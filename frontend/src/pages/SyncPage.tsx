import { useState, useEffect, useCallback } from 'react'
import { sincronizarDocumentos } from '../services/sync'
import { listarDocumentos } from '../services/documents'
import type { SyncSummaryResponse, SyncFileDetail, Document } from '../types'
import { useToast } from '../context/ToastContext'

export default function SyncPage() {
  const [syncing, setSyncing] = useState(false)
  const [result, setResult] = useState<SyncSummaryResponse | null>(null)
  const [documents, setDocuments] = useState<Document[]>([])
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date())
  const [error, setError] = useState<string | null>(null)

  const toast = useToast()

  const fetchSyncState = useCallback(async () => {
    try {
      const [docsRes, syncRes] = await Promise.allSettled([
        listarDocumentos(),
        sincronizarDocumentos()
      ])

      if (docsRes.status === 'fulfilled') setDocuments(docsRes.value.documents)
      if (syncRes.status === 'fulfilled') {
        setResult(syncRes.value)
        setLastSyncTime(new Date())
      }
    } catch {
      setError('Error al recuperar el estado del directorio de sincronización.')
    }
  }, [])

  useEffect(() => {
    fetchSyncState()
  }, [fetchSyncState])

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

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Top Header with Sync Action Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold text-neutral-900 tracking-tight leading-tight">
            Sincronizador RAG de Documentos
          </h1>
          <p className="text-xs font-semibold text-neutral-500 mt-1">
            Escaneo y verificación de firmas criptográficas (SHA-256) en el repositorio local <code className="bg-[#FAF8F5] border border-[#E8E2D6] px-1.5 py-0.5 rounded text-neutral-700 font-mono">./documents/</code>
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          <div className="hidden lg:flex px-3 py-2 rounded-xl bg-white border border-[#E8E2D6] shadow-2xs items-center gap-2 text-3xs font-bold text-neutral-600">
            <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
            <span>Último escaneo: {lastSyncTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
          </div>

          <button
            onClick={handleSync}
            disabled={syncing}
            className={`
              px-5 py-2.5 rounded-xl font-bold text-xs text-white shadow-md transition-all flex items-center justify-center gap-2.5 shrink-0 cursor-pointer
              ${syncing 
                ? 'bg-neutral-300 shadow-none cursor-not-allowed' 
                : 'bg-[#9E7111] hover:bg-[#7a5807] shadow-gold-500/20 hover:scale-[1.02] active:scale-95'}
            `}
          >
            <svg 
              className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor" 
              strokeWidth="2.5"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89M9 11l3-3 3 3m-3-3v12" />
            </svg>
            <span>{syncing ? 'Sincronizando...' : 'Sincronizar Ahora'}</span>
          </button>
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

      {/* 2. Repository Status Breakdown Cards (Always Visible) */}
      <div className="bg-white border border-[#E8E2D6] rounded-2xl p-5 sm:p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-[#E8E2D6] pb-3">
          <div>
            <h3 className="font-extrabold text-sm sm:text-base text-neutral-900">
              Estado del Repositorio Físico
            </h3>
            <p className="text-2xs font-semibold text-neutral-400 mt-0.5">
              Comparación diferencial entre archivos locales y la base vectorial
            </p>
          </div>

          {syncing && (
            <div className="flex items-center gap-2 text-xs font-bold text-[#9E7111] animate-pulse">
              <div className="w-2 h-2 rounded-full bg-[#9E7111] animate-ping" />
              <span>Escaneando y recalculando hashes...</span>
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

      {/* 3. Files Summary Table (Always Visible) */}
      <div className="bg-white border border-[#E8E2D6] rounded-2xl overflow-hidden shadow-2xs">
        <div className="p-4 border-b border-[#E8E2D6] bg-[#F5F0E8]/50 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-neutral-900 text-sm">Archivos Procesados en la Base Vectorial</h3>
            <p className="text-3xs text-neutral-400 font-semibold">Trazabilidad por nombre de archivo y firma digital SHA-256</p>
          </div>
          <span className="text-3xs font-extrabold uppercase tracking-wider text-[#9E7111] bg-white px-2 py-0.5 rounded-md border border-[#E8E2D6]">
            {result?.details.length || documents.length} Archivos
          </span>
        </div>

        <div className="divide-y divide-[#E8E2D6] overflow-x-auto max-h-[500px]">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#FAF8F5] text-neutral-500 font-bold border-b border-[#E8E2D6]">
                <th className="p-3.5 pl-5">Documento</th>
                <th className="p-3.5">Firma SHA-256</th>
                <th className="p-3.5">Estado</th>
                <th className="p-3.5 pr-5">Detalle / Observación</th>
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
                      <span className="truncate max-w-[220px] sm:max-w-xs">{item.filename}</span>
                    </td>
                    <td className="p-3.5 font-mono text-3xs text-neutral-400 truncate max-w-[140px]">
                      {item.hash ? `${item.hash.slice(0, 16)}...` : '—'}
                    </td>
                    <td className="p-3.5">
                      <span className={`px-2 py-0.5 rounded-md border text-3xs uppercase tracking-wide font-bold ${getStatusColor(item.status)}`}>
                        {getStatusLabel(item.status)}
                      </span>
                    </td>
                    <td className="p-3.5 pr-5 text-neutral-500 text-3xs leading-relaxed max-w-xs truncate">
                      {item.message || 'Verificado en índice'}
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
                      <span className="truncate max-w-[220px] sm:max-w-xs">{doc.original_name || doc.name}</span>
                    </td>
                    <td className="p-3.5 font-mono text-3xs text-neutral-400 truncate max-w-[140px]">
                      {doc.hash ? `${doc.hash.slice(0, 16)}...` : '—'}
                    </td>
                    <td className="p-3.5">
                      <span className="px-2 py-0.5 rounded-md border text-3xs uppercase tracking-wide font-bold bg-[#FAF8F5] text-neutral-600 border-[#E8E2D6]">
                        Indexado
                      </span>
                    </td>
                    <td className="p-3.5 pr-5 text-neutral-500 text-3xs leading-relaxed max-w-xs truncate">
                      Subido el {new Date(doc.upload_date).toLocaleDateString()}
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
  )
}
