import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useConvocatorias } from '@/hooks/useConvocatorias'
import { usePlans } from '@/hooks/usePlans'
import { ConvocatoriaForm } from '@/types'
import { ArrowLeft, Save, Loader2 } from 'lucide-react'
import { Link } from 'react-router-dom'

const convocatoriaSchema = z.object({
  nombre_concurso: z.string().min(1, 'El nombre es requerido'),
  institucion: z.string().min(1, 'La institución es requerida'),
  fecha_apertura: z.string().optional(),
  fecha_cierre: z.string().min(1, 'La fecha de cierre es requerida'),
  fecha_resultados: z.string().optional(),
  estado: z.enum(['abierto', 'cerrado', 'en_evaluacion', 'finalizado']),
  tipo_fondo: z.string().min(1, 'El tipo de fondo es requerido'),
  area: z.string().min(1, 'El área es requerida'),
  requisitos: z.string().optional(),
  fuente: z.string().url('Debe ser una URL válida').optional().or(z.literal('')),
  monto_financiamiento: z.string().optional(),
  notas_usuario: z.string().optional()
})

export function ConvocatoriaNewPage() {
  const [loading, setLoading] = useState(false)
  const { createConvocatoria } = useConvocatorias()
  const { hasReachedLimit, isProPlan, isTrialActive } = usePlans()
  const navigate = useNavigate()
  
  const canCreate = isProPlan() || isTrialActive() || !hasReachedLimit(0)

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors }
  } = useForm<ConvocatoriaForm>({
    resolver: zodResolver(convocatoriaSchema),
    defaultValues: {
      estado: 'abierto'
    }
  })

  if (!canCreate) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <Card>
          <CardHeader>
            <CardTitle>Límite Alcanzado</CardTitle>
            <CardDescription>
              Has alcanzado el límite de convocatorias del plan gratuito
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Actualiza a Pro para crear convocatorias ilimitadas y acceder a funciones avanzadas con IA
            </p>
            <div className="flex gap-2 justify-center">
              <Button asChild>
                <Link to="/plans">
                  Ver Planes Pro
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/app/dashboard">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Volver al Dashboard
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const onSubmit = async (data: ConvocatoriaForm) => {
    try {
      setLoading(true)
      await createConvocatoria(data)
      toast.success('Convocatoria creada exitosamente')
      navigate('/app/dashboard')
    } catch (error: any) {
      toast.error('Error al crear convocatoria: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/app/dashboard">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Nueva Convocatoria</h1>
          <p className="text-muted-foreground">
            Agrega una nueva convocatoria de financiamiento
          </p>
        </div>
      </div>

      {/* Formulario */}
      <Card>
        <CardHeader>
          <CardTitle>Información de la Convocatoria</CardTitle>
          <CardDescription>
            Completa los datos de la convocatoria de financiamiento
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Información básica */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="nombre_concurso">Nombre del Concurso *</Label>
                <Input
                  id="nombre_concurso"
                  {...register('nombre_concurso')}
                  placeholder="Ej: Fondo de Emprendimiento e Innovación 2025"
                  disabled={loading}
                />
                {errors.nombre_concurso && (
                  <p className="text-sm text-destructive mt-1">{errors.nombre_concurso.message}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="institucion">Institución *</Label>
                  <Input
                    id="institucion"
                    {...register('institucion')}
                    placeholder="Ej: CORFO, SERCOTEC, Fondos de Cultura"
                    disabled={loading}
                  />
                  {errors.institucion && (
                    <p className="text-sm text-destructive mt-1">{errors.institucion.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="tipo_fondo">Tipo de Fondo *</Label>
                  <Input
                    id="tipo_fondo"
                    {...register('tipo_fondo')}
                    placeholder="Ej: Emprendimiento, Innovación, Cultura"
                    disabled={loading}
                  />
                  {errors.tipo_fondo && (
                    <p className="text-sm text-destructive mt-1">{errors.tipo_fondo.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="area">Área *</Label>
                  <Input
                    id="area"
                    {...register('area')}
                    placeholder="Ej: Tecnología, Arte, Ciencias"
                    disabled={loading}
                  />
                  {errors.area && (
                    <p className="text-sm text-destructive mt-1">{errors.area.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="monto_financiamiento">Monto de Financiamiento</Label>
                  <Input
                    id="monto_financiamiento"
                    {...register('monto_financiamiento')}
                    placeholder="Ej: Hasta $50.000.000 CLP"
                    disabled={loading}
                  />
                </div>
              </div>
            </div>

            {/* Fechas */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Fechas Importantes</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="fecha_apertura">Fecha de Apertura</Label>
                  <Input
                    id="fecha_apertura"
                    type="date"
                    {...register('fecha_apertura')}
                    disabled={loading}
                  />
                </div>

                <div>
                  <Label htmlFor="fecha_cierre">Fecha de Cierre *</Label>
                  <Input
                    id="fecha_cierre"
                    type="date"
                    {...register('fecha_cierre')}
                    disabled={loading}
                  />
                  {errors.fecha_cierre && (
                    <p className="text-sm text-destructive mt-1">{errors.fecha_cierre.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="fecha_resultados">Fecha de Resultados</Label>
                  <Input
                    id="fecha_resultados"
                    type="date"
                    {...register('fecha_resultados')}
                    disabled={loading}
                  />
                </div>
              </div>
            </div>

            {/* Estado y enlaces */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="estado">Estado</Label>
                  <Select onValueChange={(value) => setValue('estado', value as any)} defaultValue="abierto">
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona el estado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="abierto">Abierto</SelectItem>
                      <SelectItem value="cerrado">Cerrado</SelectItem>
                      <SelectItem value="en_evaluacion">En Evaluación</SelectItem>
                      <SelectItem value="finalizado">Finalizado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="fuente">Enlace de la Fuente</Label>
                  <Input
                    id="fuente"
                    type="url"
                    {...register('fuente')}
                    placeholder="https://www.corfo.cl/convocatoria..."
                    disabled={loading}
                  />
                  {errors.fuente && (
                    <p className="text-sm text-destructive mt-1">{errors.fuente.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Notas y requisitos */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="requisitos">Requisitos Principales</Label>
                <Textarea
                  id="requisitos"
                  {...register('requisitos')}
                  placeholder="Describe los requisitos principales de la convocatoria..."
                  rows={3}
                  disabled={loading}
                />
              </div>

              <div>
                <Label htmlFor="notas_usuario">Notas Personales</Label>
                <Textarea
                  id="notas_usuario"
                  {...register('notas_usuario')}
                  placeholder="Agrega tus notas, observaciones o recordatorios..."
                  rows={3}
                  disabled={loading}
                />
              </div>
            </div>

            {/* Botones */}
            <div className="flex gap-4 pt-4">
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creando...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Crear Convocatoria
                  </>
                )}
              </Button>
              
              <Button type="button" variant="outline" asChild>
                <Link to="/app/dashboard">
                  Cancelar
                </Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}