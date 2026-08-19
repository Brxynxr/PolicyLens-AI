import type { Conversation, Message, ChatResponse } from '../types'
import api from './api'

export async function listarConversaciones(): Promise<Conversation[]> {
  const data = await api.get('/chat/conversations') as any
  return data.conversations || []
}

export async function obtenerConversacion(id: number): Promise<Conversation | null> {
  try {
    const data = await api.get(`/chat/conversations/${id}`) as any
    return data
  } catch {
    return null
  }
}

export async function enviarPregunta(
  pregunta: string,
  conversationId?: number
): Promise<{ chatResponse: ChatResponse; conversationId: number; messageUser: Message; messageAssistant: Message }> {
  const res = await api.post('/chat', {
    question: pregunta,
    conversation_id: conversationId || undefined
  }) as any

  const messageUser: Message = {
    id: Date.now(),
    conversation_id: res.conversation_id,
    role: 'user',
    content: pregunta,
    created_at: new Date().toISOString()
  }

  const messageAssistant: Message = {
    id: Date.now() + 1,
    conversation_id: res.conversation_id,
    role: 'assistant',
    content: res.answer,
    created_at: new Date().toISOString()
  }

  return {
    chatResponse: {
      answer: res.answer,
      sources: res.sources || []
    },
    conversationId: res.conversation_id,
    messageUser,
    messageAssistant
  }
}

export async function eliminarConversacion(id: number): Promise<void> {
  await api.delete(`/chat/conversations/${id}`)
}
