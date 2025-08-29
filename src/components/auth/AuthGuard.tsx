import { useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'

interface AuthGuardProps {
  children: React.ReactNode
  requireAuth?: boolean
}

export function AuthGuard({ children, requireAuth = true }: AuthGuardProps) {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    if (!loading) {
      if (requireAuth && !user) {
        // Redirigir a login si se requiere autenticación
        navigate('/login', { 
          state: { from: location.pathname },
          replace: true 
        })
      } else if (!requireAuth && user) {
        // Redirigir al dashboard si ya está autenticado
        navigate('/app/dashboard', { replace: true })
      }
    }
  }, [user, loading, requireAuth, navigate, location.pathname])

  // Mostrar loader mientras se verifica la autenticación
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  // Mostrar contenido solo si se cumplen las condiciones
  if ((requireAuth && user) || (!requireAuth && !user)) {
    return <>{children}</>
  }

  // No mostrar nada mientras se redirige
  return null
}