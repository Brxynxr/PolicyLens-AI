import type { Message, ChatSource } from '../types'
import SourceCard from './SourceCard'
import FormattedText from './FormattedText'

interface ChatMessageProps {
  message: Message
  sources?: ChatSource[]
  isStreaming?: boolean
}

export default function ChatMessage({ message, sources, isStreaming }: ChatMessageProps) {
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
        flex gap-4 p-5 md:p-6 rounded-2xl transition-all duration-300 animate-in fade-in slide-in-from-bottom-2 duration-300
        ${isUser 
          ? 'flex-row-reverse bg-purple-50/50 border border-purple-200/50' 
          : 'bg-white border border-neutral-200/80 shadow-sm hover:shadow-md relative overflow-hidden'}
      `}
    >
      {/* Barra vertical de acento purpura para asistente */}
      {!isUser && (
        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-purple-500 to-purple-600 rounded-r-full" />
      )}

      {/* Avatar corporativo */}
      <div className="shrink-0">
        {isUser ? (
          <div className="w-10 h-10 rounded-xl bg-brand-800 text-white flex items-center justify-center font-bold text-sm shadow-lg shadow-brand-800/20 transition-all duration-200 hover:scale-105">
            U
          </div>
        ) : (
          <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold text-sm shadow-lg shadow-purple-600/20 transition-all duration-200 hover:scale-105">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 space-y-3.5 min-w-0">
        <div className="flex items-center justify-between">
          <span className="font-bold text-sm text-neutral-800">
            {isUser ? 'Tu (Colaborador)' : 'RiwiPolicylens'}
          </span>
          <span className="text-xs text-neutral-400 font-medium">
            {formatTime(message.created_at)}
          </span>
        </div>

        {/* Message bubble content */}
        {message.content ? (
          <FormattedText content={message.content} isStreaming={isStreaming} />
        ) : (
          <div className="flex items-center gap-2 py-1 text-neutral-400 text-sm">
            <span className="inline-block w-2 h-2 rounded-full bg-purple-500 animate-ping" />
            <span className="italic font-medium">Generando respuesta en tiempo real...</span>
          </div>
        )}

        {/* Sources Render Block */}
        {!isUser && sources && sources.length > 0 && (
          <div className="pt-4 border-t border-neutral-100 space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-purple-600 uppercase tracking-wider">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 01-2-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Fuentes utilizadas ({sources.length}):</span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
