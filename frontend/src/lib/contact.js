// Email / phone helpers shared by the sign-up and login forms.

export const COUNTRY_CODES = [
  { code: '+91', label: '+91' },
  { code: '+1', label: '+1' },
  { code: '+44', label: '+44' },
  { code: '+971', label: '+971' },
  { code: '+61', label: '+61' },
  { code: '+65', label: '+65' },
]

/** Combines country code + local number into what the API expects. */
export function buildContact(value) {
  if (value.type === 'EMAIL') return value.email.trim()
  return `${value.countryCode}${value.phone.replace(/\D/g, '')}`
}

export function validateContact(value) {
  if (value.type === 'EMAIL') {
    if (!value.email.trim()) return 'Please enter your email address.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.email.trim())) return 'Please enter a valid email address.'
    return null
  }
  const digits = value.phone.replace(/\D/g, '')
  if (!digits) return 'Please enter your phone number.'
  if (value.countryCode === '+91' && !/^[6-9]\d{9}$/.test(digits)) {
    return 'Enter a 10-digit Indian mobile number starting with 6, 7, 8 or 9.'
  }
  if (digits.length < 6 || digits.length > 14) return 'Please enter a valid phone number.'
  return null
}

export const emptyContact = { type: 'EMAIL', email: '', phone: '', countryCode: '+91' }
