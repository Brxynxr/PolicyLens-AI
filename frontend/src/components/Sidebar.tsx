import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { isAdmin } from '../utils/auth'
import { useChat } from '../context/ChatContext'
import BrandIcon from './BrandIcon'

interface SidebarProps {
  onClose?: () => void
}

export default function Sidebar({ onClose }: SidebarProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const userName = localStorage.getItem('user_name') || 'Breyner'
  const userRole = localStorage.getItem('user_role') || 'empleado'
  const admin = isAdmin()

  const {
    conversations,
    activeConv,
    listLoading,
    handleNewChat,
    handleSelectChat,
    handleDeleteChat,
    toggleSidebarCollapse
  } = useChat()

  const handleLogout = () => {
    localStorage.removeItem('user_id')
    localStorage.removeItem('user_role')
    localStorage.removeItem('user_name')
    navigate('/login', { replace: true })
  }

  const formatChatTitle = (conv: any) => {
    const firstMsg = conv.messages?.find((m: any) => m.role === 'user')
    if (firstMsg && firstMsg.content) {
      return firstMsg.content.length > 26 ? `${firstMsg.content.slice(0, 24)}...` : firstMsg.content
    }
    return `Consulta #${conv.id}`
  }

  const isFreshChat = !activeConv || !activeConv.messages || activeConv.messages.length === 0

  const adminNavItems = [
    {
      to: '/documents',
      label: 'Documentos',
      icon: (
        <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 01-2-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )
    },
    {
      to: '/sync',
      label: 'Sincronización',
      icon: (
        <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89M9 11l3-3 3 3m-3-3v12" />
        </svg>
      )
    },
    {
      to: '/users',
      label: 'Usuarios',
      icon: (
        <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      )
    },
    {
      to: '/chat',
      label: 'Consultas RAG',
      icon: (
        <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      )
    }
  ]

  return (
    <div className="flex flex-col h-full bg-[#F5F0E8] border-r border-[#E8E2D6] w-72 text-neutral-800 select-none">
      {/* 1. Header: Brand logo + PolicyLens title + collapse toggle */}
      <div className="p-4 sm:p-5 border-b border-[#E8E2D6] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center shadow-xs">
            <BrandIcon className="w-8 h-8 rounded-lg shadow-sm" />
          </div>
          <div>
            <h1 className="font-extrabold text-base leading-tight tracking-tight text-neutral-900 flex items-center gap-1.5">
              <span>PolicyLens</span>
              <span className="text-3xs font-black uppercase text-[#9E7111] bg-[#FAF8F5] px-1.5 py-0.5 rounded border border-[#E8E2D6]">
                AI
              </span>
            </h1>
            <span className="text-3xs font-semibold text-neutral-500 block">
              {admin ? 'Panel de Administración' : 'Navegador Inteligente'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* Desktop Collapse Button */}
          <button 
            onClick={toggleSidebarCollapse}
            className="hidden md:flex p-1.5 rounded-lg hover:bg-white text-neutral-500 hover:text-neutral-900 border border-transparent hover:border-[#E8E2D6] transition-all cursor-pointer"
            title="Ocultar barra lateral"
            aria-label="Ocultar barra lateral"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          </button>

          {/* Mobile Close Button */}
          {onClose && (
            <button 
              onClick={onClose}
              className="md:hidden p-1.5 rounded-lg hover:bg-white text-neutral-500 hover:text-neutral-800 transition-colors cursor-pointer"
              aria-label="Cerrar menú"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* 2. Admin Modules Navigation (Only for Admin Role) */}
      {admin && (
        <div className="p-3 border-b border-[#E8E2D6]/80 space-y-1">
          <p className="px-2 text-3xs font-extrabold uppercase tracking-wider text-neutral-400 mb-1.5">
            Administración
          </p>
          <div className="space-y-0.5">
            {adminNavItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onClose}
                className={({ isActive }) => `
                  flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-200 border
                  ${isActive 
                    ? 'bg-white/95 backdrop-blur-xs text-neutral-900 font-bold border-[#E8E2D6] border-l-4 border-l-[#9E7111] shadow-xs' 
                    : 'bg-transparent border-transparent text-neutral-600 hover:bg-white/60 hover:border-[#E8E2D6]/70 hover:text-neutral-900'}
                `}
              >
                {({ isActive }) => (
                  <>
                    <span className={`transition-colors ${isActive ? 'text-[#9E7111]' : 'text-neutral-400'}`}>
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                    {isActive && (
                      <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#9E7111]" />
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </div>
      )}

      {/* 3. Action Area: + Nueva Consulta Button */}
      <div className="p-3">
        <button
          onClick={handleNewChat}
          disabled={isFreshChat && location.pathname === '/chat'}
          className={`
            w-full py-2.5 px-3.5 rounded-xl text-xs font-bold transition-all duration-200 flex items-center justify-between group
            ${isFreshChat && location.pathname === '/chat'
              ? 'bg-transparent border border-transparent text-neutral-400 opacity-60 cursor-not-allowed'
              : 'bg-white/50 border border-transparent hover:border-[#E8E2D6] hover:bg-white text-neutral-700 hover:text-[#9E7111] shadow-2xs hover:shadow-sm cursor-pointer'}
          `}
          title={isFreshChat && location.pathname === '/chat' ? 'Ya estás en una consulta nueva' : 'Crear una nueva consulta'}
        >
          <div className="flex items-center gap-2.5">
            <span className={`w-5 h-5 rounded-lg flex items-center justify-center font-bold text-sm transition-transform ${isFreshChat && location.pathname === '/chat' ? 'bg-[#E8E2D6]/40 text-neutral-400' : 'bg-[#FAF8F5] border border-[#E8E2D6] text-[#9E7111] group-hover:scale-110'}`}>
              +
            </span>
            <span className={isFreshChat && location.pathname === '/chat' ? 'text-neutral-400 font-semibold' : 'text-neutral-900 font-bold'}>
              Nueva Consulta
            </span>
          </div>
          {(!isFreshChat || location.pathname !== '/chat') && (
            <svg className="w-3.5 h-3.5 text-neutral-400 group-hover:text-[#9E7111] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          )}
        </button>
      </div>

      {/* 4. Middle Scroll Area: Recents History List */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
        <div className="flex items-center justify-between px-2 py-1 mb-1">
          <span className="text-3xs font-extrabold uppercase tracking-wider text-neutral-400">
            Recientes ({conversations.length})
          </span>
        </div>

        <div className="space-y-1">
          {listLoading ? (
            <div className="px-3 py-6 text-center text-xs text-neutral-400 animate-pulse">
              Cargando historial...
            </div>
          ) : conversations.length === 0 ? (
            <div className="px-3 py-6 text-center text-xs text-neutral-400 italic">
              Sin consultas recientes
            </div>
          ) : (
            conversations.map((conv) => {
              const isActive = activeConv?.id === conv.id && location.pathname === '/chat'

              return (
                <div
                  key={conv.id}
                  onClick={() => handleSelectChat(conv.id)}
                  className={`
                    group flex items-center justify-between px-3 py-2.5 rounded-xl text-xs cursor-pointer transition-all duration-200
                    ${isActive 
                      ? 'bg-white/95 backdrop-blur-xs text-neutral-900 font-bold border border-[#E8E2D6] border-l-4 border-l-[#9E7111] shadow-xs' 
                      : 'bg-transparent border border-transparent text-neutral-600 hover:bg-white/60 hover:border-[#E8E2D6]/70 hover:text-neutral-900'}
                  `}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <svg 
                      className={`w-3.5 h-3.5 shrink-0 transition-colors ${isActive ? 'text-[#9E7111]' : 'text-neutral-400 group-hover:text-neutral-600'}`} 
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor" 
                      strokeWidth="2"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                    <span className="truncate">{formatChatTitle(conv)}</span>
                  </div>

                  <button
                    onClick={(e) => handleDeleteChat(e, conv.id)}
                    className="p-1 rounded-md text-neutral-400 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all shrink-0 cursor-pointer"
                    title="Eliminar consulta"
                    aria-label="Eliminar consulta"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* 5. Footer: User Identity Capsule + Logout Button */}
      <div className="p-3 border-t border-[#E8E2D6] bg-[#FAF8F5]/80">
        <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-white border border-[#E8E2D6] shadow-2xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-[#F5F0E8] border border-[#E8E2D6] flex items-center justify-center text-[#9E7111] font-bold text-xs shrink-0">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-neutral-900 truncate">{userName}</p>
              <span className="inline-block text-3xs font-extrabold uppercase tracking-wider text-[#9E7111] bg-[#FAF8F5] px-1.5 py-0.2 rounded border border-[#E8E2D6]">
                {userRole}
              </span>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-100 transition-all cursor-pointer shrink-0"
            title="Cerrar sesión"
            aria-label="Cerrar sesión"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
