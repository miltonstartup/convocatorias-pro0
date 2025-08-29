import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PlanSelector } from '@/components/plans/PlanSelector'
import { useAuth } from '@/hooks/useAuth'
import { usePlans } from '@/hooks/usePlans'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils'
import { Crown, Calendar, CreditCard } from 'lucide-react'

export function SubscriptionPage() {
  const { profile } = useAuth()
  const { getCurrentPlan, isTrialActive, getTrialDaysLeft, isProPlan } = usePlans()
  
  const currentPlan = getCurrentPlan()

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold mb-2">Suscripción y Facturación</h1>
        <p className="text-muted-foreground">
          Gestiona tu plan y configuración de facturación
        </p>
      </div>

      {/* Plan actual */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5" />
            Plan Actual
          </CardTitle>
          <CardDescription>
            Información sobre tu suscripción actual
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-lg font-semibold">
                  {isProPlan() ? 'Plan Pro' : 'Plan Gratuito'}
                </h3>
                <Badge variant={isProPlan() ? 'default' : 'secondary'}>
                  {isProPlan() ? 'PRO' : 'FREE'}
                </Badge>
              </div>
              
              {isProPlan() && currentPlan && (
                <p className="text-2xl font-bold text-primary mb-1">
                  {formatCurrency(currentPlan.price_clp)}
                  <span className="text-sm font-normal text-muted-foreground ml-1">
                    {profile?.plan === 'pro_monthly' ? 'por mes' : 'por año'}
                  </span>
                </p>
              )}
              
              {isTrialActive() && (
                <div className="flex items-center gap-2 text-green-600">
                  <Calendar className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    Prueba gratis: {getTrialDaysLeft()} días restantes
                  </span>
                </div>
              )}
              
              {profile?.plan_expires_at && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span className="text-sm">
                    Próxima facturación: {new Date(profile.plan_expires_at).toLocaleDateString('es-CL')}
                  </span>
                </div>
              )}
            </div>
            
            <div className="text-right">
              <Badge 
                variant={isProPlan() || isTrialActive() ? 'success' : 'secondary'}
                className="mb-2"
              >
                {isProPlan() || isTrialActive() ? 'Activo' : 'Gratuito'}
              </Badge>
              
              {!isProPlan() && !isTrialActive() && (
                <p className="text-sm text-muted-foreground">
                  Límite: 5 convocatorias
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Funciones del plan actual */}
      <Card>
        <CardHeader>
          <CardTitle>Funciones Incluidas</CardTitle>
          <CardDescription>
            Esto es lo que incluye tu plan actual
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium">
                {isProPlan() || isTrialActive() ? 'Plan Pro' : 'Plan Gratuito'}
              </h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                {isProPlan() || isTrialActive() ? (
                  <>
                    <li>✓ Convocatorias ilimitadas</li>
                    <li>✓ IA para parsing de archivos</li>
                    <li>✓ Drag & drop de documentos</li>
                    <li>✓ Rastreo automático</li>
                    <li>✓ Exportación PDF/CSV</li>
                    <li>✓ Alertas personalizadas</li>
                    <li>✓ Soporte prioritario</li>
                  </>
                ) : (
                  <>
                    <li>✓ Hasta 5 convocatorias</li>
                    <li>✓ Ingreso manual</li>
                    <li>✓ Calendario básico</li>
                    <li>✓ Filtros simples</li>
                    <li>• IA parsing (Pro)</li>
                    <li>• Rastreo automático (Pro)</li>
                    <li>• Exportación avanzada (Pro)</li>
                  </>
                )}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cambiar plan */}
      <Card>
        <CardHeader>
          <CardTitle>Cambiar Plan</CardTitle>
          <CardDescription>
            Actualiza o cambia tu plan de suscripción
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PlanSelector currentPlan={profile?.plan} />
        </CardContent>
      </Card>

      {/* Historial de facturación */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Historial de Facturación
          </CardTitle>
          <CardDescription>
            Próximamente: historial de pagos y facturas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              El historial de facturación estará disponible próximamente
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}