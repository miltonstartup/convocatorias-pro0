// Página de calendario inteligente con funcionalidades avanzadas
import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Calendar as CalendarIcon, Clock, Bell, Filter, Download, Crown } from 'lucide-react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { usePlanLimits, useCalendarEvents, type CalendarEvent } from '@/hooks/useAdvanced'
import { PaywallCard, PaywallInline } from '@/components/plans/PaywallComponents'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { DayEventsModal } from '@/components/calendar/DayEventsModal'
import { AlertConfigModal } from '@/components/calendar/AlertConfigModal'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

export function CalendarPage() {
  const navigate = useNavigate()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [view, setView] = useState<'month' | 'upcoming'>('month')
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)
  const [selectedDayEvents, setSelectedDayEvents] = useState<CalendarEvent[]>([])
  const [showDayModal, setShowDayModal] = useState(false)
  const [showAlertModal, setShowAlertModal] = useState(false)
  const [selectedEventForAlert, setSelectedEventForAlert] = useState<CalendarEvent | null>(null)
  const { isPlanFree, checkFeatureAccess } = usePlanLimits()
  
  // Obtener eventos del mes actual
  const { getCalendarEvents } = useCalendarEvents()
  const calendarData = getCalendarEvents({
    month: format(currentDate, 'yyyy-MM'),
    view
  })
  
  const isLoading = false
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    )
  }

  const events = calendarData?.events || []
  const summary = calendarData?.summary

  // Generar días del mes
  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd })

  // Función para obtener eventos de un día específico
  const getEventsForDay = (day: Date) => {
    return events.filter(event => 
      isSameDay(parseISO(event.date), day)
    )
  }

  // Navegar entre meses
  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate)
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1)
    } else {
      newDate.setMonth(newDate.getMonth() + 1)
    }
    setCurrentDate(newDate)
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Calendario</h1>
          <p className="text-muted-foreground mt-2">
            Gestiona las fechas importantes de tus convocatorias
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => {
              const access = checkFeatureAccess('alerts')
              if (!access.allowed) {
                navigate('/plans')
                return
              }
              setShowAlertModal(true)
            }}
            className="gap-2"
          >
            <Bell className="w-4 h-4" />
            Configurar Alertas
            {isPlanFree && <Crown className="w-3 h-3 text-primary" />}
          </Button>
        </div>
      </div>

      {/* Resumen de alertas */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium">Total Eventos</span>
              </div>
              <div className="text-2xl font-bold text-blue-600 mt-1">{summary.total}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-orange-600" />
                <span className="text-sm font-medium">Esta Semana</span>
              </div>
              <div className="text-2xl font-bold text-orange-600 mt-1">{summary.upcoming_week}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-red-600" />
                <span className="text-sm font-medium">Urgentes</span>
              </div>
              <div className="text-2xl font-bold text-red-600 mt-1">{summary.urgent}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Verificar acceso a funcionalidades avanzadas */}
      <PaywallInline feature="calendar_advanced" />

      {/* Tabs de vistas */}
      <Tabs value={view} onValueChange={(v) => setView(v as any)} className="space-y-6">
        <TabsList>
          <TabsTrigger value="month">Vista Mensual</TabsTrigger>
          <TabsTrigger value="upcoming">Próximos Eventos</TabsTrigger>
        </TabsList>

        <TabsContent value="month" className="space-y-6">
          {isPlanFree ? (
            <PaywallCard
              feature="calendar_advanced"
              title="Calendario Inteligente"
              description="Visualiza todas las fechas importantes de tus convocatorias en un calendario avanzado con alertas personalizables."
              benefits={[
                'Vista de calendario completa',
                'Alertas personalizables',
                'Codificación por colores',
                'Sincronización con calendario externo',
                'Recordatorios automáticos'
              ]}
            />
          ) : (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle>{format(currentDate, 'MMMM yyyy', { locale: es })}</CardTitle>
                  <CardDescription>{events.length} eventos este mes</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => navigateMonth('prev')}>
                    ←
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => navigateMonth('next')}>
                    →
                  </Button>
                </div>
              </CardHeader>
              
              <CardContent>
                {/* Encabezados de días */}
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(day => (
                    <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground">
                      {day}
                    </div>
                  ))}
                </div>
                
                {/* Días del mes */}
                <div className="grid grid-cols-7 gap-1">
                  {monthDays.map(day => {
                    const dayEvents = getEventsForDay(day)
                    const hasUrgent = dayEvents.some(e => e.priority === 'alta')
                    
                    return (
                      <motion.div
                        key={day.toISOString()}
                        className={`p-2 min-h-20 border rounded-md hover:bg-muted/50 cursor-pointer ${
                          hasUrgent ? 'border-red-200 bg-red-50' : dayEvents.length > 0 ? 'border-primary/20 bg-primary/5' : ''
                        }`}
                        whileHover={{ scale: 1.02 }}
                        onClick={() => {
                          if (dayEvents.length > 0) {
                            setSelectedDay(day)
                            setSelectedDayEvents(dayEvents)
                            setShowDayModal(true)
                          }
                        }}
                      >
                        <div className="text-sm font-medium">{format(day, 'd')}</div>
                        <div className="space-y-1 mt-1">
                          {dayEvents.slice(0, 2).map(event => (
                            <div key={event.id} className="text-xs p-1 rounded bg-primary/10 text-primary truncate">
                              {event.type === 'cierre' && '⏰'}
                              {event.type === 'apertura' && '📅'}
                              {event.type === 'resultados' && '🏆'}
                              {' '}{event.title.split(':')[1]?.trim() || event.title}
                            </div>
                          ))}
                          {dayEvents.length > 2 && (
                            <div className="text-xs text-muted-foreground">+{dayEvents.length - 2} más</div>
                          )}
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="upcoming" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Próximos Eventos</CardTitle>
              <CardDescription>
                Todos los eventos ordenados cronológicamente
              </CardDescription>
            </CardHeader>
            <CardContent>
              {events.length > 0 ? (
                <div className="space-y-4">
                  {events.slice(0, 20).map((event) => (
                    <motion.div 
                      key={event.id}
                      className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge 
                            variant={event.priority === 'alta' ? 'destructive' : event.priority === 'media' ? 'secondary' : 'outline'}
                            className="text-xs"
                          >
                            {event.type === 'cierre' && '⏰ Cierre'}
                            {event.type === 'apertura' && '📅 Apertura'}
                            {event.type === 'resultados' && '🏆 Resultados'}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {event.daysUntil >= 0 
                              ? `En ${event.daysUntil} días`
                              : `Hace ${Math.abs(event.daysUntil)} días`
                            }
                          </span>
                        </div>
                        <h4 className="font-medium">{event.title}</h4>
                        <p className="text-sm text-muted-foreground">{event.organization}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(parseISO(event.date), 'dd MMM yyyy, HH:mm', { locale: es })}
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {!isPlanFree && (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => {
                              setSelectedEventForAlert(event)
                              setShowAlertModal(true)
                            }}
                            title="Configurar alerta"
                          >
                            <Bell className="w-4 h-4" />
                          </Button>
                        )}
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => navigate(`/app/convocatorias/${event.convocatoriaId}`)}
                        >
                          Ver Detalles
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CalendarIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No hay eventos próximos</p>
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => navigate('/app/convocatorias/new')}
                  >
                    Agregar Primera Convocatoria
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Modales */}
      <DayEventsModal 
        isOpen={showDayModal}
        onClose={() => setShowDayModal(false)}
        date={selectedDay}
        events={selectedDayEvents}
      />
      
      <AlertConfigModal 
        isOpen={showAlertModal}
        onClose={() => {
          setShowAlertModal(false)
          setSelectedEventForAlert(null)
        }}
        convocatoriaId={selectedEventForAlert?.convocatoriaId}
        convocatoriaTitle={selectedEventForAlert?.title}
      />
    </div>
  )
}
