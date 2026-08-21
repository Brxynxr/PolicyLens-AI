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
    <div className="min-h-screen flex items-center justify-center bg-brand-50 p-4">
      <div className="w-full max-w-md animate-fade-in-up">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gold-500 flex items-center justify-center text-white font-bold text-xl mx-auto mb-4 shadow-md shadow-gold-500/20">
            RP
          </div>
          <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">RiwiPolicylens</h1>
          <p className="text-xs font-semibold uppercase tracking-wider text-gold-600 mt-1">AI Platform</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl border border-brand-200 shadow-2xs p-8">
          <h2 className="text-lg font-bold text-neutral-900 mb-1">Iniciar Sesion</h2>
          <p className="text-xs text-neutral-400 font-medium mb-6">Ingresa tus credenciales para acceder al sistema</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-xs font-bold text-neutral-700 mb-1.5">
                Correo electronico
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@policylens.com"
                required
                className="w-full px-4 py-3 rounded-xl border border-brand-200 bg-white text-sm focus:outline-hidden focus:border-gold-500 focus:ring-1 focus:ring-gold-500/20 transition-all font-medium text-neutral-800 placeholder:text-neutral-300"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-bold text-neutral-700 mb-1.5">
                Contrasena
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Tu contrasena"
                required
                className="w-full px-4 py-3 rounded-xl border border-brand-200 bg-white text-sm focus:outline-hidden focus:border-gold-500 focus:ring-1 focus:ring-gold-500/20 transition-all font-medium text-neutral-800 placeholder:text-neutral-300"
              />
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-red-700 text-xs font-semibold flex items-center gap-2">
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !email.trim() || !password.trim()}
              className={`
                w-full py-3.5 rounded-xl font-bold text-sm transition-all shadow-md
                ${loading || !email.trim() || !password.trim()
                  ? 'bg-neutral-300 text-white shadow-none cursor-not-allowed'
                  : 'bg-gold-500 hover:bg-gold-600 text-white shadow-gold-500/20 hover:scale-[1.01] active:scale-95'}
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

        {/* Footer */}
        <p className="text-center text-xs text-neutral-400 font-medium mt-6">
          Sistema de Navegador Inteligente de Politicas
        </p>
      </div>
    </div>
  )
}
