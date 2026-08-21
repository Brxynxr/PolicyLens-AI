import { useState } from 'react'
import { sincronizarDocumentos } from '../services/sync'
import type { SyncSummaryResponse, SyncFileDetail } from '../types'

export default function SyncPage() {
  const [syncing, setSyncing] = useState(false)
  const [result, setResult] = useState<SyncSummaryResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const getStatusColor = (status: SyncFileDetail['status']) => {
    switch (status) {
      case 'added': return 'bg-[#48BB78]/10 text-[#48BB78] border border-[#48BB78]/20'
      case 'updated': return 'bg-amber-50 text-amber-600 border border-amber-100'
      case 'unchanged': return 'bg-slate-100 text-slate-600 border border-slate-200'
      case 'error': return 'bg-[#FF6B6B]/10 text-[#FF6B6B] border border-[#FF6B6B]/20'
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

  const handleSync = async () => {
    setSyncing(true)
    setError(null)
    setResult(null)

    try {
      const data = await sincronizarDocumentos()
      setResult(data)
    } catch {
      setError('Ocurrio un error inesperado al intentar sincronizar los directorios.')
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 leading-tight">Sincronizacion RAG</h1>
          <p className="text-xs font-semibold text-slate-400 mt-1 uppercase tracking-wider">
            Administracion y sincronizacion automatica del repositorio de documentos
          </p>
        </div>
      </div>

      {/* Sync Action Panel */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#7C3AED] to-[#6D28D9]" />
        
        <div className="space-y-2 max-w-xl">
          <h2 className="text-sm md:text-base font-bold text-slate-900 leading-tight">
            Escanear directorio de documentos
          </h2>
          <p className="text-xs text-slate-500 leading-relaxed font-medium">
            Este proceso busca archivos <span className="text-slate-700 font-semibold">.pdf</span>, <span className="text-slate-700 font-semibold">.docx</span> y <span className="text-slate-700 font-semibold">.html</span> en el directorio compartido (<code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 font-semibold">./documents/</code>), compara sus firmas digitales (SHA-256) con la base de datos e indexa automaticamente cualquier contenido nuevo o modificado.
          </p>
        </div>

        <button
          onClick={handleSync}
          disabled={syncing}
          className={`
            px-6 py-4 rounded-xl text-white font-bold text-sm shadow-lg transition-all flex items-center justify-center gap-3 shrink-0 self-start md:self-auto cursor-pointer
            ${syncing 
              ? 'bg-slate-300 shadow-none cursor-not-allowed' 
              : 'bg-gradient-to-r from-[#7C3AED] to-[#6D28D9] shadow-[#7C3AED]/30 hover:shadow-xl hover:shadow-[#7C3AED]/40 hover:scale-[1.02] active:scale-95'}
          `}
        >
          <svg 
            className={`w-5 h-5 shrink-0 ${syncing ? 'animate-spin' : ''}`} 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor" 
            strokeWidth="2"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>{syncing ? 'Sincronizando...' : 'Sincronizar Ahora'}</span>
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-[#FF6B6B]/10 border border-[#FF6B6B]/20 text-[#FF6B6B] text-xs font-semibold flex items-center gap-2 animate-fade-in-up">
          <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {/* Loading skeleton */}
      {syncing && (
        <div className="p-8 rounded-2xl border border-slate-200/80 bg-white text-center space-y-4 shadow-sm">
          <div className="w-10 h-10 border-4 border-slate-200 border-t-[#7C3AED] rounded-full animate-spin mx-auto"></div>
          <p className="text-xs font-bold text-slate-800">Leyendo y recalculando hashes de documentos corporativos...</p>
          <p className="text-xs text-slate-400 font-medium">Generando embeddings e indexando fragmentos de texto en base de datos vectorial.</p>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-6 animate-fade-in-up">
          {/* Dashboard highlights */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200/80 p-5 rounded-2xl flex items-center gap-4 shadow-sm">
              <div className="p-3.5 rounded-xl bg-[#48BB78]/10 text-[#48BB78] border border-[#48BB78]/20">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Nuevos</span>
                <p className="text-2xl font-black text-slate-900">{result.added.length}</p>
              </div>
            </div>

            <div className="bg-white border border-slate-200/80 p-5 rounded-2xl flex items-center gap-4 shadow-sm">
              <div className="p-3.5 rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Modificados</span>
                <p className="text-2xl font-black text-slate-900">{result.updated.length}</p>
              </div>
            </div>

            <div className="bg-white border border-slate-200/80 p-5 rounded-2xl flex items-center gap-4 shadow-sm">
              <div className="p-3.5 rounded-xl bg-slate-100 text-slate-600 border border-slate-200">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Sin cambios</span>
                <p className="text-2xl font-black text-slate-900">{result.unchanged.length}</p>
              </div>
            </div>

            <div className="bg-white border border-slate-200/80 p-5 rounded-2xl flex items-center gap-4 shadow-sm">
              <div className="p-3.5 rounded-xl bg-[#FF6B6B]/10 text-[#FF6B6B] border border-[#FF6B6B]/20">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Errores</span>
                <p className="text-2xl font-black text-slate-900">{result.errors.length}</p>
              </div>
            </div>
          </div>

          {/* Detailed items table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-sm">
            <div className="p-6 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">Resumen de Archivos Procesados</h3>
            </div>
            
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3.5 px-6">Archivo</th>
                  <th className="py-3.5 px-6">Firma Digital</th>
                  <th className="py-3.5 px-6">Estado</th>
                  <th className="py-3.5 px-6">Detalle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                {result.details.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 transition-all">
                    <td className="py-4 px-6 font-bold text-slate-900">{item.filename}</td>
                    <td className="py-4 px-6 font-mono text-[10px] text-slate-400">{item.hash || '---'}</td>
                    <td className="py-4 px-6">
                      <span className={`px-2.5 py-1 rounded-full font-bold text-[10px] ${getStatusColor(item.status)}`}>
                        {getStatusLabel(item.status)}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-slate-500 text-xs max-w-xs truncate">{item.message || '---'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
