import { Routes, Route, Navigate } from 'react-router-dom'

// Pages (to be implemented)
import ChatPage from './pages/ChatPage'
import DocumentsPage from './pages/DocumentsPage'
import SyncPage from './pages/SyncPage'

// Layout
import Layout from './components/Layout'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Navigate to="/chat" replace />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/documents" element={<DocumentsPage />} />
        <Route path="/sync" element={<SyncPage />} />
      </Route>
    </Routes>
  )
}
