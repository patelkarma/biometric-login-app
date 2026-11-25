import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import AuthLayout from '../components/AuthLayout'
import { ArrowLeftIcon } from '../components/Icons'
import { Alert, Button } from '../components/ui'
import { useAuth } from '../context/useAuth'
import { useAsyncAction } from '../hooks/useAsyncAction'
import { api } from '../lib/api'
import { isBiometricSupported } from '../lib/biometrics'
import { getDeviceId, getDeviceName } from '../lib/device'
import { formatCountdown } from '../lib/format'
import { clearPendingOtp, loadPendingOtp, savePendingOtp } from '../lib/pendingOtp'

const LENGTH = 6
const emptyDigits = () => Array(LENGTH).fill('')

/** Seconds remaining of a `total`-second window that started when the code was sent. */
function secondsLeft(pending, total, now) {
  const elapsed = Math.floor((now - pending.sentAt) / 1000)
  return Math.max(0, total - elapsed)
}

export default function VerifyCode() {
  const navigate = useNavigate()
  const { completeLogin } = useAuth()
  const [pending, setPending] = useState(() => loadPendingOtp())
  const [digits, setDigits] = useState(emptyDigits)
  const [info, setInfo] = useState(null)
  // busy: false | true (verifying) | 'resend'. Only verifying locks the Verify button, as before.
  const { busy, error, setError, run } = useAsyncAction()
  const verifying = busy === true
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

  function submit(value = code) {
    if (verifying) return
    if (value.length !== LENGTH) return setError('Enter all 6 digits.')
    run(
      async () => {
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
        // New users (or anyone without biometrics yet) are offered Face ID / fingerprint first.
        const state = { replacedOtherDevice: res.replacedOtherDevice, flow: pending.flow }
        const next = !res.hasPasskey && isBiometricSupported() ? '/enable-biometrics' : '/dashboard'
        navigate(next, { replace: true, state })
      },
      {
        onError: () => {
          setDigits(emptyDigits())
          focus(0)
        },
      },
    )
  }

  function resend() {
    setInfo(null)
    run(async () => {
      const res = await api('/auth/otp/request', {
        method: 'POST',
        body: { contactType: pending.contactType, contact: pending.contact },
      })
      const next = { ...pending, ...res, sentAt: Date.now() }
      savePendingOtp(next)
      setPending(next)
      setNow(Date.now())
      setDigits(emptyDigits())
      setInfo('A new code has been sent.')
      focus(0)
    }, { busyKey: 'resend' })
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

      {/* Local testing without email/SMS: the backend prints the code in its log (never sent to the browser). */}
      {pending.deliveryChannel === 'CONSOLE' && (
        <div className="demo-banner" role="status">
          <span>
            <strong>Check the backend logs for your code</strong>
            {pending.contactType === 'PHONE' ? 'No SMS gateway is configured' : 'No email server is configured'}, so the
            6-digit code is printed in the backend terminal. Look for the <code>DEMO DELIVERY</code> block.
          </span>
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

        <Alert>{error}</Alert>
        <Alert type="success">{info}</Alert>

        <Button block loading={verifying} disabled={verifying || code.length !== LENGTH}>
          Verify
        </Button>
      </form>

      <div className="meta-row">
        <span>{expiresIn > 0 ? `Expires in ${formatCountdown(expiresIn)}` : 'Code expired'}</span>
        {resendIn > 0 ? (
          <span>Resend in {formatCountdown(resendIn)}</span>
        ) : (
          <button type="button" className="link" onClick={resend}>
            Resend code
          </button>
        )}
      </div>
    </AuthLayout>
  )
}
