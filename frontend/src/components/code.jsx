// Pieces for entering a 6-digit code, shared by Verify, "Add phone / email" and account linking.
import { useEffect, useRef, useState } from 'react'
import { formatCountdown } from '../lib/format'

export const CODE_LENGTH = 6
const emptyDigits = () => Array(CODE_LENGTH).fill('')

/**
 * Six boxes for a one-time code. Handles typing, Backspace, arrow keys, paste and SMS autofill.
 * To clear it (e.g. after a wrong code), give it a new `key` - it then starts empty and focused.
 *
 * @param onChange    called with the code typed so far (string)
 * @param onComplete  called with the full code as soon as all 6 digits are filled
 * @param invalid     shows the boxes in the error style
 */
export function OtpInput({ onChange, onComplete, invalid = false, autoFocus = true }) {
  const [digits, setDigits] = useState(emptyDigits)
  const inputs = useRef([])

  const focus = (i) => inputs.current[Math.max(0, Math.min(CODE_LENGTH - 1, i))]?.focus()

  function update(next) {
    setDigits(next)
    onChange?.(next.join(''))
  }

  /** Writes `text` into the boxes starting at `fromIndex` (one digit typed, or a pasted code). */
  function fill(fromIndex, text) {
    const clean = text.replace(/\D/g, '').slice(0, CODE_LENGTH - fromIndex)
    if (!clean) return
    const next = [...digits]
    clean.split('').forEach((d, k) => (next[fromIndex + k] = d))
    update(next)
    focus(fromIndex + clean.length)
    if (next.every(Boolean)) onComplete?.(next.join(''))
  }

  function onKeyDown(i, e) {
    if (e.key === 'Backspace' && !digits[i] && i > 0) {
      const next = [...digits]
      next[i - 1] = ''
      update(next)
      focus(i - 1)
      e.preventDefault()
    } else if (e.key === 'ArrowLeft') focus(i - 1)
    else if (e.key === 'ArrowRight') focus(i + 1)
  }

  return (
    <div className="otp" onPaste={(e) => (e.preventDefault(), fill(0, e.clipboardData.getData('text')))}>
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => (inputs.current[i] = el)}
          className={`otp__box ${invalid ? 'is-invalid' : ''}`}
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          maxLength={CODE_LENGTH}
          aria-label={`Digit ${i + 1}`}
          value={d}
          autoFocus={autoFocus && i === 0}
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, '')
            if (!v) {
              const next = [...digits]
              next[i] = ''
              update(next)
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
  )
}

/**
 * Local testing without email/SMS: the backend prints the code in its log and never sends it
 * to the browser. Shown only when the server reports deliveryChannel "CONSOLE".
 */
export function CodeDeliveryNote({ channel, contactType }) {
  if (channel !== 'CONSOLE') return null
  return (
    <div className="demo-banner" role="status">
      <span>
        <strong>Check the backend logs for your code</strong>
        {contactType === 'PHONE' ? 'No SMS gateway is configured' : 'No email server is configured'}, so the 6-digit
        code is printed in the backend terminal. Look for the <code>DEMO DELIVERY</code> block.
      </span>
    </div>
  )
}

/** Seconds left of a `total`-second window that started at `sentAt` (ms). */
function secondsLeft(sentAt, total, now) {
  return Math.max(0, total - Math.floor((now - sentAt) / 1000))
}

/**
 * "Expires in 4:38" and "Resend in 0:24" (then a Resend button), ticking every second.
 * @param sent  { sentAt, expiresInSeconds, resendInSeconds } - the server's reply plus when it arrived
 */
export function CodeTimers({ sent, onResend }) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const expiresIn = secondsLeft(sent.sentAt, sent.expiresInSeconds, Math.max(now, sent.sentAt))
  const resendIn = secondsLeft(sent.sentAt, sent.resendInSeconds, Math.max(now, sent.sentAt))

  return (
    <div className="meta-row">
      <span>{expiresIn > 0 ? `Expires in ${formatCountdown(expiresIn)}` : 'Code expired'}</span>
      {resendIn > 0 ? (
        <span>Resend in {formatCountdown(resendIn)}</span>
      ) : (
        <button type="button" className="link" onClick={onResend}>
          Resend code
        </button>
      )}
    </div>
  )
}
