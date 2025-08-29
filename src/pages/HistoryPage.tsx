import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useConvocatorias } from '@/hooks/useConvocatorias'
import { ConvocatoriaCard } from '@/components/convocatorias/ConvocatoriaCard'
import { formatDate } from '@/lib/utils'
import { History, Calendar, CheckCircle, FileX } from 'lucide-react'
import { Link } from 'react-router-dom'

export function HistoryPage() {
  const { convocatorias, loading } = useConvocatorias()
  
  // Filtrar convocatorias finalizadas y cerradas
  const historicalConvocatorias = convocatorias.filter(
    conv => conv.estado === 'finalizado' || conv.estado === 'cerrado'
  )
  
  // Estadísticas del historial
  const stats = {
    total: historicalConvocatorias.length,
    finalizadas: historicalConvocatorias.filter(c => c.estado === 'finalizado').length,
    cerradas: historicalConvocatorias.filter(c => c.estado === 'cerrado').length,
    this_year: historicalConvocatorias.filter(c => {
      const year = new Date(c.fecha_cierre).getFullYear()
      return year === new Date().getFullYear()
    }).length
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="h-8 bg-muted rounded w-48 mx-auto mb-2 animate-pulse" />
          <div className="h-4 bg-muted rounded w-64 mx-auto animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-64 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold mb-2">Historial y Bitácora</h1>
          <p className="text-muted-foreground">
            Revisa todas tus convocatorias anteriores y lleva un registro de tus postulaciones
          </p>
        </div>
        
        <Button asChild>
          <Link to="/app/dashboard">
            Ver Activas
          </Link>
        </Button>
      </div>

      {/* Estadísticas del historial */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Histórico</CardTitle>
            <History className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Convocatorias registradas</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Finalizadas</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.finalizadas}</div>
            <p className="text-xs text-muted-foreground">Con resultados publicados</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cerradas</CardTitle>
            <FileX className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.cerradas}</div>
            <p className="text-xs text-muted-foreground">Fuera de plazo</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Este Año</CardTitle>
            <Calendar className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.this_year}</div>
            <p className="text-xs text-muted-foreground">Registradas en {new Date().getFullYear()}</p>
          </CardContent>
        </Card>
      </div>

      {/* Lista de convocatorias históricas */}
      {historicalConvocatorias.length > 0 ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              Convocatorias Anteriores ({historicalConvocatorias.length})
            </h2>
            
            <div className="flex gap-2">
              <Badge variant="outline">
                <CheckCircle className="w-3 h-3 mr-1" />
                Finalizadas: {stats.finalizadas}
              </Badge>
              <Badge variant="outline">
                <FileX className="w-3 h-3 mr-1" />
                Cerradas: {stats.cerradas}
              </Badge>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {historicalConvocatorias
              .sort((a, b) => new Date(b.fecha_cierre).getTime() - new Date(a.fecha_cierre).getTime())
              .map((convocatoria) => (
                <ConvocatoriaCard
                  key={convocatoria.id}
                  convocatoria={convocatoria}
                  onEdit={(conv) => console.log('Edit historical:', conv)}
                  onDelete={async (id) => console.log('Delete historical:', id)}
                />
              ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="max-w-md mx-auto">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <History className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">
              Aún no tienes historial
            </h3>
            <p className="text-muted-foreground mb-6">
              Las convocatorias cerradas y finalizadas aparecerán aquí para que puedas llevar un registro de tus postulaciones
            </p>
            
            <Button asChild>
              <Link to="/app/dashboard">
                <Calendar className="mr-2 h-4 w-4" />
                Ver Convocatorias Activas
              </Link>
            </Button>
          </div>
        </div>
      )}

      {/* Próximas funcionalidades */}
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-lg">Próximamente en el Historial</CardTitle>
          <CardDescription>
            Funciones avanzadas que estarán disponibles próximamente
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <h4 className="font-medium">Bitácora de Postulaciones</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Registro de estados de postulación</li>
                <li>• Seguimiento de documentos enviados</li>
                <li>• Notas y observaciones personales</li>
                <li>• Fechas importantes y recordatorios</li>
              </ul>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium">Análisis y Reportes</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Estadísticas de éxito por institución</li>
                <li>• Tendencias de financiamiento</li>
                <li>• Exportación de reportes en PDF</li>
                <li>• Recomendaciones basadas en historial</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}