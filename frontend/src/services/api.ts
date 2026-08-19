import axios from 'axios'

// Configurar instancia axios con baseURL del proxy Vite (/api -> http://localhost:8000)
const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Interceptor para manejar errores de forma consistente
// Usa la instancia 'api' ya configurada con baseURL '/api' y proxy Vite a http://localhost:8000

api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response) {
      // Error conocido del backend
      console.error('API Error:', error.response.data)
    } else {
      // Error de red o inesperado
      console.error('API Connection Error:', error.message)
    }
    return Promise.reject(error)
  }
)

export default api
