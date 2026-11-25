// Thin fetch wrapper: adds the bearer token, parses JSON errors into ApiError,
// and notifies the app when the server says this device's session was revoked.

const TOKEN_KEY = 'secureid.token'

export class ApiError extends Error {
  constructor(status, code, message) {
    super(message)
    this.status = status
    this.code = code
  }
}

let onSessionEnded = () => {}

/** AuthContext registers a handler that signs the user out of this device. */
export function setSessionEndedHandler(fn) {
  onSessionEnded = fn
}

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function setToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {
    /* storage unavailable (private mode) - session lasts for this tab only */
  }
}

const SESSION_END_CODES = new Set(['SESSION_REVOKED', 'SESSION_ENDED', 'SESSION_EXPIRED', 'SESSION_INVALID'])

export async function api(path, { method = 'GET', body } = {}) {
  const headers = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`

  let res
  try {
    res = await fetch(`/api${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiError(0, 'NETWORK', 'Cannot reach the server. Is the backend running on port 8080?')
  }

  if (res.status === 204) return null
  const data = await res.json().catch(() => null)

  if (!res.ok) {
    const code = data?.code ?? 'ERROR'
    const message = data?.message ?? `Request failed (${res.status})`
    // Only react if this request used the CURRENT token: a slow request made with an old token
    // (e.g. just before linking accounts or signing in again) must not sign the new session out.
    if (res.status === 401 && token && token === getToken() && SESSION_END_CODES.has(code)) {
      onSessionEnded(code, message)
    }
    throw new ApiError(res.status, code, message)
  }
  return data
}
