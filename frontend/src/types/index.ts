// Document types based on backend schemas
export interface Document {
  id: number
  name: string
  original_name: string
  type: string
  hash: string
  size: number
  upload_date: string
  status: string
}

export interface DocumentListResponse {
  total: number
  documents: Document[]
}

// Chat types based on backend expected response
export interface ChatSource {
  document: string
  page: number
  section: string
  content: string
}

export interface ChatResponse {
  answer: string
  sources: ChatSource[]
}

export interface Message {
  id: number
  conversation_id: number
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

export interface Conversation {
  id: number
  created_at: string
  messages: Message[]
}

// User types based on backend schemas
export interface User {
  id: number
  nombre: string
  email: string
  role: string
  is_active: boolean
  created_at: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  user: User
  message: string
}

export interface UserListResponse {
  total: number
  users: User[]
}

// Sync types based on backend schemas
export interface SyncFileDetail {
  filename: string
  hash: string
  status: 'added' | 'updated' | 'unchanged' | 'error'
  message?: string
}

export interface SyncSummaryResponse {
  added: string[]
  updated: string[]
  unchanged: string[]
  errors: string[]
  total_processed: number
  details: SyncFileDetail[]
}
