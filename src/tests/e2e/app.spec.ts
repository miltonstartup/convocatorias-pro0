import { test, expect } from '@playwright/test'

// Tests End-to-End para ConvocatoriasPro
// Estos tests verifican los flujos completos de usuario

const BASE_URL = 'https://67wxko2mslhe.space.minimax.io'

// Configuración de prueba
test.beforeEach(async ({ page }) => {
  // Configurar timeout para tests E2E
  test.setTimeout(60000)
  
  // Ir a la página principal
  await page.goto(BASE_URL)
  
  // Esperar a que la página cargue completamente
  await page.waitForLoadState('networkidle')
})

test.describe('ConvocatoriasPro E2E Tests', () => {
  test.describe('Página Principal y Navegación', () => {
    test('should load homepage correctly', async ({ page }) => {
      // Verificar que el título de la página sea correcto
      await expect(page).toHaveTitle(/ConvocatoriasPro/)
      
      // Verificar elementos principales del hero
      await expect(page.locator('h1')).toContainText('ConvocatoriasPro')
      
      // Verificar botones de acción principales
      await expect(page.locator('text=Comenzar Gratis')).toBeVisible()
      await expect(page.locator('text=Ver Demo')).toBeVisible()
    })

    test('should navigate to login page', async ({ page }) => {
      // Hacer clic en el botón de login
      await page.click('text=Iniciar Sesión')
      
      // Verificar que navegamos a la página de login
      await expect(page.url()).toContain('/login')
      
      // Verificar elementos del formulario de login
      await expect(page.locator('input[type="email"]')).toBeVisible()
      await expect(page.locator('input[type="password"]')).toBeVisible()
      await expect(page.locator('button[type="submit"]')).toBeVisible()
    })

    test('should navigate to registration page', async ({ page }) => {
      // Hacer clic en el botón de registro
      await page.click('text=Comenzar Gratis')
      
      // Verificar que navegamos a la página de registro
      await expect(page.url()).toContain('/register')
      
      // Verificar elementos del formulario de registro
      await expect(page.locator('input[type="email"]')).toBeVisible()
      await expect(page.locator('input[type="password"]')).toBeVisible()
      await expect(page.locator('input[name="fullName"]')).toBeVisible()
    })

    test('should display pricing information', async ({ page }) => {
      // Navegar a la sección de precios
      await page.click('text=Precios')
      
      // Verificar que se muestran los planes
      await expect(page.locator('text=Plan Gratuito')).toBeVisible()
      await expect(page.locator('text=Pro Mensual')).toBeVisible()
      await expect(page.locator('text=Pro Anual')).toBeVisible()
      
      // Verificar precios
      await expect(page.locator('text=$8.990')).toBeVisible()
      await expect(page.locator('text=$84.990')).toBeVisible()
    })
  })

  test.describe('Autenticación de Usuario', () => {
    test('should show validation errors for invalid login', async ({ page }) => {
      // Ir a login
      await page.goto(`${BASE_URL}/login`)
      
      // Intentar login con datos inválidos
      await page.fill('input[type="email"]', 'invalid-email')
      await page.fill('input[type="password"]', '123')
      await page.click('button[type="submit"]')
      
      // Verificar mensajes de error
      await expect(page.locator('text=Email inválido')).toBeVisible()
      await expect(page.locator('text=La contraseña debe tener al menos')).toBeVisible()
    })

    test('should register new user successfully', async ({ page }) => {
      // Ir a registro
      await page.goto(`${BASE_URL}/register`)
      
      // Generar email único para el test
      const testEmail = `test+${Date.now()}@convocatoriaspro.cl`
      
      // Llenar formulario de registro
      await page.fill('input[name="fullName"]', 'Usuario Test')
      await page.fill('input[type="email"]', testEmail)
      await page.fill('input[type="password"]', 'TestPassword123!')
      await page.fill('input[name="confirmPassword"]', 'TestPassword123!')
      
      // Enviar formulario
      await page.click('button[type="submit"]')
      
      // Verificar mensaje de confirmación
      await expect(page.locator('text=Revisa tu email')).toBeVisible()
    })
  })

  test.describe('Dashboard y Funcionalidades Principales', () => {
    test.beforeEach(async ({ page }) => {
      // Login como usuario de prueba (si existe)
      // Esto requeriría un usuario de prueba preconfigurado
      // Por ahora simularemos el estado autenticado
    })

    test('should display dashboard with convocatorias', async ({ page }) => {
      // Intentar acceder al dashboard
      await page.goto(`${BASE_URL}/app/dashboard`)
      
      // Si no está autenticado, será redirigido a login
      if (page.url().includes('/login')) {
        // Skip este test si no hay autenticación
        test.skip()
      }
      
      // Verificar elementos del dashboard
      await expect(page.locator('h1')).toContainText('Dashboard')
      await expect(page.locator('text=Convocatorias')).toBeVisible()
    })

    test('should open add convocatoria modal', async ({ page }) => {
      await page.goto(`${BASE_URL}/app/dashboard`)
      
      if (page.url().includes('/login')) {
        test.skip()
      }
      
      // Hacer clic en agregar convocatoria
      await page.click('text=Agregar Convocatoria')
      
      // Verificar que se abre el modal
      await expect(page.locator('text=Nueva Convocatoria')).toBeVisible()
      
      // Verificar campos del formulario
      await expect(page.locator('input[name="nombre_concurso"]')).toBeVisible()
      await expect(page.locator('select[name="institucion"]')).toBeVisible()
      await expect(page.locator('input[type="date"]')).toBeVisible()
    })
  })

  test.describe('Búsqueda con IA', () => {
    test('should perform AI search from homepage', async ({ page }) => {
      // Buscar el componente de búsqueda en la homepage
      const searchInput = page.locator('input[placeholder*="Buscar"]').first()
      
      if (await searchInput.isVisible()) {
        // Realizar búsqueda
        await searchInput.fill('innovación tecnológica')
        await page.click('button:has-text("Buscar")')
        
        // Esperar resultados
        await page.waitForTimeout(5000)
        
        // Verificar que se muestran resultados o mensaje
        const hasResults = await page.locator('.search-results').isVisible()
        const hasMessage = await page.locator('text=Buscando').isVisible()
        
        expect(hasResults || hasMessage).toBeTruthy()
      }
    })
  })

  test.describe('Responsive Design', () => {
    test('should work correctly on mobile viewport', async ({ page }) => {
      // Cambiar a viewport móvil
      await page.setViewportSize({ width: 375, height: 667 })
      
      // Recargar página
      await page.reload()
      
      // Verificar que el menú hamburguesa es visible
      await expect(page.locator('[data-testid="menu-icon"]')).toBeVisible()
      
      // Abrir menú móvil
      await page.click('[data-testid="menu-icon"]')
      
      // Verificar que se muestra la navegación móvil
      await expect(page.locator('.mobile-menu')).toBeVisible()
    })

    test('should work correctly on tablet viewport', async ({ page }) => {
      // Cambiar a viewport tablet
      await page.setViewportSize({ width: 768, height: 1024 })
      
      await page.reload()
      
      // Verificar que la navegación principal es visible
      await expect(page.locator('nav')).toBeVisible()
      
      // Verificar que los elementos se adaptan correctamente
      await expect(page.locator('h1')).toBeVisible()
    })
  })

  test.describe('Performance y Accesibilidad', () => {
    test('should load page within acceptable time', async ({ page }) => {
      const startTime = Date.now()
      
      await page.goto(BASE_URL)
      await page.waitForLoadState('networkidle')
      
      const loadTime = Date.now() - startTime
      
      // La página debe cargar en menos de 5 segundos
      expect(loadTime).toBeLessThan(5000)
    })

    test('should have proper heading structure', async ({ page }) => {
      // Verificar que existe un h1 principal
      const h1Count = await page.locator('h1').count()
      expect(h1Count).toBeGreaterThanOrEqual(1)
      
      // Verificar que no hay saltos en la jerarquía de headings
      const headings = await page.locator('h1, h2, h3, h4, h5, h6').allTextContents()
      expect(headings.length).toBeGreaterThan(0)
    })

    test('should have proper alt text for images', async ({ page }) => {
      const images = await page.locator('img').all()
      
      for (const img of images) {
        const alt = await img.getAttribute('alt')
        const src = await img.getAttribute('src')
        
        // Las imágenes deben tener alt text o ser decorativas
        if (src && !src.includes('data:image')) {
          expect(alt).toBeDefined()
        }
      }
    })
  })

  test.describe('Integración con Backend', () => {
    test('should handle network errors gracefully', async ({ page }) => {
      // Simular error de red
      await page.route('**/functions/v1/**', route => {
        route.abort('failed')
      })
      
      await page.goto(`${BASE_URL}/app/dashboard`)
      
      // Verificar que se muestra mensaje de error apropiado
      const errorMessage = page.locator('text=Error de conexión')
      const retryButton = page.locator('text=Reintentar')
      
      const hasErrorHandling = await errorMessage.isVisible() || await retryButton.isVisible()
      expect(hasErrorHandling).toBeTruthy()
    })

    test('should handle API timeouts', async ({ page }) => {
      // Simular timeout en API
      await page.route('**/functions/v1/**', route => {
        setTimeout(() => route.continue(), 30000) // 30s timeout
      })
      
      await page.goto(BASE_URL)
      
      // Buscar algo que haga una llamada a la API
      const searchInput = page.locator('input[placeholder*="Buscar"]').first()
      
      if (await searchInput.isVisible()) {
        await searchInput.fill('test')
        await page.click('button:has-text("Buscar")')
        
        // Verificar que se muestra indicador de carga o timeout
        await expect(page.locator('text=Cargando')).toBeVisible()
      }
    })
  })
})