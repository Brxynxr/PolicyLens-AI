import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import EyeOfHorus from './EyeOfHorus'
import { useChat } from '../context/ChatContext'

export default function Layout() {
  const { 
    isSidebarCollapsed, 
    isMobileSidebarOpen, 
    toggleSidebarCollapse, 
    toggleMobileSidebar, 
    closeMobileSidebar 
  } = useChat()

  const location = useLocation()
  const isChatPage = location.pathname === '/chat'

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#FAF8F5] text-neutral-800 font-sans">
      {/* 1. Mobile Sidebar Overlay */}
      {isMobileSidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-neutral-900/40 backdrop-blur-xs transition-opacity duration-300 md:hidden"
          onClick={closeMobileSidebar}
        />
      )}

      {/* 2. Unified Collapsible Sidebar (Desktop & Mobile Drawer) */}
      <aside 
        className={`
          fixed inset-y-0 left-0 z-50 transition-all duration-300 ease-in-out
          md:relative md:translate-x-0
          ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          ${isSidebarCollapsed ? 'md:w-0 md:overflow-hidden md:border-r-0' : 'md:w-72'}
        `}
      >
        <div className="w-72 h-full">
          <Sidebar onClose={closeMobileSidebar} />
        </div>
      </aside>

      {/* 3. Main Content Area */}
      <div className="flex flex-col flex-1 min-w-0 h-full overflow-hidden relative">
        {/* Mobile Header (Hidden on Desktop) */}
        <header className="flex items-center justify-between px-4 py-3 border-b border-[#E8E2D6] bg-[#F5F0E8] md:hidden shrink-0">
          <div className="flex items-center gap-2.5">
            <button 
              onClick={toggleMobileSidebar}
              className="p-1.5 rounded-lg border border-[#E8E2D6] bg-white text-neutral-700 hover:text-neutral-900 hover:bg-[#FAF8F5] transition-colors"
              aria-label="Abrir menú de navegación"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="flex items-center gap-2">
              <EyeOfHorus className="w-5 h-5" stroke="#9E7111" strokeWidth={2} />
              <span className="font-extrabold text-base text-neutral-900 tracking-tight">PolicyLens AI</span>
            </div>
          </div>
        </header>

        {/* Floating Sidebar Toggle Button for Desktop when Collapsed */}
        {isSidebarCollapsed && (
          <div className="hidden md:flex absolute top-3 left-4 z-30">
            <button
              onClick={toggleSidebarCollapse}
              className="p-2 rounded-xl bg-white border border-[#E8E2D6] hover:border-[#9E7111]/40 text-neutral-700 hover:text-[#9E7111] shadow-xs hover:shadow-sm transition-all flex items-center gap-2 cursor-pointer group"
              title="Expandir barra lateral"
              aria-label="Expandir barra lateral"
            >
              <svg className="w-4 h-4 text-neutral-500 group-hover:text-[#9E7111] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7" />
              </svg>
              <EyeOfHorus className="w-4 h-4" stroke="#9E7111" strokeWidth={2} />
              <span className="text-xs font-bold text-neutral-800">PolicyLens</span>
            </button>
          </div>
        )}

        {/* Dynamic Page Outlet */}
        <main className={`flex-1 overflow-y-auto focus:outline-hidden ${isChatPage ? 'p-0' : 'p-6 md:p-8'}`}>
          <div className={`${isChatPage ? 'h-full w-full' : 'max-w-6xl mx-auto h-full'}`}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
