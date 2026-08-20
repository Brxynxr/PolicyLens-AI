import { useState } from 'react'
import { Link } from 'react-router-dom'
import { isAuthenticated } from '../utils/auth'

interface StepInfo {
  id: number
  number: string
  title: string
  subtitle: string
  description: string
  highlight: string
  iconType: 'document' | 'query' | 'neural' | 'verified'
}

const NEURAL_STEPS: StepInfo[] = [
  {
    id: 1,
    number: '01',
    title: 'Carga de Documentos',
    subtitle: 'Ingesta de normativas corporativas',
    description: 'Los administradores cargan políticas internas, manuales de RRHH o contratos legales en formatos PDF, Word o HTML. El sistema procesa los archivos y extrae su contenido de forma segura para dejarlo listo para consultas.',
    highlight: 'Soporte multiformato: PDF, Word (DOCX) y HTML',
    iconType: 'document'
  },
  {
    id: 2,
    number: '02',
    title: 'Consulta del Colaborador',
    subtitle: 'Preguntas en lenguaje natural',
    description: 'Cualquier empleado puede escribir su duda directamente en el chat en su lenguaje cotidiano. No es necesario recordar términos técnicos ni saber en qué página específica se encuentra la cláusula.',
    highlight: 'Búsqueda conversacional intuitiva y directa',
    iconType: 'query'
  },
  {
    id: 3,
    number: '03',
    title: 'Procesamiento Neuronal & RAG',
    subtitle: 'Búsqueda semántica inteligente',
    description: 'El motor de inteligencia artificial analiza la consulta y localiza en milisegundos los fragmentos más relevantes dentro de la base de conocimiento, cruzando significado semántico e intención de búsqueda.',
    highlight: 'Recuperación vectorial rápida de alta precisión',
    iconType: 'neural'
  },
  {
    id: 4,
    number: '04',
    title: 'Respuesta Verificada con Fuentes',
    subtitle: 'Información exacta y auditable',
    description: 'El asistente genera una respuesta clara y concisa basada únicamente en la documentación oficial, mostrando siempre el documento y la página exacta de donde se obtuvo la información.',
    highlight: 'Cero alucinaciones • 100% auditable con fuentes',
    iconType: 'verified'
  }
]

