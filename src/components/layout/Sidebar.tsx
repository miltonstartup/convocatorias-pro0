import { Link, useLocation } from 'react-router-dom'
import { 
  Calendar, 
  LayoutDashboard, 
  History, 
  Settings, 
  Plus,
  Target,
  User,
  CreditCard,
  Bot,
  FileText,
  Clipboard,
  Upload,
  Search,
  BookOpen,
  Cog,
  Edit3,
  Heart
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'
import { usePlans } from '@/hooks/usePlans'
import { Badge } from '@/components/ui/badge'

interface SidebarProps {
  className?: string
}

const navigation = [
  { name: 'Dashboard', href: '/app/dashboard', icon: LayoutDashboard },
  { name: 'Calendario', href: '/app/calendar', icon: Calendar },
  { name: 'Historial', href: '/app/history', icon: History },
]

const aiNavigation = [
  { name: 'Búsqueda IA Pro', href: '/app/ai-search', icon: Search, pro: false },
  { name: 'Búsquedas Guardadas', href: '/app/saved-searches', icon: BookOpen, pro: true },
  { name: 'Convocatorias Guardadas', href: '/app/saved-convocatorias', icon: Heart, pro: false },
  { name: 'Configuración IA', href: '/app/ai-config', icon: Cog, pro: false },
  { name: 'Editor de Prompts', href: '/app/prompt-editor', icon: Edit3, pro: false },
  { name: 'Nueva con IA', href: '/app/convocatorias/new-ai', icon: Bot, pro: true },
  { name: 'Importar Archivo', href: '/app/convocatorias/import', icon: Upload, pro: true },
  { name: 'Pegar y Detectar', href: '/app/convocatorias/paste', icon: Clipboard, pro: true },
]

const settingsNavigation = [
  { name: 'Perfil', href: '/app/settings/profile', icon: User },
  { name: 'Suscripción', href: '/app/settings/subscription', icon: CreditCard },
]

export function Sidebar({ className }: SidebarProps) {
  const location = useLocation()
  const { profile, isPro } = useAuth()
  const { isTrialActive, getTrialDaysLeft, isProPlan } = usePlans()

  const isActive = (href: string) => {
    return location.pathname === href
  }

  return (
    <div className={cn(
      'fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border',
      className
    )}>
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 shrink-0 items-center border-b border-border px-6">
          <Link to="/app/dashboard" className="flex items-center gap-2">
            <Target className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold">ConvocatoriasPro</span>
          </Link>
        </div>
        
        {/* Plan Status */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">
                {isPro ? 'Plan Pro' : 'Plan Gratuito'}
              </p>
              {isTrialActive() && (
                <p className="text-xs text-muted-foreground">
                  Prueba: {getTrialDaysLeft()} días restantes
                </p>
              )}
            </div>
            <Badge variant={isPro ? 'default' : 'secondary'}>
              {isPro ? 'PRO' : 'FREE'}
            </Badge>
          </div>
        </div>
        
        {/* Botón Nueva Convocatoria */}
        <div className="p-4">
          <Button asChild className="w-full">
            <Link to="/app/convocatorias/new">
              <Plus className="mr-2 h-4 w-4" />
              Nueva Convocatoria
            </Link>
          </Button>
        </div>
        
        {/* Navegación principal */}
        <nav className="flex-1 px-4 py-2">
          <ul className="space-y-1">
            {navigation.map((item) => {
              const active = isActive(item.href)
              return (
                <li key={item.name}>
                  <Link
                    to={item.href}
                    className={cn(
                      'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                      active
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.name}
                  </Link>
                </li>
              )
            })}
          </ul>
          
          {/* Sección Funciones IA */}
          <div className="mt-6">
            <p className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3">
              Funciones de IA
            </p>
            <ul className="space-y-1">
              {aiNavigation.map((item) => {
                const active = isActive(item.href)
                // isPro ya está disponible del hook useAuth
                
                return (
                  <li key={item.name}>
                    <Link
                      to={item.href}
                      className={cn(
                        'flex items-center justify-between gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                        active
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                        !isPro && item.pro && 'opacity-75'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <item.icon className="h-4 w-4" />
                        {item.name}
                      </div>
                      {!isPro && item.pro && (
                        <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
                          PRO
                        </Badge>
                      )}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        </nav>
        
        {/* Configuración */}
        <div className="border-t border-border p-4">
          <p className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Configuración
          </p>
          <ul className="space-y-1">
            {settingsNavigation.map((item) => {
              const active = isActive(item.href)
              return (
                <li key={item.name}>
                  <Link
                    to={item.href}
                    className={cn(
                      'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                      active
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.name}
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      </div>
    </div>
  )
}