import { useState } from 'react'
import { Link } from 'react-router-dom'
import { 
  Calendar, 
  MapPin, 
  DollarSign, 
  Clock, 
  ExternalLink,
  Edit,
  Trash2,
  MoreVertical
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Convocatoria } from '@/types'
import { formatDate, getDaysUntilDeadline, getEstadoColor, getUrgencyColor, truncateText } from '@/lib/utils'
import { toast } from 'sonner'

interface ConvocatoriaCardProps {
  convocatoria: Convocatoria
  onEdit?: (convocatoria: Convocatoria) => void
  onDelete?: (id: number) => void
}

export function ConvocatoriaCard({ convocatoria, onEdit, onDelete }: ConvocatoriaCardProps) {
  const [loading, setLoading] = useState(false)
  const daysLeft = getDaysUntilDeadline(convocatoria.fecha_cierre)
  
  const handleDelete = async () => {
    if (!onDelete) return
    
    if (window.confirm('¿Estás seguro de que quieres eliminar esta convocatoria?')) {
      try {
        setLoading(true)
        await onDelete(convocatoria.id)
        toast.success('Convocatoria eliminada')
      } catch (error: any) {
        toast.error('Error al eliminar: ' + error.message)
      } finally {
        setLoading(false)
      }
    }
  }

  const handleEdit = () => {
    if (onEdit) {
      onEdit(convocatoria)
    }
  }

  const openSource = () => {
    if (convocatoria.fuente) {
      window.open(convocatoria.fuente, '_blank')
    }
  }

  return (
    <Card className="h-full hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg leading-6 mb-2 line-clamp-2">
              <Link 
                to={`/app/convocatorias/${convocatoria.id}`}
                className="hover:text-primary transition-colors"
              >
                {convocatoria.nombre_concurso}
              </Link>
            </CardTitle>
            
            {convocatoria.institucion && (
              <CardDescription className="flex items-center gap-1 mb-2">
                <MapPin className="h-3 w-3" />
                {convocatoria.institucion}
              </CardDescription>
            )}
          </div>
          
          <div className="flex items-start gap-2 ml-2">
            <Badge className={getEstadoColor(convocatoria.estado)}>
              {convocatoria.estado.replace('_', ' ').toUpperCase()}
            </Badge>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleEdit}>
                  <Edit className="mr-2 h-4 w-4" />
                  Editar
                </DropdownMenuItem>
                {convocatoria.fuente && (
                  <DropdownMenuItem onClick={openSource}>
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Ver fuente
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem 
                  onClick={handleDelete}
                  className="text-destructive"
                  disabled={loading}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Eliminar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {/* Fechas importantes */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Cierre:</span>
            <span className={getUrgencyColor(daysLeft)}>
              {formatDate(convocatoria.fecha_cierre)}
            </span>
          </div>
          
          {daysLeft >= 0 && convocatoria.estado === 'abierto' && (
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className={getUrgencyColor(daysLeft)}>
                {daysLeft === 0 
                  ? 'Cierra hoy' 
                  : daysLeft === 1 
                    ? 'Cierra mañana'
                    : `${daysLeft} días restantes`
                }
              </span>
            </div>
          )}
          
          {convocatoria.fecha_resultados && (
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Resultados:</span>
              <span>{formatDate(convocatoria.fecha_resultados)}</span>
            </div>
          )}
        </div>
        
        {/* Información adicional */}
        <div className="space-y-2">
          {convocatoria.tipo_fondo && (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {convocatoria.tipo_fondo}
              </Badge>
              {convocatoria.area && (
                <Badge variant="outline" className="text-xs">
                  {convocatoria.area}
                </Badge>
              )}
            </div>
          )}
          
          {convocatoria.monto_financiamiento && (
            <div className="flex items-center gap-2 text-sm">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Monto:</span>
              <span>{convocatoria.monto_financiamiento}</span>
            </div>
          )}
          
          {convocatoria.notas_usuario && (
            <div className="text-sm text-muted-foreground">
              <p className="italic">
                "{truncateText(convocatoria.notas_usuario, 80)}"
              </p>
            </div>
          )}
        </div>
        
        {/* Botón de acción */}
        <div className="pt-2">
          <Button asChild className="w-full" size="sm">
            <Link to={`/app/convocatorias/${convocatoria.id}`}>
              Ver Detalles
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}