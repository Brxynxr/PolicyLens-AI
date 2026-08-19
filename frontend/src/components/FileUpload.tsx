import { useState, useRef } from 'react'
import { subirDocumento } from '../services/documents'
import type { Document } from '../types'

interface FileUploadProps {
  onUploadSuccess: (doc: Document) => void
  onClose: () => void
}

export default function FileUpload({ onUploadSuccess, onClose }: FileUploadProps) {
  const [dragActive, setDragActive] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const inputRef = useRef<HTMLInputElement>(null)

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const validateFile = (selectedFile: File): boolean => {
    const ext = selectedFile.name.split('.').pop()?.toLowerCase() || ''
    const allowed = ['pdf', 'docx', 'html', 'htm']
    if (!allowed.includes(ext)) {
      setError(`Tipo de archivo no permitido. Solo se aceptan extensiones: .pdf, .docx, .html, .htm`)
      setFile(null)
      return false
    }
    setError(null)
    return true
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const selectedFile = e.dataTransfer.files[0]
      if (validateFile(selectedFile)) {
        setFile(selectedFile)
      }
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault()
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0]
      if (validateFile(selectedFile)) {
        setFile(selectedFile)
      }
    }
  }

  const triggerInput = () => {
    inputRef.current?.click()
  }

  const handleUploadSubmit = async () => {
    if (!file || uploading) return
    setUploading(true)
    setError(null)
    setProgress(0)

    try {
      const doc = await subirDocumento(file, (percent) => {
        setProgress(percent)
      })
      onUploadSuccess(doc)
      setFile(null)
      setProgress(0)
    } catch (err: any) {
      setError(err.message || 'Error al procesar el archivo.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-brand-200 shadow-lg p-6 max-w-lg w-full relative animate-in fade-in zoom-in-95 duration-200">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-bold text-neutral-800 text-base leading-tight">Subir Documento</h2>
          <p className="text-2xs text-neutral-400 mt-1 font-semibold">Carga archivos corporativos para indexar en la base de datos RAG</p>
        </div>
        <button 
          onClick={onClose}
          disabled={uploading}
          className="p-1.5 rounded-lg border border-brand-200 bg-white text-neutral-400 hover:text-neutral-700 hover:bg-brand-50 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Drag & Drop Area */}
      {!file && (
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={triggerInput}
          className={`
            border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-300 flex flex-col items-center justify-center min-h-56
            ${dragActive 
              ? 'border-gold-500 bg-gold-50/10' 
              : 'border-brand-300 hover:border-gold-400 hover:bg-brand-50/10'}
          `}
        >
          <input
            ref={inputRef}
            type="file"
            onChange={handleChange}
            accept=".pdf,.docx,.html,.htm"
            className="hidden"
          />

          <div className="w-12 h-12 rounded-xl bg-brand-100 text-gold-600 flex items-center justify-center mb-4 shadow-sm">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
          </div>

          <p className="text-sm font-bold text-neutral-800 leading-tight">
            Arrastra tu archivo aquí o haz click para explorar
          </p>
          <p className="text-xs text-neutral-400 mt-2 font-medium">
            Formatos admitidos: PDF, Word (DOCX) y HTML (Máx. 10MB)
          </p>
        </div>
      )}

      {/* File Selected Area */}
      {file && (
        <div className="p-4 rounded-xl border border-brand-200 bg-brand-50/30 space-y-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-gold-100 text-gold-600 border border-gold-200 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-neutral-800 truncate leading-snug">
                {file.name}
              </p>
              <p className="text-2xs text-neutral-400 font-medium">
                {(file.size / 1024).toFixed(1)} KB
              </p>
            </div>

            {!uploading && (
              <button
                onClick={() => setFile(null)}
                className="p-1 rounded-lg text-neutral-400 hover:text-red-500 hover:bg-red-50/50 transition-all cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
          </div>

          {/* Progress loader */}
          {uploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-2xs font-semibold text-neutral-500">
                <span>{progress === 100 ? 'Procesando RAG...' : 'Subiendo archivo...'}</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full bg-neutral-200 rounded-full h-1.5 overflow-hidden">
                <div 
                  className="bg-gold-500 h-1.5 rounded-full transition-all duration-150"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Error alert */}
      {error && (
        <div className="mt-4 p-3.5 rounded-xl bg-red-50 border border-red-100 text-red-700 text-xs font-semibold flex items-center gap-2">
          <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {/* Footer action buttons */}
      {file && !uploading && (
        <div className="mt-6 flex gap-3">
          <button
            onClick={() => setFile(null)}
            className="flex-1 px-4 py-3 rounded-xl border border-brand-200 bg-white hover:bg-brand-50 text-neutral-600 font-bold text-sm transition-all cursor-pointer"
          >
            Cancelar
          </button>
          
          <button
            onClick={handleUploadSubmit}
            className="flex-1 px-4 py-3 rounded-xl bg-gold-500 hover:bg-gold-600 text-white font-bold text-sm shadow-md shadow-gold-500/20 hover:scale-[1.01] transition-all cursor-pointer"
          >
            Cargar e Indexar
          </button>
        </div>
      )}
    </div>
  )
}
