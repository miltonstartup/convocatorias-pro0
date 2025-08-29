import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { CheckCircle, Search, Globe, Link, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SearchStep {
  id: string
  label: string
  description: string
  icon: React.ReactNode
  status: 'pending' | 'processing' | 'completed' | 'error'
}

interface SearchProgressProps {
  currentStep: string
  steps: SearchStep[]
  className?: string
}

export function SearchProgress({ currentStep, steps, className }: SearchProgressProps) {
  const currentStepIndex = steps.findIndex(step => step.id === currentStep)
  const progress = currentStepIndex >= 0 ? ((currentStepIndex + 1) / steps.length) * 100 : 0

  return (
    <Card className={cn('w-full', className)}>
      <CardContent className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Procesando con IA Real</h3>
            <span className="text-sm text-muted-foreground">
              {Math.round(progress)}% completado
            </span>
          </div>
          
          <Progress value={progress} className="w-full" />
          
          <div className="space-y-3">
            {steps.map((step, index) => {
              const isActive = step.id === currentStep
              const isCompleted = index < currentStepIndex || step.status === 'completed'
              const isError = step.status === 'error'
              
              return (
                <div
                  key={step.id}
                  className={cn(
                    'flex items-start gap-3 p-3 rounded-lg border transition-all',
                    isActive && 'border-blue-200 bg-blue-50',
                    isCompleted && 'border-green-200 bg-green-50',
                    isError && 'border-red-200 bg-red-50',
                    !isActive && !isCompleted && !isError && 'border-gray-200'
                  )}
                >
                  <div className={cn(
                    'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
                    isActive && 'bg-blue-100 text-blue-600',
                    isCompleted && 'bg-green-100 text-green-600',
                    isError && 'bg-red-100 text-red-600',
                    !isActive && !isCompleted && !isError && 'bg-gray-100 text-gray-500'
                  )}>
                    {isCompleted ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      step.icon
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h4 className={cn(
                      'font-medium',
                      isActive && 'text-blue-900',
                      isCompleted && 'text-green-900',
                      isError && 'text-red-900'
                    )}>
                      {step.label}
                      {isActive && (
                        <span className="ml-2 inline-flex items-center">
                          <RefreshCw className="w-3 h-3 animate-spin" />
                        </span>
                      )}
                    </h4>
                    <p className={cn(
                      'text-sm mt-1',
                      isActive && 'text-blue-700',
                      isCompleted && 'text-green-700',
                      isError && 'text-red-700',
                      !isActive && !isCompleted && !isError && 'text-gray-600'
                    )}>
                      {step.description}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Pasos predefinidos para búsqueda IA
export const AI_SEARCH_STEPS: SearchStep[] = [
  {
    id: 'web-search',
    label: 'Búsqueda Web',
    description: 'Buscando en sitios oficiales chilenos (corfo.cl, sercotec.cl, anid.cl)',
    icon: <Globe className="w-4 h-4" />,
    status: 'pending'
  },
  {
    id: 'ai-processing',
    label: 'Procesamiento IA',
    description: 'Analizando resultados con inteligencia artificial real (OpenRouter)',
    icon: <Search className="w-4 h-4" />,
    status: 'pending'
  },
  {
    id: 'link-validation',
    label: 'Validación de Enlaces',
    description: 'Verificando accesibilidad y autenticidad de enlaces encontrados',
    icon: <Link className="w-4 h-4" />,
    status: 'pending'
  },
  {
    id: 'refinement',
    label: 'Refinamiento',
    description: 'Optimizando resultados y buscando información adicional si es necesario',
    icon: <RefreshCw className="w-4 h-4" />,
    status: 'pending'
  }
]