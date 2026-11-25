import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import AuthLayout from '../components/AuthLayout'
import { FaceIdIcon, FingerprintIcon } from '../components/Icons'
import { useAuth } from '../context/useAuth'
import { enableBiometrics } from '../lib/biometrics'
import { getBiometricName, getPlatform } from '../lib/device'

const TYPES = [
  { name: 'Face ID', where: 'iPhone · iPad', platforms: ['iPhone', 'iPad'] },
  { name: 'Touch ID', where: 'Mac', platforms: ['Mac'] },
  { name: 'Fingerprint', where: 'Android', platforms: ['Android'] },
  { name: 'Windows Hello', where: 'Windows', platforms: ['Windows'] },
]

export default function EnableBiometrics() {
  const navigate = useNavigate()
  const location = useLocation()
  const { refresh } = useAuth()
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const state = location.state ?? {}
  const platform = getPlatform()
  const isPhone = ['iPhone', 'iPad', 'Android'].includes(platform)

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
    <AuthLayout
      step={state.flow === 'signup' ? 3 : undefined}
      title={
        <>
          Works with the
          <br />
          biometrics you have.
        </>
      }
      extra={
        <div className="bio-types">
          {TYPES.map((t) => {
            const here = t.platforms.includes(platform)
            return (
              <div key={t.name} className={`bio-types__item ${here ? 'is-here' : ''}`}>
                <strong>{t.name}</strong>
                <span>{here ? 'This device' : t.where}</span>
              </div>
            )
          })}
        </div>
      }
    >
      <div className="center-stack">
        <div className="ring">
          {isPhone ? <FaceIdIcon width={54} height={54} /> : <FingerprintIcon width={54} height={54} />}
        </div>
        <header className="form-head form-head--center">
          <h2>Sign in faster next time</h2>
          <p>
            Skip the code and use <strong>{getBiometricName()}</strong>. Your biometric never leaves this device — we
            only keep a public key.
          </p>
        </header>

        {error && (
          <div className="alert alert--error" role="alert">
            {error}
          </div>
        )}

        <div className="actions">
          <button className="btn btn--primary btn--block" onClick={enable} disabled={busy}>
            {busy && <span className="spinner" />}
            {isPhone ? 'Enable Face ID' : 'Enable biometrics'}
          </button>
          <button
            className="btn btn--outline btn--block"
            onClick={() => navigate('/dashboard', { replace: true, state })}
            disabled={busy}
          >
            Skip for now
          </button>
        </div>
      </div>
    </AuthLayout>
  )
}
