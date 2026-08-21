import { NavLink, useNavigate } from 'react-router-dom'
import { isAdmin } from '../App'

interface SidebarProps {
  onClose?: () => void
}

export default function Sidebar({ onClose }: SidebarProps) {
  const navigate = useNavigate()
  const userName = localStorage.getItem('user_name') || 'Usuario'
  const userRole = localStorage.getItem('user_role') || 'empleado'
  const admin = isAdmin()

  const navItems = [
    {
      to: '/chat',
      label: 'Consultas RAG',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      )
    },
    ...(admin ? [
      {
        to: '/documents',
        label: 'Documentos',
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 01-2-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        )
      },
      {
        to: '/sync',
        label: 'Sincronización',
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89M9 11l3-3 3 3m-3-3v12" />
          </svg>
        )
      },
      {
        to: '/users',
        label: 'Usuarios',
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        )
      }
    ] : [])
  ]

  const handleLogout = () => {
    localStorage.removeItem('user_id')
    localStorage.removeItem('user_role')
    localStorage.removeItem('user_name')
    navigate('/login', { replace: true })
  }

  return (
    <div className="flex flex-col h-full bg-brand-100 border-r border-brand-200 w-64 text-neutral-800">
      {/* Brand Header */}
      <div className="p-6 border-b border-brand-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gold-500 flex items-center justify-center text-white font-bold shadow-md shadow-gold-500/20">
            RP
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight tracking-tight text-neutral-900">RiwiPolicylens</h1>
            <span className="text-xs font-semibold uppercase tracking-wider text-gold-600">AI Platform</span>
          </div>
        </div>
        {onClose && (
          <button 
            onClick={onClose}
            className="md:hidden p-1.5 rounded-lg hover:bg-brand-200 text-neutral-500 hover:text-neutral-800 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1.5">
        {navItems.map((item, index) => (
          <div 
            key={item.to}
            className="animate-fade-in-right"
            style={{ animationDelay: `${index * 80}ms` }}
          >
            <NavLink
              to={item.to}
              onClick={onClose}
              className={({ isActive }) => `
                flex items-center gap-3.5 px-4 py-3 rounded-xl font-medium text-sm transition-all duration-300 group border border-transparent
                ${isActive 
                  ? 'bg-white text-gold-700 shadow-sm border-brand-200/50 translate-x-1.5' 
                  : 'text-neutral-600 hover:bg-white hover:text-neutral-900 hover:shadow-2xs hover:border-brand-200/30 hover:translate-x-1'}
              `}
            >
              {({ isActive }) => (
                <>
                  <span className={`transition-all duration-300 transform group-hover:scale-110 ${isActive ? 'text-gold-500' : 'text-neutral-400 group-hover:text-gold-600'}`}>
                    {item.icon}
                  </span>
                  <span className="transition-transform duration-300 group-hover:translate-x-0.5">{item.label}</span>
                  {isActive && (
                    <span className="ml-auto w-1.5 h-1.5 rounded-full bg-gold-500 animate-pulse" />
                  )}
                </>
              )}
            </NavLink>
          </div>
        ))}
      </nav>

      {/* Footer: User info + Logout */}
      <div className="p-4 border-t border-brand-200 bg-brand-50/50">
        <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white/60 border border-brand-200/60 mb-2">
          <div className="w-8 h-8 rounded-lg bg-gold-100 border border-gold-200 flex items-center justify-center text-gold-700 font-bold text-xs">
            {userName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-neutral-800 truncate">{userName}</p>
            <p className="text-2xs font-semibold text-neutral-400 uppercase tracking-wider">{userRole}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 hover:text-red-700 border border-transparent hover:border-red-200 transition-all"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Cerrar Sesion
        </button>
      </div>
    </div>
  )
}
