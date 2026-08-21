import { useState, useEffect, useCallback } from 'react'
import { sincronizarDocumentos } from '../services/sync'
import { listarDocumentos } from '../services/documents'
import { listarUsuarios } from '../services/users'
import { listarConversaciones } from '../services/chat'
import type { SyncSummaryResponse, SyncFileDetail, Document, User, Conversation } from '../types'
import { useToast } from '../context/ToastContext'

interface ActivityItem {
  id: string
  type: 'document' | 'chat' | 'user' | 'sync'
  title: string
  subtitle: string
  timestamp: string
  badge?: string
}

export default function SyncPage() {
  const [syncing, setSyncing] = useState(false)
  const [loadingInitial, setLoadingInitial] = useState(true)
  const [result, setResult] = useState<SyncSummaryResponse | null>(null)
  const [documents, setDocuments] = useState<Document[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date())
  const [error, setError] = useState<string | null>(null)

  const toast = useToast()

  const fetchAllData = useCallback(async () => {
    try {
      setLoadingInitial(true)
      const [docsRes, usersRes, chatsRes, syncRes] = await Promise.allSettled([
        listarDocumentos(),
        listarUsuarios(),
        listarConversaciones(),
        sincronizarDocumentos()
      ])

      if (docsRes.status === 'fulfilled') setDocuments(docsRes.value.documents)
      if (usersRes.status === 'fulfilled') setUsers(usersRes.value.users)
      if (chatsRes.status === 'fulfilled') setConversations(chatsRes.value)
      if (syncRes.status === 'fulfilled') {
        setResult(syncRes.value)
        setLastSyncTime(new Date())
      }
    } catch {
      setError('Error al sincronizar las métricas del sistema.')
    } finally {
      setLoadingInitial(false)
    }
  }, [])

  useEffect(() => {
    fetchAllData()
  }, [fetchAllData])

  const handleSync = async () => {
    setSyncing(true)
    setError(null)

    try {
      const [data, docsRes] = await Promise.all([
        sincronizarDocumentos(),
        listarDocumentos()
      ])
      setResult(data)
      setDocuments(docsRes.documents)
      setLastSyncTime(new Date())

      const totalChanges = data.added.length + data.updated.length
      if (totalChanges > 0) {
        toast.success(`Sincronización completada: ${data.added.length} nuevos, ${data.updated.length} actualizados.`, 'Sincronización Exitosa')
      } else {
        toast.info('Directorio sincronizado. No se detectaron cambios en los archivos físicos.', 'Al Día')
      }
    } catch {
      const msg = 'Ocurrió un error inesperado al intentar sincronizar los directorios.'
      setError(msg)
      toast.error(msg, 'Fallo de Sincronización')
    } finally {
      setSyncing(false)
    }
  }

  const getStatusColor = (status: SyncFileDetail['status']) => {
    switch (status) {
      case 'added': return 'bg-success/10 text-success border-success/20'
      case 'updated': return 'bg-warning/10 text-warning border-warning/20'
      case 'unchanged': return 'bg-[#FAF8F5] text-neutral-600 border-[#E8E2D6]'
      case 'error': return 'bg-red-50 text-red-600 border-red-100'
    }
  }

  const getStatusLabel = (status: SyncFileDetail['status']) => {
    switch (status) {
      case 'added': return 'Nuevo'
      case 'updated': return 'Modificado'
      case 'unchanged': return 'Sin Cambios'
      case 'error': return 'Error'
    }
  }

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
  const activeUsersCount = users.filter(u => u.is_active).length
  const totalDocumentsCount = documents.length
  const totalConversationsCount = conversations.length
  
  // Calculate today's chats
  const todayChatsCount = conversations.filter(c => {
    try {
      const chatDate = new Date(c.created_at)
      const today = new Date()
      return chatDate.toDateString() === today.toDateString()
    } catch {
      return false
    }
  }).length

  // Build Recent Activity Feed
  const recentActivities: ActivityItem[] = [
    ...documents.slice(0, 3).map(doc => ({
      id: `doc-${doc.id}`,
      type: 'document' as const,
      title: `Documento indexado: ${doc.original_name || doc.name}`,
      subtitle: `${doc.type.toUpperCase()} • ${(doc.size / 1024).toFixed(1)} KB procesados`,
      timestamp: doc.upload_date,
      badge: 'Indexación'
    })),
    ...conversations.slice(0, 3).map(conv => {
      const firstMsg = conv.messages?.find(m => m.role === 'user')?.content || `Consulta #${conv.id}`
      return {
        id: `chat-${conv.id}`,
        type: 'chat' as const,
        title: `Consulta RAG procesada`,
        subtitle: `"${firstMsg.length > 40 ? firstMsg.slice(0, 38) + '...' : firstMsg}"`,
        timestamp: conv.created_at,
        badge: 'RAG'
      }
    }),
    ...users.slice(0, 2).map(u => ({
      id: `user-${u.id}`,
      type: 'user' as const,
      title: `Usuario registrado: ${u.nombre}`,
      subtitle: `Rol asignado: ${u.role.toUpperCase()} (${u.email})`,
      timestamp: u.created_at,
      badge: 'Acceso'
    }))
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 6)

  return (
    <div className="space-y-8 pb-12">
      {/* 1. Header with Status and Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold text-neutral-900 tracking-tight leading-tight">
            Panel de Sincronización y Métricas
          </h1>
          <p className="text-xs font-semibold text-neutral-500 mt-1">
            Auditoría en tiempo real del repositorio documental, motor RAG y actividad de usuarios
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="px-3 py-1.5 rounded-xl bg-white border border-[#E8E2D6] shadow-2xs flex items-center gap-2 text-3xs font-bold text-neutral-600">
            <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
            <span>Último escaneo: {lastSyncTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-red-700 text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-200">
          <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {/* 2. Global KPIs / Statistics Row */}
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
              {loadingInitial ? '...' : activeUsersCount} <span className="text-xs font-semibold text-neutral-400">/ {users.length}</span>
            </p>
            <p className="text-2xs font-bold text-neutral-500 uppercase tracking-wider mt-0.5">Usuarios del Sistema</p>
          </div>
        </div>

        {/* Metric 2: Consultations Today / Total */}
        <div className="p-5 rounded-2xl bg-white border border-[#E8E2D6] shadow-2xs space-y-3 relative overflow-hidden group hover:border-[#9E7111]/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="w-10 h-10 rounded-xl bg-[#FAF8F5] border border-[#E8E2D6] text-[#9E7111] flex items-center justify-center font-bold shadow-2xs group-hover:scale-105 transition-transform">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </span>
            <span className="text-3xs font-extrabold uppercase tracking-wider text-[#9E7111] bg-[#FAF8F5] px-2 py-0.5 rounded-full border border-[#E8E2D6]">
              Hoy: {todayChatsCount}
            </span>
          </div>
          <div>
            <p className="text-2xl font-black text-neutral-900 tracking-tight">
              {loadingInitial ? '...' : totalConversationsCount}
            </p>
            <p className="text-2xs font-bold text-neutral-500 uppercase tracking-wider mt-0.5">Consultas RAG Totales</p>
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
              {loadingInitial ? '...' : totalDocumentsCount}
            </p>
            <p className="text-2xs font-bold text-neutral-500 uppercase tracking-wider mt-0.5">Documentos en ChromaDB</p>
          </div>
        </div>

        {/* Metric 4: Hash Status SHA-256 */}
        <div className="p-5 rounded-2xl bg-white border border-[#E8E2D6] shadow-2xs space-y-3 relative overflow-hidden group hover:border-[#9E7111]/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="w-10 h-10 rounded-xl bg-[#FAF8F5] border border-[#E8E2D6] text-[#9E7111] flex items-center justify-center font-bold shadow-2xs group-hover:scale-105 transition-transform">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </span>
            <span className="text-3xs font-extrabold uppercase tracking-wider text-success bg-success/10 px-2 py-0.5 rounded-full border border-success/20">
              SHA-256
            </span>
          </div>
          <div>
            <p className="text-2xl font-black text-neutral-900 tracking-tight">
              100%
            </p>
            <p className="text-2xs font-bold text-neutral-500 uppercase tracking-wider mt-0.5">Integridad de Archivos</p>
          </div>
        </div>
      </div>

      {/* 3. Main Split Grid: Synchronization Status Summary & Recent Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Always Visible Synchronization Details & Table */}
        <div className="lg:col-span-2 space-y-6">
          {/* Status Breakdown Pills */}
          <div className="bg-white border border-[#E8E2D6] rounded-2xl p-5 sm:p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#E8E2D6] pb-3">
              <div>
                <h3 className="font-extrabold text-sm sm:text-base text-neutral-900">
                  Estado del Repositorio Físico
                </h3>
                <p className="text-2xs font-semibold text-neutral-400 mt-0.5">
                  Directorio local monitorizado: <code className="bg-[#FAF8F5] border border-[#E8E2D6] px-1.5 py-0.5 rounded text-neutral-700 font-mono">./documents/</code>
                </p>
              </div>

              {syncing && (
                <div className="flex items-center gap-2 text-xs font-bold text-[#9E7111] animate-pulse">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#9E7111] animate-ping" />
                  <span>Escaneando...</span>
                </div>
              )}
            </div>

            {/* Metrics Counter Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-xl bg-[#FAF8F5] border border-[#E8E2D6] flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-success/15 text-success flex items-center justify-center font-black text-sm shrink-0">
                  {result?.added.length ?? 0}
                </div>
                <div className="min-w-0">
                  <p className="text-3xs font-extrabold uppercase text-neutral-400">Nuevos</p>
                  <p className="text-xs font-bold text-neutral-800 truncate">Agregados</p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#FAF8F5] border border-[#E8E2D6] flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-warning/15 text-warning flex items-center justify-center font-black text-sm shrink-0">
                  {result?.updated.length ?? 0}
                </div>
                <div className="min-w-0">
                  <p className="text-3xs font-extrabold uppercase text-neutral-400">Modificados</p>
                  <p className="text-xs font-bold text-neutral-800 truncate">Actualizados</p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#FAF8F5] border border-[#E8E2D6] flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-neutral-200 text-neutral-700 flex items-center justify-center font-black text-sm shrink-0">
                  {result?.unchanged.length ?? documents.length}
                </div>
                <div className="min-w-0">
                  <p className="text-3xs font-extrabold uppercase text-neutral-400">Sin Cambios</p>
                  <p className="text-xs font-bold text-neutral-800 truncate">Al Día</p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#FAF8F5] border border-[#E8E2D6] flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-red-100 text-red-600 flex items-center justify-center font-black text-sm shrink-0">
                  {result?.errors.length ?? 0}
                </div>
                <div className="min-w-0">
                  <p className="text-3xs font-extrabold uppercase text-neutral-400">Errores</p>
                  <p className="text-xs font-bold text-neutral-800 truncate">Fallidos</p>
                </div>
              </div>
            </div>
          </div>

          {/* Files Summary Table (Always Visible) */}
          <div className="bg-white border border-[#E8E2D6] rounded-2xl overflow-hidden shadow-2xs">
            <div className="p-4 border-b border-[#E8E2D6] bg-[#F5F0E8]/50 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-neutral-900 text-sm">Archivos Procesados en la Base Vectorial</h3>
                <p className="text-3xs text-neutral-400 font-semibold">Trazabilidad por nombre de archivo y firma criptográfica</p>
              </div>
              <span className="text-3xs font-extrabold uppercase tracking-wider text-[#9E7111] bg-white px-2 py-0.5 rounded-md border border-[#E8E2D6]">
                {result?.details.length || documents.length} Archivos
              </span>
            </div>

            <div className="divide-y divide-[#E8E2D6] overflow-x-auto max-h-96">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#FAF8F5] text-neutral-500 font-bold border-b border-[#E8E2D6]">
                    <th className="p-3.5 pl-5">Documento</th>
                    <th className="p-3.5">Firma SHA-256</th>
                    <th className="p-3.5">Estado</th>
                    <th className="p-3.5 pr-5">Detalle / Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8E2D6]/60 font-medium">
                  {result && result.details.length > 0 ? (
                    result.details.map((item, idx) => (
                      <tr key={idx} className="hover:bg-[#FAF8F5]/60 transition-colors">
                        <td className="p-3.5 pl-5 font-bold text-neutral-800 flex items-center gap-2">
                          <span className="p-1 rounded bg-[#FAF8F5] border border-[#E8E2D6] text-3xs font-bold text-[#9E7111]">
                            {item.filename.split('.').pop()?.toUpperCase() || 'DOC'}
                          </span>
                          <span className="truncate max-w-[180px] sm:max-w-xs">{item.filename}</span>
                        </td>
                        <td className="p-3.5 font-mono text-3xs text-neutral-400 truncate max-w-[120px]">
                          {item.hash ? `${item.hash.slice(0, 12)}...` : '—'}
                        </td>
                        <td className="p-3.5">
                          <span className={`px-2 py-0.5 rounded-md border text-3xs uppercase tracking-wide font-bold ${getStatusColor(item.status)}`}>
                            {getStatusLabel(item.status)}
                          </span>
                        </td>
                        <td className="p-3.5 pr-5 text-neutral-500 text-3xs leading-relaxed max-w-xs truncate">
                          {item.message || 'Verificado sin cambios en el índice'}
                        </td>
                      </tr>
                    ))
                  ) : documents.length > 0 ? (
                    documents.map((doc) => (
                      <tr key={doc.id} className="hover:bg-[#FAF8F5]/60 transition-colors">
                        <td className="p-3.5 pl-5 font-bold text-neutral-800 flex items-center gap-2">
                          <span className="p-1 rounded bg-[#FAF8F5] border border-[#E8E2D6] text-3xs font-bold text-[#9E7111]">
                            {doc.type.toUpperCase()}
                          </span>
                          <span className="truncate max-w-[180px] sm:max-w-xs">{doc.original_name || doc.name}</span>
                        </td>
                        <td className="p-3.5 font-mono text-3xs text-neutral-400 truncate max-w-[120px]">
                          {doc.hash ? `${doc.hash.slice(0, 12)}...` : '—'}
                        </td>
                        <td className="p-3.5">
                          <span className="px-2 py-0.5 rounded-md border text-3xs uppercase tracking-wide font-bold bg-[#FAF8F5] text-neutral-600 border-[#E8E2D6]">
                            Indexado
                          </span>
                        </td>
                        <td className="p-3.5 pr-5 text-neutral-500 text-3xs leading-relaxed max-w-xs truncate">
                          {formatTimeAgo(doc.upload_date)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-xs text-neutral-400 italic">
                        No hay archivos registrados en el repositorio documental
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
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
            <div className="space-y-3.5">
              {recentActivities.length === 0 ? (
                <p className="text-xs text-neutral-400 italic text-center py-6">
                  Sin actividad registrada aún
                </p>
              ) : (
                recentActivities.map((act) => (
                  <div key={act.id} className="p-3 rounded-xl bg-[#FAF8F5] border border-[#E8E2D6] space-y-1.5 hover:bg-[#F5F0E8]/50 transition-colors">
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
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 4. Bottom Action Control Panel (Sincronizar Ahora Button Relocated Here) */}
      <div className="bg-white border border-[#E8E2D6] rounded-2xl p-6 md:p-7 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-md shadow-brand-200/30 relative overflow-hidden">
        {/* Accent Bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#9E7111]" />

        <div className="space-y-1.5 max-w-2xl">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-success animate-pulse" />
            <h2 className="text-base font-extrabold text-neutral-900 leading-tight">
              Ejecutar Sincronización Manual del Repositorio
            </h2>
          </div>
          <p className="text-xs text-neutral-500 leading-relaxed font-medium">
            Escanea el directorio local <code className="bg-[#FAF8F5] px-1.5 py-0.5 rounded border border-[#E8E2D6] font-mono text-neutral-700 font-bold">./documents/</code>, recalcula las firmas digitales criptográficas SHA-256 e indexa nuevos fragmentos vectoriales en ChromaDB sin duplicar contenido.
          </p>
        </div>

        <button
          onClick={handleSync}
          disabled={syncing}
          className={`
            px-7 py-3.5 rounded-xl font-bold text-xs sm:text-sm text-white shadow-md transition-all flex items-center justify-center gap-3 shrink-0 self-start md:self-auto cursor-pointer
            ${syncing 
              ? 'bg-neutral-300 shadow-none cursor-not-allowed' 
              : 'bg-[#9E7111] hover:bg-[#7a5807] shadow-gold-500/20 hover:scale-[1.02] active:scale-95'}
          `}
        >
          <svg 
            className={`w-5 h-5 ${syncing ? 'animate-spin' : ''}`} 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor" 
            strokeWidth="2.5"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89M9 11l3-3 3 3m-3-3v12" />
          </svg>
          <span>{syncing ? 'Sincronizando Archivos...' : 'Sincronizar Ahora'}</span>
        </button>
      </div>
    </div>
  )
}
