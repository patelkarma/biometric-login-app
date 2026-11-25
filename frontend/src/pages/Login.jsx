import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import AuthLayout from '../components/AuthLayout'
import ContactInput from '../components/ContactInput'
import { buildContact, emptyContact, validateContact } from '../lib/contact'
import { FaceIdIcon, FingerprintIcon } from '../components/Icons'
import { useAuth } from '../context/useAuth'
import { api } from '../lib/api'
import { isBiometricSupported, signInWithBiometrics } from '../lib/biometrics'
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
    <AuthLayout>
      <header className="form-head">
        <h2>Welcome back</h2>
        <p>Sign in to continue</p>
      </header>

      {notice && <div className="alert alert--info">{notice}</div>}

      <form onSubmit={sendCode} noValidate>
        <ContactInput value={contact} onChange={setContact} autoFocus />
        {error && (
          <div className="alert alert--error" role="alert">
            {error}
          </div>
        )}
        <button className="btn btn--primary btn--block" disabled={!!busy}>
          {busy === 'code' ? <span className="spinner" /> : null}
          Send 6-digit code
        </button>
      </form>

      <div className="divider">
        <span>or</span>
      </div>

      <button
        type="button"
        className="btn btn--bio btn--block"
        onClick={biometricLogin}
        disabled={!!busy || !biometricSupported}
      >
        {busy === 'bio' ? (
          <span className="spinner spinner--dark" />
        ) : (
          <span className="btn__icons">
            <FaceIdIcon />
            <FingerprintIcon />
          </span>
        )}
        Sign in with Face ID / Fingerprint
      </button>
      <p className="hint">
        {biometricSupported
          ? `Uses ${getBiometricName()} on this device. Set it up once after signing in with a code.`
          : 'This browser does not support biometric sign-in. Use the 6-digit code instead.'}
      </p>

      <p className="switch">
        New here? <Link to="/signup">Create account</Link>
      </p>
    </AuthLayout>
  )
}
