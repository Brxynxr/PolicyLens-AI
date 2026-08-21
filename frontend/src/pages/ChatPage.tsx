import { useState, useEffect, useRef } from 'react'
import { useChat } from '../context/ChatContext'
import ChatMessage from '../components/ChatMessage'
import EyeOfHorus from '../components/EyeOfHorus'

export default function ChatPage() {
  const {
    activeConv,
    loading,
    error,
    mode,
    activeSources,
    isSidebarCollapsed,
    toggleSidebarCollapse,
    setMode,
    sendMessage,
    handleNewChat
  } = useChat()

  const [inputMsg, setInputMsg] = useState('')
  const chatEndRef = useRef<HTMLDivElement>(null)
  const userName = localStorage.getItem('user_name') || 'Breyner'

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [activeConv?.messages, loading])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputMsg.trim() || loading) return
    const text = inputMsg
    setInputMsg('')
    await sendMessage(text)
  }

  const handleCardClick = async (promptText: string) => {
    if (loading) return
    setInputMsg('')
    await sendMessage(promptText)
  }

  const promptCards = [
    {
      icon: (
        <svg className="w-5 h-5 text-[#9E7111]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      category: 'Vacaciones y Descansos',
      prompt: '¿Cuántos días de vacaciones me corresponden durante mi primer año de contrato?'
    },
    {
      icon: (
        <svg className="w-5 h-5 text-[#9E7111]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
      category: 'Modalidad de Trabajo',
      prompt: '¿Cuál es la política y los requisitos para aplicar al esquema de teletrabajo híbrido?'
    },
    {
      icon: (
        <svg className="w-5 h-5 text-[#9E7111]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      category: 'Jornada y Horas Extra',
      prompt: '¿Cuáles son los horarios oficiales y cómo se realiza el registro de horas extra?'
    }
  ]

  const hasMessages = activeConv && activeConv.messages && activeConv.messages.length > 0

  return (
    <div className="flex flex-col h-full bg-[#FAF8F5] relative overflow-hidden">
      {/* 1. Header Bar: Title, Sidebar Toggle, and Action Status */}
      <div className="px-4 sm:px-6 py-3 border-b border-[#E8E2D6] bg-white/70 backdrop-blur-md flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-3">
          {/* Toggle Sidebar Button for Desktop */}
          <button
            onClick={toggleSidebarCollapse}
            className="p-1.5 rounded-lg border border-[#E8E2D6] bg-white hover:bg-[#FAF8F5] text-neutral-600 hover:text-neutral-900 transition-all cursor-pointer"
            title={isSidebarCollapsed ? 'Mostrar barra lateral' : 'Ocultar barra lateral'}
            aria-label="Alternar barra lateral"
          >
            <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7" />
            </svg>
          </button>

          <div className="flex items-center gap-2">
            <EyeOfHorus className="w-5 h-5" stroke="#9E7111" strokeWidth={2} />
            <h2 className="font-extrabold text-sm sm:text-base text-neutral-900 tracking-tight">
              {hasMessages ? `Consulta #${activeConv.id}` : 'PolicyLens AI'}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {hasMessages && (
            <button
              onClick={handleNewChat}
              className="px-3 py-1.5 rounded-xl bg-white border border-[#E8E2D6] hover:border-[#9E7111]/40 text-[#9E7111] hover:bg-[#FAF8F5] text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
            >
              <span className="font-bold">+</span>
              <span className="hidden sm:inline">Nueva Consulta</span>
            </button>
          )}

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#FAF8F5] border border-[#E8E2D6] text-3xs font-extrabold text-[#9E7111] uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-[#9E7111] animate-pulse" />
            <span>{mode === 'rag' ? 'RAG + LLM' : 'Solo Embeddings'}</span>
          </div>
        </div>
      </div>

      {/* 2. Main Conversation / Welcome Canvas */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">
        <div className="max-w-3xl mx-auto h-full flex flex-col justify-between">
          {!hasMessages ? (
            /* Initial State (Hero Welcome Screen - Gemini Style) */
            <div className="my-auto py-8 sm:py-12 flex flex-col items-center text-center animate-fade-in-up">
              {/* Luxury Eye of Horus Badge */}
              <div className="relative mb-6">
                <div className="absolute -inset-2 rounded-3xl bg-[#9E7111]/10 blur-xl pointer-events-none" />
                <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-white border border-[#E8E2D6] flex items-center justify-center shadow-lg shadow-gold-500/10">
                  <EyeOfHorus className="w-10 h-10 sm:w-12 sm:h-12" stroke="#9E7111" strokeWidth={2} />
                </div>
              </div>

              {/* Greeting Header */}
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-neutral-900 tracking-tight leading-tight">
                Hola, <span className="text-[#9E7111]">{userName}</span>, ¿qué tienes en mente?
              </h1>

              <p className="mt-3 text-xs sm:text-sm md:text-base text-neutral-600 max-w-lg leading-relaxed font-medium">
                Consulta normativas empresariales, políticas de RRHH, manuales o contratos con respuestas precisas y fuentes citadas.
              </p>

              {/* 3 Clickable Onboarding Prompt Cards */}
              <div className="mt-8 sm:mt-10 grid grid-cols-1 md:grid-cols-3 gap-3.5 w-full text-left">
                {promptCards.map((card, index) => (
                  <button
                    key={index}
                    onClick={() => handleCardClick(card.prompt)}
                    disabled={loading}
                    className="p-4 rounded-2xl bg-white border border-[#E8E2D6] hover:border-[#9E7111]/50 hover:bg-[#FAF8F5]/80 shadow-2xs hover:shadow-sm transition-all duration-200 flex flex-col justify-between gap-3 group cursor-pointer text-left transform hover:-translate-y-0.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="p-2 rounded-xl bg-[#FAF8F5] border border-[#E8E2D6] group-hover:scale-105 transition-transform">
                        {card.icon}
                      </div>
                      <span className="text-3xs font-bold uppercase tracking-wider text-neutral-400">
                        {card.category}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-neutral-800 leading-snug group-hover:text-neutral-900">
                      "{card.prompt}"
                    </p>
                    <div className="flex items-center gap-1 text-3xs font-bold text-[#9E7111] opacity-0 group-hover:opacity-100 transition-opacity">
                      <span>Preguntar</span>
                      <span>&rarr;</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Message Feed Flow */
            <div className="space-y-4 pb-6">
              {activeConv.messages.map((msg) => (
                <ChatMessage 
                  key={msg.id} 
                  message={msg} 
                  sources={activeSources[msg.id] || []}
                />
              ))}

              {/* Loading Skeleton */}
              {loading && (
                <div className="flex gap-4 p-5 rounded-2xl bg-white border border-[#E8E2D6] border-l-4 border-l-[#9E7111] shadow-2xs relative overflow-hidden animate-fade-in-up">
                  <div className="shrink-0">
                    <div className="w-9 h-9 rounded-xl bg-[#FAF8F5] border border-[#E8E2D6] flex items-center justify-center">
                      <EyeOfHorus className="w-5 h-5 animate-pulse" stroke="#9E7111" strokeWidth={2} />
                    </div>
                  </div>
                  <div className="flex-1 space-y-3">
                    <div className="h-3.5 rounded-md w-1/4 shimmer-skeleton" />
                    <div className="space-y-2">
                      <div className="h-3 rounded-md w-full shimmer-skeleton" />
                      <div className="h-3 rounded-md w-4/5 shimmer-skeleton" />
                    </div>
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>
          )}

          {/* Error Notice */}
          {error && (
            <div className="my-3 p-3.5 rounded-xl bg-red-50 border border-red-100 text-red-700 text-xs font-semibold flex items-center gap-2">
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>{error}</span>
            </div>
          )}
        </div>
      </div>

      {/* 3. Floating Bottom Input Prompt Bar (Gemini Style) */}
      <div className="px-4 pb-4 pt-1 bg-gradient-to-t from-[#FAF8F5] via-[#FAF8F5]/90 to-transparent shrink-0 z-20">
        <div className="max-w-3xl mx-auto space-y-2">
          {/* Mode Switcher Pill Selector (Above input bar) */}
          <div className="flex items-center justify-between px-2">
            <div className="inline-flex p-0.5 rounded-xl bg-[#F5F0E8] border border-[#E8E2D6]">
              <button
                type="button"
                onClick={() => setMode('rag')}
                className={`
                  px-2.5 py-1 rounded-lg text-3xs font-extrabold transition-all cursor-pointer
                  ${mode === 'rag' 
                    ? 'bg-white text-[#9E7111] shadow-2xs border border-[#E8E2D6]' 
                    : 'text-neutral-600 hover:text-neutral-900'}
                `}
              >
                RAG + LLM
              </button>
              <button
                type="button"
                onClick={() => setMode('search')}
                className={`
                  px-2.5 py-1 rounded-lg text-3xs font-extrabold transition-all cursor-pointer
                  ${mode === 'search' 
                    ? 'bg-white text-[#9E7111] shadow-2xs border border-[#E8E2D6]' 
                    : 'text-neutral-600 hover:text-neutral-900'}
                `}
              >
                Solo Embeddings
              </button>
            </div>

            <span className="text-3xs text-neutral-400 font-medium hidden sm:inline">
              {mode === 'rag' ? 'Generación aumentada con citas de documentos' : 'Búsqueda vectorial directa en ChromaDB'}
            </span>
          </div>

          {/* Input Capsule Bar */}
          <form onSubmit={handleSubmit} className="relative rounded-2xl sm:rounded-3xl bg-white border border-[#E8E2D6] shadow-md shadow-brand-200/40 p-2 sm:p-2.5 flex items-center gap-2 transition-all focus-within:border-[#9E7111]/50 focus-within:ring-2 focus-within:ring-[#9E7111]/10">
            <input
              type="text"
              value={inputMsg}
              onChange={(e) => setInputMsg(e.target.value)}
              placeholder="Pregunta a PolicyLens sobre los documentos..."
              disabled={loading}
              className="flex-1 px-3 py-2 text-xs sm:text-sm bg-transparent text-neutral-800 placeholder:text-neutral-400 focus:outline-hidden font-medium"
            />

            <button
              type="submit"
              disabled={!inputMsg.trim() || loading}
              className={`
                w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl flex items-center justify-center text-white transition-all shadow-sm shrink-0 cursor-pointer
                ${!inputMsg.trim() || loading 
                  ? 'bg-neutral-300 shadow-none cursor-not-allowed text-neutral-100' 
                  : 'bg-[#9E7111] hover:bg-[#7a5807] shadow-gold-500/20 hover:scale-105 active:scale-95'}
              `}
              title="Enviar consulta"
              aria-label="Enviar consulta"
            >
              {loading ? (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg className="w-4 h-4 sm:w-4.5 sm:h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              )}
            </button>
          </form>

          {/* Fine Bottom Disclaimer */}
          <p className="text-center text-3xs text-neutral-400 font-medium">
            PolicyLens AI puede cometer errores. Verifica la información citada con los documentos originales.
          </p>
        </div>
      </div>
    </div>
  )
}
