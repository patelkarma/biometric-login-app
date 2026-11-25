import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import AuthLayout from '../components/AuthLayout'
import { CODE_LENGTH, CodeDeliveryNote, CodeTimers, OtpInput } from '../components/code'
import { ArrowLeftIcon } from '../components/Icons'
import { Alert, Button } from '../components/ui'
import { useAuth } from '../context/useAuth'
import { useAsyncAction } from '../hooks/useAsyncAction'
import { api } from '../lib/api'
import { isBiometricSupported } from '../lib/biometrics'
import { getDeviceId, getDeviceName } from '../lib/device'
import { clearPendingOtp, loadPendingOtp, savePendingOtp } from '../lib/pendingOtp'

export default function VerifyCode() {
  const navigate = useNavigate()
  const { completeLogin } = useAuth()
  const [pending, setPending] = useState(() => loadPendingOtp())
  const [code, setCode] = useState('')
  const [attempt, setAttempt] = useState(0) // changing it gives a fresh, empty, focused OtpInput
  const [info, setInfo] = useState(null)
  // busy: false | true (verifying) | 'resend'. Only verifying locks the Verify button.
  const { busy, error, setError, run } = useAsyncAction()
  const verifying = busy === true

  if (!pending) return <Navigate to="/login" replace />

  const isSignup = pending.flow === 'signup'

  function clearCode() {
    setCode('')
    setAttempt((n) => n + 1)
  }

  function submit(value = code) {
    if (verifying) return
    if (value.length !== CODE_LENGTH) return setError('Enter all 6 digits.')
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
        const state = { replacedOtherDevice: res.replacedOtherDevice, flow: pending.flow }
        // Next screen: "Is this you?" if this sign-up looks like an existing account,
        // otherwise Face ID / fingerprint for anyone who doesn't have it yet.
        let next = '/dashboard'
        if (res.possibleDuplicate) next = '/link-account'
        else if (!res.hasPasskey && isBiometricSupported()) next = '/enable-biometrics'
        navigate(next, { replace: true, state })
      },
      { onError: clearCode },
    )
  }

  function resend() {
    setInfo(null)
    run(
      async () => {
        const res = await api('/auth/otp/request', {
          method: 'POST',
          body: { contactType: pending.contactType, contact: pending.contact },
        })
        const next = { ...pending, ...res, sentAt: Date.now() }
        savePendingOtp(next)
        setPending(next)
        clearCode()
        setInfo('A new code has been sent.')
      },
      { busyKey: 'resend' },
    )
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

      <CodeDeliveryNote channel={pending.deliveryChannel} contactType={pending.contactType} />

      <form
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
      >
        <OtpInput
          key={attempt}
          invalid={!!error}
          onChange={(value) => {
            setCode(value)
            setError(null)
          }}
          onComplete={submit}
        />

        <Alert>{error}</Alert>
        <Alert type="success">{info}</Alert>

        <Button block loading={verifying} disabled={verifying || code.length !== CODE_LENGTH}>
          Verify
        </Button>
      </form>

      <CodeTimers sent={pending} onResend={resend} />
    </AuthLayout>
  )
}
