import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { MobileNav } from './MobileNav'
import { cn } from '@/lib/utils'

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()

  const getPageTitle = () => {
    switch (location.pathname) {
      case '/app/dashboard':
        return 'Dashboard'
      case '/app/calendar':
        return 'Calendario'
      case '/app/history':
        return 'Historial'
      case '/app/ai-search':
        return 'Búsqueda IA Pro'
      case '/app/saved-searches':
        return 'Búsquedas Guardadas'
      case '/app/ai-config':
        return 'Configuración IA'
      case '/app/settings/profile':
        return 'Perfil'
      case '/app/settings/subscription':
        return 'Suscripción'
      case '/app/convocatorias/new':
        return 'Nueva Convocatoria'
      default:
        if (location.pathname.startsWith('/app/convocatorias/')) {
          return 'Detalle de Convocatoria'
        }
        return 'ConvocatoriasPro'
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar para desktop */}
      <Sidebar className="hidden lg:flex" />
      
      {/* Sidebar móvil */}
      <MobileNav open={sidebarOpen} onOpenChange={setSidebarOpen} />
      
      {/* Contenido principal */}
      <div className="lg:pl-64">
        <Header 
          title={getPageTitle()}
          onMenuClick={() => setSidebarOpen(true)}
        />
        
        <main className="p-4 md:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}