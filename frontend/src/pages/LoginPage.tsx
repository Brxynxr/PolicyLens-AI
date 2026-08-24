import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    if (localStorage.getItem('user_id')) {
      navigate('/chat', { replace: true })
    }
  }, [navigate])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const res = await api.post('/auth/login', { email, password }) as any
      localStorage.setItem('user_id', String(res.user.id))
      localStorage.setItem('user_role', res.user.role)
      localStorage.setItem('user_name', res.user.nombre)
      navigate('/chat', { replace: true })
    } catch (err: any) {
      const detail = err?.response?.data?.detail
      setError(detail || 'Error al iniciar sesion. Verifica tus credenciales.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[#181E4B] overflow-hidden px-4 font-sans antialiased">
      {/* Glows de fondo con los colores de marca */}
      <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-[#7C3AED] opacity-20 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-[#FF6B6B] opacity-15 blur-3xl pointer-events-none" />

      {/* Sutil malla de fondo */}
      <div className="absolute inset-0 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:24px_24px] opacity-5 pointer-events-none" />

      <div className="relative w-full max-w-md">
        {/* Header / Branding */}
        <div className="mb-8 text-center">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#7C3AED] to-[#A78BFA] text-white font-extrabold text-xl shadow-lg shadow-[#7C3AED]/30 ring-4 ring-white/10 mb-3">
            RP
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">
            Riwi<span className="text-[#7C3AED]">PolicyLens</span>
          </h1>
          <span className="mt-1 inline-block rounded-full bg-[#7C3AED]/20 px-3 py-0.5 text-xs font-semibold uppercase tracking-widest text-[#A78BFA]">
            AI PLATFORM
          </span>
        </div>

        {/* Login Card */}
        <div className="rounded-3xl bg-white p-8 shadow-2xl shadow-black/40 ring-1 ring-black/5">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-900">Iniciar Sesion</h2>
            <p className="mt-1 text-sm text-slate-500">Ingresa tus credenciales para acceder al sistema</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            {/* Campo Correo */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Correo electronico
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                  </svg>
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@policylens.com"
                  required
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-3 pl-11 pr-4 text-sm font-medium text-slate-800 placeholder-slate-400 transition-all focus:border-[#7C3AED] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#7C3AED]/10"
                />
              </div>
            </div>

            {/* Campo Contrasena */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Contrasena
                </label>
              </div>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-3 pl-11 pr-11 text-sm font-medium text-slate-800 placeholder-slate-400 transition-all focus:border-[#7C3AED] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#7C3AED]/10"
                />
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-4 rounded-xl bg-[#FF6B6B]/10 border border-[#FF6B6B]/20 text-[#FF6B6B] text-sm font-semibold flex items-center gap-3 animate-fade-in-up">
                <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            {/* Boton Submit */}
            <button
              type="submit"
              disabled={loading || !email.trim() || !password.trim()}
              className={`
                w-full rounded-xl py-3.5 text-sm font-bold text-white shadow-lg transition-all
                ${loading || !email.trim() || !password.trim()
                  ? 'bg-slate-300 shadow-none cursor-not-allowed'
                  : 'bg-gradient-to-r from-[#7C3AED] to-[#6D28D9] shadow-[#7C3AED]/30 hover:opacity-95 hover:shadow-xl hover:shadow-[#7C3AED]/40 active:scale-[0.99] focus:outline-none focus:ring-4 focus:ring-[#7C3AED]/30'}
              `}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Verificando...
                </span>
              ) : (
                'Iniciar Sesion'
              )}
            </button>
          </form>
        </div>

        {/* Footer de la pantalla */}
        <p className="mt-8 text-center text-xs font-medium text-slate-400">
          Sistema de Navegador Inteligente de Politicas &bull; Riwi 2026
        </p>
      </div>
    </div>
  )
}
