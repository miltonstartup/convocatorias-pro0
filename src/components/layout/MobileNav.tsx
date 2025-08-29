import { Link, useLocation } from 'react-router-dom'
import { 
  Calendar, 
  LayoutDashboard, 
  History, 
  Plus,
  Target,
  User,
  CreditCard,
  X
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'
import { usePlans } from '@/hooks/usePlans'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface MobileNavProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const navigation = [
  { name: 'Dashboard', href: '/app/dashboard', icon: LayoutDashboard },
  { name: 'Calendario', href: '/app/calendar', icon: Calendar },
  { name: 'Historial', href: '/app/history', icon: History },
]

const settingsNavigation = [
  { name: 'Perfil', href: '/app/settings/profile', icon: User },
  { name: 'Suscripción', href: '/app/settings/subscription', icon: CreditCard },
]

export function MobileNav({ open, onOpenChange }: MobileNavProps) {
  const location = useLocation()
  const { profile, isPro } = useAuth()
  const { isTrialActive, getTrialDaysLeft, isProPlan } = usePlans()

  const isActive = (href: string) => {
    return location.pathname === href
  }

  const handleLinkClick = () => {
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px] h-[100vh] max-h-[100vh] w-full max-w-full m-0 rounded-none border-0 p-0">
        <div className="flex h-full flex-col bg-card">
          {/* Header */}
          <DialogHeader className="flex flex-row items-center justify-between border-b border-border p-6">
            <div className="flex items-center gap-2">
              <Target className="h-6 w-6 text-primary" />
              <DialogTitle className="text-lg font-bold">ConvocatoriasPro</DialogTitle>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </DialogHeader>
          
          {/* Plan Status */}
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">
                  {isProPlan() ? 'Plan Pro' : 'Plan Gratuito'}
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
            <Button asChild className="w-full" onClick={handleLinkClick}>
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
                      onClick={handleLinkClick}
                      className={cn(
                        'flex items-center gap-3 rounded-md px-3 py-3 text-sm font-medium transition-colors',
                        active
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                      )}
                    >
                      <item.icon className="h-5 w-5" />
                      {item.name}
                    </Link>
                  </li>
                )
              })}
            </ul>
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
                      onClick={handleLinkClick}
                      className={cn(
                        'flex items-center gap-3 rounded-md px-3 py-3 text-sm font-medium transition-colors',
                        active
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                      )}
                    >
                      <item.icon className="h-5 w-5" />
                      {item.name}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}