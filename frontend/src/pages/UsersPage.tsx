import { useState, useEffect } from 'react'
import { listarUsuarios, crearUsuario, editarUsuario, eliminarUsuario } from '../services/users'
import type { User } from '../types'
import UserModal from '../components/UserModal'

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const res = await listarUsuarios()
      setUsers(res.users)
      setTotal(res.total)
    } catch {
      setError('Error al cargar la lista de usuarios.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const handleCreate = () => {
    setEditingUser(null)
    setIsModalOpen(true)
  }

  const handleEdit = (user: User) => {
    setEditingUser(user)
    setIsModalOpen(true)
  }

  const handleDelete = async (id: number) => {
    if (!window.confirm('¿Seguro que deseas eliminar este usuario?')) return
    setDeletingId(id)
    try {
      await eliminarUsuario(id)
      await fetchUsers()
    } catch {
      setError('Error al eliminar el usuario.')
    } finally {
      setDeletingId(null)
    }
  }

  const handleSave = async (data: any) => {
    if (editingUser) {
      await editarUsuario(editingUser.id, data)
    } else {
      await crearUsuario(data)
    }
    setIsModalOpen(false)
    setEditingUser(null)
    await fetchUsers()
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  }

  return (
    <div className="space-y-6 relative min-h-[calc(100vh-10rem)]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-neutral-900 leading-tight">Gestion de Usuarios</h1>
          <p className="text-xs font-semibold text-neutral-400 mt-1 uppercase tracking-wider">
            {total} usuario{total !== 1 ? 's' : ''} registrado{total !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="px-4.5 py-3 rounded-xl bg-gold-500 hover:bg-gold-600 text-white font-bold text-sm shadow-md shadow-gold-500/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2 self-start sm:self-auto cursor-pointer"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          <span>Crear Usuario</span>
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-red-700 text-xs font-semibold flex items-center gap-2">
          <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-brand-200 overflow-hidden shadow-2xs">
        {loading ? (
          <div className="p-8 space-y-4">
            {[1, 2, 3].map((n) => (
              <div key={n} className="flex gap-4 items-center">
                <div className="w-10 h-10 rounded-xl shimmer-skeleton" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 rounded-md w-1/4 shimmer-skeleton" />
                  <div className="h-2.5 rounded-md w-1/3 shimmer-skeleton" />
                </div>
                <div className="h-6 w-16 rounded-lg shimmer-skeleton" />
              </div>
            ))}
          </div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-brand-100 flex items-center justify-center text-gold-600 mb-6 shadow-sm">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-neutral-800">No hay usuarios registrados</h3>
            <p className="text-xs text-neutral-400 mt-2 font-medium max-w-xs leading-relaxed">
              Crea el primer usuario para comenzar a gestionar el acceso al sistema.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-brand-200 bg-brand-50/40">
                  <th className="text-left px-6 py-3.5 text-xs font-bold text-neutral-500 uppercase tracking-wider">Usuario</th>
                  <th className="text-left px-6 py-3.5 text-xs font-bold text-neutral-500 uppercase tracking-wider hidden sm:table-cell">Email</th>
                  <th className="text-left px-6 py-3.5 text-xs font-bold text-neutral-500 uppercase tracking-wider">Rol</th>
                  <th className="text-left px-6 py-3.5 text-xs font-bold text-neutral-500 uppercase tracking-wider hidden md:table-cell">Estado</th>
                  <th className="text-left px-6 py-3.5 text-xs font-bold text-neutral-500 uppercase tracking-wider hidden lg:table-cell">Creado</th>
                  <th className="text-right px-6 py-3.5 text-xs font-bold text-neutral-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-100">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-brand-50/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-gold-100 border border-gold-200 flex items-center justify-center text-gold-700 font-bold text-xs shrink-0">
                          {user.nombre.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-neutral-800 truncate">{user.nombre}</p>
                          <p className="text-xs text-neutral-400 sm:hidden truncate">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 hidden sm:table-cell">
                      <span className="text-sm text-neutral-600 font-medium">{user.email}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`
                        inline-flex px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider
                        ${user.role === 'admin'
                          ? 'bg-gold-100 text-gold-700 border border-gold-200'
                          : 'bg-brand-100 text-neutral-600 border border-brand-200'}
                      `}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 hidden md:table-cell">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${user.is_active ? 'bg-green-500' : 'bg-neutral-300'}`} />
                        <span className="text-xs font-semibold text-neutral-500">
                          {user.is_active ? 'Activo' : 'Inactivo'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 hidden lg:table-cell">
                      <span className="text-xs text-neutral-400 font-medium">{formatDate(user.created_at)}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleEdit(user)}
                          className="p-2 rounded-lg text-neutral-400 hover:text-gold-600 hover:bg-gold-50 transition-all"
                          title="Editar"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(user.id)}
                          disabled={deletingId === user.id}
                          className="p-2 rounded-lg text-neutral-400 hover:text-red-500 hover:bg-red-50/50 transition-all disabled:opacity-50"
                          title="Eliminar"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <UserModal
          user={editingUser}
          onSave={handleSave}
          onClose={() => {
            setIsModalOpen(false)
            setEditingUser(null)
          }}
        />
      )}
    </div>
  )
}
