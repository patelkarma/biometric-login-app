import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import AuthLayout from '../components/AuthLayout'
import ContactInput from '../components/ContactInput'
import { FaceIdIcon } from '../components/Icons'
import { useAuth } from '../context/useAuth'
import { api } from '../lib/api'
import { isBiometricSupported, signInWithBiometrics } from '../lib/biometrics'
import { buildContact, emptyContact, validateContact } from '../lib/contact'
import { getBiometricName } from '../lib/device'
import { savePendingOtp } from './verifyState'

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const { completeLogin } = useAuth()
  const [contact, setContact] = useState(emptyContact)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(null) // 'code' | 'bio'
  const notice = location.state?.notice
  const biometricSupported = isBiometricSupported()

  async function sendCode(e) {
    e.preventDefault()
    const problem = validateContact(contact)
    if (problem) return setError(problem)
    setError(null)
    setBusy('code')
    try {
      const res = await api('/auth/otp/request', {
        method: 'POST',
        body: { contactType: contact.type, contact: buildContact(contact) },
      })
      savePendingOtp({ ...res, flow: 'login' })
      navigate('/verify')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(null)
    }
  }

  async function biometricLogin() {
    setError(null)
    // The email/phone is optional here: if it is empty the browser shows the saved passkeys.
    const hasContact = contact.type === 'EMAIL' ? contact.email.trim() : contact.phone.trim()
    if (hasContact) {
      const problem = validateContact(contact)
      if (problem) return setError(problem)
    }
    setBusy('bio')
    try {
      const res = await signInWithBiometrics(contact.type, hasContact ? buildContact(contact) : null)
      completeLogin(res)
      navigate('/dashboard', { replace: true, state: { replacedOtherDevice: res.replacedOtherDevice } })
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(null)
    }
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

      {notice && <div className="alert alert--info">{notice}</div>}

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
        {error && (
          <div className="alert alert--error" role="alert">
            {error}
          </div>
        )}
        <button className="btn btn--primary btn--block" disabled={!!busy}>
          {busy === 'code' && <span className="spinner" />}
          Send code
        </button>
      </form>

      <p className="switch">
        New here? <Link to="/signup">Create account</Link>
      </p>
    </AuthLayout>
  )
}
