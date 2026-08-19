import type { Document } from '../types'

interface DocumentCardProps {
  document: Document
  onDelete: (id: number) => void
  deletingId: number | null
}

export default function DocumentCard({ document, onDelete, deletingId }: DocumentCardProps) {
  const isDeleting = deletingId === document.id

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString)
      return date.toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' })
    } catch {
      return ''
    }
  }

  const getFileBadge = (type: string) => {
    switch (type.toLowerCase()) {
      case 'pdf':
        return (
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-red-50 text-red-700 border border-red-100 font-semibold text-3xs uppercase tracking-wider shrink-0">
            PDF
          </div>
        )
      case 'docx':
      case 'doc':
        return (
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-info/10 text-info border border-info/20 font-semibold text-3xs uppercase tracking-wider shrink-0">
            Word
          </div>
        )
      case 'html':
      case 'htm':
        return (
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-orange-50 text-orange-700 border border-orange-100 font-semibold text-3xs uppercase tracking-wider shrink-0">
            HTML
          </div>
        )
      default:
        return (
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-700 border border-neutral-200 font-semibold text-3xs uppercase tracking-wider shrink-0">
            {type}
          </div>
        )
    }
  }

  const getFileIconColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'pdf': return 'text-red-500 bg-red-50 border-red-100'
      case 'docx':
      case 'doc': return 'text-info bg-info/10 border-info/20'
      case 'html':
      case 'htm': return 'text-orange-500 bg-orange-50 border-orange-100'
      default: return 'text-neutral-500 bg-neutral-100 border-neutral-200'
    }
  }

  return (
    <div 
      className={`
        flex items-start gap-4 p-4 rounded-2xl border border-brand-200 bg-white shadow-2xs hover:shadow-sm hover:border-gold-300 transition-all duration-300 relative group
        ${isDeleting ? 'opacity-50 pointer-events-none' : ''}
      `}
    >
      {/* File Icon container */}
      <div className={`w-12 h-12 rounded-xl border flex items-center justify-center shrink-0 ${getFileIconColor(document.type)}`}>
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      </div>

      {/* Meta Content */}
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2">
          <h3 className="font-bold text-sm text-neutral-800 truncate leading-snug" title={document.original_name}>
            {document.original_name}
          </h3>
        </div>
        
        <p className="text-2xs font-semibold text-neutral-400 flex items-center gap-1.5">
          <span>{formatSize(document.size)}</span>
          <span className="w-1 h-1 rounded-full bg-neutral-300" />
          <span>Subido el {formatDate(document.upload_date)}</span>
        </p>

        <div className="pt-2 flex items-center gap-2">
          {getFileBadge(document.type)}
          
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-success/10 text-success border border-success/20 font-semibold text-3xs uppercase tracking-wider">
            <span className="w-1 h-1 rounded-full bg-success animate-pulse" />
            <span>Indexado</span>
          </div>
        </div>
      </div>

      {/* Delete button wrapper */}
      <div className="shrink-0 flex items-center h-full">
        <button
          onClick={() => onDelete(document.id)}
          disabled={isDeleting}
          className="p-2 rounded-xl border border-transparent hover:border-red-200 hover:bg-red-50 text-neutral-400 hover:text-red-600 transition-all cursor-pointer"
          title="Eliminar documento del índice"
        >
          {isDeleting ? (
            <svg className="w-4 h-4 animate-spin text-red-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          )}
        </button>
      </div>
    </div>
  )
}
