import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import AuthLayout from '../components/AuthLayout'
import { FaceIdIcon, FingerprintIcon } from '../components/Icons'
import { useAuth } from '../context/useAuth'
import { enableBiometrics } from '../lib/biometrics'
import { getBiometricName } from '../lib/device'

export default function EnableBiometrics() {
  const navigate = useNavigate()
  const location = useLocation()
  const { refresh } = useAuth()
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const state = location.state ?? {}

  async function enable() {
    setBusy(true)
    setError(null)
    try {
      await enableBiometrics()
      await refresh()
      navigate('/dashboard', { replace: true, state: { ...state, biometricsEnabled: true } })
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthLayout>
      <div className="bio-hero">
        <div className="bio-hero__ring">
          <FaceIdIcon width={44} height={44} />
          <FingerprintIcon width={44} height={44} />
        </div>
      </div>
      <header className="form-head center">
        <h2>Sign in faster next time</h2>
        <p>
          Use Face ID, fingerprint or Windows Hello instead of waiting for a code. On this device that&apos;s{' '}
          <strong>{getBiometricName()}</strong>.
        </p>
      </header>

      <ul className="bullets">
        <li>Your face or fingerprint never leaves this device.</li>
        <li>We only store a public key - nothing that can be used to sign in elsewhere.</li>
        <li>You can remove it any time from your dashboard.</li>
      </ul>

      {error && (
        <div className="alert alert--error" role="alert">
          {error}
        </div>
      )}

      <button className="btn btn--primary btn--block" onClick={enable} disabled={busy}>
        {busy ? <span className="spinner" /> : <FingerprintIcon />}
        Enable biometrics
      </button>
      <button
        className="btn btn--ghost btn--block"
        onClick={() => navigate('/dashboard', { replace: true, state })}
        disabled={busy}
      >
        Skip for now
      </button>
    </AuthLayout>
  )
}
