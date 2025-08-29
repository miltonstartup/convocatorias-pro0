import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Target, 
  Calendar, 
  Brain, 
  FileUp, 
  Bell, 
  BarChart3, 
  Shield, 
  Zap,
  ArrowRight,
  Check
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

export function LandingPage() {
  const { user } = useAuth()

  const features = [
    {
      icon: <FileUp className="h-6 w-6" />,
      title: 'Ingreso Inteligente',
      description: 'Sube archivos, pega texto o ingresa manualmente. La IA extrae la información automáticamente.'
    },
    {
      icon: <Calendar className="h-6 w-6" />,
      title: 'Calendario Inteligente',
      description: 'Visualiza fechas críticas con colores intuitivos. Nunca pierdas una oportunidad.'
    },
    {
      icon: <Brain className="h-6 w-6" />,
      title: 'IA Especializada',
      description: 'Agentes de IA que rastrean, validan y recomiendan convocatorias personalizadas.'
    },
    {
      icon: <Bell className="h-6 w-6" />,
      title: 'Alertas Personalizadas',
      description: 'Recordatorios inteligentes para fechas de cierre, resultados y nuevas oportunidades.'
    },
    {
      icon: <BarChart3 className="h-6 w-6" />,
      title: 'Dashboard Completo',
      description: 'Estadisticas, filtros avanzados y seguimiento detallado de todas tus postulaciones.'
    },
    {
      icon: <Shield className="h-6 w-6" />,
      title: 'Seguro y Confiable',
      description: 'Tus datos están protegidos con autenticación segura y backups automáticos.'
    }
  ]

  const testimonials = [
    {
      name: 'María González',
      role: 'Gestora Cultural',
      content: 'Antes perdía oportunidades por no estar al día. Ahora gestiono 20+ convocatorias sin esfuerzo.',
      rating: 5
    },
    {
      name: 'Carlos Rodríguez',
      role: 'Emprendedor Tech',
      content: 'La IA me ahorra horas de trabajo. Solo pego el texto y ConvocatoriasPro organiza todo.',
      rating: 5
    },
    {
      name: 'Ana Torres',
      role: 'Investigadora',
      content: 'El rastreo automático es increíble. Me notifica sobre nuevas convocatorias antes que mis colegas.',
      rating: 5
    }
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <Target className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold">ConvocatoriasPro</span>
          </Link>
          
          <div className="flex items-center gap-4">
            {user ? (
              <Button asChild>
                <Link to="/app/dashboard">
                  Ir al Dashboard
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            ) : (
              <>
                <Button variant="ghost" asChild>
                  <Link to="/login">Iniciar Sesión</Link>
                </Button>
                <Button asChild>
                  <Link to="/register">Empezar Gratis</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 lg:py-32">
        <div className="container mx-auto px-4 text-center">
          <Badge className="mb-4" variant="secondary">
            <Zap className="mr-1 h-3 w-3" />
            Potenciado por IA
          </Badge>
          
          <h1 className="text-4xl lg:text-6xl font-bold mb-6 bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
            Gestiona tus Convocatorias<br />de Financiamiento con IA
          </h1>
          
          <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
            La plataforma inteligente para emprendedores, investigadores y gestores culturales. 
            Automatiza el seguimiento de CORFO, SERCOTEC, Fondos de Cultura y más.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <Button size="lg" asChild>
              <Link to="/register">
                Comenzar Gratis
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              onClick={() => {
                const featuresSection = document.getElementById('features')
                if (featuresSection) {
                  featuresSection.scrollIntoView({ behavior: 'smooth' })
                }
              }}
            >
              Ver Funciones
            </Button>
          </div>
          
          <p className="text-sm text-muted-foreground">
            ✨ 3 días de prueba Pro gratis • Sin tarjeta de crédito • Cancela cuando quieras
          </p>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">
              Todo lo que necesitas para triunfar
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Desde ingreso inteligente hasta rastreo automático, tenemos las herramientas 
              que necesitas para no perder ninguna oportunidad.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="h-full">
                <CardHeader>
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center text-primary mb-4">
                    {feature.icon}
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base leading-relaxed">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">
              Lo que dicen nuestros usuarios
            </h2>
            <p className="text-xl text-muted-foreground">
              Historias reales de personas que están transformando su gestión de fondos
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index}>
                <CardContent className="p-6">
                  <div className="flex mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <span key={i} className="text-yellow-400 text-lg">★</span>
                    ))}
                  </div>
                  <p className="text-lg mb-4 leading-relaxed">
                    "{testimonial.content}"
                  </p>
                  <div>
                    <p className="font-semibold">{testimonial.name}</p>
                    <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold mb-4">
            ¿Listo para gestionar tus convocatorias como un pro?
          </h2>
          <p className="text-xl mb-8 opacity-90 max-w-2xl mx-auto">
            Únete a cientos de emprendedores, investigadores y gestores que ya están 
            aprovechando al máximo las oportunidades de financiamiento.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" variant="secondary" asChild>
              <Link to="/register">
                Empezar Gratis Ahora
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
          
          <div className="mt-8 flex flex-wrap justify-center gap-8 text-sm opacity-80">
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4" />
              <span>3 días de prueba gratis</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4" />
              <span>Sin tarjeta de crédito</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4" />
              <span>Cancela cuando quieras</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Logo y descripción */}
            <div className="col-span-1 md:col-span-2">
              <Link to="/" className="flex items-center gap-2 mb-4">
                <Target className="h-6 w-6 text-primary" />
                <span className="font-bold text-lg">ConvocatoriasPro</span>
              </Link>
              <p className="text-sm text-muted-foreground max-w-md">
                La plataforma inteligente para gestionar convocatorias de financiamiento con IA.
                Nunca pierdas una oportunidad de fondos para tu emprendimiento o proyecto.
              </p>
            </div>
            
            {/* Enlaces rápidos */}
            <div>
              <h4 className="font-semibold mb-4">Producto</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <button
                    onClick={() => {
                      const featuresSection = document.getElementById('features')
                      if (featuresSection) {
                        featuresSection.scrollIntoView({ behavior: 'smooth' })
                      }
                    }}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Funcionalidades
                  </button>
                </li>
                <li>
                  <Link to="/plans" className="text-muted-foreground hover:text-foreground transition-colors">
                    Precios
                  </Link>
                </li>
                <li>
                  <Link to="/register" className="text-muted-foreground hover:text-foreground transition-colors">
                    Empezar Gratis
                  </Link>
                </li>
              </ul>
            </div>
            
            {/* Soporte */}
            <div>
              <h4 className="font-semibold mb-4">Soporte</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="mailto:soporte@convocatoriaspro.com" className="text-muted-foreground hover:text-foreground transition-colors">
                    Contacto
                  </a>
                </li>
                <li>
                  <a href="/terminos" className="text-muted-foreground hover:text-foreground transition-colors">
                    Términos de Servicio
                  </a>
                </li>
                <li>
                  <a href="/privacidad" className="text-muted-foreground hover:text-foreground transition-colors">
                    Política de Privacidad
                  </a>
                </li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-border mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
            <div className="text-sm text-muted-foreground mb-4 md:mb-0">
              © 2025 ConvocatoriasPro. Todos los derechos reservados.
            </div>
            <div className="text-sm text-muted-foreground">
              Hecho con ❤️ para emprendedores e investigadores en Chile
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}