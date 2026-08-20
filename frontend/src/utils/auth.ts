export function isAuthenticated(): boolean {
  return localStorage.getItem('user_id') !== null
}

export function isAdmin(): boolean {
  return localStorage.getItem('user_role') === 'admin'
}

export function getCurrentUser() {
  return {
    id: localStorage.getItem('user_id'),
    name: localStorage.getItem('user_name') || 'Usuario',
    role: localStorage.getItem('user_role') || 'empleado'
  }
}
