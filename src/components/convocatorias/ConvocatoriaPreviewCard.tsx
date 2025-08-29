// Componente para mostrar vista previa de convocatorias con edición

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Edit, Save, X } from 'lucide-react'
import { ConvocatoriaData } from '@/services/ai-agents'

interface ConvocatoriaPreviewCardProps {
  convocatoria: ConvocatoriaData
  onEdit: (edited: ConvocatoriaData) => void
}

export function ConvocatoriaPreviewCard({ convocatoria, onEdit }: ConvocatoriaPreviewCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState<ConvocatoriaData>(convocatoria)

  const handleSave = () => {
    onEdit(editData)
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditData(convocatoria)
    setIsEditing(false)
  }

  const getEstadoBadge = (estado?: string) => {
    switch (estado?.toLowerCase()) {
      case 'abierto':
        return <Badge variant="default">Abierto</Badge>
      case 'cerrado':
        return <Badge variant="destructive">Cerrado</Badge>
      case 'en evaluación':
        return <Badge variant="secondary">En Evaluación</Badge>
      default:
        return <Badge variant="outline">{estado || 'Sin estado'}</Badge>
    }
  }

  if (isEditing) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Editar Convocatoria</span>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSave}>
                <Save className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="outline" onClick={handleCancel}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="nombre">Nombre *</Label>
                <Input
                  id="nombre"
                  value={editData.nombre || ''}
                  onChange={(e) => setEditData({ ...editData, nombre: e.target.value })}
                  placeholder="Nombre de la convocatoria"
                />
              </div>
              <div>
                <Label htmlFor="institucion">Institución *</Label>
                <Input
                  id="institucion"
                  value={editData.institucion || ''}
                  onChange={(e) => setEditData({ ...editData, institucion: e.target.value })}
                  placeholder="Institución organizadora"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="fechaApertura">Fecha Apertura</Label>
                <Input
                  id="fechaApertura"
                  type="date"
                  value={editData.fechaApertura || ''}
                  onChange={(e) => setEditData({ ...editData, fechaApertura: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="fechaCierre">Fecha Cierre *</Label>
                <Input
                  id="fechaCierre"
                  type="date"
                  value={editData.fechaCierre || ''}
                  onChange={(e) => setEditData({ ...editData, fechaCierre: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="estado">Estado</Label>
                <Input
                  id="estado"
                  value={editData.estado || ''}
                  onChange={(e) => setEditData({ ...editData, estado: e.target.value })}
                  placeholder="abierto, cerrado, en evaluación"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="monto">Monto</Label>
                <Input
                  id="monto"
                  value={editData.monto || ''}
                  onChange={(e) => setEditData({ ...editData, monto: e.target.value })}
                  placeholder="Monto del financiamiento"
                />
              </div>
              <div>
                <Label htmlFor="contacto">Contacto</Label>
                <Input
                  id="contacto"
                  value={editData.contacto || ''}
                  onChange={(e) => setEditData({ ...editData, contacto: e.target.value })}
                  placeholder="Email o teléfono de contacto"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="descripcion">Descripción</Label>
              <Textarea
                id="descripcion"
                value={editData.descripcion || ''}
                onChange={(e) => setEditData({ ...editData, descripcion: e.target.value })}
                placeholder="Descripción de la convocatoria"
                className="min-h-[80px]"
              />
            </div>

            <div>
              <Label htmlFor="requisitos">Requisitos</Label>
              <Textarea
                id="requisitos"
                value={editData.requisitos || ''}
                onChange={(e) => setEditData({ ...editData, requisitos: e.target.value })}
                placeholder="Requisitos principales"
                className="min-h-[80px]"
              />
            </div>

            <div>
              <Label htmlFor="sitioWeb">Sitio Web</Label>
              <Input
                id="sitioWeb"
                type="url"
                value={editData.sitioWeb || ''}
                onChange={(e) => setEditData({ ...editData, sitioWeb: e.target.value })}
                placeholder="https://..."
              />
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{convocatoria.nombre || 'Sin nombre'}</span>
          <div className="flex items-center gap-2">
            {getEstadoBadge(convocatoria.estado)}
            <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
              <Edit className="h-4 w-4" />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-muted-foreground">Institución:</span>
              <p>{convocatoria.institucion || 'Sin especificar'}</p>
            </div>
            <div>
              <span className="font-medium text-muted-foreground">Monto:</span>
              <p>{convocatoria.monto || 'Sin especificar'}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-muted-foreground">Fecha Apertura:</span>
              <p>{convocatoria.fechaApertura || 'Sin especificar'}</p>
            </div>
            <div>
              <span className="font-medium text-muted-foreground">Fecha Cierre:</span>
              <p className={!convocatoria.fechaCierre ? 'text-red-600' : ''}>
                {convocatoria.fechaCierre || 'Sin especificar (requerido)'}
              </p>
            </div>
          </div>

          {convocatoria.descripcion && (
            <div className="text-sm">
              <span className="font-medium text-muted-foreground">Descripción:</span>
              <p className="mt-1">{convocatoria.descripcion}</p>
            </div>
          )}

          {convocatoria.requisitos && (
            <div className="text-sm">
              <span className="font-medium text-muted-foreground">Requisitos:</span>
              <p className="mt-1">{convocatoria.requisitos}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 text-sm">
            {convocatoria.contacto && (
              <div>
                <span className="font-medium text-muted-foreground">Contacto:</span>
                <p>{convocatoria.contacto}</p>
              </div>
            )}
            {convocatoria.sitioWeb && (
              <div>
                <span className="font-medium text-muted-foreground">Sitio Web:</span>
                <a 
                  href={convocatoria.sitioWeb} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline block truncate"
                >
                  {convocatoria.sitioWeb}
                </a>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}