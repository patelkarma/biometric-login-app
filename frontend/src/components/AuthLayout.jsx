import { CheckIcon } from './Icons'
import Logo from './Logo'

const STEPS = ['Your details', 'Verify with a code', 'Add Face ID (optional)']

/**
 * Direction D "Sage" layout.
 * Laptop: one white rounded card on a sage background, dark green panel on the left.
 * Phone (<900px): the green panel becomes a compact header (logo, step progress).
 *
 * @param title     heading in the green panel
 * @param text      optional paragraph under the heading
 * @param step      1-3 during sign-up: shows the steps list (laptop) / progress bar (phone)
 * @param extra     optional panel content (laptop only), e.g. the biometric types grid
 * @param showTitleOnPhone  keep the panel heading in the phone header (login screen)
 */
export default function AuthLayout({ title, text, step, extra, showTitleOnPhone = false, children }) {
  return (
    <div className="auth">
      <div className="auth__card">
        <aside className="panel">
          <div className="panel__top">
            <Logo />
            {step && <span className="panel__step">Step {step} of 3</span>}
          </div>

          {step && (
            <div className="progress" aria-hidden="true">
              {STEPS.map((_, i) => (
                <span key={i} className={i < step ? 'is-done' : ''} />
              ))}
            </div>
          )}

          <div className={`panel__body ${showTitleOnPhone ? 'panel__body--phone' : ''}`}>
            {title && <h1 className="panel__title">{title}</h1>}
            {text && <p className="panel__text">{text}</p>}
            {step && (
              <ol className="steps">
                {STEPS.map((label, i) => {
                  const n = i + 1
                  const state = n < step ? 'done' : n === step ? 'current' : 'todo'
                  return (
                    <li key={label} className={`steps__item steps__item--${state}`}>
                      <span className="steps__num">{state === 'done' ? <CheckIcon width={14} height={14} /> : n}</span>
                      {label}
                    </li>
                  )
                })}
              </ol>
            )}
            {extra && <div className="panel__extra">{extra}</div>}
          </div>
        </aside>

        <main className="auth__main">
          <div className="auth__form">{children}</div>
        </main>
      </div>
    </div>
  )
}
