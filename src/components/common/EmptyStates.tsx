// Componentes de estados vacíos reutilizables
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  FileText, 
  Search, 
  Calendar, 
  PlusCircle, 
  BookOpen,
  Target,
  History
} from 'lucide-react'

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description: string
  action?: {
    label: string
    onClick: () => void
  }
  className?: string
}

export function EmptyState({ 
  icon, 
  title, 
  description, 
  action, 
  className 
}: EmptyStateProps) {
  return (
    <Card className={className}>
      <CardContent className="py-12 text-center">
        <div className="text-muted-foreground">
          {icon && (
            <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center bg-muted rounded-full">
              {icon}
            </div>
          )}
          <h3 className="text-lg font-semibold mb-2">{title}</h3>
          <p className="text-sm mb-6 max-w-md mx-auto">{description}</p>
          
          {action && (
            <Button onClick={action.onClick}>
              {action.label}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export function NoConvocatorias({ onCreateNew }: { onCreateNew: () => void }) {
  return (
    <EmptyState
      icon={<FileText className="h-8 w-8" />}
      title="No tienes convocatorias"
      description="Comienza agregando tu primera convocatoria de financiamiento para gestionar fechas importantes y no perder oportunidades."
      action={{
        label: 'Agregar Primera Convocatoria',
        onClick: onCreateNew
      }}
    />
  )
}

export function NoSearchResults({ onNewSearch }: { onNewSearch?: () => void }) {
  return (
    <EmptyState
      icon={<Search className="h-8 w-8" />}
      title="Sin resultados"
      description="No se encontraron convocatorias que coincidan con tu búsqueda. Intenta ajustar los filtros o términos de búsqueda."
      action={onNewSearch ? {
        label: 'Nueva Búsqueda',
        onClick: onNewSearch
      } : undefined}
    />
  )
}

export function NoCalendarEvents({ onAddEvent }: { onAddEvent: () => void }) {
  return (
    <EmptyState
      icon={<Calendar className="h-8 w-8" />}
      title="No hay eventos"
      description="No tienes eventos programados para este período. Agrega convocatorias para ver sus fechas importantes aquí."
      action={{
        label: 'Agregar Convocatoria',
        onClick: onAddEvent
      }}
    />
  )
}

export function NoSavedSearches({ onCreateSearch }: { onCreateSearch: () => void }) {
  return (
    <EmptyState
      icon={<BookOpen className="h-8 w-8" />}
      title="Sin búsquedas guardadas"
      description="Guarda tus búsquedas favoritas para ejecutarlas rápidamente más tarde y mantener un registro de tus consultas más útiles."
      action={{
        label: 'Realizar Primera Búsqueda',
        onClick: onCreateSearch
      }}
    />
  )
}

export function NoHistory({ onViewActive }: { onViewActive: () => void }) {
  return (
    <EmptyState
      icon={<History className="h-8 w-8" />}
      title="Sin historial"
      description="Las convocatorias cerradas y finalizadas aparecerán aquí para que puedas llevar un registro de tus postulaciones anteriores."
      action={{
        label: 'Ver Convocatorias Activas',
        onClick: onViewActive
      }}
    />
  )
}

export function FirstTimeUser({ onGetStarted }: { onGetStarted: () => void }) {
  return (
    <EmptyState
      icon={<Target className="h-8 w-8" />}
      title="¡Bienvenido a ConvocatoriasPro!"
      description="Comienza agregando tu primera convocatoria o explora las funciones de búsqueda con IA para encontrar oportunidades de financiamiento."
      action={{
        label: 'Comenzar',
        onClick: onGetStarted
      }}
    />
  )
}