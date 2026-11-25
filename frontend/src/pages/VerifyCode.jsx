import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import AuthLayout from '../components/AuthLayout'
import { ArrowLeftIcon } from '../components/Icons'
import { useAuth } from '../context/useAuth'
import { api } from '../lib/api'
import { isBiometricSupported } from '../lib/biometrics'
import { getDeviceId, getDeviceName } from '../lib/device'
import { clearPendingOtp, loadPendingOtp, savePendingOtp } from './verifyState'

const LENGTH = 6

function secondsLeft(pending, total, now) {
  if (!pending) return 0
  const elapsed = Math.floor((now - pending.sentAt) / 1000)
  return Math.max(0, total - elapsed)
}

function mmss(seconds) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

export default function VerifyCode() {
  const navigate = useNavigate()
  const { completeLogin } = useAuth()
  const [pending, setPending] = useState(() => loadPendingOtp())
  const [digits, setDigits] = useState(Array(LENGTH).fill(''))
  const [error, setError] = useState(null)
  const [info, setInfo] = useState(null)
  const [busy, setBusy] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  const inputs = useRef([])

  // One clock drives both countdowns (resend cooldown and code expiry).
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  if (!pending) return <Navigate to="/login" replace />

  const code = digits.join('')
  const resendIn = secondsLeft(pending, pending.resendInSeconds, now)
  const expiresIn = secondsLeft(pending, pending.expiresInSeconds, now)
  const isSignup = pending.flow === 'signup'

  function focus(i) {
    inputs.current[Math.max(0, Math.min(LENGTH - 1, i))]?.focus()
  }

  function fill(fromIndex, text) {
    const clean = text.replace(/\D/g, '').slice(0, LENGTH - fromIndex)
    if (!clean) return
    const next = [...digits]
    clean.split('').forEach((d, k) => (next[fromIndex + k] = d))
    setDigits(next)
    setError(null)
    focus(fromIndex + clean.length)
    if (next.every(Boolean)) submit(next.join(''))
  }

  function onKeyDown(i, e) {
    if (e.key === 'Backspace' && !digits[i] && i > 0) {
      const next = [...digits]
      next[i - 1] = ''
      setDigits(next)
      focus(i - 1)
      e.preventDefault()
    } else if (e.key === 'ArrowLeft') focus(i - 1)
    else if (e.key === 'ArrowRight') focus(i + 1)
  }

  async function submit(value = code) {
    if (busy) return
    if (value.length !== LENGTH) return setError('Enter all 6 digits.')
    setBusy(true)
    setError(null)
    try {
      const res = await api('/auth/otp/verify', {
        method: 'POST',
        body: {
          contactType: pending.contactType,
          contact: pending.contact,
          code: value,
          deviceId: getDeviceId(),
          deviceName: getDeviceName(),
        },
      })
      clearPendingOtp()
      completeLogin(res)
      const state = { replacedOtherDevice: res.replacedOtherDevice, flow: pending.flow }
      if (!res.hasPasskey && isBiometricSupported()) navigate('/enable-biometrics', { replace: true, state })
      else navigate('/dashboard', { replace: true, state })
    } catch (err) {
      setError(err.message)
      setDigits(Array(LENGTH).fill(''))
      focus(0)
    } finally {
      setBusy(false)
    }
  }

  async function resend() {
    setError(null)
    setInfo(null)
    try {
      const res = await api('/auth/otp/request', {
        method: 'POST',
        body: { contactType: pending.contactType, contact: pending.contact },
      })
      const next = { ...pending, ...res, sentAt: Date.now() }
      savePendingOtp(next)
      setPending(next)
      setNow(Date.now())
      setDigits(Array(LENGTH).fill(''))
      setInfo('A new code has been sent.')
      focus(0)
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <AuthLayout
      step={isSignup ? 2 : undefined}
      title={
        <>
          Check your
          <br />
          messages.
        </>
      }
      text={isSignup ? undefined : 'Codes expire after 5 minutes and stop working after 5 wrong tries.'}
    >
      <Link to={isSignup ? '/signup' : '/login'} className="back">
        <ArrowLeftIcon width={16} height={16} /> Back
      </Link>
      <header className="form-head">
        <h2>Enter your code</h2>
        <p>
          Sent to <strong>{pending.maskedContact}</strong>
        </p>
      </header>

      {pending.demoCode && (
        <div className="demo-banner" role="status">
          <span>
            <strong>Demo delivery</strong>
            {pending.contactType === 'PHONE'
              ? 'No SMS gateway, so the code shows here and in the server console.'
              : 'No email server, so the code shows here and in the server console.'}
          </span>
          <button
            type="button"
            className="demo-banner__code"
            onClick={() => fill(0, pending.demoCode)}
            aria-label={`Fill in demo code ${pending.demoCode}`}
          >
            {pending.demoCode}
          </button>
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
      >
        <div className="otp" onPaste={(e) => (e.preventDefault(), fill(0, e.clipboardData.getData('text')))}>
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => (inputs.current[i] = el)}
              className={`otp__box ${error ? 'is-invalid' : ''}`}
              inputMode="numeric"
              autoComplete={i === 0 ? 'one-time-code' : 'off'}
              maxLength={LENGTH}
              aria-label={`Digit ${i + 1}`}
              value={d}
              autoFocus={i === 0}
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, '')
                if (!v) {
                  const next = [...digits]
                  next[i] = ''
                  setDigits(next)
                  return
                }
                // Normally the box is selected, so v is the new digit. If not, drop the old digit.
                // Longer values come from SMS autofill / paste and fill the following boxes.
                fill(i, v.length === 2 && d ? v.replace(d, '') || d : v)
              }}
              onKeyDown={(e) => onKeyDown(i, e)}
              onFocus={(e) => e.target.select()}
            />
          ))}
        </div>

        {error && (
          <div className="alert alert--error" role="alert">
            {error}
          </div>
        )}
        {info && <div className="alert alert--success">{info}</div>}

        <button className="btn btn--primary btn--block" disabled={busy || code.length !== LENGTH}>
          {busy && <span className="spinner" />}
          Verify
        </button>
      </form>

      <div className="meta-row">
        <span>{expiresIn > 0 ? `Expires in ${mmss(expiresIn)}` : 'Code expired'}</span>
        {resendIn > 0 ? (
          <span>Resend in {mmss(resendIn)}</span>
        ) : (
          <button type="button" className="link" onClick={resend}>
            Resend code
          </button>
        )}
      </div>
    </AuthLayout>
  )
}
