import { useState, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { isAdmin } from '../utils/auth'
import { listarDocumentos } from '../services/documents'

interface SidebarProps {
  onClose?: () => void
}

export default function Sidebar({ onClose }: SidebarProps) {
  const navigate = useNavigate()
  const userName = localStorage.getItem('user_name') || 'Usuario'
  const userRole = localStorage.getItem('user_role') || 'empleado'
  const admin = isAdmin()
  const [docCount, setDocCount] = useState(0)

  useEffect(() => {
    if (admin) {
      listarDocumentos().then(res => setDocCount(res.total)).catch(() => {})
    }
  }, [admin])

  const navItems = [
    {
      to: '/chat',
      label: 'Consultas RAG',
      icon: (
        <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      )
    },
    ...(admin ? [
      {
        to: '/documents',
        label: 'Documentos',
        badge: docCount > 0 ? String(docCount) : null,
        icon: (
          <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        )
      },
      {
        to: '/sync',
        label: 'Sincronizacion',
        icon: (
          <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        )
      },
      {
        to: '/users',
        label: 'Usuarios',
        icon: (
          <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
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
    <div className="flex flex-col h-full bg-brand-800 w-64 text-white shadow-xl shadow-brand-900/30">
      {/* Brand Header */}
      <div className="p-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-700 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-purple-700/30 transition-all duration-200 hover:scale-105">
            RP
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight tracking-tight text-white">Riwi<span className="text-purple-400">PolicyLens</span></h1>
            <span className="text-xs font-semibold uppercase tracking-wider text-purple-300">AI Platform</span>
          </div>
        </div>
        {onClose && (
          <button 
            onClick={onClose}
            className="md:hidden p-2 rounded-lg hover:bg-brand-700 text-brand-300 hover:text-white transition-all duration-200"
            aria-label="Cerrar menu"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-2">
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
                flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 group
                ${isActive 
                  ? 'bg-purple-700 text-white shadow-lg shadow-purple-700/25' 
                  : 'text-slate-300 hover:text-white hover:bg-white/5'}
              `}
            >
              {({ isActive }) => (
                <>
                  <div className="flex items-center gap-3">
                    <span className={`${isActive ? 'text-white' : 'text-slate-400'}`}>
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </div>
                  {item.badge ? (
                    <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded-md font-bold">{item.badge}</span>
                  ) : isActive ? (
                    <span className="h-2 w-2 rounded-full bg-white"></span>
                  ) : null}
                </>
              )}
            </NavLink>
          </div>
        ))}
      </nav>

      {/* Footer: User info + Logout */}
      <div className="border-t border-white/10 pt-4 space-y-3 px-4">
        <div className="flex items-center gap-3 px-2 py-2 rounded-xl bg-white/5 border border-white/10">
          <div className="w-9 h-9 rounded-lg bg-purple-700 text-white flex items-center justify-center font-bold text-xs shadow-sm">
            {userName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold truncate text-white">{userName}</p>
            <span className="text-[10px] font-bold text-purple-300 uppercase tracking-wider">{userRole}</span>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-rose-300 hover:text-white hover:bg-rose-500/20 transition-all"
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
