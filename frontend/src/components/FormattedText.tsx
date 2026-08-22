import { limpiarEncoding } from '../utils/fixEncoding'

interface FormattedTextProps {
  content: string
  isStreaming?: boolean
  className?: string
}

function renderInlineBold(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
      return (
        <strong key={i} className="font-semibold text-neutral-900">
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

  const blocks = textoLimpio.split(/\n\s*\n/)

  return (
    <div className={`space-y-4 text-sm md:text-base text-neutral-700 leading-relaxed font-normal ${className}`}>
      {blocks.map((block, bIdx) => {
        const trimmed = block.trim()
        if (!trimmed) return null

        if (trimmed === '---' || trimmed === '***') {
          return <hr key={bIdx} className="border-t border-neutral-200 my-4" />
        }

        if (trimmed.startsWith('### ')) {
          const title = trimmed.replace(/^###\s+/, '')
          return (
            <h3 key={bIdx} className="font-bold text-sm md:text-base text-neutral-900 pt-1 pb-0.5 flex items-center gap-2 border-b border-neutral-200/60 pb-2">
              <span className="w-1.5 h-4 rounded-full bg-purple-500 shrink-0" />
              <span>{title}</span>
            </h3>
          )
        }

        if (trimmed.startsWith('#### ')) {
          const badgeText = trimmed.replace(/^####\s+/, '')
          return (
            <div key={bIdx} className="pt-2">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-purple-50 border border-purple-200/80 text-xs font-bold text-neutral-800 tracking-wide uppercase shadow-sm">
                <svg className="w-3.5 h-3.5 text-purple-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 01-2-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>{badgeText}</span>
              </div>
            </div>
          )
        }

        const lines = trimmed.split('\n')
        const isAllBullets = lines.length > 0 && lines.every(l => /^\s*[•\-]\s+/.test(l))

        if (isAllBullets) {
          return (
            <ul key={bIdx} className="space-y-2 pl-1 my-2">
              {lines.map((line, lIdx) => {
                const item = line.replace(/^\s*[•\-]\s*/, '')
                return (
                  <li key={lIdx} className="flex items-start gap-2.5 text-neutral-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-2 shrink-0" />
                    <span className="flex-1">{renderInlineBold(item)}</span>
                  </li>
                )
              })}
            </ul>
          )
        }

        return (
          <div key={bIdx} className="space-y-2">
            {lines.map((line, lIdx) => {
              if (/^\s*[•\-]\s+/.test(line)) {
                const item = line.replace(/^\s*[•\-]\s*/, '')
                return (
                  <div key={lIdx} className="flex items-start gap-2.5 text-neutral-700 pl-1 py-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-2 shrink-0" />
                    <span className="flex-1">{renderInlineBold(item)}</span>
                  </div>
                )
              }
              return (
                <p key={lIdx} className="leading-relaxed">
                  {renderInlineBold(line)}
                </p>
              )
            })}
          </div>
        )
      })}
      {isStreaming && (
        <span className="inline-block w-1.5 h-4 ml-1 bg-purple-500 animate-pulse align-middle" />
      )}
    </div>
  )
}
