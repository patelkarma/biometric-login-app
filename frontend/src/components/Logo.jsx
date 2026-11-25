import { ShieldIcon } from './Icons'

export default function Logo() {
  return (
    <div className="logo">
      <span className="logo__mark">
        <ShieldIcon width={16} height={16} />
      </span>
      SecureID
    </div>
  )
}
