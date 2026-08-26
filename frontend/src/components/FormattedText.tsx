import { limpiarEncoding } from '../utils/fixEncoding'

interface FormattedTextProps {
  content: string
  isStreaming?: boolean
  className?: string
}

function renderInlineFormatting(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
      return (
        <strong key={i} className="font-bold text-slate-900">
          {part.slice(2, -2)}
        </strong>
      )
    }
    return part
  })
}

export default function FormattedText({ content, isStreaming, className = '' }: FormattedTextProps) {
  const textoLimpio = limpiarEncoding(content)
  if (!textoLimpio) return null

  // 1. Normalizar numerales que vienen separados de su texto con saltos de línea (ej: "1.\n\nEjecutar...")
  const textoNormalizado = textoLimpio
    .replace(/(^|\n)(\s*\d{1,3}[\.\)])\s*\n+/g, '$1$2 ')
    .replace(/([.:])\s*(\d{1,3}[\.\)])\s+/g, '$1\n\n$2 ')

  // 2. Dividir en bloques separados por saltos de línea dobles
  const rawBlocks = textoNormalizado.split(/\n\s*\n/)

  return (
    <div className={`space-y-4 text-sm md:text-base text-slate-700 leading-relaxed font-normal ${className}`}>
      {rawBlocks.map((block, bIdx) => {
        const trimmed = block.trim()
        if (!trimmed) return null

        // 1. Separador horizontal (---)
        if (trimmed === '---' || trimmed === '***') {
          return <hr key={bIdx} className="border-t border-slate-200 my-4" />
        }

        // 2. Encabezado principal (### Titulo)
        if (trimmed.startsWith('### ')) {
          const title = trimmed.replace(/^###\s+/, '')
          return (
            <div key={bIdx} className="pt-2 pb-1 border-b border-slate-200/80 mb-2">
              <h3 className="font-extrabold text-sm md:text-base text-slate-900 flex items-center gap-2">
                <span className="w-1.5 h-4 rounded-full bg-[#7C3AED] shrink-0" />
                <span>{title}</span>
              </h3>
            </div>
          )
        }

        // 3. Cita de documento / fuente (#### Documento (Pág. X))
        if (trimmed.startsWith('#### ')) {
          const badgeText = trimmed.replace(/^####\s+/, '')
          return (
            <div key={bIdx} className="pt-2 pb-1">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-purple-50 border border-purple-200/80 text-xs font-bold text-slate-800 shadow-xs">
                <svg className="w-4 h-4 text-[#7C3AED] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="tracking-wide">{badgeText}</span>
              </div>
            </div>
          )
        }

        // 4. Encabezados de artículos normativos (ej: ARTICULO 77. o CAPITULO XI)
        if (/^(ARTICULO|ARTÍCULO|CAPITULO|CAPÍTULO|PARÁGRAFO|PARAGRAFO)\s+\w+/i.test(trimmed) && trimmed.length < 80) {
          return (
            <div key={bIdx} className="pt-1">
              <span className="inline-block font-extrabold text-xs tracking-wider uppercase bg-slate-100 text-slate-800 px-2.5 py-1 rounded-lg border border-slate-200">
                {trimmed}
              </span>
            </div>
          )
        }

        // 5. Procesamiento y desfragmentación de líneas dentro del bloque
        const rawLines = trimmed.split('\n').map(l => l.trim()).filter(Boolean)
        const isBulletList = rawLines.length > 0 && rawLines.every(l => /^[•\-\*]\s+/.test(l))

        let lines: string[] = []
        if (isBulletList) {
          lines = rawLines
        } else {
          let currentLine = ''
          for (const l of rawLines) {
            if (/^(\d+[\.\)]|[•\-\*])\s+/.test(l)) {
              if (currentLine) lines.push(currentLine)
              currentLine = l
            } else if (currentLine) {
              currentLine += ' ' + l
            } else {
              currentLine = l
            }
          }
          if (currentLine) lines.push(currentLine)
        }

        if (isBulletList) {
          return (
            <ul key={bIdx} className="space-y-2.5 pl-1 my-2">
              {lines.map((line, lIdx) => {
                const item = line.replace(/^[•\-\*]\s*/, '')
                return (
                  <li key={lIdx} className="flex items-start gap-3 text-slate-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#7C3AED] mt-2 shrink-0" />
                    <span className="flex-1 leading-relaxed">{renderInlineFormatting(item)}</span>
                  </li>
                )
              })}
            </ul>
          )
        }

        // Renderizado mixto: párrafos, listas numeradas y viñetas individuales
        return (
          <div key={bIdx} className="space-y-2.5">
            {lines.map((line, lIdx) => {
              // Viñeta individual (• o -)
              if (/^[•\-\*]\s+/.test(line)) {
                const item = line.replace(/^[•\-\*]\s*/, '')
                return (
                  <div key={lIdx} className="flex items-start gap-3 text-slate-700 pl-1 py-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#7C3AED] mt-2 shrink-0" />
                    <span className="flex-1 leading-relaxed">{renderInlineFormatting(item)}</span>
                  </div>
                )
              }

              // Lista numerada (1. o 1) o 1.-)
              const numberMatch = line.match(/^(\d+)[\.\)]\s*(.*)$/)
              if (numberMatch) {
                const num = numberMatch[1]
                const itemText = numberMatch[2]
                return (
                  <div key={lIdx} className="flex items-start gap-3 text-slate-700 pl-1 py-1">
                    <span className="w-5 h-5 rounded-full bg-purple-100 text-[#7C3AED] text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {num}
                    </span>
                    <span className="flex-1 leading-relaxed">{renderInlineFormatting(itemText)}</span>
                  </div>
                )
              }

              // Párrafo estándar
              return (
                <p key={lIdx} className="leading-relaxed">
                  {renderInlineFormatting(line)}
                </p>
              )
            })}
          </div>
        )
      })}

      {isStreaming && (
        <span className="inline-block w-1.5 h-4 ml-1 bg-[#7C3AED] animate-pulse align-middle" />
      )}
    </div>
  )
}
