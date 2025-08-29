// Componentes de estados de error reutilizables
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertTriangle, RefreshCw, Home, WifiOff } from 'lucide-react'

interface ErrorStateProps {
  title?: string
  message?: string
  onRetry?: () => void
  onGoHome?: () => void
  className?: string
}

export function ErrorState({ 
  title = 'Algo salió mal',
  message = 'Ha ocurrido un error inesperado',
  onRetry,
  onGoHome,
  className 
}: ErrorStateProps) {
  return (
    <Card className={className}>
      <CardContent className="py-12 text-center">
        <div className="text-destructive">
          <AlertTriangle className="h-12 w-12 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">{title}</h3>
          <p className="text-sm text-muted-foreground mb-6">{message}</p>
          
          <div className="flex gap-2 justify-center">
            {onRetry && (
              <Button onClick={onRetry} variant="outline">
                <RefreshCw className="mr-2 h-4 w-4" />
                Reintentar
              </Button>
            )}
            {onGoHome && (
              <Button onClick={onGoHome}>
                <Home className="mr-2 h-4 w-4" />
                Ir al Inicio
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function NetworkError({ onRetry }: { onRetry?: () => void }) {
  return (
    <Alert variant="destructive">
      <WifiOff className="h-4 w-4" />
      <AlertTitle>Error de Conexión</AlertTitle>
      <AlertDescription className="flex items-center justify-between">
        <span>No se pudo conectar al servidor. Verifica tu conexión a internet.</span>
        {onRetry && (
          <Button size="sm" variant="outline" onClick={onRetry}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Reintentar
          </Button>
        )}
      </AlertDescription>
    </Alert>
  )
}

export function NotFoundError({ 
  resource = 'recurso',
  onGoBack 
}: { 
  resource?: string
  onGoBack?: () => void 
}) {
  return (
    <ErrorState
      title="No Encontrado"
      message={`El ${resource} que buscas no existe o ha sido eliminado.`}
      onGoHome={onGoBack}
    />
  )
}

export function PermissionError({ 
  feature = 'funcionalidad',
  onUpgrade 
}: { 
  feature?: string
  onUpgrade?: () => void 
}) {
  return (
    <Alert>
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Acceso Restringido</AlertTitle>
      <AlertDescription className="flex items-center justify-between">
        <span>Esta {feature} requiere Plan Pro.</span>
        {onUpgrade && (
          <Button size="sm" onClick={onUpgrade}>
            Actualizar Plan
          </Button>
        )}
      </AlertDescription>
    </Alert>
  )
}