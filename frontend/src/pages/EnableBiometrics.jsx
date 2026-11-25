import { useLocation, useNavigate } from 'react-router-dom'
import AuthLayout from '../components/AuthLayout'
import { FaceIdIcon, FingerprintIcon } from '../components/Icons'
import { Alert, Button } from '../components/ui'
import { useAuth } from '../context/useAuth'
import { useAsyncAction } from '../hooks/useAsyncAction'
import { enableBiometrics } from '../lib/biometrics'
import { getBiometricName, getPlatform, isMobileDevice } from '../lib/device'

// The biometric options shown in the green panel; the one matching this device is highlighted.
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
  const { busy, error, run } = useAsyncAction()
  const state = location.state ?? {}
  const platform = getPlatform()
  const isPhone = isMobileDevice(platform)

  function enable() {
    run(async () => {
      await enableBiometrics()
      await refresh()
      navigate('/dashboard', { replace: true, state: { ...state, biometricsEnabled: true } })
    })
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

        <Alert>{error}</Alert>

        <div className="actions">
          <Button block loading={busy} onClick={enable} disabled={busy}>
            {isPhone ? 'Enable Face ID' : 'Enable biometrics'}
          </Button>
          <Button
            variant="outline"
            block
            onClick={() => navigate('/dashboard', { replace: true, state })}
            disabled={busy}
          >
            Skip for now
          </Button>
        </div>
      </div>
    </AuthLayout>
  )
}
