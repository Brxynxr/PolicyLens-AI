import { NavLink } from 'react-router-dom'

interface SidebarProps {
  onClose?: () => void
}

export default function Sidebar({ onClose }: SidebarProps) {
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
    }
  ]

  return (
    <div className="flex flex-col h-full bg-brand-100 border-r border-brand-200 w-64 text-neutral-800">
      {/* Brand Header */}
      <div className="p-6 border-b border-brand-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gold-500 flex items-center justify-center text-white font-bold shadow-md shadow-gold-500/20">
            PL
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight tracking-tight text-neutral-900">PolicyLens</h1>
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
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onClose}
            className={({ isActive }) => `
              flex items-center gap-3.5 px-4 py-3 rounded-xl font-medium text-sm transition-all duration-300 group
              ${isActive 
                ? 'bg-white text-gold-700 shadow-sm border border-brand-200/50 translate-x-1' 
                : 'text-neutral-600 hover:bg-brand-200/60 hover:text-neutral-900'}
            `}
          >
            {({ isActive }) => (
              <>
                <span className={`transition-colors duration-300 ${isActive ? 'text-gold-500' : 'text-neutral-400 group-hover:text-neutral-600'}`}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
                {isActive && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-gold-500" />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer Info */}
      <div className="p-4 border-t border-brand-200 bg-brand-50/50">
        <div className="flex items-center gap-3 px-2 py-1.5 rounded-xl border border-dashed border-brand-200/80 bg-white/40">
          <div className="w-2.5 h-2.5 rounded-full bg-success animate-pulse" />
          <div className="text-xs">
            <p className="font-semibold text-neutral-700">Sistema Activo</p>
            <p className="text-neutral-400">Versión 1.0 (Académico)</p>
          </div>
        </div>
      </div>
    </div>
  )
}
