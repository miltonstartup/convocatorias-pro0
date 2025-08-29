import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import Dashboard from '../pages/Dashboard'
import { AuthProvider } from '../contexts/AuthContext'
import { TestUtils } from './setup'

// Mock del hook useAuth
const mockUser = TestUtils.createMockUser()
const mockUseAuth = {
  user: mockUser,
  loading: false,
  signOut: vi.fn()
}

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => mockUseAuth
}))

// Mock del hook useConvocatorias
const mockConvocatorias = [
  TestUtils.createMockConvocatoria({ id: 1, nombre_concurso: 'CORFO Innovación 2025' }),
  TestUtils.createMockConvocatoria({ id: 2, nombre_concurso: 'FONDECYT Regular 2025', institucion: 'ANID' })
]

const mockUseConvocatorias = {
  convocatorias: mockConvocatorias,
  loading: false,
  error: null,
  refreshConvocatorias: vi.fn(),
  addConvocatoria: vi.fn(),
  updateConvocatoria: vi.fn(),
  deleteConvocatoria: vi.fn()
}

vi.mock('../hooks/useConvocatorias', () => ({
  useConvocatorias: () => mockUseConvocatorias
}))

// Wrapper para tests con contexto
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>
    <AuthProvider>
      {children}
    </AuthProvider>
  </BrowserRouter>
)

describe('Dashboard Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders dashboard correctly for authenticated user', async () => {
    render(<Dashboard />, { wrapper: TestWrapper })
    
    // Verificar que se muestra el título del dashboard
    expect(screen.getByText(/Dashboard/i)).toBeInTheDocument()
    
    // Verificar que se muestran las convocatorias
    await waitFor(() => {
      expect(screen.getByText('CORFO Innovación 2025')).toBeInTheDocument()
      expect(screen.getByText('FONDECYT Regular 2025')).toBeInTheDocument()
    })
  })

  it('displays user information correctly', () => {
    render(<Dashboard />, { wrapper: TestWrapper })
    
    // Verificar información del usuario
    expect(screen.getByText(mockUser.email)).toBeInTheDocument()
  })

  it('shows loading state when convocatorias are loading', () => {
    // Mock loading state
    mockUseConvocatorias.loading = true
    mockUseConvocatorias.convocatorias = []
    
    render(<Dashboard />, { wrapper: TestWrapper })
    
    // Verificar indicador de carga
    expect(screen.getByTestId('loader-icon')).toBeInTheDocument()
  })

  it('displays empty state when no convocatorias exist', () => {
    // Mock empty state
    mockUseConvocatorias.loading = false
    mockUseConvocatorias.convocatorias = []
    
    render(<Dashboard />, { wrapper: TestWrapper })
    
    // Verificar mensaje de estado vacío
    expect(screen.getByText(/No tienes convocatorias/i)).toBeInTheDocument()
  })

  it('handles search functionality', async () => {
    render(<Dashboard />, { wrapper: TestWrapper })
    
    // Encontrar input de búsqueda
    const searchInput = screen.getByPlaceholderText(/Buscar convocatorias/i)
    
    // Simular búsqueda
    fireEvent.change(searchInput, { target: { value: 'CORFO' } })
    
    await waitFor(() => {
      // Verificar que la búsqueda se aplicó
      expect(searchInput.value).toBe('CORFO')
    })
  })

  it('handles filter functionality', async () => {
    render(<Dashboard />, { wrapper: TestWrapper })
    
    // Encontrar filtro por institución
    const filterSelect = screen.getByRole('combobox', { name: /filtrar por institución/i })
    
    // Aplicar filtro
    fireEvent.change(filterSelect, { target: { value: 'CORFO' } })
    
    await waitFor(() => {
      expect(filterSelect.value).toBe('CORFO')
    })
  })

  it('handles add new convocatoria action', async () => {
    render(<Dashboard />, { wrapper: TestWrapper })
    
    // Encontrar botón de agregar
    const addButton = screen.getByText(/Agregar Convocatoria/i)
    
    // Hacer clic en agregar
    fireEvent.click(addButton)
    
    // Verificar que se abre el modal/formulario
    await waitFor(() => {
      expect(screen.getByText(/Nueva Convocatoria/i)).toBeInTheDocument()
    })
  })

  it('displays convocatoria cards with correct information', () => {
    render(<Dashboard />, { wrapper: TestWrapper })
    
    // Verificar información de las convocatorias
    const firstCard = screen.getByText('CORFO Innovación 2025').closest('.convocatoria-card')
    expect(firstCard).toBeInTheDocument()
    
    // Verificar institución
    expect(screen.getByText('CORFO')).toBeInTheDocument()
    expect(screen.getByText('ANID')).toBeInTheDocument()
  })

  it('handles convocatoria actions (edit, delete)', async () => {
    render(<Dashboard />, { wrapper: TestWrapper })
    
    // Encontrar botones de acción
    const editButtons = screen.getAllByTestId('edit-icon')
    const deleteButtons = screen.getAllByTestId('trash-icon')
    
    expect(editButtons).toHaveLength(2)
    expect(deleteButtons).toHaveLength(2)
    
    // Probar edición
    fireEvent.click(editButtons[0])
    
    await waitFor(() => {
      expect(screen.getByText(/Editar Convocatoria/i)).toBeInTheDocument()
    })
  })

  it('shows statistics correctly', () => {
    render(<Dashboard />, { wrapper: TestWrapper })
    
    // Verificar estadísticas
    expect(screen.getByText('2')).toBeInTheDocument() // Total convocatorias
    expect(screen.getByText(/Total de Convocatorias/i)).toBeInTheDocument()
  })

  it('handles error states gracefully', () => {
    // Mock error state
    mockUseConvocatorias.error = 'Error loading convocatorias'
    mockUseConvocatorias.loading = false
    mockUseConvocatorias.convocatorias = []
    
    render(<Dashboard />, { wrapper: TestWrapper })
    
    // Verificar mensaje de error
    expect(screen.getByText(/Error loading convocatorias/i)).toBeInTheDocument()
  })
})