import { isMobileDevice } from '../lib/device'
import { DeviceIcon, PhoneIcon } from './Icons'

/**
 * A row with an icon, a name, and one line of detail underneath.
 * By default the icon is a phone or laptop, guessed from the device name; pass `icon` to override.
 */
export default function DeviceRow({ name, detail, icon }) {
  const defaultIcon = isMobileDevice(name) ? <PhoneIcon width={20} height={20} /> : <DeviceIcon width={20} height={20} />
  return (
    <div className="device-row">
      <span className="device-row__icon">{icon ?? defaultIcon}</span>
      <div>
        <strong>{name}</strong>
        <span>{detail}</span>
      </div>
    </div>
  )
}
