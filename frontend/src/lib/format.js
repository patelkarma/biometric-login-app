// Date and text formatting used across screens.

const longDate = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
const shortTime = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' })
const dateTime = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' })

/** Today's date as "YYYY-MM-DD" in the user's own time zone (for <input type="date" max>). */
export function todayIso() {
  const d = new Date()
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 10)
}

/** Age in whole years for a "YYYY-MM-DD" date of birth. */
export function ageFrom(dob) {
  const birth = new Date(dob)
  const now = new Date()
  let age = now.getFullYear() - birth.getFullYear()
  const monthDiff = now.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) age--
  return age
}

/**
 * "YYYY-MM-DD" -> "10 May 2002".
 * Built from parts so the date never shifts by a day because of time zones.
 */
export function formatDob(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  return longDate.format(new Date(y, m - 1, d))
}

/** "+919876543210" -> "+91 98765 43210"; other countries are shown as stored. */
export function formatPhone(phone) {
  return phone.startsWith('+91') ? `+91 ${phone.slice(3, 8)} ${phone.slice(8)}` : phone
}

/** ISO timestamp -> "4:00 PM" */
export function formatTime(iso) {
  return shortTime.format(new Date(iso))
}

/** ISO timestamp -> "25 Nov 2026, 4:00 PM" */
export function formatDateTime(iso) {
  return dateTime.format(new Date(iso))
}

/** Seconds -> "m:ss" for countdowns. */
export function formatCountdown(seconds) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}
