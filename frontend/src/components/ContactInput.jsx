import { COUNTRY_CODES } from '../lib/contact'
import { MailIcon, PhoneIcon } from './Icons'

/** "Email | Phone" segmented tabs plus the matching input. */
export default function ContactInput({ value, onChange, autoFocus }) {
  const set = (patch) => onChange({ ...value, ...patch })

  return (
    <div className="field">
      <div className="tabs" role="tablist" aria-label="Sign in with">
        <button
          type="button"
          role="tab"
          aria-selected={value.type === 'EMAIL'}
          className={`tabs__tab ${value.type === 'EMAIL' ? 'is-active' : ''}`}
          onClick={() => set({ type: 'EMAIL' })}
        >
          <MailIcon width={16} height={16} /> Email
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={value.type === 'PHONE'}
          className={`tabs__tab ${value.type === 'PHONE' ? 'is-active' : ''}`}
          onClick={() => set({ type: 'PHONE' })}
        >
          <PhoneIcon width={16} height={16} /> Phone
        </button>
      </div>

      {value.type === 'EMAIL' ? (
        <>
          <label className="sr-only" htmlFor="contact-email">
            Email address
          </label>
          <input
            id="contact-email"
            className="input"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={value.email}
            autoFocus={autoFocus}
            onChange={(e) => set({ email: e.target.value })}
          />
        </>
      ) : (
        <div className="phone-row">
          <label className="sr-only" htmlFor="contact-cc">
            Country code
          </label>
          <select
            id="contact-cc"
            className="input phone-row__cc"
            value={value.countryCode}
            onChange={(e) => set({ countryCode: e.target.value })}
          >
            {COUNTRY_CODES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.label}
              </option>
            ))}
          </select>
          <label className="sr-only" htmlFor="contact-phone">
            Phone number
          </label>
          <input
            id="contact-phone"
            className="input"
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            placeholder="98765 43210"
            value={value.phone}
            autoFocus={autoFocus}
            onChange={(e) => set({ phone: e.target.value })}
          />
        </div>
      )}
    </div>
  )
}
