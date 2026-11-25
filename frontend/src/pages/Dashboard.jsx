import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import ContactsCard from '../components/ContactsCard'
import DeviceRow from '../components/DeviceRow'
import { FaceIdIcon, FingerprintIcon } from '../components/Icons'
import { Alert } from '../components/ui'
import { useAuth } from '../context/useAuth'
import { formatDob, formatTime } from '../lib/format'

/** Overview: who is signed in, plus short summaries that link to the Devices and Biometrics pages. */
export default function Dashboard() {
  const { me } = useAuth()
  const location = useLocation()
  const [banner, setBanner] = useState(() => {
    if (location.state?.linked) return 'Accounts linked. You can now sign in with your email or your phone.'
    if (location.state?.biometricsEnabled) return 'Biometric sign-in is now enabled on this device.'
    if (location.state?.replacedOtherDevice) return 'You were signed out of your other device. Only this device is active now.'
    return null
  })

  const { user, session, passkeys } = me
  const method = session.loginMethod === 'BIOMETRIC' ? 'biometrics' : '6-digit code'

  return (
    <>
      {banner && (
        <Alert type="success" className="dash__banner">
          <span>{banner}</span>
          <button className="link" onClick={() => setBanner(null)} aria-label="Dismiss">
            ✕
          </button>
        </Alert>
      )}

      <section className="tile tile--hero">
        <div className="tile--hero__who">
          <span className="avatar">
            {user.firstName[0]}
            {user.surname[0]}
          </span>
          <div>
            <h1>Hi {user.firstName}, you&apos;re all set.</h1>
            <p>
              {user.firstName} {user.surname} · Born {formatDob(user.dateOfBirth)}
            </p>
          </div>
        </div>
        <span className="badge">● Protected</span>
      </section>

      <ContactsCard />

      <div className="dash__grid">
        <section className="tile">
          <h2 className="tile__title">Active device</h2>
          <DeviceRow name={session.deviceName} detail={`This device · since ${formatTime(session.signedInAt)} · ${method}`} />
          <p className="muted-text">
            You can only be signed in on one device. A new sign-in ends this session automatically.
          </p>
          <Link to="/dashboard/devices" className="tile__link">
            View device details →
          </Link>
        </section>

        <section className="tile">
          <h2 className="tile__title">Biometric logins</h2>
          {passkeys.length === 0 ? (
            <div className="empty">
              <FaceIdIcon width={28} height={28} />
              <p>No biometric login yet. Add Face ID, fingerprint or Windows Hello to sign in without a code.</p>
            </div>
          ) : (
            <div className="device-row">
              <span className="device-row__icon">
                <FingerprintIcon width={20} height={20} />
              </span>
              <div>
                <strong>
                  {passkeys.length} biometric {passkeys.length === 1 ? 'login' : 'logins'}
                </strong>
                <span>{passkeys.map((p) => p.deviceName).join(', ')}</span>
              </div>
            </div>
          )}
          <Link to="/dashboard/biometrics" className="tile__link">
            {passkeys.length === 0 ? 'Set up biometrics →' : 'Manage biometrics →'}
          </Link>
        </section>
      </div>
    </>
  )
}
