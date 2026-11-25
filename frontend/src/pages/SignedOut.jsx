import { Link, useLocation } from 'react-router-dom'
import AuthLayout from '../components/AuthLayout'
import { AlertIcon } from '../components/Icons'

export default function SignedOut() {
  const location = useLocation()
  const message =
    location.state?.message ??
    'Your account was signed in on another device. Only one device can be active at a time.'

  return (
    <AuthLayout>
      <div className="signed-out">
        <div className="signed-out__icon">
          <AlertIcon width={34} height={34} />
        </div>
        <h2>You&apos;ve been signed out</h2>
        <p>{message}</p>
        <p className="hint">If this wasn&apos;t you, sign in again - that will sign the other device out.</p>
        <Link to="/login" className="btn btn--primary btn--block">
          Sign in again
        </Link>
      </div>
    </AuthLayout>
  )
}
