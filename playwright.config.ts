import { defineConfig, devices } from '@playwright/test'

/**
 * Configuración de Playwright para ConvocatoriasPro
 * Tests End-to-End automatizados
 */
export default defineConfig({
  testDir: './src/tests/e2e',
  
  /* Ejecutar tests en paralelo */
  fullyParallel: true,
  
  /* Fallar si algún worker no tiene tests */
  forbidOnly: !!process.env.CI,
  
  /* Reintentar en CI */
  retries: process.env.CI ? 2 : 0,
  
  /* Opt out de paralelización en CI */
  workers: process.env.CI ? 1 : undefined,
  
  /* Reporter para generar reportes */
  reporter: [
    ['html'],
    ['json', { outputFile: 'playwright-report/results.json' }],
    ['line']
  ],
  
  /* Configuración compartida para todos los tests */
  use: {
    /* URL base para todos los tests */
    baseURL: 'https://67wxko2mslhe.space.minimax.io',
    
    /* Collect trace when retrying the failed test */
    trace: 'on-first-retry',
    
    /* Screenshots on failure */
    screenshot: 'only-on-failure',
    
    /* Video recording */
    video: 'retain-on-failure',
    
    /* Timeout para acciones */
    actionTimeout: 10000,
    
    /* Timeout para navegación */
    navigationTimeout: 30000
  },
  
  /* Configuración por proyecto para diferentes navegadores */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    
    /* Test en dispositivos móviles */
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
    
    /* Branded tests */
    {
      name: 'Microsoft Edge',
      use: { ...devices['Desktop Edge'], channel: 'msedge' },
    },
    
    {
      name: 'Google Chrome',
      use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    },
  ],
  
  /* Servidor local para desarrollo */
  webServer: process.env.NODE_ENV === 'development' ? {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  } : undefined,
  
  /* Directorio para archivos de output */
  outputDir: 'test-results/',
  
  /* Configuración global de timeouts */
  timeout: 30 * 1000,
  expect: {
    timeout: 5 * 1000,
  },
  
  /* Configuración de reportes */
  reportSlowTests: {
    max: 5,
    threshold: 15 * 1000,
  }
})