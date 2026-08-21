import { Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { isAuthenticated, isAdmin } from './utils/auth'
import { ChatProvider } from './context/ChatContext'

// Pages
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import ChatPage from './pages/ChatPage'
import DocumentsPage from './pages/DocumentsPage'
import SyncPage from './pages/SyncPage'
import UsersPage from './pages/UsersPage'

// Layout
import Layout from './components/Layout'

function ProtectedRoute() {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />
  }
  return <Outlet />
}

function AdminRoute() {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />
  }
  if (!isAdmin()) {
    return <Navigate to="/chat" replace />
  }
  return <Outlet />
}

export default function App() {
  return (
    <ChatProvider>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/landing" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />

        {/* Protected routes */}
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/chat" element={<ChatPage />} />

            {/* Admin only */}
            <Route element={<AdminRoute />}>
              <Route path="/documents" element={<DocumentsPage />} />
              <Route path="/sync" element={<SyncPage />} />
              <Route path="/users" element={<UsersPage />} />
            </Route>
          </Route>
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ChatProvider>
  )
}
