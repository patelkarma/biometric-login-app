import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { DeviceIcon, FaceIdIcon, FingerprintIcon, PhoneIcon, PlusIcon, TrashIcon } from '../components/Icons'
import Logo from '../components/Logo'
import { Alert, Button } from '../components/ui'
import { useAuth } from '../context/useAuth'
import { useAsyncAction } from '../hooks/useAsyncAction'
import { api } from '../lib/api'
import { enableBiometrics, isBiometricSupported } from '../lib/biometrics'
import { isMobileDevice } from '../lib/device'
import { formatDateTime, formatDob, formatPhone, formatTime } from '../lib/format'

export default function Dashboard() {
  const { me, logout, refresh } = useAuth()
  const location = useLocation()
  // busy: false | true (adding a biometric) | 'remove'. Only adding shows the spinner, as before.
  const { busy, error: bioError, run } = useAsyncAction()
  const [banner, setBanner] = useState(() => {
    if (location.state?.biometricsEnabled) return 'Biometric sign-in is now enabled on this device.'
    if (location.state?.replacedOtherDevice) return 'You were signed out of your other device. Only this device is active now.'
    return null
  })

  if (!me) {
    return (
      <div className="page-loading">
        <span className="spinner spinner--dark" />
      </div>
    )
  }

  const { user, session, passkeys } = me
  const contact = user.email ?? formatPhone(user.phone)

  function addPasskey() {
    run(async () => {
      await enableBiometrics()
      await refresh()
      setBanner('Biometric sign-in is now enabled on this device.')
    })
  }

  function removePasskey(id) {
    run(
      async () => {
        await api(`/passkeys/${id}`, { method: 'DELETE' })
        await refresh()
      },
      { busyKey: 'remove' },
    )
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="sidebar__top">
          <Logo />
          <nav className="sidebar__nav" aria-label="Dashboard sections">
            <a href="#overview" className="is-active">
              Overview
            </a>
            <a href="#devices">Devices</a>
            <a href="#biometrics">Biometrics</a>
          </nav>
        </div>
        <button className="sidebar__logout" onClick={logout}>
          Log out
        </button>
      </aside>

      <main className="dash">
        {banner && (
          <Alert type="success" className="dash__banner">
            <span>{banner}</span>
            <button className="link" onClick={() => setBanner(null)} aria-label="Dismiss">
              ✕
            </button>
          </Alert>
        )}

        <section id="overview" className="tile tile--hero">
          <div className="tile--hero__who">
            <span className="avatar">
              {user.firstName[0]}
              {user.surname[0]}
            </span>
            <div>
              <h1>Hi {user.firstName}, you&apos;re all set.</h1>
              <p>
                {user.firstName} {user.surname} · Born {formatDob(user.dateOfBirth)} · {contact}{' '}
                <span className="verified">verified</span>
              </p>
            </div>
          </div>
          <span className="badge">● Protected</span>
        </section>

        <div className="dash__grid">
          <section id="devices" className="tile">
            <h2 className="tile__title">Active device</h2>
            <div className="device-row">
              <span className="device-row__icon">
                {isMobileDevice(session.deviceName) ? (
                  <PhoneIcon width={20} height={20} />
                ) : (
                  <DeviceIcon width={20} height={20} />
                )}
              </span>
              <div>
                <strong>{session.deviceName}</strong>
                <span>
                  This device · since {formatTime(session.signedInAt)} ·{' '}
                  {session.loginMethod === 'BIOMETRIC' ? 'biometrics' : '6-digit code'}
                </span>
              </div>
            </div>
            <p className="muted-text">
              You can only be signed in on one device. A new sign-in ends this session automatically.
            </p>
          </section>

          <section id="biometrics" className="tile">
            <div className="tile__head">
              <h2 className="tile__title">Biometric logins</h2>
              {isBiometricSupported() && (
                <Button
                  size="sm"
                  icon={<PlusIcon width={16} height={16} />}
                  loading={busy === true}
                  onClick={addPasskey}
                  disabled={busy === true}
                >
                  Add
                </Button>
              )}
            </div>

            {passkeys.length === 0 ? (
              <div className="empty">
                <FaceIdIcon width={28} height={28} />
                <p>No biometric login yet. Add Face ID, fingerprint or Windows Hello to sign in without a code.</p>
              </div>
            ) : (
              <ul className="passkeys">
                {passkeys.map((p) => (
                  <li key={p.id}>
                    <FingerprintIcon width={22} height={22} />
                    <div>
                      <strong>{p.deviceName}</strong>
                      <span>
                        Added {formatDateTime(p.createdAt)}
                        {p.lastUsedAt && ` · used ${formatDateTime(p.lastUsedAt)}`}
                      </span>
                    </div>
                    <button
                      className="icon-btn"
                      onClick={() => removePasskey(p.id)}
                      aria-label={`Remove biometric login for ${p.deviceName}`}
                    >
                      <TrashIcon width={16} height={16} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <Alert>{bioError}</Alert>
          </section>
        </div>
      </main>
    </div>
  )
}
