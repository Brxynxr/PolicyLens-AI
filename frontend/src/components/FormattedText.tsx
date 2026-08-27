import ReactMarkdown from 'react-markdown'
import { limpiarEncoding } from '../utils/fixEncoding'

interface FormattedTextProps {
  content: string
  isStreaming?: boolean
  className?: string
}

// Limpia dinámicamente nombres de archivos a títulos humanos legibles
function formatearNombreDocumento(nombreArchivo: string): string {
  if (!nombreArchivo) return 'Documento Interno'
  let base = nombreArchivo.replace(/\.(pdf|docx|html|htm)$/i, '').trim()

  // Extraer versiones finales como -v5 o _v2 -> (v5)
  let version = ''
  const vMatch = base.match(/[-_]v(\d+.*)$/i)
  if (vMatch) {
    version = ` (v${vMatch[1]})`
    base = base.slice(0, vMatch.index)
  }

  // Separar camelCase
  base = base
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .replace(/[-_]+/g, ' ')
    .trim()

  const palabras = base.split(/\s+/).map((palabra) => {
    if (!palabra) return ''
    // Si la palabra ya está en mayúsculas (ej. RRHH, SST, ISO), preservarla
    if (palabra.length > 1 && palabra === palabra.toUpperCase()) {
      return palabra
    }
    return palabra.charAt(0).toUpperCase() + palabra.slice(1).toLowerCase()
  })

  return palabras.join(' ') + version
}


export default function FormattedText({ content, isStreaming, className = '' }: FormattedTextProps) {
  const textoLimpio = limpiarEncoding(content)
  if (!textoLimpio) return null

  return (
    <div className={`prose prose-slate max-w-none text-sm md:text-base leading-relaxed text-slate-700 font-normal ${className}`}>
      <ReactMarkdown
        components={{
          // Párrafos
          p: ({ children }) => (
            <p className="mb-3 last:mb-0 leading-relaxed text-slate-700">
              {children}
            </p>
          ),

          // Negritas destacadas
          strong: ({ children }) => (
            <strong className="font-bold text-slate-900">
              {children}
            </strong>
          ),

          // Cursivas
          em: ({ children }) => (
            <em className="italic text-slate-700">
              {children}
            </em>
          ),

          // Encabezados
          h1: ({ children }) => (
            <h1 className="text-lg font-extrabold text-slate-900 mt-4 mb-2 pb-1 border-b border-slate-200 flex items-center gap-2">
              <span className="w-1.5 h-4 rounded-full bg-[#7C3AED] shrink-0" />
              <span>{children}</span>
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-base font-extrabold text-slate-900 mt-3.5 mb-2 pb-1 border-b border-slate-200 flex items-center gap-2">
              <span className="w-1.5 h-3.5 rounded-full bg-[#7C3AED] shrink-0" />
              <span>{children}</span>
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-sm md:text-base font-extrabold text-slate-900 mt-3 mb-1.5 flex items-center gap-2">
              <span className="w-1.5 h-3 rounded-full bg-[#7C3AED] shrink-0" />
              <span>{children}</span>
            </h3>
          ),
          h4: ({ children }) => {
            const rawText = String(children || '')
            // Detectar si es cabecera de documento (ej: #### Manual RRHH (Pág. 5))
            const docMatch = rawText.match(/^(.+?)(?:\s*\(P[aá]g\.?\s*(\d+)\))?$/i)
            if (docMatch && (rawText.toLowerCase().includes('.pdf') || rawText.toLowerCase().includes('.docx') || rawText.toLowerCase().includes('pág') || rawText.toLowerCase().includes('sección'))) {
              const docName = docMatch[1].trim()
              const pageNum = docMatch[2]
              return (
                <div className="pt-2 pb-1 my-1">
                  <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-purple-50 border border-purple-200/90 text-xs font-bold text-slate-800 shadow-xs">
                    <svg className="w-4 h-4 text-[#7C3AED] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="truncate">{formatearNombreDocumento(docName)}</span>
                    {pageNum && (
                      <span className="text-[10px] bg-purple-100 text-[#7C3AED] px-2 py-0.5 rounded-md font-extrabold">
                        Pág. {pageNum}
                      </span>
                    )}
                  </span>
                </div>
              )
            }
            return (
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#7C3AED] mt-2 mb-1">
                {children}
              </h4>
            )
          },

          // Listas con viñetas
          ul: ({ children }) => (
            <ul className="space-y-1.5 my-2.5 pl-1 list-none">
              {children}
            </ul>
          ),
          li: ({ children }) => (
            <li className="flex items-start gap-2.5 text-slate-700 leading-relaxed">
              <span className="w-1.5 h-1.5 rounded-full bg-[#7C3AED] mt-2 shrink-0" />
              <div className="flex-1">{children}</div>
            </li>
          ),

          // Listas numeradas
          ol: ({ children }) => (
            <ol className="space-y-1.5 my-2.5 pl-1 list-decimal list-inside text-slate-700">
              {children}
            </ol>
          ),

          // Citas y Callouts
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-[#7C3AED] bg-purple-50/50 px-4 py-2.5 rounded-r-xl text-slate-700 italic text-sm my-2">
              {children}
            </blockquote>
          ),

          // Tablas Markdown
          table: ({ children }) => (
            <div className="my-3 overflow-x-auto rounded-xl border border-slate-200 shadow-xs bg-white">
              <table className="min-w-full text-left text-xs sm:text-sm border-collapse">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-800">
              {children}
            </thead>
          ),
          tbody: ({ children }) => (
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {children}
            </tbody>
          ),
          th: ({ children }) => (
            <th className="px-4 py-2.5 font-bold text-slate-800 whitespace-nowrap">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-4 py-2.5 text-slate-700 leading-relaxed align-top">
              {children}
            </td>
          ),

          // Código inline y bloques
          code: ({ children }) => (
            <code className="px-1.5 py-0.5 rounded bg-purple-50 text-[#7C3AED] font-mono text-xs border border-purple-200/60 font-semibold">
              {children}
            </code>
          ),
          pre: ({ children }) => (
            <pre className="p-3 my-2 rounded-xl bg-slate-900 text-slate-100 font-mono text-xs overflow-x-auto">
              {children}
            </pre>
          ),

          // Línea divisoria
          hr: () => <hr className="border-t border-slate-200 my-3" />,
        }}
      >
        {textoLimpio}
      </ReactMarkdown>

      {isStreaming && (
        <span className="inline-block w-1.5 h-4 ml-1 bg-[#7C3AED] animate-pulse align-middle" />
      )}
    </div>
  )
}


