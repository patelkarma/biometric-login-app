// Shape and helpers for the Email/Phone value edited by <ContactInput>.
// Validation of this value lives in validation.js.

export const COUNTRY_CODES = [
  { code: '+91', label: '+91' },
  { code: '+1', label: '+1' },
  { code: '+44', label: '+44' },
  { code: '+971', label: '+971' },
  { code: '+61', label: '+61' },
  { code: '+65', label: '+65' },
]

export const emptyContact = { type: 'EMAIL', email: '', phone: '', countryCode: '+91' }

/** Combines country code + local number into what the API expects. */
export function buildContact(value) {
  if (value.type === 'EMAIL') return value.email.trim()
  return `${value.countryCode}${value.phone.replace(/\D/g, '')}`
}

/** True when the user has typed something in the active Email/Phone field. */
export function hasContact(value) {
  return Boolean(value.type === 'EMAIL' ? value.email.trim() : value.phone.trim())
}
