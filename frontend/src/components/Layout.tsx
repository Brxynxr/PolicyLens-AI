import { Outlet } from 'react-router-dom'

export default function Layout() {
  return (
    <div className="min-h-screen bg-brand-50">
      <main>
        <Outlet />
      </main>
    </div>
  )
}