export default function LandingPage() {
  const [showSplash, setShowSplash] = useState(true)
  const [activeStep, setActiveStep] = useState<number>(1)
  const isAuth = isAuthenticated()

  const handleEnterPlatform = () => {
    setShowSplash(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const currentStep = NEURAL_STEPS.find((s) => s.id === activeStep) || NEURAL_STEPS[0]

  // Render vector icons for neural graph nodes
  const renderStepIcon = (type: StepInfo['iconType'], className = 'w-6 h-6') => {
    switch (type) {
      case 'document':
        return (
          <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 01-2-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        )
      case 'query':
        return (
          <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        )
      case 'neural':
        return (
          <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        )
      case 'verified':
        return (
          <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        )
    }
  }

  // Step 1: Clean, Minimalist Centered Splash Entry
  if (showSplash) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-b from-brand-50 via-brand-50 to-brand-100/60 relative overflow-hidden select-none p-6">
        {/* Subtle Ambient Radial Glows */}
        <div className="absolute w-[500px] h-[500px] rounded-full bg-gold-400/10 blur-3xl pointer-events-none animate-pulse-gold" />
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-brand-200/25 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full bg-gold-300/15 blur-3xl pointer-events-none" />

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
          {/* Authentic High-Resolution PolicyLens AI Icon (Favicon Vector Asset) */}
          <div className="relative mb-6">
            <div className="absolute -inset-3 rounded-3xl bg-gold-400/20 blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            
            <svg
              className="relative w-28 h-28 sm:w-32 sm:h-32 md:w-36 md:h-36 rounded-3xl shadow-xl shadow-gold-500/20 transition-all duration-300 group-hover:shadow-2xl group-hover:shadow-gold-500/30"
              viewBox="0 0 32 32"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient id="plGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#c4941d" />
                  <stop offset="50%" stopColor="#b8860b" />
                  <stop offset="100%" stopColor="#996f09" />
                </linearGradient>
              </defs>
              <rect width="32" height="32" rx="7" fill="url(#plGoldGrad)" />
              {/* Left policy document column */}
              <path d="M8 8h6v16H8V8z" fill="#ffffff" fillOpacity="0.95" />
              {/* Right secondary policy column */}
              <path d="M18 8h6v10h-6V8z" fill="#ffffff" fillOpacity="0.95" />
              {/* Bottom right AI lens / smart node */}
              <circle cx="21" cy="24" r="3" fill="#ffffff" fillOpacity="0.85" />
            </svg>
          </div>

          {/* Primary Title with highlighted AI */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-neutral-900 tracking-tight leading-tight transition-colors group-hover:text-gold-700">
            PolicyLens <span className="text-gold-600 font-black">AI</span>
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
    <div className="min-h-screen bg-brand-50 text-neutral-800 font-sans flex flex-col selection:bg-gold-500 selection:text-white animate-fade-in-up">
      {/* Sticky Header Navigation Bar */}
      <header className="sticky top-0 z-40 bg-brand-50/90 backdrop-blur-md border-b border-brand-200/70 transition-all">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Logo & Return to Splash */}
          <button
            onClick={() => setShowSplash(true)}
            className="flex items-center gap-3 group text-left cursor-pointer focus:outline-hidden"
            title="Volver a la pantalla de entrada"
          >
            <svg
              className="w-8 h-8 rounded-lg shadow-sm shadow-gold-500/20 group-hover:scale-105 transition-transform"
              viewBox="0 0 32 32"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect width="32" height="32" rx="6" fill="#b8860b" />
              <path d="M8 8h6v16H8V8zm10 0h6v10h-6V8z" fill="white" opacity="0.95" />
              <circle cx="21" cy="24" r="3" fill="white" opacity="0.85" />
            </svg>
            <div>
              <span className="font-extrabold text-base text-neutral-900 tracking-tight leading-none block">
                PolicyLens
              </span>
              <span className="text-3xs uppercase font-bold tracking-widest text-gold-600 block">
                AI Platform
              </span>
            </div>
          </button>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-bold text-neutral-600">
            <a href="#inicio" className="hover:text-gold-600 transition-colors">Inicio</a>
            <a href="#flujo" className="hover:text-gold-600 transition-colors">Flujo Neuronal</a>
            <a href="#beneficios" className="hover:text-gold-600 transition-colors">Problema & Solución</a>
            <a href="#capacidades" className="hover:text-gold-600 transition-colors">Características</a>
          </nav>

          {/* Action Login Button */}
          <div className="flex items-center gap-3">
            <Link
              to={isAuth ? '/chat' : '/login'}
              className="px-4.5 py-2 rounded-xl bg-gold-500 hover:bg-gold-600 text-white font-bold text-xs shadow-md shadow-gold-500/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2"
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
        <section id="inicio" className="relative pt-12 pb-20 md:pt-20 md:pb-24 overflow-hidden">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-8">
              {/* Left Column: Copywriting */}
              <div className="flex-1 text-center lg:text-left space-y-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold-100 border border-gold-200 text-gold-800 text-xs font-bold shadow-2xs">
                  <span className="w-2 h-2 rounded-full bg-gold-500 animate-pulse" />
                  <span>Plataforma RAG de Políticas Corporativas</span>
                </div>

                <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-neutral-900 tracking-tight leading-[1.15]">
                  Claridad instantánea para tus <span className="text-gold-600 underline decoration-gold-300 decoration-wavy decoration-2">políticas y contratos</span> internos.
                </h1>

                <p className="text-base md:text-lg text-neutral-600 leading-relaxed font-normal max-w-xl mx-auto lg:mx-0">
                  Encuentra respuestas precisas, contextualizadas y con fuentes exactas en segundos. Sin alucinaciones, sin fricción y con soporte multiformato.
                </p>

                {/* CTA Buttons */}
                <div className="pt-2 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
                  <Link
                    to={isAuth ? '/chat' : '/login'}
                    className="w-full sm:w-auto px-7 py-4 rounded-xl bg-gold-500 hover:bg-gold-600 text-white font-bold text-sm shadow-lg shadow-gold-500/25 hover:scale-[1.02] active:scale-95 transition-all text-center flex items-center justify-center gap-2.5"
                  >
                    <span>{isAuth ? 'Abrir Consultas RAG' : 'Comenzar / Iniciar Sesión'}</span>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </Link>

                  <a
                    href="#flujo"
                    className="w-full sm:w-auto px-6 py-4 rounded-xl border border-brand-200 bg-white hover:bg-brand-100 text-neutral-700 font-bold text-sm shadow-2xs hover:border-gold-300 transition-all text-center"
                  >
                    Ver Flujo Neuronal
                  </a>
                </div>

                {/* Key Metric Highlights */}
                <div className="pt-6 grid grid-cols-3 gap-4 border-t border-brand-200/80 max-w-lg mx-auto lg:mx-0 text-left">
                  <div>
                    <p className="text-lg font-black text-neutral-900">100%</p>
                    <p className="text-2xs font-semibold text-neutral-400 uppercase tracking-wider">Citas Verificables</p>
                  </div>
                  <div>
                    <p className="text-lg font-black text-neutral-900">3 Formatos</p>
                    <p className="text-2xs font-semibold text-neutral-400 uppercase tracking-wider">PDF, DOCX, HTML</p>
                  </div>
                  <div>
                    <p className="text-lg font-black text-neutral-900">&lt; 1.8s</p>
                    <p className="text-2xs font-semibold text-neutral-400 uppercase tracking-wider">Respuesta RAG</p>
                  </div>
                </div>
              </div>

              {/* Right Column: Interactive UI Showcase Mockup */}
              <div className="flex-1 w-full max-w-lg lg:max-w-none">
                <div className="relative rounded-3xl border border-brand-200 bg-white p-5 md:p-6 shadow-xl shadow-brand-200/40 animate-scale-up">
                  {/* Window Bar Header */}
                  <div className="flex items-center justify-between pb-4 mb-4 border-b border-brand-100">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-red-400/80" />
                      <span className="w-3 h-3 rounded-full bg-amber-400/80" />
                      <span className="w-3 h-3 rounded-full bg-green-400/80" />
                    </div>
                    <span className="text-3xs font-bold uppercase tracking-wider text-neutral-400 bg-brand-50 px-2 py-0.5 rounded-md border border-brand-200/60">
                      PolicyLens AI &bull; Simulación RAG
                    </span>
                  </div>

                  {/* Simulated Chat Feed */}
                  <div className="space-y-4 text-left">
                    {/* User Question */}
                    <div className="flex gap-3 items-start justify-end">
                      <div className="bg-brand-100/70 border border-brand-200/50 rounded-2xl rounded-tr-xs p-3.5 max-w-[85%] text-xs font-medium text-neutral-800">
                        ¿Cuántos días de vacaciones me corresponden al cumplir el primer año y cómo se solicitan?
                      </div>
                      <div className="w-7 h-7 rounded-lg bg-neutral-800 text-white flex items-center justify-center text-xs font-bold shrink-0">
                        U
                      </div>
                    </div>

                    {/* AI Response with Gold Bar */}
                    <div className="flex gap-3 items-start relative bg-brand-50/40 border border-brand-200 rounded-2xl rounded-tl-xs p-4 shadow-2xs">
                      <div className="w-7 h-7 rounded-lg bg-gold-500 text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-sm shadow-gold-500/30">
                        PL
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
                        <div className="pt-2 border-t border-brand-200/60">
                          <div className="p-2.5 rounded-xl bg-white border border-brand-200 flex items-center justify-between gap-2 shadow-2xs">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="p-1 rounded bg-red-50 text-red-600 border border-red-100 text-3xs font-bold">PDF</span>
                              <div className="min-w-0">
                                <p className="text-3xs font-bold text-neutral-800 truncate">manual_rrhh_2026.pdf</p>
                                <p className="text-3xs text-neutral-400">Pág. 32 &bull; Sección Vacaciones y Descansos</p>
                              </div>
                            </div>
                            <span className="text-3xs font-bold text-gold-600 bg-gold-50 px-2 py-0.5 rounded-md border border-gold-200">
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

        {/* 2. INTERACTIVE NEURAL-CYCLE FLOW (SPLIT VIEW COMPONENT) */}
        <section id="flujo" className="py-20 bg-white border-y border-brand-200/70 relative">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            {/* Section Header */}
            <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
              <span className="text-xs font-extrabold uppercase tracking-widest text-gold-600 bg-gold-50 px-3 py-1 rounded-full border border-gold-200">
                Flujo Neuronal RAG
              </span>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-neutral-900 tracking-tight">
                El Proceso de Consulta Paso a Paso
              </h2>
              <p className="text-sm text-neutral-500 font-medium">
                Haz clic en cada nodo del grafo para ver cómo funciona cada etapa del sistema.
              </p>
            </div>

            {/* Split View Container */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
              {/* Left Column: Circular Neural-Network Graph (5 cols) */}
              <div className="lg:col-span-5 flex flex-col items-center justify-center">
                <div className="relative w-72 h-72 sm:w-80 sm:h-80 md:w-96 md:h-96 flex items-center justify-center select-none">
                  {/* SVG Neural Connections with Curved Paths & Travelling Data Particles */}
                  <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 340 340">
                    <defs>
                      <linearGradient id="orbitGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#b8860b" stopOpacity="0.4" />
                        <stop offset="50%" stopColor="#dcc9ad" stopOpacity="0.2" />
                        <stop offset="100%" stopColor="#b8860b" stopOpacity="0.4" />
                      </linearGradient>

                      {/* Filter for particle glow */}
                      <filter id="goldGlow" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="2" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                      </filter>
                    </defs>

                    {/* Outer Neural Orbit Path */}
                    <circle
                      cx="170"
                      cy="170"
                      r="115"
                      fill="none"
                      stroke="url(#orbitGradient)"
                      strokeWidth="1.5"
                      strokeDasharray="6 6"
                      className="animate-spin-slow"
                    />

                    {/* Curved Connection Paths to Satellite Nodes */}
                    {/* Curve 1: Center (170,170) to Node 1 Top (170,55) */}
                    <path
                      id="curve-1"
                      d="M 170 170 Q 145 110 170 55"
                      fill="none"
                      stroke={activeStep === 1 ? '#b8860b' : '#dcc9ad'}
                      strokeWidth={activeStep === 1 ? '2.5' : '1.5'}
                      strokeDasharray="4 4"
                      strokeOpacity={activeStep === 1 ? '0.95' : '0.4'}
                      className="transition-all duration-300"
                    />

                    {/* Curve 2: Center (170,170) to Node 2 Right (285,170) */}
                    <path
                      id="curve-2"
                      d="M 170 170 Q 230 145 285 170"
                      fill="none"
                      stroke={activeStep === 2 ? '#b8860b' : '#dcc9ad'}
                      strokeWidth={activeStep === 2 ? '2.5' : '1.5'}
                      strokeDasharray="4 4"
                      strokeOpacity={activeStep === 2 ? '0.95' : '0.4'}
                      className="transition-all duration-300"
                    />

                    {/* Curve 3: Center (170,170) to Node 3 Bottom (170,285) */}
                    <path
                      id="curve-3"
                      d="M 170 170 Q 195 230 170 285"
                      fill="none"
                      stroke={activeStep === 3 ? '#b8860b' : '#dcc9ad'}
                      strokeWidth={activeStep === 3 ? '2.5' : '1.5'}
                      strokeDasharray="4 4"
                      strokeOpacity={activeStep === 3 ? '0.95' : '0.4'}
                      className="transition-all duration-300"
                    />

                    {/* Curve 4: Center (170,170) to Node 4 Left (55,170) */}
                    <path
                      id="curve-4"
                      d="M 170 170 Q 110 195 55 170"
                      fill="none"
                      stroke={activeStep === 4 ? '#b8860b' : '#dcc9ad'}
                      strokeWidth={activeStep === 4 ? '2.5' : '1.5'}
                      strokeDasharray="4 4"
                      strokeOpacity={activeStep === 4 ? '0.95' : '0.4'}
                      className="transition-all duration-300"
                    />

                    {/* Animated Data Particles travelling along the curves */}
                    <circle r={activeStep === 1 ? '4' : '2.5'} fill={activeStep === 1 ? '#d4a017' : '#b08d55'} opacity={activeStep === 1 ? '1' : '0.4'} filter="url(#goldGlow)">
                      <animateMotion dur="2.2s" repeatCount="indefinite">
                        <mpath href="#curve-1" />
                      </animateMotion>
                    </circle>

                    <circle r={activeStep === 2 ? '4' : '2.5'} fill={activeStep === 2 ? '#d4a017' : '#b08d55'} opacity={activeStep === 2 ? '1' : '0.4'} filter="url(#goldGlow)">
                      <animateMotion dur="2.4s" repeatCount="indefinite">
                        <mpath href="#curve-2" />
                      </animateMotion>
                    </circle>

                    <circle r={activeStep === 3 ? '4' : '2.5'} fill={activeStep === 3 ? '#d4a017' : '#b08d55'} opacity={activeStep === 3 ? '1' : '0.4'} filter="url(#goldGlow)">
                      <animateMotion dur="2.2s" repeatCount="indefinite">
                        <mpath href="#curve-3" />
                      </animateMotion>
                    </circle>

                    <circle r={activeStep === 4 ? '4' : '2.5'} fill={activeStep === 4 ? '#d4a017' : '#b08d55'} opacity={activeStep === 4 ? '1' : '0.4'} filter="url(#goldGlow)">
                      <animateMotion dur="2.4s" repeatCount="indefinite">
                        <mpath href="#curve-4" />
                      </animateMotion>
                    </circle>
                  </svg>

                  {/* Central Node: Clean "Sistema" Hub */}
                  <div className="relative z-10 w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-neutral-900 via-neutral-900 to-brand-950 p-1 shadow-lg shadow-gold-500/10 flex items-center justify-center text-white border border-gold-500/30">
                    <div className="flex flex-col items-center justify-center">
                      <svg className="w-5 h-5 text-gold-400 mb-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <rect x="2" y="2" width="20" height="8" rx="2" />
                        <rect x="2" y="14" width="20" height="8" rx="2" />
                        <line x1="6" y1="6" x2="6.01" y2="6" strokeLinecap="round" strokeWidth="3" />
                        <line x1="6" y1="18" x2="6.01" y2="18" strokeLinecap="round" strokeWidth="3" />
                      </svg>
                      <span className="text-3xs uppercase font-extrabold text-neutral-200 tracking-wider">Sistema</span>
                    </div>
                  </div>

                  {/* Satellite Node 1: TOP (270°) - Carga de Documentos */}
                  <button
                    onClick={() => setActiveStep(1)}
                    className={`
                      absolute top-2 sm:top-3 left-1/2 -translate-x-1/2 z-20 group cursor-pointer focus:outline-hidden transition-all duration-300
                      ${activeStep === 1 ? 'scale-110' : 'hover:scale-105 opacity-80 hover:opacity-100'}
                    `}
                    title="Carga de Documentos"
                    aria-label="Paso 1: Carga de Documentos"
                  >
                    <div className={`
                      w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center transition-all duration-300 shadow-md
                      ${activeStep === 1 
                        ? 'bg-gold-500 text-white ring-4 ring-gold-400/30 shadow-gold-500/30' 
                        : 'bg-white text-neutral-700 border border-brand-200 hover:border-gold-300'}
                    `}>
                      {renderStepIcon('document', 'w-6 h-6')}
                    </div>
                  </button>

                  {/* Satellite Node 2: RIGHT (0°) - Consulta del Usuario */}
                  <button
                    onClick={() => setActiveStep(2)}
                    className={`
                      absolute top-1/2 right-2 sm:right-3 -translate-y-1/2 z-20 group cursor-pointer focus:outline-hidden transition-all duration-300
                      ${activeStep === 2 ? 'scale-110' : 'hover:scale-105 opacity-80 hover:opacity-100'}
                    `}
                    title="Consulta del Colaborador"
                    aria-label="Paso 2: Consulta del Colaborador"
                  >
                    <div className={`
                      w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center transition-all duration-300 shadow-md
                      ${activeStep === 2 
                        ? 'bg-gold-500 text-white ring-4 ring-gold-400/30 shadow-gold-500/30' 
                        : 'bg-white text-neutral-700 border border-brand-200 hover:border-gold-300'}
                    `}>
                      {renderStepIcon('query', 'w-6 h-6')}
                    </div>
                  </button>

                  {/* Satellite Node 3: BOTTOM (90°) - Procesamiento Neuronal & RAG */}
                  <button
                    onClick={() => setActiveStep(3)}
                    className={`
                      absolute bottom-2 sm:bottom-3 left-1/2 -translate-x-1/2 z-20 group cursor-pointer focus:outline-hidden transition-all duration-300
                      ${activeStep === 3 ? 'scale-110' : 'hover:scale-105 opacity-80 hover:opacity-100'}
                    `}
                    title="Procesamiento Neuronal & RAG"
                    aria-label="Paso 3: Procesamiento Neuronal & RAG"
                  >
                    <div className={`
                      w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center transition-all duration-300 shadow-md
                      ${activeStep === 3 
                        ? 'bg-gold-500 text-white ring-4 ring-gold-400/30 shadow-gold-500/30' 
                        : 'bg-white text-neutral-700 border border-brand-200 hover:border-gold-300'}
                    `}>
                      {renderStepIcon('neural', 'w-6 h-6')}
                    </div>
                  </button>

                  {/* Satellite Node 4: LEFT (180°) - Respuesta Verificada con Fuentes */}
                  <button
                    onClick={() => setActiveStep(4)}
                    className={`
                      absolute top-1/2 left-2 sm:left-3 -translate-y-1/2 z-20 group cursor-pointer focus:outline-hidden transition-all duration-300
                      ${activeStep === 4 ? 'scale-110' : 'hover:scale-105 opacity-80 hover:opacity-100'}
                    `}
                    title="Respuesta Verificada con Fuentes"
                    aria-label="Paso 4: Respuesta Verificada con Fuentes"
                  >
                    <div className={`
                      w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center transition-all duration-300 shadow-md
                      ${activeStep === 4 
                        ? 'bg-gold-500 text-white ring-4 ring-gold-400/30 shadow-gold-500/30' 
                        : 'bg-white text-neutral-700 border border-brand-200 hover:border-gold-300'}
                    `}>
                      {renderStepIcon('verified', 'w-6 h-6')}
                    </div>
                  </button>
                </div>

                {/* Step Selector Pills for Mobile & Easy Access */}
                <div className="flex items-center gap-2 mt-6 bg-brand-100/60 p-1.5 rounded-2xl border border-brand-200/70">
                  {NEURAL_STEPS.map((step) => (
                    <button
                      key={step.id}
                      onClick={() => setActiveStep(step.id)}
                      className={`
                        px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer
                        ${activeStep === step.id 
                          ? 'bg-gold-500 text-white shadow-sm shadow-gold-500/20' 
                          : 'text-neutral-600 hover:text-neutral-900 hover:bg-white/60'}
                      `}
                    >
                      Paso {step.number}
                    </button>
                  ))}
                </div>
              </div>

              {/* Right Column: Clean, Airy & Simple Information Card (7 cols) */}
              <div className="lg:col-span-7">
                <div 
                  key={currentStep.id} 
                  className="bg-brand-50/60 border border-brand-200 rounded-3xl p-6 sm:p-8 md:p-10 shadow-xs relative overflow-hidden animate-fade-in-up"
                >
                  {/* Step Pill Header */}
                  <div className="flex items-center gap-2.5 mb-4">
                    <span className="px-3 py-1 rounded-lg bg-gold-500 text-white font-extrabold text-xs shadow-sm shadow-gold-500/20">
                      Paso {currentStep.number}
                    </span>
                    <span className="text-xs font-bold text-gold-700">
                      {currentStep.subtitle}
                    </span>
                  </div>

                  {/* Concise Title */}
                  <h3 className="text-xl sm:text-2xl font-black text-neutral-900 tracking-tight leading-tight">
                    {currentStep.title}
                  </h3>

                  {/* Simple, Human-Friendly Description */}
                  <p className="mt-4 text-sm sm:text-base text-neutral-600 leading-relaxed font-normal">
                    {currentStep.description}
                  </p>

                  {/* Clean Highlight Footer */}
                  <div className="mt-8 pt-5 border-t border-brand-200/80 flex items-center gap-2.5 text-xs sm:text-sm font-bold text-neutral-800">
                    <span className="w-5 h-5 rounded-full bg-gold-100 text-gold-700 flex items-center justify-center font-bold text-xs shrink-0">
                      ✓
                    </span>
                    <span>{currentStep.highlight}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3. PROBLEM & SOLUTION BREAKDOWN */}
        <section id="beneficios" className="py-20 bg-brand-50">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
              <span className="text-xs font-extrabold uppercase tracking-widest text-gold-600 bg-gold-100 px-3 py-1 rounded-full border border-gold-200">
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
              <div className="rounded-3xl border border-gold-300 bg-white p-6 md:p-8 space-y-6 shadow-md shadow-gold-500/10 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gold-400/10 rounded-bl-full pointer-events-none" />
                
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gold-500 text-white flex items-center justify-center font-bold text-lg shadow-sm shadow-gold-500/30">
                    ✓
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-neutral-900">La Solución PolicyLens AI</h3>
                    <p className="text-2xs text-gold-700 font-semibold">Precisión, inmediatez y trazabilidad total</p>
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
        <section id="capacidades" className="py-20 bg-white border-t border-brand-200/70">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
              <span className="text-xs font-extrabold uppercase tracking-widest text-gold-600 bg-gold-50 px-3 py-1 rounded-full border border-gold-200">
                Capacidades Principales
              </span>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-neutral-900 tracking-tight">
                Todo lo que necesitas para gobernar tu conocimiento interno
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Feature 1 */}
              <div className="p-6 rounded-2xl border border-brand-200 bg-brand-50/40 hover:border-gold-300 hover:bg-white transition-all duration-300 shadow-2xs space-y-3">
                <div className="w-10 h-10 rounded-xl bg-gold-100 border border-gold-200 text-gold-700 flex items-center justify-center">
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
              <div className="p-6 rounded-2xl border border-brand-200 bg-brand-50/40 hover:border-gold-300 hover:bg-white transition-all duration-300 shadow-2xs space-y-3">
                <div className="w-10 h-10 rounded-xl bg-gold-100 border border-gold-200 text-gold-700 flex items-center justify-center">
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
              <div className="p-6 rounded-2xl border border-brand-200 bg-brand-50/40 hover:border-gold-300 hover:bg-white transition-all duration-300 shadow-2xs space-y-3">
                <div className="w-10 h-10 rounded-xl bg-gold-100 border border-gold-200 text-gold-700 flex items-center justify-center">
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
              <div className="p-6 rounded-2xl border border-brand-200 bg-brand-50/40 hover:border-gold-300 hover:bg-white transition-all duration-300 shadow-2xs space-y-3">
                <div className="w-10 h-10 rounded-xl bg-gold-100 border border-gold-200 text-gold-700 flex items-center justify-center">
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
      <footer className="bg-brand-100 border-t border-brand-200 py-8 text-neutral-500 text-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-gold-500 flex items-center justify-center text-white font-bold text-2xs">
              PL
            </div>
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
