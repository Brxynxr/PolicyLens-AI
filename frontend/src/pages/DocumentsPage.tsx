import { useState, useEffect } from 'react'
import { listarDocumentos, eliminarDocumento } from '../services/documents'
import type { Document } from '../types'
import DocumentCard from '../components/DocumentCard'
import FileUpload from '../components/FileUpload'
import ConfirmDialog from '../components/ConfirmDialog'

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [isUploadOpen, setIsUploadOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [docToDelete, setDocToDelete] = useState<Document | null>(null)

  const fetchDocs = async () => {
    try {
      setLoading(true)
      const res = await listarDocumentos()
      setDocuments(res.documents)
      setTotal(res.total)
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
            <h4 className="text-xs font-bold text-neutral-800 uppercase tracking-wide">Base Documental Simulada</h4>
            <p className="text-2xs text-neutral-500 mt-0.5 leading-relaxed font-semibold">
              Los archivos subidos se persisten en la base de datos. Las consultas del chat responderán según el contenido indexado.
            </p>
          </div>
        </div>
      </div>

      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-neutral-900 leading-tight">Documentos Indexados</h1>
          <p className="text-xs font-semibold text-neutral-400 mt-1 uppercase tracking-wider">
            Mostrando {total} documento{total !== 1 ? 's' : ''} en la base de datos vectorial
          </p>
        </div>
        
        <button
          onClick={() => setIsUploadOpen(true)}
          className="px-4.5 py-3 rounded-xl bg-gold-500 hover:bg-gold-600 text-white font-bold text-sm shadow-md shadow-gold-500/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2 self-start sm:self-auto cursor-pointer"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          <span>Subir Documento</span>
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-red-700 text-xs font-semibold flex items-center gap-2">
          <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="flex gap-4 p-4 rounded-2xl border border-brand-200 bg-white shadow-2xs relative overflow-hidden">
              <div className="w-12 h-12 rounded-xl shrink-0 shimmer-skeleton" />
              <div className="flex-1 space-y-2.5">
                <div className="h-3.5 rounded-md w-3/4 shimmer-skeleton" />
                <div className="h-2.5 rounded-md w-1/2 shimmer-skeleton" />
                <div className="h-2 rounded-md w-1/4 shimmer-skeleton" />
              </div>
            </div>
          ))}
        </div>
      ) : documents.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center bg-white border border-brand-200 rounded-2xl max-w-lg mx-auto shadow-2xs">
          <div className="w-16 h-16 rounded-2xl bg-brand-100 flex items-center justify-center text-gold-600 mb-6 shadow-sm">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 01-2-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-base font-bold text-neutral-800">No hay documentos indexados</h3>
          <p className="text-xs text-neutral-400 mt-2 font-medium max-w-xs leading-relaxed">
            La base de datos vectorial está vacía. Sube tu primer archivo PDF, DOCX o HTML para comenzar a realizar preguntas sobre él.
          </p>
          <button
            onClick={() => setIsUploadOpen(true)}
            className="mt-6 px-4 py-2.5 rounded-xl border border-gold-400 text-gold-600 hover:bg-gold-50/20 font-bold text-xs transition-all cursor-pointer"
          >
            Subir archivo inicial
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {documents.map((doc, index) => (
            <div 
              key={doc.id}
              className="animate-fade-in-up"
              style={{ animationDelay: `${index * 60}ms` }}
            >
              <DocumentCard
                document={doc}
                onDelete={handleDelete}
                deletingId={deletingId}
              />
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {docToDelete && (
        <ConfirmDialog
          title="Eliminar documento"
          message={`¿Seguro que deseas eliminar "${docToDelete.original_name}" de la base vectorial? Las consultas RAG ya no tendrán acceso a él. Esta acción también borra el archivo físico.`}
          confirmLabel="Eliminar"
          loading={deletingId !== null}
          onConfirm={handleDelete}
          onClose={() => setDocToDelete(null)}
        />
      )}

      {/* Floating Upload Modal */}
      {isUploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Overlay Background */}
          <div 
            className="absolute inset-0 bg-neutral-900/40 backdrop-blur-xs transition-opacity"
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