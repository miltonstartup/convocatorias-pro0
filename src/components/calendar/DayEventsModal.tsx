// Modal para eventos del día en el calendario
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Calendar, Clock, Building2, ExternalLink } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { CalendarEvent } from '@/hooks/useAdvanced'
import { useNavigate } from 'react-router-dom'

interface DayEventsModalProps {
  isOpen: boolean
  onClose: () => void
  date: Date | null
  events: CalendarEvent[]
}

export function DayEventsModal({ isOpen, onClose, date, events }: DayEventsModalProps) {
  const navigate = useNavigate()
  
  if (!date) return null
  
  const formatEventType = (type: string) => {
    switch (type) {
      case 'cierre': return '⏰ Cierre'
      case 'apertura': return '📅 Apertura'
      case 'resultados': return '🏆 Resultados'
      default: return type
    }
  }
  
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'alta': return 'destructive'
      case 'media': return 'secondary'
      case 'baja': return 'outline'
      default: return 'outline'
    }
  }
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Eventos del {format(date, 'dd MMMM yyyy', { locale: es })}
          </DialogTitle>
          <DialogDescription>
            {events.length} evento{events.length !== 1 ? 's' : ''} programado{events.length !== 1 ? 's' : ''} para este día
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 mt-6">
          {events.length > 0 ? (
            events.map((event) => (
              <div key={event.id} className="p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={getPriorityColor(event.priority) as any}>
                        {formatEventType(event.type)}
                      </Badge>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {format(parseISO(event.date), 'HH:mm', { locale: es })}
                      </span>
                      {event.daysUntil !== undefined && (
                        <span className="text-xs text-muted-foreground">
                          {event.daysUntil === 0 ? 'Hoy' : 
                           event.daysUntil > 0 ? `En ${event.daysUntil} días` : 
                           `Hace ${Math.abs(event.daysUntil)} días`}
                        </span>
                      )}
                    </div>
                    
                    <h4 className="font-medium text-sm">
                      {event.title.includes(':') ? event.title.split(':').slice(1).join(':').trim() : event.title}
                    </h4>
                    
                    {event.organization && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Building2 className="w-3 h-3" />
                        {event.organization}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        navigate(`/app/convocatorias/${event.convocatoriaId}`)
                        onClose()
                      }}
                    >
                      <ExternalLink className="w-3 h-3 mr-1" />
                      Ver
                    </Button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No hay eventos programados para este día</p>
            </div>
          )}
        </div>
        
        <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
          <Button 
            onClick={() => {
              navigate('/app/convocatorias/new')
              onClose()
            }}
          >
            Agregar Convocatoria
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
