// Componente Paywall para funcionalidades Pro
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Crown, Zap, ArrowRight, Check } from 'lucide-react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { usePlanLimits } from '@/hooks/useAdvanced'
import { useAuth } from '@/hooks/useAuth'

interface PaywallProps {
  feature: string
  title: string
  description: string
  benefits: string[]
  className?: string
}

export function PaywallCard({ feature, title, description, benefits, className }: PaywallProps) {
  const navigate = useNavigate()
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={className}
    >
      <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-background to-primary/10">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Crown className="w-8 h-8 text-primary" />
          </div>
          <Badge variant="secondary" className="mx-auto mb-2 bg-primary/10 text-primary border-primary/20">
            <Zap className="w-3 h-3 mr-1" />
            Funcionalidad Pro
          </Badge>
          <CardTitle className="text-xl">{title}</CardTitle>
          <CardDescription className="text-center">
            {description}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">
              Con Plan Pro obtienes:
            </h4>
            <div className="space-y-2">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-primary flex-shrink-0" />
                  <span>{benefit}</span>
                </div>
              ))}
            </div>
          </div>
          
          <div className="pt-4 border-t">
            <Button 
              onClick={() => navigate('/plans')}
              className="w-full bg-primary hover:bg-primary/90"
              size="lg"
            >
              Ver Planes Pro
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <p className="text-xs text-muted-foreground text-center mt-2">
              Desde $8.990/mes • Cancela cuando quieras
            </p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// Componente de límite de plan Free
export function PlanLimitCard() {
  const { planUsage, isNearLimit, isAtLimit } = usePlanLimits()
  const navigate = useNavigate()
  
  if (!planUsage || planUsage.current_plan !== 'free') return null
  
  const usagePercentage = planUsage.usage_percentage
  const isLimitReached = usagePercentage >= 100
  
  return (
    <Card className={`border-2 ${isLimitReached ? 'border-destructive/50 bg-destructive/5' : isNearLimit ? 'border-warning/50 bg-warning/5' : 'border-primary/20 bg-primary/5'}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant={isLimitReached ? 'destructive' : isNearLimit ? 'secondary' : 'outline'}>
              Plan Gratuito
            </Badge>
            <span className="text-sm font-medium">
              {planUsage.convocatorias_used}/{planUsage.convocatorias_limit} convocatorias
            </span>
          </div>
          {(isNearLimit || isLimitReached) && (
            <Crown className={`w-5 h-5 ${isLimitReached ? 'text-destructive' : 'text-warning'}`} />
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Progress 
            value={Math.min(usagePercentage, 100)} 
            className={`h-2 ${isLimitReached ? '[&>div]:bg-destructive' : isNearLimit ? '[&>div]:bg-warning' : ''}`}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Uso actual</span>
            <span>{usagePercentage}%</span>
          </div>
        </div>
        
        {isLimitReached && (
          <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20">
            <p className="text-sm text-destructive font-medium mb-2">
              ¡Límite alcanzado!
            </p>
            <p className="text-xs text-muted-foreground mb-3">
              Has alcanzado el límite de 5 convocatorias. Actualiza a Plan Pro para convocatorias ilimitadas.
            </p>
            <Button 
              onClick={() => navigate('/plans')}
              size="sm" 
              className="w-full bg-destructive hover:bg-destructive/90"
            >
              Actualizar a Pro
            </Button>
          </div>
        )}
        
        {isNearLimit && !isLimitReached && (
          <div className="p-3 rounded-md bg-warning/10 border border-warning/20">
            <p className="text-sm text-warning font-medium mb-2">
              Cerca del límite
            </p>
            <p className="text-xs text-muted-foreground mb-3">
              Te quedan pocas convocatorias disponibles. Considera actualizar a Plan Pro.
            </p>
            <Button 
              onClick={() => navigate('/plans')}
              size="sm" 
              variant="outline"
              className="w-full border-warning/50 hover:bg-warning/10"
            >
              Ver Planes Pro
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Componente inline para funcionalidades bloqueadas
export function PaywallInline({ feature, onUpgrade }: { 
  feature: string
  onUpgrade?: () => void 
}) {
  const { isPro } = useAuth()
  const navigate = useNavigate()
  
  // Si es Pro, no mostrar paywall
  if (isPro) return null
  
  return (
    <div className="flex items-center gap-2 p-2 rounded-md bg-primary/5 border border-primary/20">
      <Crown className="w-4 h-4 text-primary flex-shrink-0" />
      <span className="text-sm flex-1">Esta funcionalidad requiere Plan Pro</span>
      <Button 
        size="sm" 
        variant="outline"
        onClick={() => {
          onUpgrade?.() || navigate('/plans')
        }}
        className="border-primary/50 hover:bg-primary/10"
      >
        Actualizar
      </Button>
    </div>
  )
}
