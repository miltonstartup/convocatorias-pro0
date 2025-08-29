import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function ConvocatoriaDetailPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Detalle de Convocatoria</CardTitle>
          <CardDescription>
            Esta funcionalidad estará disponible próximamente
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Aquí podrás ver todos los detalles de la convocatoria, incluyendo:
          </p>
          <ul className="list-disc list-inside mt-4 space-y-1 text-muted-foreground">
            <li>Información completa de la convocatoria</li>
            <li>Fechas importantes y recordatorios</li>
            <li>Estado de tu postulación</li>
            <li>Documentos requeridos</li>
            <li>Historial de cambios</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}