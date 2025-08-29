// Componente de loading spinner
import { cn } from '@/lib/utils'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function LoadingSpinner({ size = 'md', className }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6', 
    lg: 'w-8 h-8'
  }
  
  return (
    <div className={cn('flex items-center justify-center', className)}>
      <div className={cn(
        'animate-spin rounded-full border-2 border-muted-foreground/30 border-t-primary',
        sizeClasses[size]
      )} />
    </div>
  )
}

export function LoadingCard({ className }: { className?: string }) {
  return (
    <div className={cn('p-8 text-center', className)}>
      <LoadingSpinner size="lg" className="mb-3" />
      <p className="text-sm text-muted-foreground">Cargando...</p>
    </div>
  )
}