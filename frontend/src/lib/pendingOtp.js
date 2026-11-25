// Remembers which email/phone is being verified, so /verify survives a page refresh.
// Kept in sessionStorage: it disappears when the tab is closed.
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
