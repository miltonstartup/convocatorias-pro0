import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AISearchInterface } from '@/components/ai-search/AISearchInterface'
import { useAuth } from '@/hooks/useAuth'
import { 
  Bot, 
  AlertCircle, 
  Sparkles,
  Brain,
  Computer,
  Palette,
  GraduationCap,
  Building,
  Lightbulb,
  Target,
  Zap,
  CheckCircle,
  Globe
} from 'lucide-react'

// Plantillas predefinidas de búsqueda IA Real (optimizadas para Chile)
const searchTemplates = [
  {
    id: 'corfo-innovacion',
    name: 'Innovación CORFO',
    icon: Lightbulb,
    query: 'fondos CORFO para proyectos de innovación y desarrollo tecnológico en Chile',
    description: 'Financiamiento para innovación empresarial',
    provider: 'gemini_smart'
  },
  {
    id: 'emprendimiento-sercotec',
    name: 'Emprendimiento SERCOTEC',
    icon: Building,
    query: 'programas SERCOTEC para emprendedores y MIPYMES en Chile',
    description: 'Apoyo para micro y pequeñas empresas',
    provider: 'gemini_smart'
  },
  {
    id: 'investigacion-anid',
    name: 'Investigación ANID',
    icon: GraduationCap,
    query: 'becas FONDECYT y fondos ANID para investigación científica en Chile',
    description: 'Becas y fondos para investigación científica',
    provider: 'gemini_direct'
  },
  {
    id: 'startups-chile',
    name: 'Startups Tech Chile',
    icon: Computer,
    query: 'financiamiento para startups tecnológicas y capital semilla en Chile',
    description: 'Capital semilla para startups tecnológicas',
    provider: 'gemini_smart'
  },
  {
    id: 'audiovisual-chile',
    name: 'Arte y Audiovisual',
    icon: Palette,
    query: 'fondos CNTV y financiamiento para proyectos audiovisuales y culturales en Chile',
    description: 'Financiamiento para proyectos audiovisuales',
    provider: 'openrouter'
  }
]

export default function AISearchPage() {
  const { isPro } = useAuth()

  // TEMPORAL: Permitir acceso para pruebas (comentar para restringir a Pro)
  // if (!isPro) {
  //   return (
  //     <div className="min-h-screen bg-gray-50 py-8">
  //       <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
  //         <Alert className="mb-6 border-orange-200 bg-orange-50">
  //           <AlertCircle className="h-4 w-4 text-orange-600" />
  //           <AlertTitle className="text-orange-800">Plan Pro Requerido</AlertTitle>
  //           <AlertDescription className="text-orange-700">
  //             La función de Búsqueda IA está disponible solo para usuarios Pro.
  //             <a href="/app/plans" className="underline font-medium ml-1">Actualizar plan</a>
  //           </AlertDescription>
  //         </Alert>
  //       </div>
  //     </div>
  //   )
  // }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 lg:gap-8">
          {/* Panel principal - Búsqueda IA Real */}
          <div className="xl:col-span-3 space-y-6">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-gradient-to-r from-green-500 to-blue-500 rounded-lg">
                  <Target className="h-8 w-8 text-white" />
                </div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Búsqueda IA Avanzada
                </h1>
                <Badge variant="default" className="bg-gradient-to-r from-green-500 to-blue-500 text-white">
                  <Sparkles className="h-3 w-3 mr-1" />
                  Multi-Proveedor
                </Badge>
              </div>
              <p className="text-gray-600">
                Búsqueda inteligente con OpenRouter, Gemini Direct y Flujo Inteligente de 2 pasos
              </p>
            </div>

            {/* Interfaz de búsqueda IA real */}
            <AISearchInterface />
          </div>

          {/* Panel lateral - Plantillas y información */}
          <div className="xl:col-span-1 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-blue-500" />
                  Plantillas IA
                </CardTitle>
                <CardDescription>
                  Consultas optimizadas por sector y proveedor
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {searchTemplates.map((template) => {
                  const Icon = template.icon
                  return (
                    <div
                      key={template.id}
                      className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => {
                        // Simular click en el campo de búsqueda con la query del template
                        const event = new CustomEvent('useTemplate', {
                          detail: { query: template.query }
                        })
                        window.dispatchEvent(event)
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <Icon className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="font-semibold text-sm text-gray-900">
                              {template.name}
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {template.provider === 'openrouter' && 'OpenRouter'}
                              {template.provider === 'gemini_direct' && 'Gemini Pro'}
                              {template.provider === 'gemini_smart' && 'Smart Flow'}
                            </Badge>
                          </div>
                          <div className="text-xs text-gray-600">
                            {template.description}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </CardContent>
            </Card>

            {/* Información sobre proveedores IA */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Brain className="h-5 w-5 text-purple-500" />
                  Proveedores IA
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* OpenRouter */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Brain className="h-4 w-4 text-blue-500" />
                    <span className="font-medium text-sm">OpenRouter</span>
                    <Badge variant="outline" className="text-xs">Múltiples Modelos</Badge>
                  </div>
                  <div className="text-xs text-gray-600 space-y-1 pl-6">
                    <div>• DeepSeek Chat v3</div>
                    <div>• Gemini 2.0 Flash</div>
                    <div>• Llama 3.3 70B</div>
                    <div>• Validación cruzada</div>
                  </div>
                </div>
                
                {/* Gemini Direct */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-blue-500" />
                    <span className="font-medium text-sm">Gemini 2.5 Pro</span>
                    <Badge variant="outline" className="text-xs">Directo</Badge>
                  </div>
                  <div className="text-xs text-gray-600 space-y-1 pl-6">
                    <div>• Respuesta rápida</div>
                    <div>• Alta precisión</div>
                    <div>• Contexto extenso</div>
                  </div>
                </div>
                
                {/* Flujo Inteligente */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-green-500" />
                    <span className="font-medium text-sm">Flujo Inteligente</span>
                    <Badge className="text-xs bg-gradient-to-r from-green-500 to-blue-500 text-white">
                      ✨ Recomendado
                    </Badge>
                  </div>
                  <div className="text-xs text-gray-600 space-y-1 pl-6">
                    <div>• Paso 1: Flash-Lite (lista rápida)</div>
                    <div>• Paso 2: Pro (análisis detallado)</div>
                    <div>• Máxima precisión</div>
                    <div>• Resultados optimizados</div>
                  </div>
                </div>

                <div className="pt-3 border-t border-gray-200">
                  <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    Sitios monitoreados:
                  </h4>
                  <div className="space-y-1 text-xs text-gray-600">
                    <div>• corfo.cl (CORFO)</div>
                    <div>• sercotec.cl (SERCOTEC)</div>
                    <div>• anid.cl (ANID)</div>
                    <div>• fosis.gob.cl (FOSIS)</div>
                    <div>• gob.cl (Gobierno)</div>
                  </div>
                </div>
                
                <div className="pt-3 border-t border-gray-200">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="font-semibold text-sm text-green-700">Estado del Sistema</span>
                  </div>
                  <div className="space-y-1 text-xs text-gray-600">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span>OpenRouter API activa</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span>Gemini API conectada</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span>Flujo inteligente operativo</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}