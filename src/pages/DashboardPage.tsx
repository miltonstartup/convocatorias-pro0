// Dashboard principal con estadísticas avanzadas y paywall dinámico
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { 
  BarChart3, 
  Calendar, 
  Clock, 
  Download, 
  PlusCircle, 
  Search, 
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Building2,
  Crown
} from 'lucide-react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useAdvancedFeatures, usePlanLimits } from '@/hooks/useAdvanced'
import { useConvocatorias } from '@/hooks/useConvocatorias'
import { PaywallCard, PlanLimitCard, PaywallInline } from '@/components/plans/PaywallComponents'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { format, formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { ErrorBoundary } from '@/components/ErrorBoundary'

export function DashboardPage() {
  const navigate = useNavigate()
  
  // Estados con manejo de errores
  const { dashboardStats, isLoadingStats, exportData, isExporting } = useAdvancedFeatures()
  const { isPlanFree, checkFeatureAccess } = usePlanLimits()
  const { convocatorias, isLoading: isLoadingConvocatorias } = useConvocatorias()

  // Estado de carga general
  const isLoading = isLoadingStats || isLoadingConvocatorias
  
  // Mostrar spinner si aún está cargando
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner />
        <span className="ml-2 text-muted-foreground">Cargando dashboard...</span>
      </div>
    )
  }
  
  // Datos seguros con valores por defecto
  const safeConvocatorias = convocatorias || []
  const mockStats = {
    overview: {
      total_convocatorias: safeConvocatorias.length,
      active_convocatorias: safeConvocatorias.filter(c => c?.estado === 'abierto').length,
      deadline_this_week: 2,
      deadline_this_month: 5
    },
    upcoming_deadlines: safeConvocatorias.slice(0, 3).map(c => ({
      id: c?.id?.toString() || Math.random().toString(),
      title: c?.nombre_concurso || 'Sin nombre',
      organization: c?.institucion || 'Sin institución',
      deadline: c?.fecha_cierre || new Date().toISOString(),
      days_until: c?.fecha_cierre ? Math.ceil((new Date(c.fecha_cierre).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : 0,
      priority: 'alta' as const
    })),
    recent_activity: safeConvocatorias.slice(0, 5).map(c => ({
      id: c?.id?.toString() || Math.random().toString(),
      title: c?.nombre_concurso || 'Sin nombre',
      action: 'Convocatoria añadida',
      date: c?.created_at || new Date().toISOString()
    })),
    plan_usage: {
      current_plan: isPlanFree ? 'free' : 'pro',
      convocatorias_used: safeConvocatorias.length,
      convocatorias_limit: isPlanFree ? 5 : 'Ilimitadas',
      usage_percentage: isPlanFree ? (safeConvocatorias.length / 5) * 100 : 0
    }
  }
  
  const currentStats = dashboardStats || mockStats
  const stats = currentStats?.overview || mockStats.overview
  const usage = currentStats?.plan_usage || mockStats.plan_usage

  return (
    <ErrorBoundary>
      <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Gestiona tus convocatorias de forma inteligente
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Exportar datos */}
          <Button
            variant="outline"
            onClick={() => {
              const access = checkFeatureAccess('export_csv')
              if (!access.allowed) {
                navigate('/plans')
                return
              }
              exportData({ format: 'csv' })
            }}
            disabled={isExporting}
            className="gap-2"
          >
            <Download className="w-4 h-4" />
            {isExporting ? 'Exportando...' : 'Exportar'}
            {isPlanFree && <Crown className="w-3 h-3 text-primary" />}
          </Button>
          
          {/* Nueva convocatoria */}
          <Button 
            onClick={() => {
              if (usage.usage_percentage >= 100 && isPlanFree) {
                navigate('/plans')
                return
              }
              navigate('/app/convocatorias/new')
            }}
            className="gap-2"
          >
            <PlusCircle className="w-4 h-4" />
            Nueva Convocatoria
          </Button>
        </div>
      </div>

      {/* Plan Limit Warning */}
      <PlanLimitCard />

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Convocatorias</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_convocatorias || 0}</div>
            <p className="text-xs text-muted-foreground">
              {usage && typeof usage.convocatorias_limit === 'number' 
                ? `${Math.max(0, usage.convocatorias_limit - (stats?.total_convocatorias || 0))} restantes`
                : 'Ilimitadas'
              }
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Activas</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats?.active_convocatorias || 0}</div>
            <p className="text-xs text-muted-foreground">
              Abiertas para postulación
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Esta Semana</CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats?.deadline_this_week || 0}</div>
            <p className="text-xs text-muted-foreground">
              Cierran en 7 días
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Este Mes</CardTitle>
            <Calendar className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats?.deadline_this_month || 0}</div>
            <p className="text-xs text-muted-foreground">
              Cierran en 30 días
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="upcoming" className="space-y-6">
        <TabsList>
          <TabsTrigger value="upcoming">Próximos Vencimientos</TabsTrigger>
          <TabsTrigger value="activity">Actividad Reciente</TabsTrigger>
          <TabsTrigger value="analytics">
            Analíticas
            {isPlanFree && <Crown className="w-3 h-3 ml-1 text-primary" />}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Próximos Vencimientos
              </CardTitle>
              <CardDescription>
                Convocatorias que cierran próximamente
              </CardDescription>
            </CardHeader>
            <CardContent>
              {currentStats?.upcoming_deadlines && currentStats.upcoming_deadlines.length > 0 ? (
                <div className="space-y-4">
                  {currentStats.upcoming_deadlines.map((deadline) => (
                    <div 
                      key={deadline.id}
                      className="flex items-center justify-between p-4 rounded-lg border bg-card"
                    >
                      <div className="flex-1">
                        <h4 className="font-medium">{deadline.title}</h4>
                        <p className="text-sm text-muted-foreground">{deadline.organization}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge 
                            variant={deadline.priority === 'alta' ? 'destructive' : deadline.priority === 'media' ? 'secondary' : 'outline'}
                            className="text-xs"
                          >
                            {deadline.days_until} días restantes
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(deadline.deadline), 'dd MMM yyyy', { locale: es })}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => navigate(`/app/convocatorias/${deadline.id}`)}
                        >
                          Ver Detalles
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No hay vencimientos próximos</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Actividad Reciente</CardTitle>
              <CardDescription>
                Últimas convocatorias añadidas
              </CardDescription>
            </CardHeader>
            <CardContent>
              {currentStats?.recent_activity && currentStats.recent_activity.length > 0 ? (
                <div className="space-y-3">
                  {currentStats.recent_activity.map((activity) => (
                    <div key={activity.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                      <div className="w-2 h-2 rounded-full bg-primary" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{activity.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {activity.action} • {formatDistanceToNow(new Date(activity.date), { addSuffix: true, locale: es })}
                        </p>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => navigate(`/app/convocatorias/${activity.id}`)}
                      >
                        Ver
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No hay actividad reciente</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          {isPlanFree ? (
            <PaywallCard
              feature="analytics"
              title="Analíticas Avanzadas"
              description="Obtén insights detallados sobre tus convocatorias con gráficos, tendencias y métricas avanzadas."
              benefits={[
                'Gráficos de tendencias por mes',
                'Análisis por organización',
                'Métricas de éxito y conversión',
                'Exportación de reportes',
                'Comparativas históricas'
              ]}
            />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Gráfico por estado */}
              <Card>
                <CardHeader>
                  <CardTitle>Por Estado</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(dashboardStats.by_status || {}).map(([status, count]) => (
                      <div key={status} className="flex items-center justify-between">
                        <span className="capitalize text-sm">{status.replace('_', ' ')}</span>
                        <Badge variant="outline">{count}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Top organizaciones */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    Top Organizaciones
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {dashboardStats.by_organization && dashboardStats.by_organization.length > 0 ? (
                      dashboardStats.by_organization.map((org, index) => (
                        <div key={org.name} className="flex items-center justify-between">
                          <span className="text-sm">{org.name}</span>
                          <Badge variant="outline">{org.count}</Badge>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No hay datos de organizaciones
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
      </div>
    </ErrorBoundary>
  )
}
