export function isAuthenticated(): boolean {
  return localStorage.getItem('user_id') !== null
}

export function isAdmin(): boolean {
  return localStorage.getItem('user_role') === 'admin'
}
