// Identifies "this device" for the one-active-device rule.
// The id is random, created once and kept in localStorage, so a different
// browser, browser profile or incognito window counts as a different device.

const DEVICE_KEY = 'secureid.deviceId'

export function getDeviceId() {
  try {
    let id = localStorage.getItem(DEVICE_KEY)
    if (!id) {
      id = crypto.randomUUID()
      localStorage.setItem(DEVICE_KEY, id)
    }
    return id
  } catch {
    return 'session-' + Math.random().toString(36).slice(2)
  }
}

export function getPlatform() {
  const ua = navigator.userAgent
  if (/iPhone|iPod/.test(ua)) return 'iPhone'
  if (/iPad/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return 'iPad'
  if (/Android/.test(ua)) return 'Android'
  if (/Windows/.test(ua)) return 'Windows'
  if (/Macintosh|Mac OS X/.test(ua)) return 'Mac'
  if (/Linux/.test(ua)) return 'Linux'
  return 'Unknown OS'
}

/**
 * True for phones and tablets. Accepts a platform ("iPhone") or a device name
 * ("Safari on iPhone"); defaults to this browser's platform.
 */
export function isMobileDevice(platformOrName = getPlatform()) {
  return /iPhone|iPad|Android/.test(platformOrName)
}

function getBrowser() {
  const ua = navigator.userAgent
  if (/Edg\//.test(ua)) return 'Edge'
  if (/OPR\//.test(ua)) return 'Opera'
  if (/Firefox\//.test(ua)) return 'Firefox'
  if (/SamsungBrowser/.test(ua)) return 'Samsung Internet'
  if (/Chrome\//.test(ua)) return 'Chrome'
  if (/Safari\//.test(ua)) return 'Safari'
  return 'Browser'
}

/** e.g. "Chrome on Windows" */
export function getDeviceName() {
  return `${getBrowser()} on ${getPlatform()}`
}

/** Friendly name of the biometric this device most likely uses. */
export function getBiometricName() {
  switch (getPlatform()) {
    case 'iPhone':
    case 'iPad':
      return 'Face ID / Touch ID'
    case 'Mac':
      return 'Touch ID'
    case 'Windows':
      return 'Windows Hello'
    case 'Android':
      return 'Fingerprint / Face unlock'
    default:
      return 'Biometrics'
  }
}
