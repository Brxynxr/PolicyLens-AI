import { Routes, Route, Navigate, Outlet } from 'react-router-dom'

// Pages
import LoginPage from './pages/LoginPage'
import ChatPage from './pages/ChatPage'
import DocumentsPage from './pages/DocumentsPage'
import SyncPage from './pages/SyncPage'
import UsersPage from './pages/UsersPage'

// Layout
import Layout from './components/Layout'
import { isAuthenticated, isAdmin } from './utils/auth'

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
    <Routes>
      {/* Public */}
      <Route path="/login" element={<LoginPage />} />

      {/* Protected routes */}
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Navigate to="/chat" replace />} />
          <Route path="/chat" element={<ChatPage />} />

          {/* Admin only */}
          <Route element={<AdminRoute />}>
            <Route path="/documents" element={<DocumentsPage />} />
            <Route path="/sync" element={<SyncPage />} />
            <Route path="/users" element={<UsersPage />} />
          </Route>
        </Route>
      </Route>
    </Routes>
  )
}
