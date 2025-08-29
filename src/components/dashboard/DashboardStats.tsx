import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Target, 
  Calendar, 
  Clock, 
  CheckCircle,
  AlertTriangle
} from 'lucide-react'
import { DashboardStats as Stats } from '@/types'

interface DashboardStatsProps {
  stats: Stats
  loading?: boolean
}

export function DashboardStats({ stats, loading }: DashboardStatsProps) {
  const statsCards = [
    {
      title: 'Total Convocatorias',
      value: stats.total,
      description: 'Todas tus convocatorias',
      icon: <Target className="h-4 w-4" />,
      color: 'text-blue-600'
    },
    {
      title: 'Abiertas',
      value: stats.abiertas,
      description: 'Actualmente disponibles',
      icon: <Calendar className="h-4 w-4" />,
      color: 'text-green-600'
    },
    {
      title: 'Próximas a Cerrar',
      value: stats.proximas_a_cerrar,
      description: 'Cierran en 7 días o menos',
      icon: <AlertTriangle className="h-4 w-4" />,
      color: 'text-amber-600'
    },
    {
      title: 'En Evaluación',
      value: stats.en_evaluacion,
      description: 'Pendientes de resultados',
      icon: <Clock className="h-4 w-4" />,
      color: 'text-blue-600'
    }
  ]

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 bg-muted rounded animate-pulse w-20" />
              <div className="h-4 w-4 bg-muted rounded animate-pulse" />
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted rounded animate-pulse w-12 mb-1" />
              <div className="h-3 bg-muted rounded animate-pulse w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {statsCards.map((stat, index) => (
        <Card key={index}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {stat.title}
            </CardTitle>
            <div className={stat.color}>
              {stat.icon}
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
            <p className="text-xs text-muted-foreground">
              {stat.description}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}