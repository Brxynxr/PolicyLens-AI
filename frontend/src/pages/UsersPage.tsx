import { useState, useEffect } from 'react'
import { listarUsuarios, crearUsuario, editarUsuario, eliminarUsuario } from '../services/users'
import type { User } from '../types'
import UserModal from '../components/UserModal'
import ConfirmDialog from '../components/ConfirmDialog'

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [userToDelete, setUserToDelete] = useState<User | null>(null)

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

  const handleDelete = async () => {
    if (!userToDelete) return
    setDeletingId(userToDelete.id)
    try {
      await eliminarUsuario(userToDelete.id)
      await fetchUsers()
      setUserToDelete(null)
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

  const getRoleBadge = (role: string) => {
    if (role === 'admin') {
      return 'bg-[#7C3AED]/10 text-[#7C3AED] border border-[#7C3AED]/20'
    }
    return 'bg-slate-100 text-slate-600 border border-slate-200'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 leading-tight">Gestion de Usuarios</h1>
          <p className="text-xs font-semibold text-slate-400 mt-1 uppercase tracking-wider">
            {total} usuario{total !== 1 ? 's' : ''} registrado{total !== 1 ? 's' : ''} &bull; Panel de administracion
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-bold shadow-md shadow-[#7C3AED]/20 transition-all"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Crear Usuario
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-[#FF6B6B]/10 border border-[#FF6B6B]/20 text-[#FF6B6B] text-xs font-semibold flex items-center gap-2">
          <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-sm">
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
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-4">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <h3 className="text-sm font-bold text-slate-800">No hay usuarios registrados</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-xs">
              Crea el primer usuario para comenzar a gestionar el acceso al sistema.
            </p>
            <button
              onClick={handleCreate}
              className="mt-4 px-4 py-2 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-bold shadow-md shadow-[#7C3AED]/20 transition-all"
            >
              Crear primer usuario
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3.5 px-6">Usuario</th>
                  <th className="py-3.5 px-6 hidden sm:table-cell">Email</th>
                  <th className="py-3.5 px-6">Rol</th>
                  <th className="py-3.5 px-6 hidden md:table-cell">Estado</th>
                  <th className="py-3.5 px-6 hidden lg:table-cell">Creado</th>
                  <th className="py-3.5 px-6 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50/50 transition-all">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-[#7C3AED]/10 border border-[#7C3AED]/20 flex items-center justify-center text-[#7C3AED] font-bold text-xs shrink-0">
                          {user.nombre.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-900 truncate">{user.nombre}</p>
                          <p className="text-xs text-slate-400 sm:hidden truncate">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6 hidden sm:table-cell">
                      <span className="text-sm text-slate-600 font-medium">{user.email}</span>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${getRoleBadge(user.role)}`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="py-4 px-6 hidden md:table-cell">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${user.is_active ? 'bg-[#48BB78]' : 'bg-slate-300'}`} />
                        <span className="text-xs font-semibold text-slate-500">
                          {user.is_active ? 'Activo' : 'Inactivo'}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-6 hidden lg:table-cell">
                      <span className="text-xs text-slate-400 font-medium">{formatDate(user.created_at)}</span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleEdit(user)}
                          className="p-2 rounded-lg text-slate-400 hover:text-[#7C3AED] hover:bg-[#7C3AED]/10 transition-all"
                          title="Editar"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setUserToDelete(user)}
                          disabled={deletingId === user.id}
                          className="p-2 rounded-lg text-slate-400 hover:text-[#FF6B6B] hover:bg-[#FF6B6B]/10 transition-all disabled:opacity-50"
                          title="Eliminar"
                        >
                          {deletingId === user.id ? (
                            <div className="w-4 h-4 border-2 border-slate-200 border-t-[#FF6B6B] rounded-full animate-spin"></div>
                          ) : (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          )}
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

      {/* Delete Confirmation Modal */}
      {userToDelete && (
        <ConfirmDialog
          title="Eliminar usuario"
          message={`¿Seguro que deseas eliminar a "${userToDelete.nombre}" (${userToDelete.email})? El usuario perdera el acceso al sistema.`}
          confirmLabel="Eliminar"
          loading={deletingId !== null}
          onConfirm={handleDelete}
          onClose={() => setUserToDelete(null)}
        />
      )}
    </div>
  )
}
