import { useState } from 'react'
import { Search, Filter, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { DashboardFilters as Filters } from '@/types'

interface DashboardFiltersProps {
  filters: Filters
  onFiltersChange: (filters: Filters) => void
  onSearch: (search: string) => void
}

const ESTADOS = [
  { value: 'todos', label: 'Todos los estados' },
  { value: 'abierto', label: 'Abierto' },
  { value: 'cerrado', label: 'Cerrado' },
  { value: 'en_evaluacion', label: 'En Evaluación' },
  { value: 'finalizado', label: 'Finalizado' }
]

const INSTITUCIONES = [
  'CORFO',
  'SERCOTEC',
  'Fondos de Cultura',
  'ANID',
  'FIA',
  'FOSIS',
  'CNCA',
  'FONDART'
]

const TIPOS_FONDO = [
  'Emprendimiento',
  'Innovación',
  'Cultura',
  'Investigación',
  'Tecnología',
  'Desarrollo Social',
  'Exportación',
  'Turismo'
]

export function DashboardFilters({ filters, onFiltersChange, onSearch }: DashboardFiltersProps) {
  const [searchValue, setSearchValue] = useState(filters.search || '')

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSearch(searchValue)
  }

  const handleFilterChange = (key: keyof Filters, value: string) => {
    onFiltersChange({
      ...filters,
      [key]: value === 'todos' ? undefined : value
    })
  }

  const clearFilters = () => {
    setSearchValue('')
    onFiltersChange({})
    onSearch('')
  }

  const activeFiltersCount = Object.values(filters).filter(Boolean).length

  return (
    <div className="space-y-4">
      {/* Barra de búsqueda */}
      <form onSubmit={handleSearchSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Buscar por nombre, institución..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button type="submit">
          Buscar
        </Button>
      </form>

      {/* Filtros rápidos */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-sm font-medium text-muted-foreground mr-2">
          Filtros:
        </span>
        
        {/* Filtro por Estado */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Filter className="mr-2 h-4 w-4" />
              Estado
              {filters.estado && (
                <Badge variant="secondary" className="ml-2">
                  {ESTADOS.find(e => e.value === filters.estado)?.label}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {ESTADOS.map((estado) => (
              <DropdownMenuItem
                key={estado.value}
                onClick={() => handleFilterChange('estado', estado.value)}
              >
                {estado.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Filtro por Institución */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              Institución
              {filters.institucion && (
                <Badge variant="secondary" className="ml-2">
                  {filters.institucion}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem
              onClick={() => handleFilterChange('institucion', 'todos')}
            >
              Todas las instituciones
            </DropdownMenuItem>
            {INSTITUCIONES.map((institucion) => (
              <DropdownMenuItem
                key={institucion}
                onClick={() => handleFilterChange('institucion', institucion)}
              >
                {institucion}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Filtro por Tipo de Fondo */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              Tipo de Fondo
              {filters.tipo_fondo && (
                <Badge variant="secondary" className="ml-2">
                  {filters.tipo_fondo}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem
              onClick={() => handleFilterChange('tipo_fondo', 'todos')}
            >
              Todos los tipos
            </DropdownMenuItem>
            {TIPOS_FONDO.map((tipo) => (
              <DropdownMenuItem
                key={tipo}
                onClick={() => handleFilterChange('tipo_fondo', tipo)}
              >
                {tipo}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Limpiar filtros */}
        {activeFiltersCount > 0 && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={clearFilters}
            className="text-muted-foreground"
          >
            <X className="mr-1 h-4 w-4" />
            Limpiar ({activeFiltersCount})
          </Button>
        )}
      </div>
    </div>
  )
}