import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { 
  listarConversaciones, 
  obtenerConversacion, 
  enviarPregunta, 
  eliminarConversacion 
} from '../services/chat'
import type { Conversation, Message, ChatSource } from '../types'

interface ChatContextType {
  conversations: Conversation[]
  activeConv: Conversation | null
  loading: boolean
  listLoading: boolean
  error: string | null
  mode: 'rag' | 'search'
  activeSources: Record<number, ChatSource[]>
  isSidebarCollapsed: boolean
  isMobileSidebarOpen: boolean
  toggleSidebarCollapse: () => void
  toggleMobileSidebar: () => void
  closeMobileSidebar: () => void
  setMode: (mode: 'rag' | 'search') => void
  setError: (err: string | null) => void
  handleNewChat: () => void
  handleSelectChat: (id: number) => Promise<void>
  handleDeleteChat: (e: React.MouseEvent, id: number) => Promise<void>
  sendMessage: (text: string) => Promise<void>
  loadConversations: (selectId?: number) => Promise<void>
}

const ChatContext = createContext<ChatContextType | undefined>(undefined)

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConv, setActiveConv] = useState<Conversation | null>(null)
  const [loading, setLoading] = useState(false)
  const [listLoading, setListLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mode, setMode] = useState<'rag' | 'search'>('rag')
  const [activeSources, setActiveSources] = useState<Record<number, ChatSource[]>>({})
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)

  const navigate = useNavigate()
  const location = useLocation()

  const loadConversations = useCallback(async (selectId?: number) => {
    try {
      setListLoading(true)
      const data = await listarConversaciones()
      setConversations(data)
      
      if (selectId) {
        const fullChat = await obtenerConversacion(selectId)
        setActiveConv(fullChat)
      } else if (data.length > 0 && !activeConv && location.pathname === '/chat') {
        const fullChat = await obtenerConversacion(data[0].id)
        setActiveConv(fullChat)
      }
    } catch {
      // Quiet fail if not authenticated
    } finally {
      setListLoading(false)
    }
  }, [location.pathname, activeConv])

  useEffect(() => {
    if (localStorage.getItem('user_id')) {
      loadConversations()
    }
  }, [loadConversations])

  const toggleSidebarCollapse = () => {
    setIsSidebarCollapsed(prev => !prev)
  }

  const toggleMobileSidebar = () => {
    setIsMobileSidebarOpen(prev => !prev)
  }

  const closeMobileSidebar = () => {
    setIsMobileSidebarOpen(false)
  }

  const handleNewChat = () => {
    setActiveConv(null)
    setError(null)
    if (location.pathname !== '/chat') {
      navigate('/chat')
    }
    if (isMobileSidebarOpen) {
      closeMobileSidebar()
    }
  }

  const handleSelectChat = async (id: number) => {
    try {
      setLoading(true)
      setError(null)
      const fullChat = await obtenerConversacion(id)
      setActiveConv(fullChat)
      if (location.pathname !== '/chat') {
        navigate('/chat')
      }
      if (isMobileSidebarOpen) {
        closeMobileSidebar()
      }
    } catch {
      setError('Error al recuperar la conversación.')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteChat = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation()
    if (!window.confirm('¿Deseas eliminar este chat del historial?')) return
    try {
      await eliminarConversacion(id)
      if (activeConv?.id === id) {
        setActiveConv(null)
      }
      await loadConversations()
    } catch {
      setError('Error al eliminar la conversación.')
    }
  }

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return

    const userText = text.trim()
    setLoading(true)
    setError(null)

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
      const currentConvId = activeConv && activeConv.id > 0 ? activeConv.id : undefined
      const res = await enviarPregunta(userText, currentConvId, mode)
      
      await loadConversations(res.conversationId)
      
      if (res.chatResponse.sources.length > 0) {
        setActiveSources(prev => ({
          ...prev,
          [res.messageAssistant.id]: res.chatResponse.sources
        }))
      }
    } catch (err: any) {
      setError(err.message || 'Error al procesar la respuesta del modelo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <ChatContext.Provider
      value={{
        conversations,
        activeConv,
        loading,
        listLoading,
        error,
        mode,
        activeSources,
        isSidebarCollapsed,
        isMobileSidebarOpen,
        toggleSidebarCollapse,
        toggleMobileSidebar,
        closeMobileSidebar,
        setMode,
        setError,
        handleNewChat,
        handleSelectChat,
        handleDeleteChat,
        sendMessage,
        loadConversations
      }}
    >
      {children}
    </ChatContext.Provider>
  )
}

export function useChat() {
  const context = useContext(ChatContext)
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider')
  }
  return context
}
