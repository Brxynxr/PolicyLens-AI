import { useState, useEffect, useRef } from 'react'
import { 
  listarConversaciones, 
  obtenerConversacion, 
  enviarPregunta, 
  eliminarConversacion 
} from '../services/chat'
import type { Conversation, Message, ChatSource } from '../types'
import ChatMessage from '../components/ChatMessage'

export default function ChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConv, setActiveConv] = useState<Conversation | null>(null)
  const [inputMsg, setInputMsg] = useState('')
  const [loading, setLoading] = useState(false)
  const [listLoading, setListLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Track sources of the last assistant reply dynamically in state
  const [activeSources, setActiveSources] = useState<Record<number, ChatSource[]>>({})

  const chatEndRef = useRef<HTMLDivElement>(null)

  // Fetch all chats on load
  const loadConversations = async (selectId?: number) => {
    try {
      setListLoading(true)
      const data = await listarConversaciones()
      setConversations(data)
      
      if (data.length > 0) {
        // Select either the requested chat, or the latest active one
        const idToSelect = selectId || data[0].id
        const fullChat = await obtenerConversacion(idToSelect)
        setActiveConv(fullChat)
      } else {
        // No chats exist
        setActiveConv(null)
      }
    } catch {
      setError('Error al cargar conversaciones.')
    } finally {
      setListLoading(false)
    }
  }

  useEffect(() => {
    loadConversations()
  }, [])

  // Scroll to bottom helper
  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [activeConv?.messages, loading])

  // Start new conversation
  const handleNewChat = () => {
    setActiveConv(null)
    setInputMsg('')
  }

  // Select another conversation
  const handleSelectChat = async (id: number) => {
    try {
      setLoading(true)
      const fullChat = await obtenerConversacion(id)
      setActiveConv(fullChat)
    } catch {
      setError('Error al recuperar la conversación.')
    } finally {
      setLoading(false)
    }
  }

  // Delete chat conversation
  const handleDeleteChat = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation()
    if (!window.confirm('¿Deseas eliminar este chat?')) return
    try {
      await eliminarConversacion(id)
      if (activeConv?.id === id) {
        setActiveConv(null)
      }
      loadConversations()
    } catch {
      setError('Error al eliminar la conversación.')
    }
  }

  // Submit message
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputMsg.trim() || loading) return

    const userText = inputMsg.trim()
    setInputMsg('')
    setLoading(true)
    setError(null)

    // Optimistic user UI update
    const tempUserMsg: Message = {
      id: Date.now(),
      conversation_id: activeConv?.id || 0,
      role: 'user',
      content: userText,
      created_at: new Date().toISOString()
    }

    if (activeConv) {
      setActiveConv({
        ...activeConv,
        messages: [...activeConv.messages, tempUserMsg]
      })
    } else {
      setActiveConv({
        id: 0,
        created_at: new Date().toISOString(),
        messages: [tempUserMsg]
      })
    }

    try {
      const res = await enviarPregunta(userText, activeConv?.id || undefined)
      
      // Update conversations list with the new/updated entry
      await loadConversations(res.conversationId)
      
      // Store sources mapping
      if (res.chatResponse.sources.length > 0) {
        setActiveSources(prev => ({
          ...prev,
          [res.messageAssistant.id]: res.chatResponse.sources
        }))
      }
    } catch (err: any) {
      setError(err.message || 'Error al procesar la respuesta RAG.')
    } finally {
      setLoading(false)
    }
  }

  const formatChatTitle = (conv: Conversation) => {
    const firstMsg = conv.messages.find(m => m.role === 'user')
    if (firstMsg) {
      return firstMsg.content.length > 28 ? `${firstMsg.content.slice(0, 26)}...` : firstMsg.content
    }
    return `Chat #${conv.id}`
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] md:h-[calc(100vh-4.5rem)] gap-6 overflow-hidden">
      {/* Internal panel for conversation list history */}
      <div className="hidden lg:flex flex-col w-72 bg-white rounded-2xl border border-brand-200 overflow-hidden shrink-0 animate-fade-in-right shadow-2xs">
        <div className="p-4 border-b border-brand-200 bg-brand-50/30 flex justify-between items-center">
          <h2 className="font-bold text-neutral-800 text-sm">Historial de Consultas</h2>
          <button 
            onClick={handleNewChat}
            className="p-1.5 rounded-lg border border-brand-200 bg-white hover:bg-brand-50 text-gold-600 hover:text-gold-700 transition-all font-medium text-xs flex items-center gap-1"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <span>Nuevo</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {listLoading ? (
            <div className="p-4 text-center text-xs text-neutral-400">Cargando historial...</div>
          ) : conversations.length === 0 ? (
            <div className="p-6 text-center text-xs text-neutral-400 italic">No hay consultas previas</div>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => handleSelectChat(conv.id)}
                className={`
                  group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all duration-200 border
                  ${activeConv?.id === conv.id 
                    ? 'bg-brand-100/60 border-brand-200/80 text-neutral-900 font-semibold' 
                    : 'bg-transparent border-transparent text-neutral-600 hover:bg-brand-50 hover:text-neutral-900'}
                `}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <svg className={`w-4 h-4 shrink-0 ${activeConv?.id === conv.id ? 'text-gold-500' : 'text-neutral-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <span className="text-xs truncate">{formatChatTitle(conv)}</span>
                </div>
                <button
                  onClick={(e) => handleDeleteChat(e, conv.id)}
                  className="p-1 rounded-lg text-neutral-400 hover:text-red-500 hover:bg-red-50/50 opacity-0 group-hover:opacity-100 transition-all"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main chat window container */}
      <div className="flex flex-col flex-1 bg-white rounded-2xl border border-brand-200 overflow-hidden relative shadow-xs animate-scale-up">
        


        {/* Chat Feed */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
          {!activeConv || activeConv.messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-4 max-w-md mx-auto">
              <div className="w-16 h-16 rounded-2xl bg-brand-100 flex items-center justify-center text-gold-600 mb-6 shadow-md shadow-brand-200/20">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-neutral-900 leading-tight">¿Qué deseas consultar hoy?</h3>
              <p className="text-sm text-neutral-500 mt-2 leading-relaxed font-medium">
                Realiza consultas en lenguaje natural sobre políticas de recursos humanos, contratos y reglamentos internos de la compañía.
              </p>
              
              <div className="mt-8 grid grid-cols-1 gap-3.5 w-full">
                <button 
                  onClick={() => setInputMsg('¿Cuántos días de vacaciones me corresponden por año?')}
                  className="px-4 py-3 text-left rounded-xl border border-brand-200 hover:border-gold-300 hover:bg-brand-50/20 text-xs font-semibold text-neutral-700 transition-all flex items-center justify-between"
                >
                  <span>¿Cuántos días de vacaciones me corresponden?</span>
                  <span className="text-gold-500">&rarr;</span>
                </button>
                <button 
                  onClick={() => setInputMsg('¿Cuál es la política sobre el teletrabajo híbrido?')}
                  className="px-4 py-3 text-left rounded-xl border border-brand-200 hover:border-gold-300 hover:bg-brand-50/20 text-xs font-semibold text-neutral-700 transition-all flex items-center justify-between"
                >
                  <span>¿Cuál es la política de teletrabajo híbrido?</span>
                  <span className="text-gold-500">&rarr;</span>
                </button>
              </div>
            </div>
          ) : (
            <>
              {activeConv.messages.map((msg) => (
                <ChatMessage 
                  key={msg.id} 
                  message={msg} 
                  sources={activeSources[msg.id] || []}
                />
              ))}
              
              {loading && (
                <div className="flex gap-4 p-4 md:p-6 rounded-2xl bg-white border border-brand-200 relative overflow-hidden shadow-2xs">
                  <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gold-400" />
                  <div className="shrink-0">
                    <div className="w-10 h-10 rounded-xl bg-gold-100 border border-gold-200 flex items-center justify-center font-bold text-sm text-gold-500 shimmer-skeleton" />
                  </div>
                  <div className="flex-1 space-y-3">
                    <div className="h-3.5 rounded-md w-1/4 shimmer-skeleton" />
                    <div className="space-y-2">
                      <div className="h-3 rounded-md w-full shimmer-skeleton" />
                      <div className="h-3 rounded-md w-5/6 shimmer-skeleton" />
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {error && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-red-700 text-xs font-semibold flex items-center gap-2">
              <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Input Bar Form */}
        <form onSubmit={handleSend} className="p-4 border-t border-brand-200 bg-brand-50/20">
          <div className="flex gap-3">
            <input
              type="text"
              value={inputMsg}
              onChange={(e) => setInputMsg(e.target.value)}
              placeholder="Realiza una pregunta sobre las políticas..."
              className="flex-1 px-4 py-3.5 rounded-xl border border-brand-200 bg-white text-sm focus:outline-hidden focus:border-gold-500 focus:ring-1 focus:ring-gold-500/20 transition-all font-medium text-neutral-800"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={!inputMsg.trim() || loading}
              className={`
                px-5 rounded-xl text-white font-bold text-sm transition-all flex items-center gap-2 shadow-md
                ${!inputMsg.trim() || loading 
                  ? 'bg-neutral-300 shadow-none cursor-not-allowed' 
                  : 'bg-gold-500 hover:bg-gold-600 shadow-gold-500/20 hover:scale-[1.02]'}
              `}
            >
              <span>Consultar</span>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}