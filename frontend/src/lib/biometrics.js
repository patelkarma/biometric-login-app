// Face ID / Touch ID / fingerprint / Windows Hello via WebAuthn passkeys.
// The biometric check happens entirely on the device; the server only ever
// sees a public key and signatures.
import {
  browserSupportsWebAuthn,
  platformAuthenticatorIsAvailable,
  startAuthentication,
  startRegistration,
} from '@simplewebauthn/browser'
import { api } from './api'
import { getDeviceId, getDeviceName } from './device'

export function isBiometricSupported() {
  return browserSupportsWebAuthn()
}

export async function hasBuiltInBiometric() {
  try {
    return await platformAuthenticatorIsAvailable()
  } catch {
    return false
  }
}

function friendlyError(err) {
  const name = err?.name
  if (name === 'NotAllowedError' || name === 'AbortError') {
    return 'The biometric prompt was cancelled or timed out.'
  }
  if (name === 'InvalidStateError') {
    return 'Biometric login is already set up on this device.'
  }
  if (name === 'SecurityError') {
    return 'Biometrics need a secure page. Open the app at http://localhost (not an IP address).'
  }
  return err?.message || 'Biometric verification failed.'
}

/** Registers a passkey for the signed-in user. */
export async function enableBiometrics() {
  const { requestId, options } = await api('/passkeys/register/start', { method: 'POST' })
  let credential
  try {
    credential = await startRegistration({ optionsJSON: options })
  } catch (err) {
    throw new Error(friendlyError(err), { cause: err })
  }
  return api('/passkeys/register/finish', {
    method: 'POST',
    body: { requestId, credential, deviceName: getDeviceName() },
  })
}

/** Signs in with a passkey. contact is optional: without it the browser lists saved passkeys. */
export async function signInWithBiometrics(contactType, contact) {
  const body = contact ? { contactType, contact } : {}
  const { requestId, options } = await api('/auth/passkey/login/start', { method: 'POST', body })
  let credential
  try {
    credential = await startAuthentication({ optionsJSON: options })
  } catch (err) {
    throw new Error(friendlyError(err), { cause: err })
  }
  return api('/auth/passkey/login/finish', {
    method: 'POST',
    body: { requestId, credential, deviceId: getDeviceId(), deviceName: getDeviceName() },
  })
}
