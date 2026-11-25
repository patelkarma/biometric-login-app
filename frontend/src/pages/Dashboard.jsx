import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import {
  DeviceIcon,
  FaceIdIcon,
  FingerprintIcon,
  LockIcon,
  LogoutIcon,
  MailIcon,
  PhoneIcon,
  PlusIcon,
  ShieldIcon,
  TrashIcon,
  UserIcon,
} from '../components/Icons'
import { useAuth } from '../context/useAuth'
import { api } from '../lib/api'
import { enableBiometrics, isBiometricSupported } from '../lib/biometrics'

const dateFmt = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'long', year: 'numeric' })
const timeFmt = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' })

function formatDob(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  return dateFmt.format(new Date(y, m - 1, d))
}

function formatPhone(p) {
  return p.startsWith('+91') ? `+91 ${p.slice(3, 8)} ${p.slice(8)}` : p
}

export default function Dashboard() {
  const { me, logout, refresh } = useAuth()
  const location = useLocation()
  const [bioError, setBioError] = useState(null)
  const [bioBusy, setBioBusy] = useState(false)
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

  async function addPasskey() {
    setBioBusy(true)
    setBioError(null)
    try {
      await enableBiometrics()
      await refresh()
      setBanner('Biometric sign-in is now enabled on this device.')
    } catch (err) {
      setBioError(err.message)
    } finally {
      setBioBusy(false)
    }
  }

  async function removePasskey(id) {
    setBioError(null)
    try {
      await api(`/passkeys/${id}`, { method: 'DELETE' })
      await refresh()
    } catch (err) {
      setBioError(err.message)
    }
  }

  return (
    <div className="app">
      <nav className="topbar">
        <div className="topbar__brand">
          <span className="logo-mark logo-mark--sm">
            <ShieldIcon width={18} height={18} />
          </span>
          SecureID
        </div>
        <button className="btn btn--ghost btn--sm" onClick={logout}>
          <LogoutIcon width={16} height={16} /> Log out
        </button>
      </nav>

      <main className="dash">
        {banner && (
          <div className="alert alert--success dash__banner">
            <span>{banner}</span>
            <button className="link" onClick={() => setBanner(null)} aria-label="Dismiss">
              ✕
            </button>
          </div>
        )}

        <section className="card card--hero">
          <div className="avatar">
            {user.firstName[0]}
            {user.surname[0]}
          </div>
          <div>
            <h1>Hello, {user.firstName}!</h1>
            <p>You&apos;re signed in securely. Here&apos;s an overview of your account.</p>
          </div>
        </section>

        <div className="dash__grid">
          <section className="card">
            <h3 className="card__title">
              <UserIcon width={18} height={18} /> Profile
            </h3>
            <dl className="details">
              <div>
                <dt>First name</dt>
                <dd>{user.firstName}</dd>
              </div>
              <div>
                <dt>Surname</dt>
                <dd>{user.surname}</dd>
              </div>
              <div>
                <dt>Date of birth</dt>
                <dd>{formatDob(user.dateOfBirth)}</dd>
              </div>
              <div>
                <dt>{user.contactType === 'EMAIL' ? 'Email' : 'Phone'}</dt>
                <dd className="details__contact">
                  {user.contactType === 'EMAIL' ? <MailIcon width={16} height={16} /> : <PhoneIcon width={16} height={16} />}
                  {user.email ?? formatPhone(user.phone)}
                  <span className="badge badge--green">Verified</span>
                </dd>
              </div>
            </dl>
          </section>

          <section className="card">
            <h3 className="card__title">
              <DeviceIcon width={18} height={18} /> Active device
            </h3>
            <div className="device">
              <span className="pulse" aria-hidden="true" />
              <div>
                <strong>{session.deviceName}</strong>
                <span className="muted">This device</span>
              </div>
            </div>
            <dl className="details details--compact">
              <div>
                <dt>Signed in</dt>
                <dd>{timeFmt.format(new Date(session.signedInAt))}</dd>
              </div>
              <div>
                <dt>Method</dt>
                <dd>{session.loginMethod === 'BIOMETRIC' ? 'Face ID / fingerprint' : '6-digit code'}</dd>
              </div>
            </dl>
            <p className="note">
              <LockIcon width={14} height={14} /> Only one device can be active at a time. Signing in somewhere else
              will sign this device out automatically.
            </p>
          </section>

          <section className="card">
            <div className="card__head">
              <h3 className="card__title">
                <FingerprintIcon width={18} height={18} /> Biometric logins
              </h3>
              {isBiometricSupported() && (
                <button className="btn btn--outline btn--sm" onClick={addPasskey} disabled={bioBusy}>
                  {bioBusy ? <span className="spinner spinner--dark" /> : <PlusIcon width={16} height={16} />} Add
                </button>
              )}
            </div>
            {passkeys.length === 0 ? (
              <div className="empty">
                <FaceIdIcon width={30} height={30} />
                <p>No biometric login yet. Add Face ID, fingerprint or Windows Hello to sign in without a code.</p>
              </div>
            ) : (
              <ul className="passkeys">
                {passkeys.map((p) => (
                  <li key={p.id}>
                    <FingerprintIcon width={18} height={18} />
                    <div>
                      <strong>{p.deviceName}</strong>
                      <span className="muted">
                        Added {timeFmt.format(new Date(p.createdAt))}
                        {p.lastUsedAt && ` · Last used ${timeFmt.format(new Date(p.lastUsedAt))}`}
                      </span>
                    </div>
                    <button className="icon-btn" onClick={() => removePasskey(p.id)} aria-label="Remove biometric login">
                      <TrashIcon width={16} height={16} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {bioError && <div className="alert alert--error">{bioError}</div>}
          </section>

          <section className="card">
            <h3 className="card__title">
              <ShieldIcon width={18} height={18} /> Security
            </h3>
            <ul className="checks">
              <li>Codes expire in 5 minutes and lock after 5 wrong attempts</li>
              <li>Codes and session tokens are stored only as SHA-256 hashes</li>
              <li>Biometric data never leaves your device - we only keep a public key</li>
              <li>New sign-ins automatically end sessions on other devices</li>
            </ul>
          </section>
        </div>
      </main>
    </div>
  )
}
