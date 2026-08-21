import type { Message, ChatSource } from '../types'
import SourceCard from './SourceCard'
import EyeOfHorus from './EyeOfHorus'

interface ChatMessageProps {
  message: Message
  sources?: ChatSource[]
}

export default function ChatMessage({ message, sources }: ChatMessageProps) {
  const isUser = message.role === 'user'

  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString)
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } catch {
      return ''
    }
  }

  return (
    <div 
      className={`
        flex gap-3 sm:gap-4 p-4 sm:p-5 rounded-2xl transition-all duration-200 animate-fade-in-up
        ${isUser 
          ? 'flex-row-reverse bg-[#F5F0E8] border border-[#E8E2D6] ml-auto max-w-[88%] sm:max-w-[80%]' 
          : 'bg-white border border-[#E8E2D6] border-l-4 border-l-[#9E7111] shadow-2xs relative w-full'}
      `}
    >
      {/* Avatar */}
      <div className="shrink-0">
        {isUser ? (
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-neutral-900 text-white flex items-center justify-center font-bold text-xs shadow-xs">
            U
          </div>
        ) : (
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#FAF8F5] border border-[#E8E2D6] flex items-center justify-center shadow-xs">
            <EyeOfHorus className="w-5 h-5" stroke="#9E7111" strokeWidth={2} />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 space-y-2.5 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-bold text-xs sm:text-sm text-neutral-900">
              {isUser ? 'Tú' : 'PolicyLens AI'}
            </span>
            {!isUser && (
              <span className="text-3xs font-extrabold uppercase text-[#9E7111] bg-[#FAF8F5] px-1.5 py-0.2 rounded border border-[#E8E2D6]">
                Verificado
              </span>
            )}
          </div>
          <span className="text-3xs text-neutral-400 font-medium shrink-0">
            {formatTime(message.created_at)}
          </span>
        </div>

        {/* Message body */}
        <p className="text-xs sm:text-sm text-neutral-700 leading-relaxed font-normal whitespace-pre-wrap">
          {message.content}
        </p>

        {/* Sources Render Block */}
        {!isUser && sources && sources.length > 0 && (
          <div className="pt-3 mt-3 border-t border-[#E8E2D6] space-y-2.5">
            <div className="flex items-center gap-1.5 text-2xs font-extrabold text-[#9E7111] uppercase tracking-wider">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 01-2-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Fuentes de Verificación ({sources.length}):</span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {sources.map((src, index) => (
                <SourceCard key={index} source={src} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
