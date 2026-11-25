import DeviceRow from '../components/DeviceRow'
import { Button } from '../components/ui'
import { useAuth } from '../context/useAuth'
import { formatDateTime } from '../lib/format'

/** Devices: details of the one active session and how the one-device rule works. */
export default function Devices() {
  const { me, logout } = useAuth()
  const { session } = me
  const method = session.loginMethod === 'BIOMETRIC' ? 'Face ID / fingerprint' : '6-digit code'

  return (
    <>
      <header className="dash__head">
        <h1>Devices</h1>
        <p>Your account can be signed in on only one device at a time.</p>
      </header>

      <div className="dash__grid">
        <section className="tile">
          <div className="tile__head">
            <h2 className="tile__title">Active device</h2>
            <span className="verified">Active now</span>
          </div>
          <DeviceRow name={session.deviceName} detail="This device" />
          <dl className="details">
            <div>
              <dt>Signed in</dt>
              <dd>{formatDateTime(session.signedInAt)}</dd>
            </div>
            <div>
              <dt>Sign-in method</dt>
              <dd>{method}</dd>
            </div>
            <div>
              <dt>Last activity</dt>
              <dd>{formatDateTime(session.lastSeenAt)}</dd>
            </div>
            <div>
              <dt>Session expires</dt>
              <dd>{formatDateTime(session.expiresAt)}</dd>
            </div>
          </dl>
          <Button variant="outline" block onClick={logout}>
            Sign out of this device
          </Button>
        </section>

        <section className="tile">
          <h2 className="tile__title">How one active device works</h2>
          <ol className="how">
            <li>
              <strong>Sign in anywhere</strong>
              <span>Use a 6-digit code or Face ID / fingerprint on any phone or computer.</span>
            </li>
            <li>
              <strong>The old device is signed out</strong>
              <span>Signing in on a new device ends the session on the previous one straight away.</span>
            </li>
            <li>
              <strong>You&apos;re told where</strong>
              <span>The old device shows &quot;You&apos;ve been signed out&quot; and names the new device within seconds.</span>
            </li>
          </ol>
          <p className="muted-text">Didn&apos;t sign in somewhere new? Sign in again here to end that session.</p>
        </section>
      </div>
    </>
  )
}
