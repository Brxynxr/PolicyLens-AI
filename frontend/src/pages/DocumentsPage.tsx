import { useState, useEffect } from 'react'
import { listarDocumentos, eliminarDocumento } from '../services/documents'
import type { Document } from '../types'
import DocumentCard from '../components/DocumentCard'
import FileUpload from '../components/FileUpload'
import { useToast } from '../context/ToastContext'

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [isUploadOpen, setIsUploadOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const toast = useToast()

  const fetchDocs = async () => {
    try {
      setLoading(true)
      const res = await listarDocumentos()
      setDocuments(res.documents)
      setTotal(res.total)
    } catch {
      setError('Error al recuperar la lista de documentos.')
      toast.error('No se pudo cargar el listado de documentos.', 'Error de Carga')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDocs()
  }, [])

  const handleDelete = async (id: number) => {
    const confirmed = await toast.confirmDialog({
      title: 'Eliminar documento RAG',
      message: '¿Seguro que deseas eliminar este documento de la base vectorial? Las consultas RAG ya no tendrán acceso a él.',
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      isDestructive: true
    })

    if (!confirmed) return

    setDeletingId(id)
    try {
      await eliminarDocumento(id)
      toast.success('Documento eliminado correctamente de la base de datos y del índice vectorial.')
      await fetchDocs()
    } catch {
      setError('Error al eliminar el documento.')
      toast.error('Ocurrió un error al intentar eliminar el documento.', 'Error')
    } finally {
      setDeletingId(null)
    }
  }

  const handleUploadSuccess = () => {
    setIsUploadOpen(false)
    fetchDocs()
  }

  return (
    <div className="space-y-6 relative min-h-[calc(100vh-10rem)]">
      {/* Top Banner Warning: Mock status */}
      <div className="p-4 rounded-xl bg-brand-100 border border-brand-200/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-2xs">
        <div className="flex gap-3">
          <span className="shrink-0 text-gold-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </span>
          <div>
            <h4 className="text-xs font-bold text-neutral-800 uppercase tracking-wide">Base Documental RAG</h4>
            <p className="text-2xs text-neutral-500 mt-0.5 leading-relaxed font-semibold">
              Los archivos subidos se persisten e indexan automáticamente. Las consultas del chat responderán según el contenido activo.
            </p>
          </div>
        </div>
      </div>

      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-neutral-900 leading-tight">Gestión de Documentos</h1>
          <p className="text-xs font-semibold text-neutral-400 mt-1 uppercase tracking-wider">
            {total} documento{total !== 1 ? 's' : ''} indexado{total !== 1 ? 's' : ''} en la base vectorial
          </p>
        </div>

        <button
          onClick={() => setIsUploadOpen(true)}
          className="px-4.5 py-3 rounded-xl bg-gold-500 hover:bg-gold-600 text-white font-bold text-sm shadow-md shadow-gold-500/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2 self-start sm:self-auto cursor-pointer"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          <span>Subir Documentos</span>
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

      {/* Grid of Documents */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-40 rounded-2xl bg-white border border-brand-200 p-5 space-y-4">
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-xl shimmer-skeleton" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 rounded-md w-3/4 shimmer-skeleton" />
                  <div className="h-3 rounded-md w-1/2 shimmer-skeleton" />
                </div>
              </div>
              <div className="h-3 rounded-md w-full shimmer-skeleton" />
            </div>
          ))}
        </div>
      ) : documents.length === 0 ? (
        <div className="bg-white rounded-2xl border border-brand-200 p-12 text-center flex flex-col items-center justify-center">
          <div className="w-16 h-16 rounded-2xl bg-brand-100 flex items-center justify-center text-gold-600 mb-6 shadow-sm">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-base font-bold text-neutral-800">No hay documentos cargados</h3>
          <p className="text-xs text-neutral-400 mt-2 font-medium max-w-xs leading-relaxed">
            Sube archivos en formato PDF, Word o HTML para comenzar a realizar consultas RAG.
          </p>
          <button
            onClick={() => setIsUploadOpen(true)}
            className="mt-6 px-4.5 py-2.5 rounded-xl border border-gold-300 bg-gold-50/50 hover:bg-gold-100 text-gold-700 font-bold text-xs transition-colors cursor-pointer"
          >
            Subir mi primer documento
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {documents.map((doc) => (
            <DocumentCard
              key={doc.id}
              document={doc}
              onDelete={handleDelete}
              deletingId={deletingId}
            />
          ))}
        </div>
      )}

      {/* Upload Modal Drawer */}
      {isUploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/40 backdrop-blur-xs animate-in fade-in duration-200">
          <FileUpload
            onUploadSuccess={handleUploadSuccess}
            onClose={() => setIsUploadOpen(false)}
          />
        </div>
      )}
    </div>
  )
}
