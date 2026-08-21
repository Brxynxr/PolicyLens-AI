import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'

export default function Layout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen)
  const closeSidebar = () => setIsSidebarOpen(false)

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-neutral-50 font-sans">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-brand-900/60 backdrop-blur-sm transition-opacity duration-300 md:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar - Desktop and Mobile Drawer */}
      <div 
        className={`
          fixed inset-y-0 left-0 z-50 transform md:relative md:transform-none transition-transform duration-300 ease-in-out
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        <Sidebar onClose={closeSidebar} />
      </div>

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Mobile Header */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-brand-800 bg-brand-800 md:hidden">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center text-white font-bold shadow-md shadow-purple-600/30">
              RP
            </div>
            <span className="font-bold text-lg text-white tracking-tight">RiwiPolicylens</span>
          </div>
          <button 
            onClick={toggleSidebar}
            className="p-2 rounded-lg bg-brand-700/50 text-white hover:bg-brand-700 hover:text-purple-300 transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-400"
            aria-label="Abrir menu de navegacion"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </header>

        {/* Dynamic Page Outlet */}
        <main className="flex-1 overflow-y-auto focus:outline-hidden p-6 md:p-8">
          <div className="max-w-6xl mx-auto h-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
