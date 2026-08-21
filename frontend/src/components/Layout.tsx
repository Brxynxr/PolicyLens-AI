import { Outlet, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Sidebar from './Sidebar'
import BrandIcon from './BrandIcon'
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
      {/* 1. Mobile Sidebar Overlay with AnimatePresence */}
      <AnimatePresence>
        {isMobileSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="fixed inset-0 z-40 bg-neutral-900/40 backdrop-blur-xs md:hidden"
            onClick={closeMobileSidebar}
          />
        )}
      </AnimatePresence>

      {/* 2. Unified Collapsible Sidebar (Desktop & Mobile Drawer) */}
      <aside 
        className={`
          fixed inset-y-0 left-0 z-50 transition-all duration-300 ease-in-out shrink-0 overflow-hidden
          md:relative md:translate-x-0
          ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          ${isSidebarCollapsed ? 'md:w-0 md:border-r-0 md:opacity-0 pointer-events-none md:pointer-events-none' : 'md:w-72 md:opacity-100'}
        `}
      >
        <div 
          className={`w-72 h-full transition-opacity duration-200 ease-in-out ${isSidebarCollapsed ? 'opacity-0' : 'opacity-100'}`}
        >
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
              className="p-1.5 rounded-lg border border-[#E8E2D6] bg-white text-neutral-700 hover:text-neutral-900 hover:bg-[#FAF8F5] transition-colors cursor-pointer"
              aria-label="Abrir menú de navegación"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="flex items-center gap-2">
              <BrandIcon className="w-6 h-6 rounded-md shadow-xs" />
              <span className="font-extrabold text-base text-neutral-900 tracking-tight">PolicyLens AI</span>
            </div>
          </div>
        </header>

        {/* Floating Sidebar Toggle Button for Desktop when Collapsed in Chat */}
        {isChatPage && isSidebarCollapsed && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="hidden md:flex absolute top-3 left-4 z-30"
          >
            <button
              onClick={toggleSidebarCollapse}
              className="p-2 rounded-xl bg-white/90 backdrop-blur-xs border border-[#E8E2D6] hover:border-[#9E7111]/40 text-neutral-700 hover:text-[#9E7111] shadow-xs hover:shadow-sm transition-all flex items-center justify-center cursor-pointer group"
              title="Expandir barra lateral"
              aria-label="Expandir barra lateral"
            >
              <svg className="w-4 h-4 text-neutral-500 group-hover:text-[#9E7111] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7" />
              </svg>
            </button>
          </motion.div>
        )}

        {/* Desktop Header for non-chat pages when sidebar is collapsed */}
        {!isChatPage && isSidebarCollapsed && (
          <motion.header 
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="hidden md:flex items-center gap-3 px-6 py-3 border-b border-[#E8E2D6] bg-[#F5F0E8]/60 shrink-0"
          >
            <button
              onClick={toggleSidebarCollapse}
              className="p-1.5 rounded-lg border border-[#E8E2D6] bg-white hover:bg-[#FAF8F5] text-neutral-600 hover:text-neutral-900 transition-all cursor-pointer"
              title="Expandir barra lateral"
              aria-label="Expandir barra lateral"
            >
              <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7" />
              </svg>
            </button>
            <div className="flex items-center gap-2">
              <BrandIcon className="w-5 h-5 rounded-md" />
              <span className="font-extrabold text-sm text-neutral-900 tracking-tight">PolicyLens AI</span>
            </div>
          </motion.header>
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
