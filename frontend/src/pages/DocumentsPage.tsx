import { useState, useEffect } from 'react'
import { listarDocumentos, eliminarDocumento, reindexarDocumentos, obtenerEstadisticasDocumentos } from '../services/documents'
import type { Document, DocumentStatsResponse } from '../types'
import FileUpload from '../components/FileUpload'
import ConfirmDialog from '../components/ConfirmDialog'

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [total, setTotal] = useState(0)
  const [stats, setStats] = useState<DocumentStatsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [isUploadOpen, setIsUploadOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [docToDelete, setDocToDelete] = useState<Document | null>(null)
  const [reindexing, setReindexing] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const fetchDocs = async () => {
    try {
      setLoading(true)
      const [res, statsRes] = await Promise.all([
        listarDocumentos(),
        obtenerEstadisticasDocumentos()
      ])
      setDocuments(res.documents)
      setTotal(res.total)
      if (statsRes) setStats(statsRes)
    } catch {
      setError('Error al recuperar la lista de documentos.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDocs()
  }, [])

  const handleDelete = async () => {
    if (!docToDelete) return
    setDeletingId(docToDelete.id)
    try {
      await eliminarDocumento(docToDelete.id)
      await fetchDocs()
      setDocToDelete(null)
    } catch {
      setError('Error al eliminar el documento.')
    } finally {
      setDeletingId(null)
    }
  }

  const handleReindex = async () => {
    try {
      setReindexing(true)
      setError(null)
      setSuccessMsg(null)
      const res = await reindexarDocumentos()
      await fetchDocs()
      setSuccessMsg(`Reindexación completa: ${res.total_chunks} chunks generados en total.`)
    } catch {
      setError('Error al reindexar los documentos.')
    } finally {
      setReindexing(false)
    }
  }

  const handleUploadSuccess = () => {
    setIsUploadOpen(false)
    fetchDocs()
  }

  const getFileIcon = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase()
    switch (ext) {
      case 'pdf':
        return (
          <div className="p-2 bg-[#FF6B6B]/10 text-[#FF6B6B] rounded-lg">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
        )
      case 'docx':
      case 'doc':
        return (
          <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
        )
      case 'html':
      case 'htm':
        return (
          <div className="p-2 bg-[#48BB78]/10 text-[#48BB78] rounded-lg">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
          </div>
        )
      default:
        return (
          <div className="p-2 bg-slate-100 text-slate-600 rounded-lg">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
        )
    }
  }

  const getFileExtension = (filename: string) => {
    return filename.split('.').pop()?.toUpperCase() || 'FILE'
  }

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-4 rounded-xl bg-[#7C3AED]/5 border border-[#7C3AED]/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex gap-3">
          <span className="shrink-0 text-[#7C3AED]">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </span>
          <div>
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">Base Documental Activa</h4>
            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed font-medium">
              Los archivos subidos se persisten en la base de datos. Las consultas del chat responderan segun el contenido indexado.
            </p>
          </div>
        </div>
      </div>

      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 leading-tight">Gestion de Documentos y Base Vectorial</h1>
          <p className="text-xs font-semibold text-slate-400 mt-1 uppercase tracking-wider">
            Modelo Activo: {stats?.embedding_model || 'intfloat/multilingual-e5-small'} ({stats?.embedding_dim || 384}d) &bull; ChromaDB Store
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={handleReindex}
            disabled={reindexing}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-bold transition-all border border-amber-200 disabled:opacity-50 cursor-pointer"
          >
            {reindexing ? (
              <div className="w-4 h-4 border-2 border-amber-300 border-t-amber-700 rounded-full animate-spin"></div>
            ) : (
              <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            )}
            {reindexing ? 'Reindexando...' : 'Re-Indexar Todo'}
          </button>
          <button
            onClick={() => fetchDocs()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all border border-slate-200 cursor-pointer"
          >
            <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Actualizar
          </button>
          <button
            onClick={() => setIsUploadOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-bold shadow-md shadow-[#7C3AED]/20 transition-all cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Subir Documento
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-[#FF6B6B]/10 border border-[#FF6B6B]/20 text-[#FF6B6B] text-xs font-semibold flex items-center gap-2">
          <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold flex items-center gap-2">
          <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <span>{successMsg}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="p-3.5 rounded-xl bg-[#7C3AED]/10 text-[#7C3AED] border border-[#7C3AED]/20">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Documentos</span>
            <p className="text-2xl font-black text-slate-900">{total}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="p-3.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Chunks</span>
            <p className="text-2xl font-black text-slate-900">{stats?.total_chunks ?? 0}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="p-3.5 rounded-xl bg-[#48BB78]/10 text-[#48BB78] border border-[#48BB78]/20">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Estado ChromaDB</span>
            <p className="text-sm font-bold text-[#48BB78] mt-1 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#48BB78]"></span> {stats?.chroma_status || 'Conectado'} ({stats?.embedding_dim || 384}d)
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="p-3.5 rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Inferencia LLM</span>
            <p className="text-sm font-bold text-slate-800 mt-1">{stats?.llm_provider || 'Ollama Local (phi4-mini)'}</p>
          </div>
        </div>
      </div>

      {/* Document Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Archivos Indexados en el Conocimiento RAG</h3>
            <p className="text-xs text-slate-400">Directorio de origen: <code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">./documents</code></p>
          </div>
          <span className="text-xs font-semibold text-slate-500">Chunker: 1800 chars / 360 overlap</span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-400">
            <div className="inline-block w-6 h-6 border-2 border-slate-200 border-t-[#7C3AED] rounded-full animate-spin"></div>
            <p className="mt-2 text-xs font-medium">Cargando documentos...</p>
          </div>
        ) : documents.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mx-auto mb-4">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-sm font-bold text-slate-800">No hay documentos indexados</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
              Sube tu primer archivo PDF, DOCX o HTML para comenzar a realizar preguntas sobre el.
            </p>
            <button
              onClick={() => setIsUploadOpen(true)}
              className="mt-4 px-4 py-2 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-bold shadow-md shadow-[#7C3AED]/20 transition-all"
            >
              Subir primer archivo
            </button>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="py-3.5 px-6">Documento</th>
                <th className="py-3.5 px-6">Formato</th>
                <th className="py-3.5 px-6">Fecha</th>
                <th className="py-3.5 px-6">Estado</th>
                <th className="py-3.5 px-6 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
              {documents.map((doc) => (
                <tr key={doc.id} className="hover:bg-slate-50/50 transition-all">
                  <td className="py-4 px-6 font-bold text-slate-900 flex items-center gap-3">
                    {getFileIcon(doc.original_name)}
                    {doc.original_name}
                  </td>
                  <td className="py-4 px-6">
                    <span className="bg-slate-100 px-2 py-1 rounded text-slate-600 font-bold">
                      {getFileExtension(doc.original_name)}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-slate-500">
                    {new Date(doc.upload_date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="py-4 px-6">
                    {doc.status === 'processed' || doc.status === undefined ? (
                      <span className="bg-[#48BB78]/10 text-[#48BB78] px-2.5 py-1 rounded-full font-bold text-[10px]">
                        INDEXADO
                      </span>
                    ) : doc.status === 'error' ? (
                      <span className="bg-red-100 text-red-500 px-2.5 py-1 rounded-full font-bold text-[10px]">
                        ERROR
                      </span>
                    ) : (
                      <span className="bg-amber-100 text-amber-600 px-2.5 py-1 rounded-full font-bold text-[10px]">
                        PENDIENTE
                      </span>
                    )}
                  </td>
                  <td className="py-4 px-6 text-right">
                    <button
                      onClick={() => setDocToDelete(doc)}
                      disabled={deletingId === doc.id}
                      className="text-slate-400 hover:text-[#FF6B6B] transition-all disabled:opacity-50"
                    >
                      {deletingId === doc.id ? (
                        <div className="w-4 h-4 border-2 border-slate-200 border-t-[#FF6B6B] rounded-full animate-spin"></div>
                      ) : (
                        <svg className="w-4 h-4 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {docToDelete && (
        <ConfirmDialog
          title="Eliminar documento"
          message={`¿Seguro que deseas eliminar "${docToDelete.original_name}" de la base vectorial? Las consultas RAG ya no tendran acceso a él.`}
          confirmLabel="Eliminar"
          loading={deletingId !== null}
          onConfirm={handleDelete}
          onClose={() => setDocToDelete(null)}
        />
      )}

      {/* Floating Upload Modal */}
      {isUploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-brand-900/60 backdrop-blur-sm transition-opacity"
            onClick={() => setIsUploadOpen(false)}
          />
          <FileUpload 
            onUploadSuccess={handleUploadSuccess} 
            onClose={() => setIsUploadOpen(false)} 
          />
        </div>
      )}
    </div>
  )
}
