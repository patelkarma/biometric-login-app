import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import AuthLayout from '../components/AuthLayout'
import ContactInput from '../components/ContactInput'
import { FaceIdIcon } from '../components/Icons'
import { Alert, Button } from '../components/ui'
import { useAuth } from '../context/useAuth'
import { useAsyncAction } from '../hooks/useAsyncAction'
import { api } from '../lib/api'
import { isBiometricSupported, signInWithBiometrics } from '../lib/biometrics'
import { buildContact, emptyContact, hasContact } from '../lib/contact'
import { getBiometricName } from '../lib/device'
import { savePendingOtp } from '../lib/pendingOtp'
import { validateContact } from '../lib/validation'

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const { completeLogin } = useAuth()
  const [contact, setContact] = useState(emptyContact)
  const { busy, error, setError, run } = useAsyncAction() // busy: false | 'code' | 'bio'
  const notice = location.state?.notice
  const biometricSupported = isBiometricSupported()

  function sendCode(e) {
    e.preventDefault()
    const problem = validateContact(contact)
    if (problem) return setError(problem)
    run(
      async () => {
        const res = await api('/auth/otp/request', {
          method: 'POST',
          body: { contactType: contact.type, contact: buildContact(contact) },
        })
        savePendingOtp({ ...res, flow: 'login' })
        navigate('/verify')
      },
      { busyKey: 'code' },
    )
  }

  function biometricLogin() {
    // The email/phone is optional here: if it is empty the browser shows the saved passkeys.
    const typed = hasContact(contact)
    if (typed) {
      const problem = validateContact(contact)
      if (problem) return setError(problem)
    }
    run(
      async () => {
        const res = await signInWithBiometrics(contact.type, typed ? buildContact(contact) : null)
        completeLogin(res)
        navigate('/dashboard', { replace: true, state: { replacedOtherDevice: res.replacedOtherDevice } })
      },
      { busyKey: 'bio' },
    )
  }

  return (
    <AuthLayout
      title={
        <>
          Calm, simple,
          <br />
          secure sign-in.
        </>
      }
      text="A code or a glance — whichever you prefer. One trusted device at a time."
      showTitleOnPhone
    >
      <header className="form-head">
        <h2>Welcome back</h2>
        <p>How would you like to sign in?</p>
      </header>

      <Alert type="info">{notice}</Alert>

      <button
        type="button"
        className="option"
        onClick={biometricLogin}
        disabled={!!busy || !biometricSupported}
      >
        <span className="option__icon">
          {busy === 'bio' ? <span className="spinner" /> : <FaceIdIcon width={22} height={22} />}
        </span>
        <span className="option__text">
          Face ID / Fingerprint
          <small>
            {biometricSupported ? `Instant, with ${getBiometricName()}` : 'Not supported in this browser'}
          </small>
        </span>
        <span className="option__arrow" aria-hidden="true">
          →
        </span>
      </button>

      <div className="divider">
        <span>or get a 6-digit code</span>
      </div>

      <form onSubmit={sendCode} noValidate>
        <ContactInput value={contact} onChange={setContact} />
        <Alert>{error}</Alert>
        <Button block loading={busy === 'code'} disabled={!!busy}>
          Send code
        </Button>
      </form>

      <p className="switch">
        New here? <Link to="/signup">Create account</Link>
      </p>
    </AuthLayout>
  )
}
