import type { Conversation, Message, ChatResponse, ChatSource } from '../types'
import api from './api'

// Setup initial mock data in localStorage if empty (kept as fallback)
const MOCK_CONVERSATIONS_KEY = 'policylens_mock_conversations'

const defaultConversations: Conversation[] = [
  {
    id: 1,
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    messages: [
      {
        id: 101,
        conversation_id: 1,
        role: 'user',
        content: '¿Cuántos días de vacaciones tengo al año?',
        created_at: new Date(Date.now() - 3600000 * 2).toISOString()
      },
      {
        id: 102,
        conversation_id: 1,
        role: 'assistant',
        content: 'Según el Manual de Recursos Humanos (Sección de Vacaciones, Pág. 12), todos los empleados contratados a tiempo completo tienen derecho a 15 días hábiles de vacaciones pagadas por año completo trabajado. Las vacaciones deben solicitarse con al menos 15 días de anticipación y estar aprobadas por el supervisor directo.',
        created_at: new Date(Date.now() - 3600000 * 1.9).toISOString()
      }
    ]
  },
  {
    id: 2,
    created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
    messages: [
      {
        id: 201,
        conversation_id: 2,
        role: 'user',
        content: '¿Cuál es la política sobre el trabajo remoto?',
        created_at: new Date(Date.now() - 3600000 * 24).toISOString()
      },
      {
        id: 202,
        conversation_id: 2,
        role: 'assistant',
        content: 'De acuerdo con la Política de Teletrabajo 2025, los empleados en puestos aptos para trabajo remoto pueden trabajar desde casa hasta 2 días a la semana, previa coordinación con su gerente de área. La empresa provee un subsidio mensual para la conexión a internet de alta velocidad y el equipamiento ergonómico básico de oficina.',
        created_at: new Date(Date.now() - 3600000 * 23.8).toISOString()
      }
    ]
  }
]

// Initialize helper
const getStoredConversations = (): Conversation[] => {
  const data = localStorage.getItem(MOCK_CONVERSATIONS_KEY)
  if (!data) {
    localStorage.setItem(MOCK_CONVERSATIONS_KEY, JSON.stringify(defaultConversations))
    return defaultConversations
  }
  return JSON.parse(data)
}

const saveStoredConversations = (conversations: Conversation[]) => {
  localStorage.setItem(MOCK_CONVERSATIONS_KEY, JSON.stringify(conversations))
}

// Service Functions (Simulating API Latency)
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export async function listarConversaciones(): Promise<Conversation[]> {
  await delay(600)
  return getStoredConversations().sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
}

export async function obtenerConversacion(id: number): Promise<Conversation | null> {
  await delay(400)
  const convs = getStoredConversations()
  const found = convs.find(c => c.id === id)
  return found || null
}

export async function enviarPregunta(
  pregunta: string,
  conversationId?: number
): Promise<{ chatResponse: ChatResponse; conversationId: number; messageUser: Message; messageAssistant: Message }> {
  await delay(1500) // RAG processing takes longer

  // Try real API first, fallback to mock
  try {
    // Usamos el tipo correcto para el body y response
    const res = await api.post('/chat', { pregunta, conversationId }) as any
    
    // Real API response format
    return {
      chatResponse: {
        answer: res.answer,
        sources: res.sources || []
      },
      conversationId: res.conversationId || (conversationId || 1),
      messageUser: res.messageUser || {
        id: Date.now(),
        conversation_id: conversationId || 1,
        role: 'user',
        content: pregunta,
        created_at: new Date().toISOString()
      },
      messageAssistant: res.messageAssistant || {
        id: Date.now() + 1,
        conversation_id: conversationId || 1,
        role: 'assistant',
        content: res.answer,
        created_at: new Date().toISOString()
      }
    }
  } catch (err) {
    console.warn('Using mock response, API failed:', err)
  }

  // Fallback to mock response
  const convs = getStoredConversations()
  let targetConvId = conversationId

  // Create new conversation if none specified
  if (!targetConvId) {
    targetConvId = convs.length > 0 ? Math.max(...convs.map(c => c.id)) + 1 : 1
    const newConv: Conversation = {
      id: targetConvId,
      created_at: new Date().toISOString(),
      messages: []
    }
    convs.push(newConv)
  }

  const currentConvIndex = convs.findIndex(c => c.id === targetConvId)
  if (currentConvIndex === -1) {
    throw new Error('Conversación no encontrada')
  }

  const currentConv = convs[currentConvIndex]
  const messageUser: Message = {
    id: Date.now(),
    conversation_id: targetConvId,
    role: 'user',
    content: pregunta,
    created_at: new Date().toISOString()
  }

  // Generate mock RAG response based on query
  let answer = 'No se encontró información relevante sobre este tema en los documentos empresariales indexados.'
  let sources: ChatSource[] = []

  const queryLower = pregunta.toLowerCase()
  if (queryLower.includes('vacaci') || queryLower.includes('día') || queryLower.includes('libre')) {
    answer = 'Según el Manual de Recursos Humanos (Sección de Vacaciones, Pág. 12), los empleados gozan de 15 días hábiles de vacaciones pagadas anuales por cada año completo de servicio. La acumulación máxima permitida es de 30 días.'
    sources = [
      {
        document: 'manual_rrhh_2026.pdf',
        page: 12,
        section: 'Vacaciones y Ausencias',
        content: 'Los empleados contratados bajo modalidad indefinida devengan 1.25 días de vacaciones por mes trabajado, totalizando 15 días hábiles al año. Las solicitudes deben gestionarse por el portal interno.'
      }
    ]
  } else if (queryLower.includes('remot') || queryLower.includes('teletrab') || queryLower.includes('casa')) {
    answer = 'La Política de Teletrabajo 2025 detalla un esquema híbrido (2 días de trabajo remoto, 3 días presenciales). Requiere aprobación del gerente y tener evaluaciones de desempeño satisfactorias.'
    sources = [
      {
        document: 'politica_teletrabajo_2025.docx',
        page: 2,
        section: 'Modalidad Híbrida',
        content: 'El esquema híbrido de la empresa permite hasta un 40% de la jornada semanal en trabajo remoto para roles administrativos, sujeto a aprobación del líder directo.'
      }
    ]
  } else if (queryLower.includes('segurid') || queryLower.includes('dat') || queryLower.includes('confidenc')) {
    answer = 'El Contrato de Confidencialidad y Seguridad de Datos (Sección 4.2) prohíbe explícitamente el uso de redes Wi-Fi públicas sin VPN corporativa y exige el almacenamiento de archivos sensibles únicamente en Google Drive corporativo.'
    sources = [
      {
        document: 'contrato_confidencialidad_general.html',
        page: 1,
        section: 'Uso de Dispositivos',
        content: 'Queda estrictamente prohibido conectar dispositivos corporativos a redes inalámbricas públicas no seguras sin el uso de la Red Privada Virtual (VPN) autorizada por el departamento de IT.'
      }
    ]
  }

  const messageAssistant: Message = {
    id: Date.now() + 1,
    conversation_id: targetConvId,
    role: 'assistant',
    content: answer,
    created_at: new Date().toISOString()
  }

  // Update mock database
  currentConv.messages.push(messageUser, messageAssistant)
  saveStoredConversations(convs)

  return {
    chatResponse: {
      answer,
      sources
    },
    conversationId: targetConvId,
    messageUser,
    messageAssistant
  }
}

export async function eliminarConversacion(id: number): Promise<void> {
  await delay(300)
  const convs = getStoredConversations()
  const updated = convs.filter(c => c.id !== id)
  saveStoredConversations(updated)
}