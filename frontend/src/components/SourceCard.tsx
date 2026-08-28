import { useState } from 'react'
import type { ChatSource } from '../types'
import { limpiarEncoding } from '../utils/fixEncoding'

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------
export interface GroupedSource {
  document: string
  pages: number[]
  fragments: Array<{
    page: number
    section: string
    content: string
  }>
}

// ---------------------------------------------------------------------------
// Agrupador de fuentes por documento
// ---------------------------------------------------------------------------
export function groupSources(sources: ChatSource[]): GroupedSource[] {
  if (!sources || sources.length === 0) return []
  const map = new Map<string, GroupedSource>()

  for (const s of sources) {
    const docName = s.document || 'Documento'
    if (!map.has(docName)) {
      map.set(docName, { document: docName, pages: [], fragments: [] })
    }
    const group = map.get(docName)!
    if (s.page && !group.pages.includes(s.page)) {
      group.pages.push(s.page)
    }
    group.fragments.push({ page: s.page, section: s.section, content: s.content })
  }

  return Array.from(map.values()).map((g) => ({
    ...g,
    pages: g.pages.sort((a, b) => a - b),
  }))
}

// ---------------------------------------------------------------------------
// Ícono de archivo según extensión
// ---------------------------------------------------------------------------
function FileIcon({ filename }: { filename: string }) {
  const ext = filename.split('.').pop()?.toLowerCase()

  if (ext === 'pdf') {
    return (
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50 text-rose-600 border border-rose-100 shadow-sm shrink-0">
        {/* PDF icon */}
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
          />
        </svg>
      </span>
    )
  }
  if (ext === 'docx' || ext === 'doc') {
    return (
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100 shadow-sm shrink-0">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      </span>
    )
  }
  return (
    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500 border border-slate-200 shadow-sm shrink-0">
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
    </span>
  )
}

// ---------------------------------------------------------------------------
// Componente de tarjeta de fuente
// ---------------------------------------------------------------------------
interface SourceCardProps {
  source?: ChatSource
  groupedSource?: GroupedSource
}

export default function SourceCard({ source, groupedSource }: SourceCardProps) {
  const [isOpen, setIsOpen] = useState(false)

  const data: GroupedSource = groupedSource || {
    document: source?.document || 'Documento',
    pages: source?.page ? [source.page] : [],
    fragments: source
      ? [{ page: source.page, section: source.section, content: source.content }]
      : [],
  }

  // Etiqueta de páginas
  const pagesLabel =
    data.pages.length === 1
      ? `Pág. ${data.pages[0]}`
      : data.pages.length > 1
      ? `Págs. ${data.pages.join(', ')}`
      : ''

  const fragmentCount = data.fragments.length

  return (
    <div
      className={`
        rounded-xl border bg-gray-50 transition-all duration-200 overflow-hidden
        ${isOpen
          ? 'border-purple-300 shadow-md shadow-purple-500/10'
          : 'border-slate-200 hover:border-purple-200 hover:shadow-sm hover:bg-white'
        }
      `}
    >
      {/* ── Encabezado / botón acordeón ── */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full text-left px-4 py-3 flex items-center gap-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED] focus-visible:ring-offset-1 cursor-pointer"
        aria-expanded={isOpen}
      >
        {/* Ícono del archivo */}
        <FileIcon filename={data.document} />

        {/* Información del documento */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-800 truncate leading-snug">
            {data.document}
          </p>

          {/* Metadatos: Páginas (destacado) · fragmentos (secundario) */}
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {pagesLabel && (
              <span className="text-[11px] font-bold text-[#7C3AED] bg-purple-50 border border-purple-100 px-2 py-0.5 rounded-md tracking-wide">
                {pagesLabel}
              </span>
            )}
            {/* Separador visual punto medio */}
            {pagesLabel && (
              <span className="text-slate-300 text-xs select-none">·</span>
            )}
            <span className="text-[11px] text-slate-400 font-medium">
              {fragmentCount} fragmento{fragmentCount !== 1 ? 's' : ''} de referencia
            </span>
          </div>
        </div>

        {/* Flecha acordeón con padding generoso */}
        <span
          className={`
            ml-2 p-2 rounded-lg shrink-0 transition-all duration-200
            ${isOpen
              ? 'rotate-180 text-[#7C3AED] bg-purple-50'
              : 'rotate-0 text-slate-400 hover:bg-slate-100'
            }
          `}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </button>

      {/* ── Panel de fragmentos expandible ── */}
      <div
        className={`
          overflow-hidden transition-all duration-300 ease-in-out
          ${isOpen ? 'max-h-[640px] overflow-y-auto border-t border-slate-100' : 'max-h-0'}
        `}
      >
        <div className="px-4 py-3 space-y-3 bg-white/60">
          {data.fragments.map((frag, idx) => (
            <div
              key={idx}
              className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-xs space-y-1.5"
            >
              {/* Cabecera del fragmento */}
              <div className="flex items-center justify-between text-[11px] font-bold text-[#7C3AED]">
                <span>
                  Fragmento #{idx + 1}&nbsp;&bull;&nbsp;Pág. {frag.page}
                </span>
                {frag.section &&
                  frag.section !== 'General' &&
                  frag.section !== `Página ${frag.page}` && (
                    <span className="text-slate-400 font-normal truncate max-w-[180px]">
                      {frag.section}
                    </span>
                  )}
              </div>

              {/* Texto del fragmento */}
              <p className="text-xs text-slate-600 leading-relaxed italic bg-slate-50/60 p-2.5 rounded-lg border border-slate-100">
                &ldquo;{limpiarEncoding(frag.content)}&rdquo;
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
