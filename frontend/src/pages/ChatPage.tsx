import { useState, useEffect, useRef } from 'react'
import { 
  listarConversaciones, 
  obtenerConversacion, 
  enviarPreguntaStream, 
  eliminarConversacion 
} from '../services/chat'
import type { Conversation, Message, ChatSource } from '../types'
import ConfirmDialog from '../components/ConfirmDialog'

export default function ChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConv, setActiveConv] = useState<Conversation | null>(null)
  const [inputMsg, setInputMsg] = useState('')
  const [loading, setLoading] = useState(false)
  const [streamingMsgId, setStreamingMsgId] = useState<number | null>(null)
  const [listLoading, setListLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mode, setMode] = useState<'rag' | 'search'>('rag')
  const [chatToDelete, setChatToDelete] = useState<number | null>(null)
  const [activeSources, setActiveSources] = useState<Record<number, ChatSource[]>>({})

  const chatEndRef = useRef<HTMLDivElement>(null)

  const userName = localStorage.getItem('user_name') || 'Joseph'
  const userInitials = userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

  const suggestions = [
    { icon: '🌴', text: 'Vacaciones y días libres', subtext: 'Días acumulados y solicitudes', query: '¿Cuántos días de vacaciones me corresponden?' },
    { icon: '🏥', text: 'Incapacidades y licencias', subtext: 'Protocolos de salud y permisos', query: '¿En cuántos días debo cargar una incapacidad médica?' },
    { icon: '💻', text: 'Horarios y Teletrabajo', subtext: 'Esquemas híbridos e ingreso', query: '¿Cuál es la política sobre el teletrabajo híbrido?' },
  ]

  const loadConversations = async (selectId?: number) => {
    try {
      setListLoading(true)
      const data = await listarConversaciones()
      setConversations(data)
      if (data.length > 0) {
        const idToSelect = selectId || data[0].id
        const fullChat = await obtenerConversacion(idToSelect)
        setActiveConv(fullChat)
      } else {
        setActiveConv(null)
      }
    } catch {
      setError('Error al cargar conversaciones.')
    } finally {
      setListLoading(false)
    }
  }

  useEffect(() => { loadConversations() }, [])

  const scrollToBottom = () => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }
  useEffect(() => { scrollToBottom() }, [activeConv?.messages, loading, streamingMsgId])

  const handleNewChat = () => { setActiveConv(null); setInputMsg('') }

  const handleSelectChat = async (id: number) => {
    try {
      setLoading(true)
      const fullChat = await obtenerConversacion(id)
      setActiveConv(fullChat)
    } catch {
      setError('Error al recuperar la conversacion.')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteChat = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation()
    setChatToDelete(id)
  }

  const confirmDeleteChat = async () => {
    if (!chatToDelete) return
    const id = chatToDelete
    try {
      await eliminarConversacion(id)
      if (activeConv?.id === id) setActiveConv(null)
      loadConversations()
    } catch {
      setError('Error al eliminar la conversacion.')
    } finally {
      setChatToDelete(null)
    }
  }

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!inputMsg.trim() || loading) return

    const userText = inputMsg.trim()
    setInputMsg('')
    setLoading(true)
    setError(null)

    const tempUserMsgId = Date.now()
    const tempAssistantMsgId = tempUserMsgId + 1

    const tempUserMsg: Message = {
      id: tempUserMsgId,
      conversation_id: activeConv?.id || 0,
      role: 'user',
      content: userText,
      created_at: new Date().toISOString()
    }

    const tempAssistantMsg: Message = {
      id: tempAssistantMsgId,
      conversation_id: activeConv?.id || 0,
      role: 'assistant',
      content: '',
      created_at: new Date().toISOString()
    }

    if (activeConv) {
      setActiveConv({
        ...activeConv,
        messages: [...activeConv.messages, tempUserMsg, tempAssistantMsg]
      })
    } else {
      setActiveConv({
        id: 0,
        created_at: new Date().toISOString(),
        messages: [tempUserMsg, tempAssistantMsg]
      })
    }

    setStreamingMsgId(tempAssistantMsgId)

    try {
      const currentConvId = activeConv && activeConv.id > 0 ? activeConv.id : undefined
      await enviarPreguntaStream(userText, currentConvId, mode, {
        onStart: ({ conversationId, sources }) => {
          if (sources && sources.length > 0) {
            setActiveSources(prev => ({ ...prev, [tempAssistantMsgId]: sources }))
          }
          if (conversationId) {
            setActiveConv(prev => prev ? { ...prev, id: conversationId } : null)
          }
        },
        onToken: (token) => {
          setActiveConv(prev => {
            if (!prev) return prev
            const msgs = prev.messages.map(m =>
              m.id === tempAssistantMsgId ? { ...m, content: m.content + token } : m
            )
            return { ...prev, messages: msgs }
          })
        },
        onDone: async ({ conversationId, answer }) => {
          setActiveConv(prev => {
            if (!prev) return prev
            const msgs = prev.messages.map(m =>
              m.id === tempAssistantMsgId ? { ...m, content: answer } : m
            )
            return { ...prev, id: conversationId, messages: msgs }
          })
          try {
            const data = await listarConversaciones()
            setConversations(data)
          } catch {}
        },
        onError: (err) => {
          setError(err.message || 'Error al procesar la respuesta.')
        }
      })
    } catch (err: any) {
      setError(err.message || 'Error al procesar la respuesta.')
    } finally {
      setLoading(false)
      setStreamingMsgId(null)
    }
  }

  const formatChatTitle = (conv: Conversation) => {
    const firstMsg = conv.messages.find(m => m.role === 'user')
    if (firstMsg) {
      return firstMsg.content.length > 28 ? firstMsg.content.slice(0, 26) + '...' : firstMsg.content
    }
    return 'Chat #' + conv.id
  }

  const formatTime = (isoString: string) => {
    try {
      return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } catch {
      return ''
    }
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-100/70 font-sans flex flex-row">
      
      {/* 2. HISTORIAL */}
      <section className="w-72 bg-white border-r border-slate-200/80 flex flex-col justify-between shrink-0">
        <div className="p-4 flex-1 flex flex-col overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-bold text-slate-900 text-sm">Tus Consultas</h2>
            <button onClick={handleNewChat} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#7C3AED]/10 text-[#7C3AED] hover:bg-[#7C3AED] hover:text-white font-bold text-xs transition-all cursor-pointer">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>
              Nueva
            </button>
          </div>

          {listLoading ? (
            <div className="space-y-2">{[1,2,3].map(n => <div key={n} className="p-3 rounded-xl shimmer-skeleton h-16" />)}</div>
          ) : conversations.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
              <div className="p-3 bg-slate-50 text-slate-300 rounded-2xl mb-3 border border-slate-100">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
              </div>
              <p className="text-xs font-bold text-slate-500">Sin consultas previas</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Tus conversaciones guardadas aparecerán aquí.</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {conversations.map((conv) => (
                <div key={conv.id} className="group relative">
                  <button
                    onClick={() => handleSelectChat(conv.id)}
                    className={`w-full text-left p-3 rounded-xl transition-all pr-8 ${
                      activeConv?.id === conv.id
                        ? 'bg-[#7C3AED]/10 border border-[#7C3AED]/30'
                        : 'hover:bg-slate-50 border border-transparent'
                    }`}
                  >
                    <p className={`text-xs font-medium line-clamp-2 ${
                      activeConv?.id === conv.id ? 'font-bold text-[#7C3AED]' : 'text-slate-600 truncate'
                    }`}>
                      {formatChatTitle(conv)}
                    </p>
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      {new Date(conv.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                    </span>
                  </button>
                  <button
                    onClick={(e) => handleDeleteChat(e, conv.id)}
                    className="absolute right-2 top-3 p-1 rounded-lg text-slate-400 hover:text-rose-600 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 3. AREA PRINCIPAL */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        
        {/* Topbar */}
        <header className="h-16 border-b border-slate-200/80 bg-white px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Modo de consulta:</span>
            <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 border border-slate-200/80">
              <button
                onClick={() => setMode('rag')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  mode === 'rag'
                    ? 'bg-[#7C3AED] text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 font-medium'
                }`}
              >
                Respuesta Generada (IA)
              </button>
              <button
                onClick={() => setMode('search')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  mode === 'search'
                    ? 'bg-[#7C3AED] text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 font-medium'
                }`}
              >
                Solo Documento
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200/60 px-3 py-1 rounded-full">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Base de datos al día
          </div>
        </header>

        {/* Contenido / Mensajes o Empty State */}
        <div className="flex-1 overflow-y-auto">
          {!activeConv || activeConv.messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center p-6 max-w-2xl mx-auto w-full text-center">
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-[#7C3AED] to-[#A78BFA] text-white flex items-center justify-center shadow-lg shadow-[#7C3AED]/30 mb-4">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
              </div>
              <h2 className="text-xl font-extrabold text-slate-900">¿Qué deseas consultar hoy?</h2>
              <p className="text-xs text-slate-500 mt-1 max-w-md">Realiza preguntas sobre las políticas, contratos y reglamentos internos de la empresa.</p>
              
              <div className="grid grid-cols-3 gap-3 w-full mt-8">
                {suggestions.map((sug, idx) => (
                  <button
                    key={idx}
                    onClick={() => setInputMsg(sug.query)}
                    className="p-4 rounded-2xl bg-white border border-slate-200/80 hover:border-[#7C3AED] hover:shadow-md transition-all text-left group cursor-pointer"
                  >
                    <span className="text-lg">{sug.icon}</span>
                    <p className="text-xs font-bold text-slate-800 mt-2 group-hover:text-[#7C3AED]">{sug.text}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{sug.subtext}</p>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto w-full space-y-6">
              {activeConv.messages.map((msg) => {
                const isUser = msg.role === 'user'
                return (
                  <div key={msg.id} className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
                    {!isUser && (
                      <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-[#7C3AED] to-[#A78BFA] text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-md shadow-[#7C3AED]/20">
                        RP
                      </div>
                    )}
                    <div className={`rounded-2xl px-5 py-3.5 max-w-xl shadow-sm ${
                      isUser ? 'bg-[#181E4B] text-white rounded-tr-none' : 'bg-white border border-slate-200/80 rounded-tl-none'
                    }`}>
                      <div className={`flex items-center justify-between gap-4 mb-1 pb-1 ${isUser ? 'border-b border-white/10' : 'border-b border-slate-100'}`}>
                        <span className={`text-[11px] font-bold ${isUser ? 'text-slate-300' : 'text-[#7C3AED]'}`}>
                          {isUser ? `Tú (${userName})` : 'Asistente de Políticas'}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {formatTime(msg.created_at)}
                        </span>
                      </div>
                      {msg.content ? (
                        <p className={`text-sm leading-relaxed ${isUser ? 'text-white font-medium' : 'text-slate-700'}`}>
                          {msg.content}
                        </p>
                      ) : (
                        <div className="flex items-center gap-2 py-1">
                          <span className="inline-block w-2 h-2 rounded-full bg-[#7C3AED] animate-ping" />
                          <span className="text-xs italic text-slate-400">Generando respuesta...</span>
                        </div>
                      )}
                      {!isUser && activeSources[msg.id] && activeSources[msg.id].length > 0 && (
                        <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                          {activeSources[msg.id].map((src, sIdx) => (
                            <div key={sIdx} className="flex items-center justify-between p-3 rounded-xl bg-purple-50/60 border border-purple-100">
                              <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-white border border-purple-200 text-[#7C3AED]">
                                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 01-2-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                                </div>
                                <div>
                                  <p className="font-bold text-xs text-slate-800">{src.document}</p>
                                  <p className="text-slate-500 text-[11px]">Página {src.page} &bull; {src.section}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    {isUser && (
                      <div className="h-9 w-9 rounded-xl bg-[#7C3AED] text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-md">
                        {userInitials}
                      </div>
                    )}
                  </div>
                )
              })}
              <div ref={chatEndRef} />
            </div>
          )}
          {error && (
            <div className="p-4 rounded-xl bg-[#FF6B6B]/10 border border-[#FF6B6B]/20 text-[#FF6B6B] text-xs font-semibold flex items-center gap-2">
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Input Prompts */}
        <form onSubmit={handleSend} className="shrink-0 bg-white border-t p-4">
          <div className="max-w-3xl mx-auto flex items-center gap-2">
            <input 
              type="text" 
              value={inputMsg}
              onChange={(e) => setInputMsg(e.target.value)}
              placeholder="Escribe tu duda sobre las políticas de la empresa..." 
              className="flex-1 rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:border-[#7C3AED] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#7C3AED]/10 transition-all"
              disabled={loading}
            />
            <button 
              type="submit"
              disabled={!inputMsg.trim() || loading}
              className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white px-6 py-3 rounded-xl font-bold text-sm shadow-md shadow-[#7C3AED]/20 transition-all flex items-center gap-2 shrink-0 cursor-pointer disabled:opacity-50"
            >
              <span>{loading ? 'Consultando...' : 'Consultar'}</span>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
            </button>
          </div>
        </form>

      </main>

      {chatToDelete !== null && (
        <ConfirmDialog
          title="Eliminar conversación"
          message="¿Seguro que deseas eliminar este chat? Se borrarán todos los mensajes."
          confirmLabel="Eliminar"
          onConfirm={confirmDeleteChat}
          onClose={() => setChatToDelete(null)}
        />
      )}
    </div>
  )
}