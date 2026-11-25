import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { api, getToken, setSessionEndedHandler, setToken } from '../lib/api'
import { AuthContext } from './useAuth'

const HEARTBEAT_MS = 5000

export function AuthProvider({ children }) {
  const [token, setTokenState] = useState(() => getToken())
  const [me, setMe] = useState(null)
  // Why this device's session ended ({ code, message }), so the route guard can show the right screen.
  const [sessionEnded, setSessionEnded] = useState(null)
  const endedRef = useRef(false)

  const clearLocal = useCallback(() => {
    setToken(null)
    setTokenState(null)
    setMe(null)
  }, [])

  // Any API call answered with SESSION_REVOKED (another device signed in) lands here.
  // We only clear local state; <RequireAuth> then redirects to /signed-out or /login.
  useEffect(() => {
    setSessionEndedHandler((code, message) => {
      if (endedRef.current) return
      endedRef.current = true
      setSessionEnded({ code, message })
      clearLocal()
    })
  }, [clearLocal])

  const refresh = useCallback(async () => {
    const data = await api('/me')
    setMe(data)
    return data
  }, [])

  // Load the profile whenever we have a token.
  useEffect(() => {
    if (!token) return
    refresh().catch(() => {})
  }, [token, refresh])

  // Heartbeat: notices within a few seconds when this account signs in on another device.
  useEffect(() => {
    if (!token) return
    const beat = () => api('/session/heartbeat').catch(() => {})
    const id = setInterval(beat, HEARTBEAT_MS)
    const onVisible = () => document.visibilityState === 'visible' && beat()
    window.addEventListener('focus', beat)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(id)
      window.removeEventListener('focus', beat)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [token])

  /** Called with the LoginResponse from code or biometric sign-in. */
  const completeLogin = useCallback((loginResponse) => {
    endedRef.current = false
    setSessionEnded(null)
    setToken(loginResponse.token)
    setTokenState(loginResponse.token)
  }, [])

  const logout = useCallback(async () => {
    try {
      await api('/session/logout', { method: 'POST' })
    } catch {
      /* already signed out on the server */
    }
    setSessionEnded(null)
    clearLocal()
  }, [clearLocal])

  const value = useMemo(
    () => ({ token, me, sessionEnded, isAuthenticated: !!token, completeLogin, logout, refresh }),
    [token, me, sessionEnded, completeLogin, logout, refresh],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
