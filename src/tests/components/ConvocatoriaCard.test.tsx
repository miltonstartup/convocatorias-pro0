import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ConvocatoriaCard from '../components/ConvocatoriaCard'
import { TestUtils } from './setup'

// Props mock
const mockConvocatoria = TestUtils.createMockConvocatoria({
  id: 1,
  nombre_concurso: 'CORFO Innovación Digital 2025',
  institucion: 'CORFO',
  fecha_cierre: '2025-12-31',
  estado: 'abierto',
  monto_financiamiento: '$50.000.000',
  area: 'Tecnología Digital'
})

const mockProps = {
  convocatoria: mockConvocatoria,
  onEdit: vi.fn(),
  onDelete: vi.fn(),
  onView: vi.fn()
}

describe('ConvocatoriaCard Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders convocatoria information correctly', () => {
    render(<ConvocatoriaCard {...mockProps} />)
    
    // Verificar título
    expect(screen.getByText('CORFO Innovación Digital 2025')).toBeInTheDocument()
    
    // Verificar institución
    expect(screen.getByText('CORFO')).toBeInTheDocument()
    
    // Verificar monto
    expect(screen.getByText('$50.000.000')).toBeInTheDocument()
    
    // Verificar área
    expect(screen.getByText('Tecnología Digital')).toBeInTheDocument()
    
    // Verificar estado
    expect(screen.getByText('abierto')).toBeInTheDocument()
  })

  it('displays fecha de cierre correctly formatted', () => {
    render(<ConvocatoriaCard {...mockProps} />)
    
    // Verificar fecha formateada (puede variar según locale)
    expect(screen.getByText(/31.*12.*2025|Dec.*31.*2025/)).toBeInTheDocument()
  })

  it('shows correct status badge color for open convocatoria', () => {
    render(<ConvocatoriaCard {...mockProps} />)
    
    const statusBadge = screen.getByText('abierto').closest('.status-badge')
    expect(statusBadge).toHaveClass('bg-green-100', 'text-green-800')
  })

  it('shows correct status badge color for closed convocatoria', () => {
    const closedConvocatoria = {
      ...mockConvocatoria,
      estado: 'cerrado'
    }
    
    render(<ConvocatoriaCard {...mockProps} convocatoria={closedConvocatoria} />)
    
    const statusBadge = screen.getByText('cerrado').closest('.status-badge')
    expect(statusBadge).toHaveClass('bg-red-100', 'text-red-800')
  })

  it('calls onView when card is clicked', async () => {
    render(<ConvocatoriaCard {...mockProps} />)
    
    const card = screen.getByRole('article')
    fireEvent.click(card)
    
    expect(mockProps.onView).toHaveBeenCalledWith(mockConvocatoria.id)
  })

  it('calls onEdit when edit button is clicked', async () => {
    render(<ConvocatoriaCard {...mockProps} />)
    
    const editButton = screen.getByTestId('edit-icon').closest('button')
    fireEvent.click(editButton!)
    
    expect(mockProps.onEdit).toHaveBeenCalledWith(mockConvocatoria.id)
  })

  it('calls onDelete when delete button is clicked', async () => {
    render(<ConvocatoriaCard {...mockProps} />)
    
    const deleteButton = screen.getByTestId('trash-icon').closest('button')
    fireEvent.click(deleteButton!)
    
    expect(mockProps.onDelete).toHaveBeenCalledWith(mockConvocatoria.id)
  })

  it('prevents event bubbling on action buttons', async () => {
    render(<ConvocatoriaCard {...mockProps} />)
    
    const editButton = screen.getByTestId('edit-icon').closest('button')
    fireEvent.click(editButton!)
    
    // onView no debe ser llamado cuando se hace clic en botones de acción
    expect(mockProps.onView).not.toHaveBeenCalled()
    expect(mockProps.onEdit).toHaveBeenCalledWith(mockConvocatoria.id)
  })

  it('shows days remaining until deadline', () => {
    const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const convocatoriaWithFutureDate = {
      ...mockConvocatoria,
      fecha_cierre: futureDate
    }
    
    render(<ConvocatoriaCard {...mockProps} convocatoria={convocatoriaWithFutureDate} />)
    
    // Verificar que se muestra "quedan X días"
    expect(screen.getByText(/quedan.*días/i)).toBeInTheDocument()
  })

  it('shows overdue status for past deadlines', () => {
    const pastDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const convocatoriaWithPastDate = {
      ...mockConvocatoria,
      fecha_cierre: pastDate,
      estado: 'cerrado'
    }
    
    render(<ConvocatoriaCard {...mockProps} convocatoria={convocatoriaWithPastDate} />)
    
    // Verificar que se muestra como vencida
    expect(screen.getByText(/vencida/i)).toBeInTheDocument()
  })

  it('handles missing optional fields gracefully', () => {
    const incompleteConvocatoria = {
      ...mockConvocatoria,
      monto_financiamiento: null,
      area: null
    }
    
    render(<ConvocatoriaCard {...mockProps} convocatoria={incompleteConvocatoria} />)
    
    // El componente debe renderizar sin errores
    expect(screen.getByText('CORFO Innovación Digital 2025')).toBeInTheDocument()
    expect(screen.getByText('CORFO')).toBeInTheDocument()
  })

  it('is accessible with proper ARIA labels', () => {
    render(<ConvocatoriaCard {...mockProps} />)
    
    // Verificar accesibilidad
    const card = screen.getByRole('article')
    expect(card).toHaveAttribute('aria-label', expect.stringContaining('CORFO Innovación Digital 2025'))
    
    const editButton = screen.getByTestId('edit-icon').closest('button')
    expect(editButton).toHaveAttribute('aria-label', expect.stringContaining('Editar'))
    
    const deleteButton = screen.getByTestId('trash-icon').closest('button')
    expect(deleteButton).toHaveAttribute('aria-label', expect.stringContaining('Eliminar'))
  })
})