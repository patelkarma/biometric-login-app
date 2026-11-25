// Keeps "which email/phone are we verifying" across a page refresh on /verify.
const KEY = 'secureid.pendingOtp'

export function savePendingOtp(data) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ ...data, sentAt: Date.now() }))
  } catch {
    /* ignore */
  }
}

export function loadPendingOtp() {
  try {
    return JSON.parse(sessionStorage.getItem(KEY))
  } catch {
    return null
  }
}

export function clearPendingOtp() {
  try {
    sessionStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
}
