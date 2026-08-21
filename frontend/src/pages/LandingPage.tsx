import { useState } from 'react'
import { Link } from 'react-router-dom'
import { isAuthenticated } from '../utils/auth'
import BrandIcon from '../components/BrandIcon'

export default function LandingPage() {
  const [showSplash, setShowSplash] = useState(true)
  const isAuth = isAuthenticated()

  const handleEnterPlatform = () => {
    setShowSplash(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Step 1: Clean, Minimalist Centered Splash Entry (Original Brand Vector Asset)
  if (showSplash) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-b from-[#FAF8F5] via-[#FAF8F5] to-[#F5F0E8] relative overflow-hidden select-none p-6">
        {/* Subtle Ambient Radial Glows */}
        <div className="absolute w-[500px] h-[500px] rounded-full bg-[#9E7111]/10 blur-3xl pointer-events-none animate-pulse-gold" />
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-[#E8E2D6]/40 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full bg-[#FAF8F5] blur-3xl pointer-events-none" />

        {/* Single Centered Clickable Brand Block */}
        <button
          onClick={handleEnterPlatform}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              handleEnterPlatform()
            }
          }}
          className="group relative z-10 flex flex-col items-center text-center cursor-pointer focus:outline-hidden transition-all duration-300 transform hover:scale-[1.02] active:scale-95"
          title="Entrar a PolicyLens AI"
          aria-label="Entrar a PolicyLens AI: Navegador Inteligente de Políticas y Contratos Internos"
        >
          {/* Authentic High-Resolution PolicyLens AI Icon */}
          <div className="relative mb-6">
            <div className="absolute -inset-4 rounded-3xl bg-[#9E7111]/15 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            
            <BrandIcon className="relative w-28 h-28 sm:w-32 sm:h-32 md:w-36 md:h-36 rounded-3xl shadow-xl shadow-gold-500/20 transition-all duration-300 group-hover:shadow-2xl group-hover:shadow-gold-500/30" />
          </div>

          {/* Primary Title with highlighted AI */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-neutral-900 tracking-tight leading-tight transition-colors group-hover:text-[#9E7111]">
            PolicyLens <span className="text-[#9E7111] font-black">AI</span>
          </h1>

          {/* Exact Subtitle */}
          <p className="mt-2.5 text-sm sm:text-base md:text-lg font-medium text-neutral-600 max-w-md mx-auto leading-relaxed">
            Navegador Inteligente de Políticas y Contratos Internos.
          </p>
        </button>
      </div>
    )
  }

  // Step 2: Informative Home (Landing Page)
  return (
    <div className="min-h-screen bg-[#FAF8F5] text-neutral-800 font-sans flex flex-col selection:bg-[#9E7111] selection:text-white animate-fade-in-up">
      {/* Sticky Header Navigation Bar */}
      <header className="sticky top-0 z-40 bg-[#FAF8F5]/90 backdrop-blur-md border-b border-[#E8E2D6] transition-all">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Logo & Return to Splash */}
          <button
            onClick={() => setShowSplash(true)}
            className="flex items-center gap-3 group text-left cursor-pointer focus:outline-hidden"
            title="Volver a la pantalla de entrada"
          >
            <BrandIcon className="w-8 h-8 rounded-lg shadow-sm shadow-gold-500/20 group-hover:scale-105 transition-transform" />
            <div>
              <span className="font-extrabold text-base text-neutral-900 tracking-tight leading-none block">
                PolicyLens
              </span>
              <span className="text-3xs uppercase font-bold tracking-widest text-[#9E7111] block">
                AI Platform
              </span>
            </div>
          </button>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-bold text-neutral-600">
            <a href="#inicio" className="hover:text-[#9E7111] transition-colors">Inicio</a>
            <a href="#flujo" className="hover:text-[#9E7111] transition-colors">Cómo Funciona</a>
            <a href="#beneficios" className="hover:text-[#9E7111] transition-colors">Problema & Solución</a>
            <a href="#capacidades" className="hover:text-[#9E7111] transition-colors">Características</a>
          </nav>

          {/* Action Login Button */}
          <div className="flex items-center gap-3">
            <Link
              to={isAuth ? '/chat' : '/login'}
              className="px-4.5 py-2 rounded-xl bg-[#9E7111] hover:bg-[#7a5807] text-white font-bold text-xs shadow-md shadow-gold-500/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2"
            >
              <span>{isAuth ? 'Ir a Consultas' : 'Iniciar Sesión'}</span>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Sections */}
      <main className="flex-1">
        {/* 1. HERO SECTION */}
        <section id="inicio" className="relative pt-12 pb-20 md:pt-20 md:pb-28 overflow-hidden">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-8">
              {/* Left Column: Copywriting */}
              <div className="flex-1 text-center lg:text-left space-y-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-[#E8E2D6] text-[#9E7111] text-xs font-bold shadow-2xs">
                  <span className="w-2 h-2 rounded-full bg-[#9E7111] animate-pulse" />
                  <span>Plataforma RAG de Políticas Corporativas</span>
                </div>

                <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-neutral-900 tracking-tight leading-[1.15]">
                  Claridad instantánea para tus <span className="text-[#9E7111] underline decoration-[#dcc9ad] decoration-wavy decoration-2">políticas y contratos</span> internos.
                </h1>

                <p className="text-base md:text-lg text-neutral-600 leading-relaxed font-normal max-w-xl mx-auto lg:mx-0">
                  Encuentra respuestas precisas, contextualizadas y con fuentes exactas en segundos. Sin alucinaciones, sin fricción y con soporte multiformato.
                </p>

                {/* CTA Buttons */}
                <div className="pt-2 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
                  <Link
                    to={isAuth ? '/chat' : '/login'}
                    className="w-full sm:w-auto px-7 py-4 rounded-xl bg-[#9E7111] hover:bg-[#7a5807] text-white font-bold text-sm shadow-lg shadow-gold-500/25 hover:scale-[1.02] active:scale-95 transition-all text-center flex items-center justify-center gap-2.5"
                  >
                    <span>{isAuth ? 'Abrir Consultas RAG' : 'Comenzar / Iniciar Sesión'}</span>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </Link>

                  <a
                    href="#flujo"
                    className="w-full sm:w-auto px-6 py-4 rounded-xl border border-[#E8E2D6] bg-white hover:bg-[#F5F0E8] text-neutral-700 font-bold text-sm shadow-2xs hover:border-[#9E7111]/40 transition-all text-center"
                  >
                    Ver cómo funciona
                  </a>
                </div>

                {/* Key Metric Highlights */}
                <div className="pt-6 grid grid-cols-3 gap-4 border-t border-[#E8E2D6] max-w-lg mx-auto lg:mx-0 text-left">
                  <div>
                    <p className="text-lg font-black text-neutral-900">100%</p>
                    <p className="text-2xs font-semibold text-neutral-400 uppercase tracking-wider">Citas Verificables</p>
                  </div>
                  <div>
                    <p className="text-lg font-black text-neutral-900">3 Formatos</p>
                    <p className="text-2xs font-semibold text-neutral-400 uppercase tracking-wider">PDF, DOCX, HTML</p>
                  </div>
                  <div>
                    <p className="text-lg font-black text-neutral-900">&lt; 2s</p>
                    <p className="text-2xs font-semibold text-neutral-400 uppercase tracking-wider">Respuesta RAG</p>
                  </div>
                </div>
              </div>

              {/* Right Column: Interactive UI Showcase Mockup */}
              <div className="flex-1 w-full max-w-lg lg:max-w-none">
                <div className="relative rounded-3xl border border-[#E8E2D6] bg-white p-5 md:p-6 shadow-xl shadow-brand-200/40 animate-scale-up">
                  {/* Window Bar Header */}
                  <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#E8E2D6]/60">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-red-400/80" />
                      <span className="w-3 h-3 rounded-full bg-amber-400/80" />
                      <span className="w-3 h-3 rounded-full bg-green-400/80" />
                    </div>
                    <span className="text-3xs font-bold uppercase tracking-wider text-neutral-400 bg-[#FAF8F5] px-2 py-0.5 rounded-md border border-[#E8E2D6]">
                      PolicyLens AI &bull; Simulación RAG
                    </span>
                  </div>

                  {/* Simulated Chat Feed */}
                  <div className="space-y-4 text-left">
                    {/* User Question */}
                    <div className="flex gap-3 items-start justify-end">
                      <div className="bg-[#F5F0E8] border border-[#E8E2D6] rounded-2xl rounded-tr-xs p-3.5 max-w-[85%] text-xs font-medium text-neutral-800">
                        ¿Cuántos días de vacaciones me corresponden al cumplir el primer año y cómo se solicitan?
                      </div>
                      <div className="w-7 h-7 rounded-lg bg-neutral-900 text-white flex items-center justify-center text-xs font-bold shrink-0">
                        U
                      </div>
                    </div>

                    {/* AI Response with Gold Bar */}
                    <div className="flex gap-3 items-start relative bg-white border border-[#E8E2D6] border-l-4 border-l-[#9E7111] rounded-2xl rounded-tl-xs p-4 shadow-2xs">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0">
                        <BrandIcon className="w-7 h-7 rounded-md" />
                      </div>
                      <div className="flex-1 space-y-2.5 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-neutral-900">PolicyLens AI</span>
                          <span className="text-3xs text-success font-bold bg-success/10 px-1.5 py-0.5 rounded border border-success/20">
                            Contexto Verificado
                          </span>
                        </div>
                        <p className="text-xs text-neutral-700 leading-relaxed font-normal">
                          De acuerdo con el <strong className="text-neutral-900 font-bold">Manual de RRHH 2026</strong>, todo colaborador tiene derecho a <strong className="text-neutral-900 font-bold">15 días hábiles</strong> de vacaciones remuneradas al cumplir un año continuo de servicio. La solicitud debe registrarse a través del portal de RRHH con al menos <strong className="text-neutral-900 font-bold">15 días de anticipación</strong>.
                        </p>

                        {/* Source Snippet Card */}
                        <div className="pt-2 border-t border-[#E8E2D6]">
                          <div className="p-2.5 rounded-xl bg-[#FAF8F5] border border-[#E8E2D6] flex items-center justify-between gap-2 shadow-2xs">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="p-1 rounded bg-red-50 text-red-600 border border-red-100 text-3xs font-bold">PDF</span>
                              <div className="min-w-0">
                                <p className="text-3xs font-bold text-neutral-800 truncate">manual_rrhh_2026.pdf</p>
                                <p className="text-3xs text-neutral-400">Pág. 32 &bull; Sección Vacaciones y Descansos</p>
                              </div>
                            </div>
                            <span className="text-3xs font-bold text-[#9E7111] bg-white px-2 py-0.5 rounded-md border border-[#E8E2D6]">
                              Fuente #1
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 2. SYSTEM FLOW (Step-by-Step Overview) */}
        <section id="flujo" className="py-20 bg-white border-y border-[#E8E2D6]">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
              <span className="text-xs font-extrabold uppercase tracking-widest text-[#9E7111] bg-[#FAF8F5] px-3 py-1 rounded-full border border-[#E8E2D6]">
                Arquitectura del Sistema
              </span>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-neutral-900 tracking-tight">
                Flujo RAG en 3 Pasos Simples
              </h2>
              <p className="text-sm text-neutral-500 font-medium">
                Cómo transformamos documentos estáticos en un motor de respuestas inteligente y verificable.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
              {/* Step 1 */}
              <div className="bg-[#FAF8F5] border border-[#E8E2D6] rounded-2xl p-6 md:p-8 flex flex-col justify-between relative shadow-2xs hover:shadow-md hover:border-[#9E7111]/40 transition-all duration-300 group">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="w-12 h-12 rounded-2xl bg-white border border-[#E8E2D6] text-[#9E7111] font-extrabold text-lg flex items-center justify-center shadow-xs group-hover:scale-110 transition-transform">
                      01
                    </span>
                    <span className="text-2xs font-bold uppercase tracking-wider text-neutral-400">Paso 1</span>
                  </div>
                  <h3 className="text-lg font-bold text-neutral-900 leading-tight">
                    Ingesta & Consulta Documental
                  </h3>
                  <p className="text-xs text-neutral-600 leading-relaxed font-normal">
                    Los administradores cargan políticas o manuales en formato <strong className="text-neutral-800">PDF, Word (DOCX) o HTML</strong>. Los empleados formulan preguntas en lenguaje natural sin requerir tecnicismos.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-[#E8E2D6] flex items-center gap-2 text-2xs font-bold text-[#9E7111]">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <span>Carga física y parsing estructurado</span>
                </div>
              </div>

              {/* Step 2 */}
              <div className="bg-[#FAF8F5] border border-[#E8E2D6] rounded-2xl p-6 md:p-8 flex flex-col justify-between relative shadow-2xs hover:shadow-md hover:border-[#9E7111]/40 transition-all duration-300 group">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="w-12 h-12 rounded-2xl bg-[#9E7111] text-white font-extrabold text-lg flex items-center justify-center shadow-md shadow-gold-500/20 group-hover:scale-110 transition-transform">
                      02
                    </span>
                    <span className="text-2xs font-bold uppercase tracking-wider text-neutral-400">Paso 2</span>
                  </div>
                  <h3 className="text-lg font-bold text-neutral-900 leading-tight">
                    Indexación Vectorial & RAG
                  </h3>
                  <p className="text-xs text-neutral-600 leading-relaxed font-normal">
                    El texto se fragmenta en <strong className="text-neutral-800">chunks semánticos con metadatos</strong> (página, sección, hash). Se generan embeddings y se indexan en <strong className="text-neutral-800">ChromaDB</strong> para recuperación por similitud de coseno y filtro léxico.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-[#E8E2D6] flex items-center gap-2 text-2xs font-bold text-[#9E7111]">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                  </svg>
                  <span>Búsqueda semántica híbrida</span>
                </div>
              </div>

              {/* Step 3 */}
              <div className="bg-[#FAF8F5] border border-[#E8E2D6] rounded-2xl p-6 md:p-8 flex flex-col justify-between relative shadow-2xs hover:shadow-md hover:border-[#9E7111]/40 transition-all duration-300 group">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="w-12 h-12 rounded-2xl bg-neutral-900 text-white font-extrabold text-lg flex items-center justify-center shadow-md shadow-neutral-900/10 group-hover:scale-110 transition-transform">
                      03
                    </span>
                    <span className="text-2xs font-bold uppercase tracking-wider text-neutral-400">Paso 3</span>
                  </div>
                  <h3 className="text-lg font-bold text-neutral-900 leading-tight">
                    Respuesta Sintetizada con Fuentes
                  </h3>
                  <p className="text-xs text-neutral-600 leading-relaxed font-normal">
                    El LLM formula la respuesta utilizando <strong className="text-neutral-800">única y exclusivamente los fragmentos recuperados</strong>. El usuario visualiza la respuesta acompañada de tarjetas desplegables con el fragmento exacto y número de página.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-[#E8E2D6] flex items-center gap-2 text-2xs font-bold text-[#9E7111]">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Cero alucinaciones &bull; 100% auditable</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3. PROBLEM & SOLUTION BREAKDOWN */}
        <section id="beneficios" className="py-20 bg-[#FAF8F5]">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
              <span className="text-xs font-extrabold uppercase tracking-widest text-[#9E7111] bg-white px-3 py-1 rounded-full border border-[#E8E2D6]">
                Valor y Beneficios
              </span>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-neutral-900 tracking-tight">
                El Desafío vs. La Solución PolicyLens AI
              </h2>
              <p className="text-sm text-neutral-500 font-medium">
                Diseñado para eliminar cuellos de botella en Recursos Humanos, Legal y Operaciones.
              </p>
            </div>

            {/* Comparison Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* The Traditional Problem */}
              <div className="rounded-3xl border border-red-200/60 bg-red-50/30 p-6 md:p-8 space-y-6 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-100 border border-red-200 text-red-600 flex items-center justify-center font-bold text-lg">
                    &times;
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-red-950">El Problema Tradicional</h3>
                    <p className="text-2xs text-red-700/80 font-medium">Fricción, ambigüedad y pérdida de tiempo</p>
                  </div>
                </div>

                <ul className="space-y-4 text-xs text-neutral-700">
                  <li className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-bold text-3xs shrink-0 mt-0.5">&times;</span>
                    <span><strong className="text-neutral-900 font-bold">Documentos densos y dispersos:</strong> Manuales de más de 100 páginas donde encontrar una cláusula específica toma decenas de minutos.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-bold text-3xs shrink-0 mt-0.5">&times;</span>
                    <span><strong className="text-neutral-900 font-bold">Sobrecarga a RRHH y Legal:</strong> Consultas repetitivas sobre vacaciones, licencias o confidencialidad saturan a los equipos.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-bold text-3xs shrink-0 mt-0.5">&times;</span>
                    <span><strong className="text-neutral-900 font-bold">Alucinaciones en IA genérica:</strong> Los modelos de lenguaje comunes inventan políticas si no tienen el contexto corporativo indexado.</span>
                  </li>
                </ul>
              </div>

              {/* The PolicyLens Solution */}
              <div className="rounded-3xl border border-[#9E7111]/40 bg-white p-6 md:p-8 space-y-6 shadow-md shadow-gold-500/10 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#9E7111]/10 rounded-bl-full pointer-events-none" />
                
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#9E7111] text-white flex items-center justify-center font-bold text-lg shadow-sm shadow-gold-500/30">
                    ✓
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-neutral-900">La Solución PolicyLens AI</h3>
                    <p className="text-2xs text-[#9E7111] font-semibold">Precisión, inmediatez y trazabilidad total</p>
                  </div>
                </div>

                <ul className="space-y-4 text-xs text-neutral-700">
                  <li className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-success/10 text-success flex items-center justify-center font-bold text-3xs shrink-0 mt-0.5">✓</span>
                    <span><strong className="text-neutral-900 font-bold">Respuestas en menos de 2 segundos:</strong> Búsqueda semántica híbrida que localiza el fragmento exacto al instante.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-success/10 text-success flex items-center justify-center font-bold text-3xs shrink-0 mt-0.5">✓</span>
                    <span><strong className="text-neutral-900 font-bold">Trazabilidad con Citas Reales:</strong> Cada respuesta expone el documento fuente, página y extracto para verificación legal.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-success/10 text-success flex items-center justify-center font-bold text-3xs shrink-0 mt-0.5">✓</span>
                    <span><strong className="text-neutral-900 font-bold">Sincronizador Inteligente SHA-256:</strong> Detección automática de cambios en archivos físicos para actualizar la base vectorial en un clic.</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* 4. KEY CAPABILITIES (Características) */}
        <section id="capacidades" className="py-20 bg-white border-t border-[#E8E2D6]">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
              <span className="text-xs font-extrabold uppercase tracking-widest text-[#9E7111] bg-[#FAF8F5] px-3 py-1 rounded-full border border-[#E8E2D6]">
                Capacidades Principales
              </span>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-neutral-900 tracking-tight">
                Todo lo que necesitas para gobernar tu conocimiento interno
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Feature 1 */}
              <div className="p-6 rounded-2xl border border-[#E8E2D6] bg-[#FAF8F5] hover:border-[#9E7111]/40 hover:bg-white transition-all duration-300 shadow-2xs space-y-3">
                <div className="w-10 h-10 rounded-xl bg-white border border-[#E8E2D6] text-[#9E7111] flex items-center justify-center shadow-xs">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 01-2-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h4 className="text-sm font-bold text-neutral-800">Multiformato Nativo</h4>
                <p className="text-xs text-neutral-500 leading-relaxed font-medium">
                  Soporte completo para documentos PDF (PyMuPDF), archivos de Microsoft Word (.docx) y páginas HTML corporativas.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="p-6 rounded-2xl border border-[#E8E2D6] bg-[#FAF8F5] hover:border-[#9E7111]/40 hover:bg-white transition-all duration-300 shadow-2xs space-y-3">
                <div className="w-10 h-10 rounded-xl bg-white border border-[#E8E2D6] text-[#9E7111] flex items-center justify-center shadow-xs">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <h4 className="text-sm font-bold text-neutral-800">Doble Modo de Consulta</h4>
                <p className="text-xs text-neutral-500 leading-relaxed font-medium">
                  Alterna entre <strong className="text-neutral-700">RAG + LLM</strong> (síntesis con IA) o <strong className="text-neutral-700">Solo Embeddings</strong> (búsqueda directa de fragmentos vectoriales).
                </p>
              </div>

              {/* Feature 3 */}
              <div className="p-6 rounded-2xl border border-[#E8E2D6] bg-[#FAF8F5] hover:border-[#9E7111]/40 hover:bg-white transition-all duration-300 shadow-2xs space-y-3">
                <div className="w-10 h-10 rounded-xl bg-white border border-[#E8E2D6] text-[#9E7111] flex items-center justify-center shadow-xs">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89M9 11l3-3 3 3m-3-3v12" />
                  </svg>
                </div>
                <h4 className="text-sm font-bold text-neutral-800">Sincronización SHA-256</h4>
                <p className="text-xs text-neutral-500 leading-relaxed font-medium">
                  Compara firmas criptográficas de archivos locales para identificar documentos nuevos o modificados sin re-indexar duplicados.
                </p>
              </div>

              {/* Feature 4 */}
              <div className="p-6 rounded-2xl border border-[#E8E2D6] bg-[#FAF8F5] hover:border-[#9E7111]/40 hover:bg-white transition-all duration-300 shadow-2xs space-y-3">
                <div className="w-10 h-10 rounded-xl bg-white border border-[#E8E2D6] text-[#9E7111] flex items-center justify-center shadow-xs">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <h4 className="text-sm font-bold text-neutral-800">Roles y Permisos</h4>
                <p className="text-xs text-neutral-500 leading-relaxed font-medium">
                  Gestión de usuarios con roles diferenciados: administradores para gobierno documental y colaboradores para consultas.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-[#F5F0E8] border-t border-[#E8E2D6] py-8 text-neutral-500 text-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <BrandIcon className="w-6 h-6 rounded-md shadow-2xs" />
            <span className="font-bold text-neutral-800">PolicyLens AI</span>
            <span className="text-neutral-400">&bull; Proyecto Académico RAG</span>
          </div>

          <p className="text-2xs text-neutral-400">
            FastAPI &bull; SQLite &bull; ChromaDB &bull; React &bull; Tailwind CSS
          </p>
        </div>
      </footer>
    </div>
  )
}
