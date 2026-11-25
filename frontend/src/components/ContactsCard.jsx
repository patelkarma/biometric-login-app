import { useState } from 'react'
import { useAuth } from '../context/useAuth'
import { useAsyncAction } from '../hooks/useAsyncAction'
import { api } from '../lib/api'
import { buildContact, emptyContact } from '../lib/contact'
import { formatPhone } from '../lib/format'
import { validateContact } from '../lib/validation'
import { CODE_LENGTH, CodeDeliveryNote, CodeTimers, OtpInput } from './code'
import ContactInput from './ContactInput'
import { MailIcon, PhoneIcon } from './Icons'
import { Alert, Button } from './ui'

/**
 * "Email & phone" on the Overview: shows the account's verified email and phone, and lets the
 * user add the missing one (enter it -> enter the code sent to it -> added). Afterwards they can
 * sign in with either; it is still one account with one active device.
 */
export default function ContactsCard() {
  const { me, refresh } = useAuth()
  const { user } = me
  const missingType = !user.phone ? 'PHONE' : !user.email ? 'EMAIL' : null
  const missingLabel = missingType === 'PHONE' ? 'phone number' : 'email'

  // step: 'idle' | 'enter' | 'code'
  const [step, setStep] = useState('idle')
  const [contact, setContact] = useState(emptyContact)
  const [sent, setSent] = useState(null) // the server's reply when a code was sent, plus sentAt
  const [code, setCode] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [added, setAdded] = useState(null)
  const { busy, error, setError, run } = useAsyncAction()

  function begin() {
    setContact({ ...emptyContact, type: missingType })
    setAdded(null)
    setError(null)
    setStep('enter')
  }

  function cancel() {
    setStep('idle')
    setSent(null)
    setError(null)
  }

  function sendCode(e) {
    e?.preventDefault()
    const problem = validateContact(contact)
    if (problem) return setError(problem)
    run(async () => {
      const res = await api('/contacts/start', {
        method: 'POST',
        body: { contactType: contact.type, contact: buildContact(contact) },
      })
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
        await api('/contacts/verify', {
          method: 'POST',
          body: { contactType: sent.contactType, contact: sent.contact, code: value },
        })
        await refresh()
        setAdded(`${sent.contactType === 'PHONE' ? 'Phone number' : 'Email'} added. You can now sign in with it.`)
        setStep('idle')
        setSent(null)
      },
      {
        onError: () => {
          setCode('')
          setAttempt((n) => n + 1)
        },
      },
    )
  }

  return (
    <section className="tile">
      <div>
        <h2 className="tile__title">Email &amp; phone</h2>
        <p className="muted-text">
          Sign in with any verified email or phone. It&apos;s still one account and one active device.
        </p>
      </div>

      <Alert type="success">{added}</Alert>

      <div className="contacts">
        {user.email && <ContactRow icon={<MailIcon width={20} height={20} />} value={user.email} />}
        {user.phone && <ContactRow icon={<PhoneIcon width={20} height={20} />} value={formatPhone(user.phone)} />}
        {missingType && step === 'idle' && (
          <div className="contact-row contact-row--empty">
            <span className="device-row__icon">
              {missingType === 'PHONE' ? <PhoneIcon width={20} height={20} /> : <MailIcon width={20} height={20} />}
            </span>
            <div>
              <strong>No {missingLabel} yet</strong>
              <span>Add one to sign in with it too</span>
            </div>
            <Button size="sm" onClick={begin}>
              + Add {missingType === 'PHONE' ? 'phone' : 'email'}
            </Button>
          </div>
        )}
      </div>

      {step === 'enter' && (
        <form className="add-contact" onSubmit={sendCode} noValidate>
          <div className="add-contact__intro">
            <h3>Add a {missingLabel}</h3>
            <p className="muted-text">We&apos;ll send a 6-digit code to check it&apos;s yours.</p>
          </div>
          <div className="add-contact__action">
            <ContactInput value={contact} onChange={setContact} lockedType={missingType} autoFocus />
            <Alert>{error}</Alert>
            <div className="add-contact__buttons">
              <Button type="button" variant="outline" onClick={cancel} disabled={busy}>
                Cancel
              </Button>
              <Button loading={busy} disabled={busy}>
                Send code
              </Button>
            </div>
          </div>
        </form>
      )}

      {step === 'code' && sent && (
        <form
          className="add-contact"
          onSubmit={(e) => {
            e.preventDefault()
            verify()
          }}
          noValidate
        >
          <div className="add-contact__intro">
            <h3>Add a {missingLabel}</h3>
            <p className="muted-text">
              Enter the code we sent to <strong>{sent.maskedContact}</strong> ·{' '}
              <button type="button" className="link" onClick={() => setStep('enter')}>
                Change
              </button>
            </p>
            <CodeDeliveryNote channel={sent.deliveryChannel} contactType={sent.contactType} />
          </div>
          <div className="add-contact__action">
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
            <div className="add-contact__buttons">
              <Button type="button" variant="outline" onClick={cancel} disabled={busy}>
                Cancel
              </Button>
              <Button loading={busy} disabled={busy || code.length !== CODE_LENGTH}>
                Verify &amp; add
              </Button>
            </div>
            <CodeTimers sent={sent} onResend={() => sendCode()} />
          </div>
        </form>
      )}
    </section>
  )
}

function ContactRow({ icon, value }) {
  return (
    <div className="contact-row">
      <span className="device-row__icon">{icon}</span>
      <div>
        <strong>{value}</strong>
      </div>
      <span className="verified">Verified</span>
    </div>
  )
}
