import { useState } from 'react'
import type { ChatSource } from '../types'

interface SourceCardProps {
  source: ChatSource
}

export default function SourceCard({ source }: SourceCardProps) {
  const [isOpen, setIsOpen] = useState(false)

  // Detect file type and return matching icon
  const getFileIcon = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase()
    switch (ext) {
      case 'pdf':
        return (
          <span className="p-1.5 rounded-lg bg-red-50 text-red-600 border border-red-100 flex items-center justify-center">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </span>
        )
      case 'docx':
      case 'doc':
        return (
          <span className="p-1.5 rounded-lg bg-info/10 text-info border border-info/20 flex items-center justify-center">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </span>
        )
      case 'html':
      case 'htm':
        return (
          <span className="p-1.5 rounded-lg bg-orange-50 text-orange-600 border border-orange-100 flex items-center justify-center">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
          </span>
        )
      default:
        return (
          <span className="p-1.5 rounded-lg bg-neutral-100 text-neutral-600 border border-neutral-200 flex items-center justify-center">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 01-2-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </span>
        )
    }
  }

  return (
    <div className="rounded-xl border border-brand-200 bg-white hover:border-gold-300 transition-all duration-300 shadow-xs">
      {/* Header Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full text-left p-3.5 flex items-center gap-3.5 focus:outline-hidden"
      >
        {getFileIcon(source.document)}
        
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-neutral-800 truncate leading-tight">
            {source.document}
          </p>
          <p className="text-xs text-neutral-400 mt-1 flex items-center gap-1.5 font-medium">
            <span>Pág. {source.page}</span>
            <span className="w-1 h-1 rounded-full bg-neutral-300" />
            <span className="truncate">{source.section}</span>
          </p>
        </div>

        <span className={`text-neutral-400 transform transition-transform duration-300 ${isOpen ? 'rotate-180 text-gold-500' : ''}`}>
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </button>

      {/* Slide down fragment preview */}
      <div 
        className={`
          overflow-hidden transition-all duration-300 ease-in-out border-brand-100
          ${isOpen ? 'max-h-60 border-t bg-brand-50/20' : 'max-h-0'}
        `}
      >
        <div className="p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-gold-600 mb-2">
            Fragmento de Referencia:
          </p>
          <div className="text-xs text-neutral-600 leading-relaxed font-sans bg-white p-3 rounded-lg border border-brand-100 italic shadow-2xs">
            "{source.content}"
          </div>
        </div>
      </div>
    </div>
  )
}
