import { useState, useRef } from 'react'
import { subirDocumento } from '../services/documents'

interface FileUploadProps {
  onUploadSuccess: () => void
  onClose: () => void
}

export default function FileUpload({ onUploadSuccess, onClose }: FileUploadProps) {
  const [dragActive, setDragActive] = useState(false)
  const [files, setFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentFileIndex, setCurrentFileIndex] = useState(0)
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

  const filterValidFiles = (selectedFiles: FileList | File[]): File[] => {
    const allowed = ['pdf', 'docx', 'html', 'htm']
    const valid: File[] = []
    const invalid: string[] = []

    Array.from(selectedFiles).forEach(file => {
      const ext = file.name.split('.').pop()?.toLowerCase() || ''
      if (allowed.includes(ext)) {
        valid.push(file)
      } else {
        invalid.push(file.name)
      }
    })

    if (invalid.length > 0) {
      setError(`Archivos no permitidos (${invalid.join(', ')}). Solo se aceptan: .pdf, .docx, .html, .htm`)
    } else {
      setError(null)
    }

    return valid
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const validFiles = filterValidFiles(e.dataTransfer.files)
      if (validFiles.length > 0) {
        setFiles(prev => [...prev, ...validFiles])
      }
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault()
    if (e.target.files && e.target.files.length > 0) {
      const validFiles = filterValidFiles(e.target.files)
      if (validFiles.length > 0) {
        setFiles(prev => [...prev, ...validFiles])
      }
    }
  }

  const triggerInput = () => {
    inputRef.current?.click()
  }

  const handleRemoveFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleUploadSubmit = async () => {
    if (files.length === 0 || uploading) return
    setUploading(true)
    setError(null)
    setProgress(0)

    try {
      for (let i = 0; i < files.length; i++) {
        setCurrentFileIndex(i)
        const currentFile = files[i]
        await subirDocumento(currentFile, (filePercent) => {
          const fileWeight = 100 / files.length
          const totalProgress = Math.round(i * fileWeight + (filePercent / 100) * fileWeight)
          setProgress(totalProgress)
        })
      }
      setFiles([])
      setProgress(0)
      onUploadSuccess()
    } catch (err: any) {
      setError(err.message || 'Error al procesar la carga de archivos.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-brand-200 shadow-lg p-6 max-w-lg w-full relative animate-in fade-in zoom-in-95 duration-200">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-bold text-neutral-800 text-base leading-tight">Subir Documentos</h2>
          <p className="text-2xs text-neutral-400 mt-1 font-semibold">Carga uno o varios archivos corporativos para indexar en RAG</p>
        </div>
        <button 
          onClick={onClose}
          disabled={uploading}
          className="p-1.5 rounded-lg border border-brand-200 bg-white text-neutral-400 hover:text-neutral-700 hover:bg-brand-50 transition-colors cursor-pointer"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Drag & Drop Area */}
      {files.length === 0 && (
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={triggerInput}
          className={`
            border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-300 flex flex-col items-center justify-center min-h-56
            ${dragActive 
              ? 'border-[#7C3AED] bg-[#7C3AED]/10' 
                  : 'bg-brand-350 hover:border-purple-400 hover:bg-brand-50/10'}
          `}
        >
          <input
            ref={inputRef}
            type="file"
            multiple
            onChange={handleChange}
            accept=".pdf,.docx,.html,.htm"
            className="hidden"
          />

          <div className="w-12 h-12 rounded-xl bg-brand-100 text-[#7C3AED] flex items-center justify-center mb-4 shadow-sm">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
          </div>

          <p className="text-sm font-bold text-neutral-800 leading-tight">
            Arrastra tus archivos aquí o haz click para explorar
          </p>
          <p className="text-xs text-neutral-400 mt-2 font-medium">
            Soporta selección múltiple (PDF, Word DOCX y HTML, Máx. 10MB c/u)
          </p>
        </div>
      )}

      {/* Files Selected Area */}
      {files.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-neutral-700">
              {files.length} archivo{files.length > 1 ? 's' : ''} seleccionado{files.length > 1 ? 's' : ''}
            </span>
            {!uploading && (
              <button
                onClick={triggerInput}
                className="text-2xs font-bold text-[#7C3AED] hover:text-[#6D28D9] transition-colors cursor-pointer"
              >
                + Agregar más
              </button>
            )}
          </div>

          <input
            ref={inputRef}
            type="file"
            multiple
            onChange={handleChange}
            accept=".pdf,.docx,.html,.htm"
            className="hidden"
          />

          <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
            {files.map((file, idx) => (
              <div 
                key={`${file.name}-${idx}`} 
                className={`p-3 rounded-xl border flex items-center gap-3 transition-all ${
                  uploading && currentFileIndex === idx 
                    ? 'border-[#7C3AED] bg-[#7C3AED]/20' 
                    : 'border-brand-200 bg-brand-50/30'
                }`}
              >
                <div className="w-8 h-8 rounded-lg bg-[#7C3AED]/10 text-[#7C3AED] border border-[#7C3AED]/20 flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-neutral-800 truncate leading-snug">
                    {file.name}
                  </p>
                  <p className="text-2xs text-neutral-400 font-medium">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>

                {!uploading && (
                  <button
                    onClick={() => handleRemoveFile(idx)}
                    className="p-1 rounded-lg text-neutral-400 hover:text-red-500 hover:bg-red-50/50 transition-all cursor-pointer"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Progress loader */}
          {uploading && (
            <div className="space-y-2 mt-4">
              <div className="flex justify-between text-2xs font-semibold text-neutral-500">
                <span className="truncate max-w-[320px]">Procesando {files[currentFileIndex]?.name} ({currentFileIndex + 1}/{files.length})</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full bg-neutral-200 rounded-full h-1.5 overflow-hidden">
                <div 
                  className="bg-[#7C3AED] h-1.5 rounded-full transition-all duration-150"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-[10px] text-purple-600 font-medium text-center animate-pulse">
                Generando embeddings e indexando en base vectorial...
              </p>
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
      {files.length > 0 && !uploading && (
        <div className="mt-6 flex gap-3">
          <button
            onClick={() => setFiles([])}
            className="flex-1 px-4 py-3 rounded-xl border border-brand-200 bg-white hover:bg-brand-50 text-neutral-600 font-bold text-sm transition-all cursor-pointer"
          >
            Limpiar todo
          </button>
          
          <button
            onClick={handleUploadSubmit}
            className="flex-1 px-4 py-3 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-bold text-sm shadow-md shadow-[#7C3AED]/20 hover:scale-[1.01] transition-all cursor-pointer"
          >
            Cargar e Indexar ({files.length})
          </button>
        </div>
      )}
    </div>
  )
}
