import { beforeAll, afterEach, afterAll, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import '@testing-library/jest-dom'

// Configuración global para tests de ConvocatoriasPro

// Mock de variables de entorno
vi.stubEnv('VITE_SUPABASE_URL', 'https://wilvxlbiktetduwftqfn.supabase.co')
vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-anon-key')

// Mock de Supabase client
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn(),
      signIn: vi.fn(),
      signOut: vi.fn(),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } }))
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn(),
      single: vi.fn()
    })),
    functions: {
      invoke: vi.fn()
    },
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(),
        download: vi.fn(),
        remove: vi.fn()
      }))
    }
  }))
}))

// Mock de react-router-dom
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  useLocation: () => ({ pathname: '/' }),
  useParams: () => ({}),
  Link: ({ children, to, ...props }) => <a href={to} {...props}>{children}</a>,
  BrowserRouter: ({ children }) => <div>{children}</div>,
  Routes: ({ children }) => <div>{children}</div>,
  Route: ({ element }) => element
}))

// Mock de Lucide React icons
vi.mock('lucide-react', () => ({
  Search: () => <div data-testid="search-icon" />,
  Bell: () => <div data-testid="bell-icon" />,
  User: () => <div data-testid="user-icon" />,
  Menu: () => <div data-testid="menu-icon" />,
  X: () => <div data-testid="x-icon" />,
  Settings: () => <div data-testid="settings-icon" />,
  Calendar: () => <div data-testid="calendar-icon" />,
  Download: () => <div data-testid="download-icon" />,
  Upload: () => <div data-testid="upload-icon" />,
  Plus: () => <div data-testid="plus-icon" />,
  Edit: () => <div data-testid="edit-icon" />,
  Trash2: () => <div data-testid="trash-icon" />,
  Check: () => <div data-testid="check-icon" />,
  AlertCircle: () => <div data-testid="alert-icon" />,
  Loader2: () => <div data-testid="loader-icon" />
}))

// Mock de fecha para tests consistentes
const mockDate = new Date('2025-08-17T10:00:00.000Z')
vi.setSystemTime(mockDate)

// Configuración de ResizeObserver para tests
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn()
}))

// Mock de IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn()
}))

// Mock de fetch para tests de API
global.fetch = vi.fn()

// Configuración antes de todos los tests
beforeAll(() => {
  // Configurar console para capturar logs en tests
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})

// Limpiar después de cada test
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

// Limpiar después de todos los tests
afterAll(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
})

// Utilidades para tests
export const TestUtils = {
  // Crear usuario mock
  createMockUser: (overrides = {}) => ({
    id: 'test-user-id',
    email: 'test@example.com',
    created_at: '2025-01-01T00:00:00.000Z',
    ...overrides
  }),
  
  // Crear convocatoria mock
  createMockConvocatoria: (overrides = {}) => ({
    id: 1,
    nombre_concurso: 'Test Convocatoria',
    institucion: 'CORFO',
    fecha_cierre: '2025-12-31',
    estado: 'abierto',
    monto_financiamiento: '$50.000.000',
    area: 'Innovación',
    created_at: '2025-01-01T00:00:00.000Z',
    ...overrides
  }),
  
  // Crear respuesta de API mock
  createMockApiResponse: (data = {}, error = null) => ({
    data: error ? null : data,
    error,
    status: error ? 400 : 200
  }),
  
  // Delay para tests async
  delay: (ms = 100) => new Promise(resolve => setTimeout(resolve, ms))
}