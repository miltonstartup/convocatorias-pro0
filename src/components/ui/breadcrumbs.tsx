import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ChevronRight, Home } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BreadcrumbItem {
  label: string
  href?: string
  icon?: React.ReactNode
}

interface BreadcrumbsProps {
  items?: BreadcrumbItem[]
  className?: string
}

const routeMap: Record<string, string> = {
  dashboard: 'Dashboard',
  calendar: 'Calendario',
  history: 'Historial',
  export: 'Exportar Datos',
  settings: 'Configuración',
  profile: 'Perfil',
  plans: 'Planes',
  convocatorias: 'Convocatorias',
  new: 'Nueva',
  'new-ai': 'Nueva con IA',
  import: 'Importar Archivo',
  paste: 'Pegar y Detectar',
  subscription: 'Suscripción'
}

export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  const location = useLocation()
  
  // Si se proporcionan items manuales, usarlos
  if (items) {
    return (
      <nav aria-label="Breadcrumb" className={cn('flex items-center space-x-2 text-sm text-muted-foreground', className)}>
        <Link to="/app/dashboard" className="hover:text-foreground transition-colors">
          <Home className="h-4 w-4" />
        </Link>
        {items.map((item, index) => (
          <React.Fragment key={index}>
            <ChevronRight className="h-4 w-4" />
            {item.href ? (
              <Link to={item.href} className="hover:text-foreground transition-colors flex items-center gap-1">
                {item.icon}
                {item.label}
              </Link>
            ) : (
              <span className="text-foreground flex items-center gap-1">
                {item.icon}
                {item.label}
              </span>
            )}
          </React.Fragment>
        ))}
      </nav>
    )
  }
  
  // Generar breadcrumbs automáticamente desde la ruta
  const pathSegments = location.pathname.split('/').filter(Boolean)
  
  // Remover 'app' del inicio si existe
  if (pathSegments[0] === 'app') {
    pathSegments.shift()
  }
  
  if (pathSegments.length === 0) {
    return null
  }
  
  const breadcrumbItems: BreadcrumbItem[] = []
  let currentPath = '/app'
  
  pathSegments.forEach((segment, index) => {
    currentPath += `/${segment}`
    const label = routeMap[segment] || segment.charAt(0).toUpperCase() + segment.slice(1)
    
    breadcrumbItems.push({
      label,
      href: index === pathSegments.length - 1 ? undefined : currentPath
    })
  })
  
  return (
    <nav aria-label="Breadcrumb" className={cn('flex items-center space-x-2 text-sm text-muted-foreground', className)}>
      <Link to="/app/dashboard" className="hover:text-foreground transition-colors">
        <Home className="h-4 w-4" />
      </Link>
      {breadcrumbItems.map((item, index) => (
        <React.Fragment key={index}>
          <ChevronRight className="h-4 w-4" />
          {item.href ? (
            <Link to={item.href} className="hover:text-foreground transition-colors">
              {item.label}
            </Link>
          ) : (
            <span className="text-foreground font-medium">
              {item.label}
            </span>
          )}
        </React.Fragment>
      ))}
    </nav>
  )
}