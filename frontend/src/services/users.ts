import type { User, UserListResponse } from '../types'
import api from './api'

export async function listarUsuarios(): Promise<UserListResponse> {
  const res = await api.get<UserListResponse>('/users') as any
  return {
    total: res.total,
    users: res.users
  }
}

export async function crearUsuario(data: {
  nombre: string
  email: string
  password: string
  role: string
}): Promise<User> {
  const res = await api.post('/users', data) as any
  return res
}

export async function editarUsuario(id: number, data: {
  nombre?: string
  email?: string
  role?: string
  is_active?: boolean
}): Promise<User> {
  const res = await api.put(`/users/${id}`, data) as any
  return res
}

export async function eliminarUsuario(id: number): Promise<void> {
  await api.delete(`/users/${id}`)
}
