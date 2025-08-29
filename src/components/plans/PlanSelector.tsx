import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { usePlans } from '@/hooks/usePlans'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Check, Zap, Crown } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { PlanType } from '@/types'

interface PlanSelectorProps {
  isRequired?: boolean
  currentPlan?: PlanType
}

export function PlanSelector({ isRequired = false, currentPlan }: PlanSelectorProps) {
  const [loading, setLoading] = useState<PlanType | null>(null)
  const { selectPlan, isTrialActive, getTrialDaysLeft } = usePlans()
  const navigate = useNavigate()

  const plans = [
    {
      id: 'free' as PlanType,
      name: 'Plan Gratuito',
      price: 0,
      description: 'Perfecto para empezar',
      icon: <Zap className="h-6 w-6" />,
      features: [
        'Hasta 5 convocatorias',
        'Ingreso manual',
        'Calendario básico',
        'Filtros simples',
        '3 días de prueba Pro'
      ],
      cta: 'Continuar gratis',
      popular: false
    },
    {
      id: 'pro_monthly' as PlanType,
      name: 'Pro Mensual',
      price: 8990,
      description: 'Todas las funciones premium',
      icon: <Crown className="h-6 w-6" />,
      features: [
        'Convocatorias ilimitadas',
        'IA para parsing de archivos',
        'Drag & drop de documentos',
        'Rastreo automático',
        'Exportación PDF/CSV',
        'Alertas personalizadas',
        'Soporte prioritario'
      ],
      cta: 'Suscribirse Pro',
      popular: true
    },
    {
      id: 'pro_annual' as PlanType,
      name: 'Pro Anual',
      price: 84990,
      originalPrice: 107880, // 8990 * 12
      description: 'Máximo ahorro + extras',
      icon: <Crown className="h-6 w-6" />,
      features: [
        'Todo lo del Pro Mensual',
        'Acceso anticipado',
        '1 colaborador incluido',
        'Reportes avanzados',
        'Backup automático',
        'API access (próximamente)',
        'Descuento de 2 meses'
      ],
      cta: 'Suscribirse Pro Anual',
      popular: false,
      savings: '2 meses gratis'
    }
  ]

  const handleSelectPlan = async (planId: PlanType) => {
    try {
      setLoading(planId)
      
      console.log('Seleccionando plan:', planId)
      console.log('Plan actual:', currentPlan)
      
      if (planId === currentPlan) {
        toast.info('Ya tienes este plan activo')
        if (isRequired) {
          navigate('/app/dashboard')
        }
        return
      }

      const { success, redirected } = await selectPlan(planId)
      
      if (success) {
        if (planId === 'free') {
          toast.success('Plan gratuito activado')
          navigate('/app/dashboard')
        } else if (redirected) {
          toast.success('Redirigiendo a MercadoPago...', {
            description: 'Serás redirigido al checkout de MercadoPago'
          })
          // El usuario será redirigido a MercadoPago
          // Cuando regrese, el webhook actualizará su plan
        }
      }
    } catch (error: any) {
      console.error('Error al seleccionar plan:', error)
      toast.error('Error al procesar el pago', {
        description: error.message || 'Por favor intenta nuevamente o contacta soporte'
      })
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="py-8">
      {isRequired && (
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">¡Bienvenido a ConvocatoriasPro!</h1>
          <p className="text-muted-foreground">
            Selecciona el plan que mejor se adapte a tus necesidades
          </p>
          {isTrialActive() && (
            <div className="mt-4 p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
              <p className="text-green-700 dark:text-green-300 font-medium">
                ¡Tienes {getTrialDaysLeft()} días de prueba Pro gratis!
              </p>
              <p className="text-sm text-green-600 dark:text-green-400">
                Prueba todas las funciones premium sin costo
              </p>
            </div>
          )}
        </div>
      )}
      
      <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
        {plans.map((plan) => {
          const isCurrentPlan = currentPlan === plan.id
          const isLoadingPlan = loading === plan.id
          
          return (
            <Card 
              key={plan.id} 
              className={`relative ${plan.popular ? 'ring-2 ring-primary' : ''} ${isCurrentPlan ? 'ring-2 ring-green-500' : ''}`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground">
                    Más Popular
                  </Badge>
                </div>
              )}
              
              {plan.savings && (
                <div className="absolute -top-3 right-4">
                  <Badge variant="success">
                    {plan.savings}
                  </Badge>
                </div>
              )}
              
              {isCurrentPlan && (
                <div className="absolute -top-3 left-4">
                  <Badge variant="success">
                    Plan Actual
                  </Badge>
                </div>
              )}
              
              <CardHeader className="text-center pb-8">
                <div className="flex justify-center mb-4 text-primary">
                  {plan.icon}
                </div>
                <CardTitle className="text-xl">{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
                
                <div className="mt-4">
                  {plan.price === 0 ? (
                    <div className="text-3xl font-bold">Gratis</div>
                  ) : (
                    <div>
                      <div className="text-3xl font-bold">
                        {formatCurrency(plan.price)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {plan.id === 'pro_monthly' ? 'por mes' : 'por año'}
                      </div>
                      {plan.originalPrice && (
                        <div className="text-sm text-muted-foreground line-through">
                          {formatCurrency(plan.originalPrice)}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </CardHeader>
              
              <CardContent>
                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
                
                <Button 
                  className="w-full" 
                  variant={plan.popular ? 'default' : 'outline'}
                  onClick={() => handleSelectPlan(plan.id)}
                  disabled={isLoadingPlan || isCurrentPlan}
                >
                  {isLoadingPlan ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Procesando...
                    </div>
                  ) : isCurrentPlan ? (
                    'Plan Actual'
                  ) : (
                    plan.cta
                  )}
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>
      
      {isRequired && (
        <div className="text-center mt-8">
          <p className="text-sm text-muted-foreground">
            Puedes cambiar tu plan en cualquier momento desde la configuración
          </p>
        </div>
      )}
    </div>
  )
}