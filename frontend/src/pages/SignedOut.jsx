import { Link, useLocation } from 'react-router-dom'
import AuthLayout from '../components/AuthLayout'
import { DeviceIcon, LogoutIcon, PhoneIcon } from '../components/Icons'

/** Pulls the device name out of the server message: "...another device (Safari on iPhone)...". */
function newDeviceFrom(message) {
  const m = /\(([^)]+)\)/.exec(message ?? '')
  return m ? m[1] : null
}

export default function SignedOut() {
  const location = useLocation()
  const message = location.state?.message
  const newDevice = newDeviceFrom(message)

  return (
    <AuthLayout
      title={
        <>
          One account.
          <br />
          One device.
        </>
      }
      extra={
        <div className="handover" aria-hidden="true">
          <div className="handover__old">
            <DeviceIcon width={30} height={30} />
            This device
          </div>
          <span className="handover__arrow">→</span>
          <div className="handover__new">
            <PhoneIcon width={30} height={30} />
            {newDevice ?? 'New device'}
          </div>
        </div>
      }
    >
      <div className="center-stack">
        <div className="warn-icon">
          <LogoutIcon width={34} height={34} />
        </div>
        <h2 className="center-stack__title">You&apos;ve been signed out</h2>

        {newDevice && (
          <div className="device-row">
            <span className="device-row__icon">
              <DeviceIcon width={20} height={20} />
            </span>
            <div>
              <strong>{newDevice}</strong>
              <span>is now your active device</span>
            </div>
          </div>
        )}

        <p className="muted-text">
          {newDevice
            ? 'Only one device can be active at a time.'
            : 'Your account was signed in on another device. Only one device can be active at a time.'}{' '}
          Wasn&apos;t you? Sign in again to end that session.
        </p>
        <Link to="/login" className="btn btn--primary btn--block">
          Sign in again
        </Link>
      </div>
    </AuthLayout>
  )
}
