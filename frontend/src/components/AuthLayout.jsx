import { CheckIcon, ShieldIcon } from './Icons'

/** Split-screen layout: brand panel on the left, form on the right (stacks on phones). */
export default function AuthLayout({ children }) {
  return (
    <div className="auth">
      <aside className="brand">
        <div className="brand__logo">
          <span className="logo-mark">
            <ShieldIcon width={22} height={22} />
          </span>
          SecureID
        </div>

        <div className="brand__body">
          <h1 className="brand__title">
            Passwordless login
            <br />
            for the modern web.
          </h1>
          <ul className="brand__features">
            <li>
              <CheckIcon width={18} height={18} /> 6-digit code by email or phone
            </li>
            <li>
              <CheckIcon width={18} height={18} /> Face ID, fingerprint &amp; Windows Hello
            </li>
            <li>
              <CheckIcon width={18} height={18} /> One trusted device at a time
            </li>
          </ul>
          <FaceScan />
        </div>

        <p className="brand__foot">Your biometrics never leave your device.</p>
      </aside>

      <main className="auth__panel">
        <div className="auth__form">{children}</div>
      </main>
    </div>
  )
}

function FaceScan() {
  return (
    <div className="facescan" aria-hidden="true">
      <svg viewBox="0 0 200 200">
        <g className="facescan__frame" fill="none" strokeWidth="6" strokeLinecap="round">
          <path d="M20 60V36a16 16 0 0 1 16-16h24" />
          <path d="M140 20h24a16 16 0 0 1 16 16v24" />
          <path d="M180 140v24a16 16 0 0 1-16 16h-24" />
          <path d="M60 180H36a16 16 0 0 1-16-16v-24" />
        </g>
        <g className="facescan__face" fill="none" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M72 78v10M128 78v10" />
          <path d="M100 78v32h-8" />
          <path d="M76 132c13 11 35 11 48 0" />
        </g>
        <rect className="facescan__line" x="30" y="28" width="140" height="4" rx="2" />
      </svg>
    </div>
  )
}
