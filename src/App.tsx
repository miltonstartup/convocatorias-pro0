import { Routes, Route, Navigate } from 'react-router-dom'
import { AppProviders } from '@/components/providers/AppProviders'
import { AuthGuard } from '@/components/auth/AuthGuard'
import { AppLayout } from '@/components/layout/AppLayout'

// Páginas públicas
import { LandingPage } from '@/pages/LandingPage'
import { AuthPage } from '@/pages/AuthPage'
import { PlansPage } from '@/pages/PlansPage'

// Páginas protegidas
import { DashboardPage } from '@/pages/DashboardPage'
import { CalendarPage } from '@/pages/CalendarPage'
import { HistoryPage } from '@/pages/HistoryPage'
import { ProfilePage } from '@/pages/ProfilePage'
import { SubscriptionPage } from '@/pages/SubscriptionPage'
import { ConvocatoriaNewPage } from '@/pages/ConvocatoriaNewPage'
import NewConvocatoriaV2 from '@/pages/NewConvocatoriaV2'
import { ConvocatoriaDetailPage } from '@/pages/ConvocatoriaDetailPage'
import { ConvocatoriaImportPage } from '@/pages/ConvocatoriaImportPage'
import { ConvocatoriaPastePage } from '@/pages/ConvocatoriaPastePage'
import { SettingsPage } from '@/pages/SettingsPage'
import { ExportPage } from '@/pages/ExportPage'
import { AuthCallbackPage } from '@/pages/AuthCallbackPage'
import AISearchPage from '@/pages/AISearchPage'
import SavedSearchesPage from '@/pages/SavedSearchesPage'
import SavedConvocatoriasPage from '@/pages/SavedConvocatoriasPage'
import AIConfigPage from '@/pages/AIConfigPage'
import PromptEditorPage from '@/pages/PromptEditorPage'

function App() {
  return (
    <AppProviders>
      <div className="min-h-screen bg-background">
        <Routes>
          {/* Páginas públicas */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<AuthPage type="login" />} />
          <Route path="/register" element={<AuthPage type="register" />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          <Route path="/pricing" element={<Navigate to="/plans" replace />} />
          
          {/* Selección de plan (PÚBLICA) */}
          <Route path="/plans" element={<PlansPage />} />
          
          {/* Páginas de la aplicación */}
          <Route 
            path="/app" 
            element={
              <AuthGuard>
                <AppLayout />
              </AuthGuard>
            }
          >
            {/* Redirigir /app a /app/dashboard */}
            <Route index element={<Navigate to="/app/dashboard" replace />} />
            
            {/* Páginas principales */}
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="calendar" element={<CalendarPage />} />
            <Route path="history" element={<HistoryPage />} />
            <Route path="export" element={<ExportPage />} />
            
            {/* Configuración */}
            <Route path="settings" element={<SettingsPage />} />
            <Route path="settings/profile" element={<ProfilePage />} />
            <Route path="settings/subscription" element={<SubscriptionPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="plans" element={<PlansPage />} />
            
            {/* Convocatorias */}
            <Route path="convocatorias" element={<Navigate to="/app/dashboard" replace />} />
            <Route path="convocatorias/new" element={<ConvocatoriaNewPage />} />
            <Route path="convocatorias/new-ai" element={<NewConvocatoriaV2 />} />
            <Route path="convocatorias/import" element={<ConvocatoriaImportPage />} />
            <Route path="convocatorias/paste" element={<ConvocatoriaPastePage />} />
            <Route path="convocatorias/:id" element={<ConvocatoriaDetailPage />} />
            
            {/* Búsqueda IA Pro */}
            <Route path="ai-search" element={<AISearchPage />} />
            <Route path="saved-searches" element={<SavedSearchesPage />} />
            <Route path="saved-convocatorias" element={<SavedConvocatoriasPage />} />
            <Route path="ai-config" element={<AIConfigPage />} />
            <Route path="prompt-editor" element={<PromptEditorPage />} />
          </Route>
          
          {/* Ruta catch-all para redirigir al inicio */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </AppProviders>
  )
}

export default App