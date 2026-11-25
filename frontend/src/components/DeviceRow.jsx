import { isMobileDevice } from '../lib/device'
import { DeviceIcon, PhoneIcon } from './Icons'

/** A device with a phone or laptop icon, its name, and one line of detail underneath. */
export default function DeviceRow({ name, detail }) {
  return (
    <div className="device-row">
      <span className="device-row__icon">
        {isMobileDevice(name) ? <PhoneIcon width={20} height={20} /> : <DeviceIcon width={20} height={20} />}
      </span>
      <div>
        <strong>{name}</strong>
        <span>{detail}</span>
      </div>
    </div>
  )
}
