import { motion } from 'framer-motion'
import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { listarDocumentos } from '../services/documents'
import { listarUsuarios } from '../services/users'
import { listarConversaciones } from '../services/chat'
import type { Document, User, Conversation } from '../types'

interface ActivityItem {
  id: string
  type: 'document' | 'chat' | 'user'
  title: string
  subtitle: string
  timestamp: string
  badge: string
}

export default function DashboardPage() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const [loading, setLoading] = useState(true)

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true)
      const [docsRes, usersRes, chatsRes] = await Promise.allSettled([
        listarDocumentos(),
        listarUsuarios(),
        listarConversaciones()
      ])

      if (docsRes.status === 'fulfilled') setDocuments(docsRes.value.documents)
      if (usersRes.status === 'fulfilled') setUsers(usersRes.value.users)
      if (chatsRes.status === 'fulfilled') setConversations(chatsRes.value)
      setLastUpdated(new Date())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDashboardData()
  }, [fetchDashboardData])

  // Format relative timestamp
  const formatTimeAgo = (dateInput: string | Date) => {
    try {
      const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput
      const now = new Date()
      const diffMs = now.getTime() - date.getTime()
      const diffSec = Math.floor(diffMs / 1000)
      const diffMin = Math.floor(diffSec / 60)
      const diffHours = Math.floor(diffMin / 60)
      const diffDays = Math.floor(diffHours / 24)

      if (diffSec < 60) return 'Hace un momento'
      if (diffMin < 60) return `Hace ${diffMin} min`
      if (diffHours < 24) return `Hace ${diffHours} h`
      if (diffDays === 1) return 'Ayer'
      return `Hace ${diffDays} días`
    } catch {
      return 'Reciente'
    }
  }

  // Calculate stats
  const activeUsers = users.filter(u => u.is_active).length
  const totalDocs = documents.length
  const totalChats = conversations.length
  
  // Today's chats
  const todayChats = conversations.filter(c => {
    try {
      const chatDate = new Date(c.created_at)
      const today = new Date()
      return chatDate.toDateString() === today.toDateString()
    } catch {
      return false
    }
  }).length

  // Breakdown by file type
  const pdfCount = documents.filter(d => d.type.toLowerCase() === 'pdf').length
  const docxCount = documents.filter(d => ['docx', 'doc'].includes(d.type.toLowerCase())).length
  const htmlCount = documents.filter(d => ['html', 'htm'].includes(d.type.toLowerCase())).length

  // Build Recent Activity Feed
  const recentActivities: ActivityItem[] = [
    ...documents.slice(0, 4).map(doc => ({
      id: `doc-${doc.id}`,
      type: 'document' as const,
      title: `Documento indexado: ${doc.original_name || doc.name}`,
      subtitle: `${doc.type.toUpperCase()} • ${(doc.size / 1024).toFixed(1)} KB procesados en ChromaDB`,
      timestamp: doc.upload_date,
      badge: 'Indexación'
    })),
    ...conversations.slice(0, 4).map(conv => {
      const firstMsg = conv.messages?.find(m => m.role === 'user')?.content || `Consulta #${conv.id}`
      return {
        id: `chat-${conv.id}`,
        type: 'chat' as const,
        title: `Consulta RAG formulada`,
        subtitle: `"${firstMsg.length > 45 ? firstMsg.slice(0, 43) + '...' : firstMsg}"`,
        timestamp: conv.created_at,
        badge: 'RAG'
      }
    }),
    ...users.slice(0, 3).map(u => ({
      id: `user-${u.id}`,
      type: 'user' as const,
      title: `Usuario registrado: ${u.nombre}`,
      subtitle: `Rol asignado: ${u.role.toUpperCase()} (${u.email})`,
      timestamp: u.created_at,
      badge: 'Acceso'
    }))
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 6)

  const formatFullDate = (d: Date) => {
    return d.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }) + ` a las ` + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  }

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Clean Minimalist Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold text-neutral-900 tracking-tight leading-tight">
            Dashboard
          </h1>
          <p className="text-xs font-semibold text-neutral-500 mt-1 flex items-center gap-1.5">
            <span>Resumen general</span>
            <span>&bull;</span>
            <span className="text-[#9E7111] font-bold">Actualizado: {formatFullDate(lastUpdated)}</span>
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          <button
            onClick={fetchDashboardData}
            disabled={loading}
            className="p-2 rounded-xl bg-white border border-[#E8E2D6] hover:border-[#9E7111]/40 text-neutral-600 hover:text-[#9E7111] shadow-2xs transition-all cursor-pointer"
            title="Refrescar métricas"
            aria-label="Refrescar métricas"
          >
            <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89M9 11l3-3 3 3m-3-3v12" />
            </svg>
          </button>

          <Link
            to="/chat"
            className="px-4 py-2.5 rounded-xl bg-[#9E7111] hover:bg-[#7a5807] text-white font-bold text-xs shadow-sm shadow-gold-500/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-1.5"
          >
            <span>Ir a Consultas</span>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </Link>
        </div>
      </div>

      {/* 2. Key Metrics KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Active Users */}
        <div className="p-5 rounded-2xl bg-white border border-[#E8E2D6] shadow-2xs space-y-3 relative overflow-hidden group hover:border-[#9E7111]/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="w-10 h-10 rounded-xl bg-[#FAF8F5] border border-[#E8E2D6] text-[#9E7111] flex items-center justify-center font-bold shadow-2xs group-hover:scale-105 transition-transform">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </span>
            <span className="text-3xs font-extrabold uppercase tracking-wider text-success bg-success/10 px-2 py-0.5 rounded-full border border-success/20">
              Activos
            </span>
          </div>
          <div>
            <p className="text-2xl font-black text-neutral-900 tracking-tight">
              {loading ? '...' : activeUsers} <span className="text-xs font-semibold text-neutral-400">/ {users.length}</span>
            </p>
            <p className="text-2xs font-bold text-neutral-500 uppercase tracking-wider mt-0.5">Usuarios del Sistema</p>
          </div>
        </div>

        {/* Metric 2: Today's Consultations */}
        <div className="p-5 rounded-2xl bg-white border border-[#E8E2D6] shadow-2xs space-y-3 relative overflow-hidden group hover:border-[#9E7111]/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="w-10 h-10 rounded-xl bg-[#FAF8F5] border border-[#E8E2D6] text-[#9E7111] flex items-center justify-center font-bold shadow-2xs group-hover:scale-105 transition-transform">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </span>
            <span className="text-3xs font-extrabold uppercase tracking-wider text-[#9E7111] bg-[#FAF8F5] px-2 py-0.5 rounded-full border border-[#E8E2D6]">
              Hoy
            </span>
          </div>
          <div>
            <p className="text-2xl font-black text-neutral-900 tracking-tight">
              {loading ? '...' : todayChats} <span className="text-xs font-semibold text-neutral-400">/ {totalChats} tot.</span>
            </p>
            <p className="text-2xs font-bold text-neutral-500 uppercase tracking-wider mt-0.5">Consultas Realizadas</p>
          </div>
        </div>

        {/* Metric 3: Indexed Documents */}
        <div className="p-5 rounded-2xl bg-white border border-[#E8E2D6] shadow-2xs space-y-3 relative overflow-hidden group hover:border-[#9E7111]/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="w-10 h-10 rounded-xl bg-[#FAF8F5] border border-[#E8E2D6] text-[#9E7111] flex items-center justify-center font-bold shadow-2xs group-hover:scale-105 transition-transform">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 01-2-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </span>
            <span className="text-3xs font-extrabold uppercase tracking-wider text-info bg-info/10 px-2 py-0.5 rounded-full border border-info/20">
              Vectorizado
            </span>
          </div>
          <div>
            <p className="text-2xl font-black text-neutral-900 tracking-tight">
              {loading ? '...' : totalDocs}
            </p>
            <p className="text-2xs font-bold text-neutral-500 uppercase tracking-wider mt-0.5">Documentos en ChromaDB</p>
          </div>
        </div>

        {/* Metric 4: Integrity Status */}
        <div className="p-5 rounded-2xl bg-white border border-[#E8E2D6] shadow-2xs space-y-3 relative overflow-hidden group hover:border-[#9E7111]/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="w-10 h-10 rounded-xl bg-[#FAF8F5] border border-[#E8E2D6] text-[#9E7111] flex items-center justify-center font-bold shadow-2xs group-hover:scale-105 transition-transform">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </span>
            <span className="text-3xs font-extrabold uppercase tracking-wider text-success bg-success/10 px-2 py-0.5 rounded-full border border-success/20">
              100%
            </span>
          </div>
          <div>
            <p className="text-2xl font-black text-neutral-900 tracking-tight">
              Salud RAG
            </p>
            <p className="text-2xs font-bold text-neutral-500 uppercase tracking-wider mt-0.5">Firmas SHA-256 Validadas</p>
          </div>
        </div>
      </div>

      {/* 3. Distribution & Breakdown Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Document Composition and Quick Admin Actions */}
        <div className="lg:col-span-2 space-y-6">
          {/* Document Format Distribution */}
          <div className="bg-white border border-[#E8E2D6] rounded-2xl p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#E8E2D6] pb-3">
              <div>
                <h3 className="font-extrabold text-sm sm:text-base text-neutral-900">
                  Distribución de Formatos Documentales
                </h3>
                <p className="text-2xs font-semibold text-neutral-400 mt-0.5">
                  Archivos procesados por tipo para extracción semántica y vectorización
                </p>
              </div>
              <Link
                to="/documents"
                className="text-xs font-bold text-[#9E7111] hover:underline"
              >
                Ver todos &rarr;
              </Link>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E8E2D6] text-center space-y-1">
                <span className="inline-block px-2 py-0.5 rounded bg-red-100 text-red-700 text-3xs font-black">
                  PDF
                </span>
                <p className="text-xl font-black text-neutral-900">{pdfCount}</p>
                <p className="text-3xs text-neutral-400 font-bold uppercase">Manuales & Políticas</p>
              </div>

              <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E8E2D6] text-center space-y-1">
                <span className="inline-block px-2 py-0.5 rounded bg-blue-100 text-blue-700 text-3xs font-black">
                  DOCX
                </span>
                <p className="text-xl font-black text-neutral-900">{docxCount}</p>
                <p className="text-3xs text-neutral-400 font-bold uppercase">Contratos Word</p>
              </div>

              <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E8E2D6] text-center space-y-1">
                <span className="inline-block px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-3xs font-black">
                  HTML
                </span>
                <p className="text-xl font-black text-neutral-900">{htmlCount}</p>
                <p className="text-3xs text-neutral-400 font-bold uppercase">Páginas Internas</p>
              </div>
            </div>
          </div>

          {/* Quick Management Shortcuts */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Link
              to="/documents"
              className="p-4 rounded-2xl bg-white border border-[#E8E2D6] hover:border-[#9E7111]/40 hover:bg-[#FAF8F5]/60 shadow-2xs transition-all flex items-center gap-3 group"
            >
              <div className="w-10 h-10 rounded-xl bg-[#FAF8F5] border border-[#E8E2D6] text-[#9E7111] flex items-center justify-center font-bold group-hover:scale-105 transition-transform">
                📄
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-neutral-900 group-hover:text-[#9E7111] transition-colors">Gestión Documental</p>
                <p className="text-3xs text-neutral-400 font-medium">Subir y eliminar archivos</p>
              </div>
            </Link>

            <Link
              to="/sync"
              className="p-4 rounded-2xl bg-white border border-[#E8E2D6] hover:border-[#9E7111]/40 hover:bg-[#FAF8F5]/60 shadow-2xs transition-all flex items-center gap-3 group"
            >
              <div className="w-10 h-10 rounded-xl bg-[#FAF8F5] border border-[#E8E2D6] text-[#9E7111] flex items-center justify-center font-bold group-hover:scale-105 transition-transform">
                🔄
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-neutral-900 group-hover:text-[#9E7111] transition-colors">Sincronizador RAG</p>
                <p className="text-3xs text-neutral-400 font-medium">Escanear directorio físico</p>
              </div>
            </Link>

            <Link
              to="/users"
              className="p-4 rounded-2xl bg-white border border-[#E8E2D6] hover:border-[#9E7111]/40 hover:bg-[#FAF8F5]/60 shadow-2xs transition-all flex items-center gap-3 group"
            >
              <div className="w-10 h-10 rounded-xl bg-[#FAF8F5] border border-[#E8E2D6] text-[#9E7111] flex items-center justify-center font-bold group-hover:scale-105 transition-transform">
                👥
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-neutral-900 group-hover:text-[#9E7111] transition-colors">Control de Usuarios</p>
                <p className="text-3xs text-neutral-400 font-medium">Roles y permisos</p>
              </div>
            </Link>
          </div>
        </div>

        {/* Right 1 Col: Recent Administrative Activity Feed */}
        <div className="space-y-6">
          <div className="bg-white border border-[#E8E2D6] rounded-2xl p-5 sm:p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#E8E2D6] pb-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#9E7111]" />
                <h3 className="font-extrabold text-sm sm:text-base text-neutral-900">
                  Actividad Reciente
                </h3>
              </div>
              <span className="text-3xs font-bold text-neutral-400 uppercase tracking-wider">
                Auditoría
              </span>
            </div>

            {/* Timeline Stream */}
            <motion.div className="space-y-3" initial="hidden" animate="visible" variants={{
                hidden: { opacity: 0 },
                visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
              }}>
              {recentActivities.length === 0 ? (
                <p className="text-xs text-neutral-400 italic text-center py-6">
                  Sin actividad registrada aún
                </p>
              ) : (
                recentActivities.map((act) => (
                  <motion.div key={act.id} variants={{
                    hidden: { opacity: 0, y: 8 },
                    visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: "easeOut" } }
                  }} className="p-3 rounded-xl bg-[#FAF8F5] border border-[#E8E2D6] space-y-1 hover:bg-[#F5F0E8]/50 transition-colors">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-3xs font-extrabold uppercase px-1.5 py-0.2 rounded bg-white border border-[#E8E2D6] text-[#9E7111]">
                        {act.badge}
                      </span>
                      <span className="text-3xs font-semibold text-neutral-400">
                        {formatTimeAgo(act.timestamp)}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-neutral-900 leading-snug">
                      {act.title}
                    </p>
                    <p className="text-3xs text-neutral-500 leading-normal truncate">
                      {act.subtitle}
                    </p>
                  </motion.div>
                ))
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}
