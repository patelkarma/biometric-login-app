import { COUNTRY_CODES } from '../lib/contact'

/** "Email | Phone" pill tabs plus the matching input. */
export default function ContactInput({ value, onChange, autoFocus, label = 'Sign in with' }) {
  const set = (patch) => onChange({ ...value, ...patch })

  return (
    <div className="field">
      <div className="pills" role="tablist" aria-label={label}>
        {[
          ['EMAIL', 'Email'],
          ['PHONE', 'Phone'],
        ].map(([type, text]) => (
          <button
            key={type}
            type="button"
            role="tab"
            aria-selected={value.type === type}
            className={`pill ${value.type === type ? 'is-active' : ''}`}
            onClick={() => set({ type })}
          >
            {text}
          </button>
        ))}
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
            className="input"
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
