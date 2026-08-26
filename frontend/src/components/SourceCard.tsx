import { useState } from 'react'
import type { ChatSource } from '../types'
import { limpiarEncoding } from '../utils/fixEncoding'

export interface GroupedSource {
  document: string
  pages: number[]
  fragments: Array<{
    page: number
    section: string
    content: string
  }>
}

export function groupSources(sources: ChatSource[]): GroupedSource[] {
  if (!sources || sources.length === 0) return []
  const map = new Map<string, GroupedSource>()

  for (const s of sources) {
    const docName = s.document || 'Documento'
    if (!map.has(docName)) {
      map.set(docName, {
        document: docName,
        pages: [],
        fragments: []
      })
    }
    const group = map.get(docName)!
    if (s.page && !group.pages.includes(s.page)) {
      group.pages.push(s.page)
    }
    group.fragments.push({
      page: s.page,
      section: s.section,
      content: s.content
    })
  }

  return Array.from(map.values()).map(g => ({
    ...g,
    pages: g.pages.sort((a, b) => a - b)
  }))
}

interface SourceCardProps {
  source?: ChatSource
  groupedSource?: GroupedSource
}

export default function SourceCard({ source, groupedSource }: SourceCardProps) {
  const [isOpen, setIsOpen] = useState(false)

  // Normalizar datos ya sea que venga como ChatSource simple o GroupedSource
  const data: GroupedSource = groupedSource || {
    document: source?.document || 'Documento',
    pages: source?.page ? [source.page] : [],
    fragments: source ? [{ page: source.page, section: source.section, content: source.content }] : []
  }

  const getFileIcon = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase()
    switch (ext) {
      case 'pdf':
        return (
          <span className="p-2 rounded-xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center shrink-0 shadow-xs">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </span>
        )
      case 'docx':
      case 'doc':
        return (
          <span className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0 shadow-xs">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </span>
        )
      default:
        return (
          <span className="p-2 rounded-xl bg-slate-100 text-slate-600 border border-slate-200 flex items-center justify-center shrink-0 shadow-xs">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </span>
        )
    }
  }

  const pagesLabel = data.pages.length === 1 
    ? `Pág. ${data.pages[0]}` 
    : data.pages.length > 1 
      ? `Págs. ${data.pages.join(', ')}` 
      : ''

  return (
    <div className="rounded-2xl border border-slate-200 bg-white hover:border-purple-300 hover:shadow-md transition-all duration-200 shadow-xs overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full text-left p-3.5 flex items-center gap-3.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED] cursor-pointer"
      >
        {getFileIcon(data.document)}
        
        <div className="flex-1 min-w-0">
          <p className="text-xs md:text-sm font-bold text-slate-900 truncate leading-snug">
            {data.document}
          </p>
          <div className="text-[11px] text-slate-500 mt-1 flex flex-wrap items-center gap-2 font-medium">
            {pagesLabel && (
              <span className="px-2 py-0.5 rounded-md bg-purple-50 text-[#7C3AED] font-bold border border-purple-100">
                {pagesLabel}
              </span>
            )}
            <span className="text-slate-400">
              {data.fragments.length} fragmento{data.fragments.length > 1 ? 's' : ''} de referencia
            </span>
          </div>
        </div>

        <span className={`p-1 rounded-lg text-slate-400 transform transition-transform duration-200 ${isOpen ? 'rotate-180 text-[#7C3AED] bg-purple-50' : ''}`}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </button>

      <div 
        className={`overflow-hidden transition-all duration-300 ease-in-out border-slate-100 ${isOpen ? 'max-h-[600px] overflow-y-auto border-t bg-slate-50/50' : 'max-h-0'}`}
      >
        <div className="p-3.5 space-y-3">
          {data.fragments.map((frag, idx) => (
            <div key={idx} className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-xs space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-bold text-[#7C3AED]">
                <span>Fragmento #{idx + 1} &bull; Pág. {frag.page}</span>
                {frag.section && frag.section !== 'General' && frag.section !== `Página ${frag.page}` && (
                  <span className="text-slate-400 font-normal truncate max-w-[200px]">{frag.section}</span>
                )}
              </div>
              <p className="text-xs text-slate-600 leading-relaxed font-sans italic bg-slate-50/60 p-2.5 rounded-lg border border-slate-100">
                "{limpiarEncoding(frag.content)}"
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
