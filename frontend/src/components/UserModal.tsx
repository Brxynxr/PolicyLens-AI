import { useState, useEffect } from 'react'
import type { User } from '../types'

interface UserModalProps {
  user?: User | null
  onSave: (data: any) => Promise<void>
  onClose: () => void
}

export default function UserModal({ user, onSave, onClose }: UserModalProps) {
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('empleado')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isEditing = !!user

  useEffect(() => {
    if (user) {
      setNombre(user.nombre)
      setEmail(user.email)
      setRole(user.role)
    }
  }, [user])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!nombre.trim() || !email.trim()) {
      setError('Nombre y email son obligatorios.')
      return
    }

    if (!isEditing && !password.trim()) {
      setError('La contrasena es obligatoria al crear un usuario.')
      return
    }

    setSaving(true)
    try {
      if (isEditing) {
        await onSave({ nombre, email, role })
      } else {
        await onSave({ nombre, email, password, role })
      }
    } catch (err: any) {
      const detail = err?.response?.data?.detail
      setError(detail || 'Error al guardar el usuario.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-neutral-900/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      <div className="relative w-full max-w-md bg-white rounded-2xl border border-brand-200 shadow-xl p-6 animate-scale-up">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-bold text-neutral-900">
              {isEditing ? 'Editar Usuario' : 'Crear Usuario'}
            </h2>
            <p className="text-xs text-neutral-400 font-medium mt-0.5">
              {isEditing ? 'Modifica los datos del usuario' : 'Completa los datos para crear un nuevo usuario'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-brand-100 text-neutral-400 hover:text-neutral-700 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-neutral-700 mb-1.5">
              Nombre
            </label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Nombre completo"
              className="w-full px-4 py-3 rounded-xl border border-brand-200 bg-white text-sm focus:outline-hidden focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED]/20 transition-all font-medium text-neutral-800 placeholder:text-neutral-300"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-700 mb-1.5">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="correo@ejemplo.com"
              className="w-full px-4 py-3 rounded-xl border border-brand-200 bg-white text-sm focus:outline-hidden focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED]/20 transition-all font-medium text-neutral-800 placeholder:text-neutral-300"
            />
          </div>

          {!isEditing && (
            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1.5">
                Contrasena
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Contrasena inicial"
                className="w-full px-4 py-3 rounded-xl border border-brand-200 bg-white text-sm focus:outline-hidden focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED]/20 transition-all font-medium text-neutral-800 placeholder:text-neutral-300"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-neutral-700 mb-1.5">
              Rol
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-brand-200 bg-white text-sm focus:outline-hidden focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED]/20 transition-all font-medium text-neutral-800"
            >
              <option value="empleado">Empleado</option>
              <option value="admin">Administrador</option>
            </select>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-red-700 text-xs font-semibold flex items-center gap-2">
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-brand-200 text-neutral-600 hover:bg-brand-50 font-bold text-sm transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className={`
                flex-1 py-3 rounded-xl font-bold text-sm transition-all shadow-md
                ${saving
                  ? 'bg-neutral-300 text-white shadow-none cursor-not-allowed'
                  : 'bg-[#7C3AED] hover:bg-[#6D28D9] text-white shadow-[#7C3AED]/20 hover:scale-[1.01] active:scale-95'}
              `}
            >
              {saving ? 'Guardando...' : isEditing ? 'Guardar Cambios' : 'Crear Usuario'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
