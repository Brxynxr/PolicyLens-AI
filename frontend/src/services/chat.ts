import type { Conversation, Message, ChatResponse, ChatSource } from '../types'
import api from './api'

export interface StreamCallbacks {
  onStart?: (data: { conversationId: number; sources: ChatSource[] }) => void
  onToken?: (token: string) => void
  onDone?: (data: { conversationId: number; answer: string }) => void
  onError?: (error: Error) => void
}

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
  conversationId?: number,
  mode: string = 'rag'
): Promise<{ chatResponse: ChatResponse; conversationId: number; messageUser: Message; messageAssistant: Message }> {
  const res = await api.post('/chat', {
    question: pregunta,
    conversation_id: conversationId && conversationId > 0 ? conversationId : undefined,
    mode: mode
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

export async function enviarPreguntaStream(
  pregunta: string,
  conversationId?: number,
  mode: string = 'rag',
  callbacks?: StreamCallbacks
): Promise<{ conversationId: number; answer: string; sources: ChatSource[] }> {
  const response = await fetch('/api/chat/stream', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      question: pregunta,
      conversation_id: conversationId && conversationId > 0 ? conversationId : undefined,
      mode: mode,
    }),
  })

  if (!response.ok) {
    let errorDetail = 'Error al procesar la pregunta'
    try {
      const errData = await response.json()
      errorDetail = errData.detail || errorDetail
    } catch {
      // Ignorar fallo de parseo JSON si la respuesta no es JSON
    }
    const err = new Error(errorDetail)
    callbacks?.onError?.(err)
    throw err
  }

  if (!response.body) {
    const err = new Error('No se pudo establecer el flujo de lectura (ReadableStream no disponible)')
    callbacks?.onError?.(err)
    throw err
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder('utf-8')

  let finalConversationId = conversationId || 0
  let finalAnswer = ''
  let finalSources: ChatSource[] = []
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed || !trimmed.startsWith('data: ')) continue

        const jsonStr = trimmed.slice(6).trim()
        if (!jsonStr) continue

        try {
          const event = JSON.parse(jsonStr)

          if (event.type === 'start') {
            if (event.conversation_id) {
              finalConversationId = event.conversation_id
            }
            if (event.sources) {
              finalSources = event.sources
            }
            callbacks?.onStart?.({
              conversationId: finalConversationId,
              sources: finalSources,
            })
          } else if (event.type === 'token') {
            const token = event.content || ''
            finalAnswer += token
            callbacks?.onToken?.(token)
          } else if (event.type === 'done') {
            if (event.conversation_id) {
              finalConversationId = event.conversation_id
            }
            if (event.answer) {
              finalAnswer = event.answer
            }
            callbacks?.onDone?.({
              conversationId: finalConversationId,
              answer: finalAnswer,
            })
          } else if (event.type === 'error') {
            const err = new Error(event.error || 'Error durante el streaming')
            callbacks?.onError?.(err)
            throw err
          }
        } catch (parseErr) {
          if (jsonStr.includes('"type": "error"')) {
            throw parseErr
          }
        }
      }
    }
  } catch (err: any) {
    callbacks?.onError?.(err)
    throw err
  }

  return {
    conversationId: finalConversationId,
    answer: finalAnswer,
    sources: finalSources,
  }
}

export async function eliminarConversacion(id: number): Promise<void> {
  await api.delete(`/chat/conversations/${id}`)
}

