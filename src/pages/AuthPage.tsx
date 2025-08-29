import { useLocation } from 'react-router-dom'
import { LoginForm } from '@/components/auth/LoginForm'
import { RegisterForm } from '@/components/auth/RegisterForm'
import { AuthGuard } from '@/components/auth/AuthGuard'
import { Target } from 'lucide-react'

interface AuthPageProps {
  type: 'login' | 'register'
}

export function AuthPage({ type }: AuthPageProps) {
  const location = useLocation()
  const from = location.state?.from || '/app/dashboard'

  return (
    <AuthGuard requireAuth={false}>
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          {/* Logo */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Target className="h-8 w-8 text-primary" />
              <span className="text-2xl font-bold">ConvocatoriasPro</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Gestiona tus convocatorias de financiamiento
            </p>
          </div>
          
          {/* Formulario */}
          {type === 'login' ? <LoginForm /> : <RegisterForm />}
        </div>
      </div>
    </AuthGuard>
  )
}