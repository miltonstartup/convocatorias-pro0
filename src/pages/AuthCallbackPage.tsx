import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

export function AuthCallbackPage() {
  const navigate = useNavigate()

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Obtener la sesión del hash de la URL
        const { data, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Error en auth callback:', error)
          toast.error('Error al iniciar sesión: ' + error.message)
          navigate('/login', { replace: true })
          return
        }
        
        if (data.session) {
          toast.success('¡Bienvenido a ConvocatoriasPro!')
          // Redirigir a selección de plan para nuevos usuarios
          navigate('/plans?first=true', { replace: true })
        } else {
          navigate('/login', { replace: true })
        }
      } catch (error: any) {
        console.error('Error inesperado:', error)
        toast.error('Error inesperado: ' + error.message)
        navigate('/login', { replace: true })
      }
    }

    handleAuthCallback()
  }, [navigate])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Completando inicio de sesión...</p>
      </div>
    </div>
  )
}