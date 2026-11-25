import { useState } from 'react'
import { FaceIdIcon, FingerprintIcon, PlusIcon, TrashIcon } from '../components/Icons'
import { Alert, Button } from '../components/ui'
import { useAuth } from '../context/useAuth'
import { useAsyncAction } from '../hooks/useAsyncAction'
import { api } from '../lib/api'
import { enableBiometrics, isBiometricSupported } from '../lib/biometrics'
import { getBiometricName } from '../lib/device'
import { formatDateTime } from '../lib/format'

/** Biometrics: list, add and remove the Face ID / fingerprint logins (passkeys) of this account. */
export default function Biometrics() {
  const { me, refresh } = useAuth()
  const { passkeys } = me
  const supported = isBiometricSupported()
  const [notice, setNotice] = useState(null)
  // busy: false | true (adding) | 'remove'. Only adding shows the spinner.
  const { busy, error, run } = useAsyncAction()

  function addPasskey() {
    setNotice(null)
    run(async () => {
      await enableBiometrics()
      await refresh()
      setNotice('Biometric sign-in is now enabled on this device.')
    })
  }

  function removePasskey(id) {
    setNotice(null)
    run(
      async () => {
        await api(`/passkeys/${id}`, { method: 'DELETE' })
        await refresh()
        setNotice('Biometric login removed.')
      },
      { busyKey: 'remove' },
    )
  }

  return (
    <>
      <header className="dash__head">
        <h1>Biometric logins</h1>
        <p>Sign in with Face ID, fingerprint or Windows Hello instead of a code.</p>
      </header>

      <Alert type="success" className="dash__banner">
        {notice}
      </Alert>

      <div className="dash__grid">
        <section className="tile">
          <div className="tile__head">
            <h2 className="tile__title">Your biometric logins</h2>
            {supported && (
              <Button
                size="sm"
                icon={<PlusIcon width={16} height={16} />}
                loading={busy === true}
                onClick={addPasskey}
                disabled={busy === true}
              >
                Add
              </Button>
            )}
          </div>

          {passkeys.length === 0 ? (
            <div className="empty">
              <FaceIdIcon width={28} height={28} />
              <p>No biometric login yet. Add Face ID, fingerprint or Windows Hello to sign in without a code.</p>
            </div>
          ) : (
            <ul className="passkeys">
              {passkeys.map((p) => (
                <li key={p.id}>
                  <FingerprintIcon width={22} height={22} />
                  <div>
                    <strong>{p.deviceName}</strong>
                    <span>
                      Added {formatDateTime(p.createdAt)}
                      {p.lastUsedAt && ` · used ${formatDateTime(p.lastUsedAt)}`}
                    </span>
                  </div>
                  <button
                    className="icon-btn"
                    onClick={() => removePasskey(p.id)}
                    disabled={busy === 'remove'}
                    aria-label={`Remove biometric login for ${p.deviceName}`}
                  >
                    <TrashIcon width={16} height={16} />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <Alert>{error}</Alert>
        </section>

        <section className="tile">
          <h2 className="tile__title">On this device</h2>
          <div className="device-row">
            <span className="device-row__icon">
              <FingerprintIcon width={20} height={20} />
            </span>
            <div>
              <strong>{supported ? getBiometricName() : 'Not available'}</strong>
              <span>{supported ? 'Supported by this browser' : 'This browser cannot use biometrics — use a 6-digit code.'}</span>
            </div>
          </div>
          <ul className="how how--plain">
            <li>
              <strong>Your biometric stays on your device</strong>
              <span>Your face or fingerprint is checked by the device itself. We only store a public key.</span>
            </li>
            <li>
              <strong>One per device</strong>
              <span>Add a biometric login on each phone or computer you use.</span>
            </li>
            <li>
              <strong>Removing one</strong>
              <span>After removing, that device signs in with a 6-digit code until you add it again.</span>
            </li>
          </ul>
        </section>
      </div>
    </>
  )
}
