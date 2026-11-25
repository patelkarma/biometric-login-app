import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './context/useAuth'
import Dashboard from './pages/Dashboard'
import EnableBiometrics from './pages/EnableBiometrics'
import Login from './pages/Login'
import SignedOut from './pages/SignedOut'
import SignUp from './pages/SignUp'
import VerifyCode from './pages/VerifyCode'

function RequireAuth({ children }) {
  const { isAuthenticated, sessionEnded } = useAuth()
  if (isAuthenticated) return children
  if (sessionEnded?.code === 'SESSION_REVOKED') {
    return <Navigate to="/signed-out" replace state={{ message: sessionEnded.message }} />
  }
  return <Navigate to="/login" replace state={sessionEnded ? { notice: sessionEnded.message } : undefined} />
}

function GuestOnly({ children }) {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : children
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<GuestOnly><Login /></GuestOnly>} />
      <Route path="/signup" element={<GuestOnly><SignUp /></GuestOnly>} />
      {/* No GuestOnly here: after a successful code the page itself decides where to go next. */}
      <Route path="/verify" element={<VerifyCode />} />
      <Route path="/signed-out" element={<SignedOut />} />
      <Route path="/enable-biometrics" element={<RequireAuth><EnableBiometrics /></RequireAuth>} />
      <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}
