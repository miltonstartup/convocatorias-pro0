// Página de planes mejorada con integración MercadoPago
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Check, Crown, Zap, Star, ArrowRight, Shield, Sparkles } from 'lucide-react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { usePlans } from '@/hooks/usePlans'
import { Plan, PlanType } from '@/types'
import { useAdvancedFeatures, usePlanLimits } from '@/hooks/useAdvanced'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { toast } from 'sonner'

export function PlansPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { plans, loading: isLoading, selectPlan } = usePlans()
  const { dashboardStats } = useAdvancedFeatures()
  const { planUsage } = usePlanLimits()
  
  const currentPlan = user ? (planUsage?.current_plan || 'free') : 'free'
  
  const handlePlanSelection = async (planId: string) => {
    if (!user) {
      navigate('/login')
      return
    }
    
    console.log('Intentando seleccionar plan:', planId)
    console.log('Plan actual del usuario:', currentPlan)
    
    // Si hace clic en su plan actual, mostrar info pero no redirigir
    if (currentPlan === planId) {
      toast.info('Ya tienes este plan activo')
      return
    }
    
    // Para otros casos, usar la función selectPlan existente
    try {
      console.log('Procesando selección de plan:', planId)
      await selectPlan(planId as PlanType)
    } catch (error: any) {
      console.error('Error al procesar la selección:', error)
      toast.error('Error al procesar el pago', {
        description: error.message || 'Por favor intenta nuevamente'
      })
    }
  }
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    )
  }
  
  const freePlan = plans?.find(p => p.id === 'free')
  const monthlyPlan = plans?.find(p => p.id === 'pro_monthly')
  const annualPlan = plans?.find(p => p.id === 'pro_annual')
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
      <div className="container mx-auto px-4 py-16 max-w-7xl">
        {/* Header */}
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <Badge variant="secondary" className="mx-auto bg-primary/10 text-primary border-primary/20">
              <Sparkles className="w-3 h-3 mr-1" />
              Planes y Precios
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
              Elije el plan perfecto para ti
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Gestiona tus convocatorias de forma inteligente con herramientas potenciadas por IA
            </p>
            
            {/* Plan actual */}
            {currentPlan && currentPlan !== 'free' && (
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
                <Crown className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-primary">
                  Plan Actual: {currentPlan === 'pro_monthly' ? 'Pro Mensual' : 'Pro Anual'}
                </span>
              </div>
            )}
          </motion.div>
        </div>
        
        {/* Planes */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">
          {/* Plan Gratuito */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className={`relative h-full ${currentPlan === 'free' ? 'ring-2 ring-primary' : ''}`}>
              {currentPlan === 'free' && (
                <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 bg-primary">
                  Plan Actual
                </Badge>
              )}
              
              <CardHeader className="text-center pb-8">
                <CardTitle className="text-2xl">Plan Gratuito</CardTitle>
                <div className="text-4xl font-bold">$0</div>
                <CardDescription className="text-base">
                  Perfecto para comenzar
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  {freePlan?.features && (Array.isArray(freePlan.features) ? freePlan.features : JSON.parse(freePlan.features as string)).map((feature: string, index: number) => (
                    <div key={index} className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </div>
                  ))}
                </div>
                
                <Separator />
                
                <Button 
                  onClick={() => handlePlanSelection('free')}
                  variant={currentPlan === 'free' ? 'default' : 'outline'}
                  className="w-full"
                  size="lg"
                >
                  {currentPlan === 'free' ? 'Plan Actual' : 'Comenzar Gratis'}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
          
          {/* Plan Pro Mensual */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className={`relative h-full border-primary/50 shadow-lg ${currentPlan === 'pro_monthly' ? 'ring-2 ring-primary' : ''}`}>
              {currentPlan === 'pro_monthly' && (
                <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 bg-primary">
                  Plan Actual
                </Badge>
              )}
              
              <div className="absolute -top-2 -right-2">
                <Badge className="bg-gradient-to-r from-primary to-primary/80 text-white">
                  <Star className="w-3 h-3 mr-1" />
                  Popular
                </Badge>
              </div>
              
              <CardHeader className="text-center pb-8">
                <CardTitle className="text-2xl flex items-center justify-center gap-2">
                  <Crown className="w-5 h-5 text-primary" />
                  Pro Mensual
                </CardTitle>
                <div className="text-4xl font-bold">
                  ${monthlyPlan?.price_clp?.toLocaleString('es-CL')}
                  <span className="text-lg font-normal text-muted-foreground">/mes</span>
                </div>
                <CardDescription className="text-base">
                  Funcionalidades completas
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  {monthlyPlan?.features && (Array.isArray(monthlyPlan.features) ? monthlyPlan.features : JSON.parse(monthlyPlan.features as string)).map((feature: string, index: number) => (
                    <div key={index} className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-primary flex-shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </div>
                  ))}
                </div>
                
                <Separator />
                
                <Button 
                  onClick={() => handlePlanSelection('pro_monthly')}
                  className="w-full bg-primary hover:bg-primary/90"
                  size="lg"
                  disabled={currentPlan === 'pro_monthly'}
                >
                  {currentPlan === 'pro_monthly' ? 'Plan Actual' : (
                    <>
                      Elegir Plan Pro
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
                
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">
                    Facturado mensualmente • Cancela cuando quieras
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
          
          {/* Plan Pro Anual */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className={`relative h-full ${currentPlan === 'pro_annual' ? 'ring-2 ring-primary' : ''}`}>
              {currentPlan === 'pro_annual' && (
                <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 bg-primary">
                  Plan Actual
                </Badge>
              )}
              
              <div className="absolute -top-2 -right-2">
                <Badge className="bg-gradient-to-r from-green-600 to-green-500 text-white">
                  <Zap className="w-3 h-3 mr-1" />
                  Ahorro
                </Badge>
              </div>
              
              <CardHeader className="text-center pb-8">
                <CardTitle className="text-2xl flex items-center justify-center gap-2">
                  <Crown className="w-5 h-5 text-primary" />
                  Pro Anual
                </CardTitle>
                <div className="space-y-1">
                  <div className="text-4xl font-bold">
                    ${annualPlan?.price_clp?.toLocaleString('es-CL')}
                    <span className="text-lg font-normal text-muted-foreground">/año</span>
                  </div>
                  <div className="text-sm text-green-600 font-medium">
                    Equivale a $7.082/mes (Ahorra $17.980)
                  </div>
                </div>
                <CardDescription className="text-base">
                  La mejor opción a largo plazo
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  {annualPlan?.features && (Array.isArray(annualPlan.features) ? annualPlan.features : JSON.parse(annualPlan.features as string)).map((feature: string, index: number) => (
                    <div key={index} className="flex items-center gap-2">
                      <Check className={`w-4 h-4 flex-shrink-0 ${
                        feature.includes('gratis') || feature.includes('beta') ? 'text-green-600' : 'text-primary'
                      }`} />
                      <span className={`text-sm ${
                        feature.includes('gratis') || feature.includes('beta') ? 'font-medium text-green-700' : ''
                      }`}>
                        {feature}
                      </span>
                    </div>
                  ))}
                </div>
                
                <Separator />
                
                <Button 
                  onClick={() => handlePlanSelection('pro_annual')}
                  className="w-full bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80"
                  size="lg"
                  disabled={currentPlan === 'pro_annual'}
                >
                  {currentPlan === 'pro_annual' ? 'Plan Actual' : (
                    <>
                      Elegir Plan Anual
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
                
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">
                    Facturado anualmente • Cancela cuando quieras
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
        
        {/* Características destacadas */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-center space-y-8"
        >
          <h2 className="text-3xl font-bold">Por qué elegir ConvocatoriasPro</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="text-center space-y-3">
              <div className="w-12 h-12 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
                <Zap className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold">Inteligencia Artificial</h3>
              <p className="text-sm text-muted-foreground">
                Agentes IA que procesan, validan y recomiendan convocatorias automáticamente.
              </p>
            </div>
            
            <div className="text-center space-y-3">
              <div className="w-12 h-12 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold">Seguro y Confiable</h3>
              <p className="text-sm text-muted-foreground">
                Tus datos están protegidos con encriptación de nivel bancario y backups automáticos.
              </p>
            </div>
            
            <div className="text-center space-y-3">
              <div className="w-12 h-12 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
                <Star className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold">Soporte Premium</h3>
              <p className="text-sm text-muted-foreground">
                Soporte prioritario y actualizaciones constantes con nuevas funcionalidades.
              </p>
            </div>
          </div>
          
          <div className="pt-8">
            <Button 
              variant="outline" 
              onClick={() => navigate('/app/dashboard')}
              className="gap-2"
            >
              Volver al Dashboard
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
