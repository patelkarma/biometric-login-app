// Form validation run in the browser before anything is sent.
// The server applies the same rules again (never trust the client), with the same messages.
import { ageFrom, todayIso } from './format'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const INDIA_MOBILE_RE = /^[6-9]\d{9}$/
const NAME_RE = /^\p{L}[\p{L} .'-]*$/u
const MIN_AGE = 13
const MAX_AGE = 120

/**
 * Checks the Email/Phone input (the value shape of <ContactInput>).
 * @returns an error message, or null when valid
 */
export function validateContact(value) {
  if (value.type === 'EMAIL') {
    if (!value.email.trim()) return 'Please enter your email address.'
    if (!EMAIL_RE.test(value.email.trim())) return 'Please enter a valid email address.'
    return null
  }
  const digits = value.phone.replace(/\D/g, '')
  if (!digits) return 'Please enter your phone number.'
  if (value.countryCode === '+91' && !INDIA_MOBILE_RE.test(digits)) {
    return 'Enter a 10-digit Indian mobile number starting with 6, 7, 8 or 9.'
  }
  if (digits.length < 6 || digits.length > 14) return 'Please enter a valid phone number.'
  return null
}

function validateName(value, label) {
  if (!value.trim()) return `${label} is required.`
  if (!NAME_RE.test(value.trim())) return 'Use letters only.'
  return null
}

function validateDateOfBirth(dob) {
  if (!dob) return 'Date of birth is required.'
  if (dob > todayIso()) return 'Date of birth cannot be in the future.'
  const age = ageFrom(dob)
  if (age < MIN_AGE) return `You must be at least ${MIN_AGE} years old.`
  if (age > MAX_AGE) return 'Please enter a valid date of birth.'
  return null
}

/**
 * Validates the whole sign-up form.
 * @returns an object of field -> message; empty when everything is valid
 */
export function validateSignup(form, contact) {
  const errors = {
    firstName: validateName(form.firstName, 'First name'),
    surname: validateName(form.surname, 'Surname'),
    dateOfBirth: validateDateOfBirth(form.dateOfBirth),
    contact: validateContact(contact),
  }
  return Object.fromEntries(Object.entries(errors).filter(([, message]) => message))
}
