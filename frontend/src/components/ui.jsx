// Small building blocks shared by every screen.

/**
 * A message box. Renders nothing when there is no message, so pages can write
 * `<Alert>{error}</Alert>` without wrapping it in a condition.
 *
 * @param type  'error' (default) | 'success' | 'info'
 */
export function Alert({ type = 'error', className = '', children }) {
  if (!children) return null
  return (
    <div className={`alert alert--${type} ${className}`.trim()} role={type === 'error' ? 'alert' : undefined}>
      {children}
    </div>
  )
}

/**
 * Labelled text input with an optional error message underneath.
 * Any other props (type, value, onChange, autoComplete...) go straight to the <input>.
 */
export function TextField({ id, label, error, ...inputProps }) {
  return (
    <div className="field">
      <label className="label" htmlFor={id}>
        {label}
      </label>
      <input id={id} className={`input ${error ? 'is-invalid' : ''}`} {...inputProps} />
      {error && <span className="field__error">{error}</span>}
    </div>
  )
}

/**
 * Button in the app's style that shows a spinner while `loading`.
 *
 * @param variant  'primary' (default) | 'outline'
 * @param block    full width
 * @param size     'sm' for the compact dashboard button
 * @param icon     optional icon, replaced by the spinner while loading
 */
export function Button({ variant = 'primary', block = false, size, loading = false, icon, children, ...props }) {
  const classes = ['btn', `btn--${variant}`, block && 'btn--block', size && `btn--${size}`].filter(Boolean).join(' ')
  return (
    <button className={classes} {...props}>
      {loading ? <span className="spinner" /> : icon}
      {children}
    </button>
  )
}
