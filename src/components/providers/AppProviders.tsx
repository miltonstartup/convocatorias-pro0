// Proveedores centralizados de la aplicación
import React from 'react'
import { BrowserRouter as Router } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@/hooks/useAuth'
import { ThemeProvider } from '@/hooks/useTheme'
import { PWAProvider } from '@/components/ui/PWAProvider'
import { Toaster } from '@/components/ui/toast'

// Configurar React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutos
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 1,
    }
  },
})

interface AppProvidersProps {
  children: React.ReactNode
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <PWAProvider>
            <Router>
              {children}
              <Toaster />
            </Router>
          </PWAProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}