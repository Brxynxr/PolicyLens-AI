import { useState } from 'react'
import { sincronizarDocumentos } from '../services/sync'
import type { SyncSummaryResponse, SyncFileDetail } from '../types'

export default function SyncPage() {
  const [syncing, setSyncing] = useState(false)
  const [result, setResult] = useState<SyncSummaryResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSync = async () => {
    setSyncing(true)
    setError(null)
    setResult(null)

    try {
      const data = await sincronizarDocumentos()
      setResult(data)
    } catch {
      setError('Ocurrió un error inesperado al intentar sincronizar los directorios.')
    } finally {
      setSyncing(false)
    }
  }

  const getStatusColor = (status: SyncFileDetail['status']) => {
    switch (status) {
      case 'added': return 'bg-success/10 text-success border-success/20'
      case 'updated': return 'bg-warning/10 text-warning border-warning/20'
      case 'unchanged': return 'bg-neutral-100 text-neutral-600 border-neutral-200'
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
    <div className="space-y-8 min-h-[calc(100vh-10rem)]">
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-neutral-900 leading-tight">Sincronizador RAG</h1>
        <p className="text-xs font-semibold text-neutral-400 mt-1 uppercase tracking-wider">
          Administración y sincronización automática del repositorio de documentos físicos
        </p>
      </div>

      {/* Sync Action panel */}
      <div className="bg-white border border-brand-200 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-2xs relative overflow-hidden">
        {/* Gold Accent top border */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gold-500" />
        
        <div className="space-y-2 max-w-xl">
          <h2 className="text-sm md:text-base font-bold text-neutral-800 leading-tight">
            Escanear directorio de documentos
          </h2>
          <p className="text-xs text-neutral-500 leading-relaxed font-semibold">
            Este proceso busca archivos <span className="text-neutral-700">.pdf</span>, <span className="text-neutral-700">.docx</span> y <span className="text-neutral-700">.html</span> en el directorio compartido de la empresa (<code className="bg-neutral-100 px-1.5 py-0.5 rounded-sm font-semibold">./documents/</code>), compara sus firmas digitales (SHA-256) con la base de datos e indexa automáticamente cualquier contenido nuevo o modificado.
          </p>
        </div>

        <button
          onClick={handleSync}
          disabled={syncing}
          className={`
            px-6 py-4 rounded-xl text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-3 shrink-0 self-start md:self-auto cursor-pointer
            ${syncing 
              ? 'bg-neutral-300 shadow-none cursor-not-allowed' 
              : 'bg-gold-500 hover:bg-gold-600 shadow-gold-500/20 hover:scale-[1.02]'}
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
          <span>{syncing ? 'Sincronizando...' : 'Sincronizar Ahora'}</span>
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-red-700 text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-200">
          <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {/* Loading layout skeleton */}
      {syncing && (
        <div className="p-8 rounded-2xl border border-brand-200 bg-white text-center space-y-4 animate-pulse">
          <div className="w-10 h-10 rounded-full border-4 border-gold-200 border-t-gold-500 animate-spin mx-auto" />
          <p className="text-xs font-bold text-neutral-800">Leyendo y recalculando hashes de documentos corporativos...</p>
          <p className="text-2xs text-neutral-400 font-semibold">Generando embeddings e indexando fragmentos de texto en base de datos vectorial.</p>
        </div>
      )}

      {/* Results grid layout */}
      {result && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          {/* Dashboard highlights counter */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white border border-brand-200 p-4.5 rounded-2xl flex items-center gap-3.5 shadow-2xs">
              <div className="w-10 h-10 rounded-xl bg-success/10 text-success flex items-center justify-center font-bold text-sm shrink-0">
                {result.added.length}
              </div>
              <div className="min-w-0">
                <p className="text-2xs font-semibold text-neutral-400 uppercase tracking-wider">Nuevos</p>
                <p className="text-xs font-bold text-neutral-800 truncate mt-0.5">Agregados al índice</p>
              </div>
            </div>

            <div className="bg-white border border-brand-200 p-4.5 rounded-2xl flex items-center gap-3.5 shadow-2xs">
              <div className="w-10 h-10 rounded-xl bg-warning/10 text-warning flex items-center justify-center font-bold text-sm shrink-0">
                {result.updated.length}
              </div>
              <div className="min-w-0">
                <p className="text-2xs font-semibold text-neutral-400 uppercase tracking-wider">Modificados</p>
                <p className="text-xs font-bold text-neutral-800 truncate mt-0.5">Actualizados</p>
              </div>
            </div>

            <div className="bg-white border border-brand-200 p-4.5 rounded-2xl flex items-center gap-3.5 shadow-2xs">
              <div className="w-10 h-10 rounded-xl bg-neutral-100 text-neutral-600 flex items-center justify-center font-bold text-sm shrink-0">
                {result.unchanged.length}
              </div>
              <div className="min-w-0">
                <p className="text-2xs font-semibold text-neutral-400 uppercase tracking-wider">Sin cambios</p>
                <p className="text-xs font-bold text-neutral-800 truncate mt-0.5">Ignorados</p>
              </div>
            </div>

            <div className="bg-white border border-brand-200 p-4.5 rounded-2xl flex items-center gap-3.5 shadow-2xs">
              <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center font-bold text-sm shrink-0">
                {result.errors.length}
              </div>
              <div className="min-w-0">
                <p className="text-2xs font-semibold text-neutral-400 uppercase tracking-wider">Errores</p>
                <p className="text-xs font-bold text-neutral-800 truncate mt-0.5">Fallidos</p>
              </div>
            </div>
          </div>

          {/* Detailed items list table */}
          <div className="bg-white border border-brand-200 rounded-2xl overflow-hidden shadow-2xs">
            <div className="p-4 border-b border-brand-200 bg-brand-50/30">
              <h3 className="font-bold text-neutral-800 text-sm">Resumen de Archivos Procesados</h3>
            </div>
            
            <div className="divide-y divide-brand-200 overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-brand-50/50 text-neutral-500 font-semibold">
                    <th className="p-3.5 pl-5">Nombre del archivo</th>
                    <th className="p-3.5">Firma Digital (SHA-256)</th>
                    <th className="p-3.5">Estado</th>
                    <th className="p-3.5 pr-5">Detalle/Observación</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-100 font-medium">
                  {result.details.map((item, idx) => (
                    <tr key={idx} className="hover:bg-brand-50/10 transition-colors">
                      <td className="p-3.5 pl-5 font-bold text-neutral-800">{item.filename}</td>
                      <td className="p-3.5 font-mono text-3xs text-neutral-400">{item.hash || '—'}</td>
                      <td className="p-3.5">
                        <span className={`px-2 py-0.5 rounded-md border text-3xs uppercase tracking-wide font-bold ${getStatusColor(item.status)}`}>
                          {getStatusLabel(item.status)}
                        </span>
                      </td>
                      <td className="p-3.5 pr-5 text-neutral-500 text-3xs leading-relaxed max-w-xs truncate">{item.message || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
