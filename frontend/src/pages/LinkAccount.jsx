import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import AuthLayout from '../components/AuthLayout'
import { CODE_LENGTH, CodeDeliveryNote, CodeTimers, OtpInput } from '../components/code'
import DeviceRow from '../components/DeviceRow'
import { ArrowLeftIcon, CheckIcon, MailIcon, PhoneIcon } from '../components/Icons'
import { Alert, Button } from '../components/ui'
import { useAuth } from '../context/useAuth'
import { useAsyncAction } from '../hooks/useAsyncAction'
import { api } from '../lib/api'
import { isBiometricSupported } from '../lib/biometrics'
import { getDeviceId, getDeviceName } from '../lib/device'
import { formatDob, formatPhone } from '../lib/format'

/**
 * "Is this you?" - shown right after sign-up when an existing account has the same name and
 * date of birth. Step 'ask': link or keep separate. Step 'code': prove you own the existing
 * account with a code sent to its email / phone; then the two accounts become one.
 */
export default function LinkAccount() {
  const navigate = useNavigate()
  const location = useLocation()
  const { me, completeLogin } = useAuth()
  const [match, setMatch] = useState(null)
  const [step, setStep] = useState('ask') // 'ask' | 'code'
  const [sent, setSent] = useState(null)
  const [code, setCode] = useState('')
  const [attempt, setAttempt] = useState(0)
  const { busy, error, setError, run } = useAsyncAction()

  // Where a brand-new account goes when there is nothing (more) to link.
  const continueWithoutLinking = () =>
    navigate(isBiometricSupported() ? '/enable-biometrics' : '/dashboard', {
      replace: true,
      state: { ...location.state, flow: 'signup' },
    })

  // The server decides whether a match exists; the page never trusts its own memory for that.
  useEffect(() => {
    let cancelled = false
    api('/link/match')
      .then((m) => !cancelled && setMatch(m))
      .catch(() => !cancelled && continueWithoutLinking())
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function sendLinkCode() {
    run(async () => {
      const res = await api('/link/start', { method: 'POST' })
      setSent({ ...res, sentAt: Date.now() })
      setCode('')
      setAttempt((n) => n + 1)
      setStep('code')
    })
  }

  function verify(value = code) {
    if (busy || value.length !== CODE_LENGTH) return
    run(
      async () => {
        const res = await api('/link/verify', {
          method: 'POST',
          body: { code: value, deviceId: getDeviceId(), deviceName: getDeviceName() },
        })
        // The new account is gone; this device is now signed in to the existing one.
        completeLogin(res)
        navigate('/dashboard', { replace: true, state: { linked: true } })
      },
      {
        onError: () => {
          setCode('')
          setAttempt((n) => n + 1)
        },
      },
    )
  }

  if (!match) {
    return (
      <div className="page-loading">
        <span className="spinner spinner--dark" />
      </div>
    )
  }

  const user = me?.user
  const newContact = user ? (user.phone ? formatPhone(user.phone) : user.email) : null
  const existingIcon = match.contactType === 'PHONE' ? <PhoneIcon width={20} height={20} /> : <MailIcon width={20} height={20} />

  if (step === 'code') {
    return (
      <AuthLayout
        title={
          <>
            Prove both
            <br />
            are yours.
          </>
        }
        extra={<LinkSteps />}
      >
        <button type="button" className="back link" onClick={() => setStep('ask')}>
          <ArrowLeftIcon width={16} height={16} /> Back
        </button>
        <header className="form-head">
          <h2>Confirm it&apos;s your account</h2>
          <p>
            Enter the code sent to <strong>{sent.maskedContact}</strong>
          </p>
        </header>
        <CodeDeliveryNote channel={sent.deliveryChannel} contactType={sent.contactType} />
        <form
          onSubmit={(e) => {
            e.preventDefault()
            verify()
          }}
          noValidate
        >
          <OtpInput
            key={attempt}
            invalid={!!error}
            onChange={(value) => {
              setCode(value)
              setError(null)
            }}
            onComplete={verify}
          />
          <Alert>{error}</Alert>
          <Button block loading={busy} disabled={busy || code.length !== CODE_LENGTH}>
            Verify &amp; link accounts
          </Button>
        </form>
        <CodeTimers sent={sent} onResend={sendLinkCode} />
        <p className="hint">
          Your {user?.phone ? 'phone' : 'email'} will be added to the existing account and the new duplicate is
          removed.
        </p>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title={
        <>
          One person,
          <br />
          one account.
        </>
      }
      text="Sign in with either your email or your phone, keep one profile, and stay on one active device."
      showTitleOnPhone
    >
      {newContact && (
        <span className="verified verified--chip">
          <CheckIcon width={14} height={14} /> {newContact} verified
        </span>
      )}
      <header className="form-head">
        <h2>Is this you?</h2>
        <p>
          We already have an account for{' '}
          <strong>
            {match.firstName} {match.surname}
          </strong>
          , born {formatDob(match.dateOfBirth)}, that signs in with:
        </p>
      </header>

      <div className="link-match">
        <DeviceRow name={match.maskedContact} detail="Existing account" icon={existingIcon} />
      </div>

      <Alert>{error}</Alert>
      <div className="actions">
        <Button block loading={busy} onClick={sendLinkCode} disabled={busy}>
          Yes, it&apos;s me — link my {user?.phone ? 'phone' : 'email'}
        </Button>
        <Button variant="outline" block onClick={continueWithoutLinking} disabled={busy}>
          No, it&apos;s not me — keep a new account
        </Button>
      </div>
      <p className="hint">
        To link, we&apos;ll send a code to {match.maskedContact} so only its owner can join the two.
      </p>
    </AuthLayout>
  )
}

/** Progress shown in the green panel while linking. */
function LinkSteps() {
  return (
    <ol className="steps">
      <li className="steps__item steps__item--done">
        <span className="steps__num">
          <CheckIcon width={14} height={14} />
        </span>
        New contact verified
      </li>
      <li className="steps__item steps__item--current">
        <span className="steps__num">2</span>
        Confirm the existing account
      </li>
      <li className="steps__item steps__item--todo">
        <span className="steps__num">3</span>
        Sign in with either
      </li>
    </ol>
  )
}
