// Modal para configuración de alertas
import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Bell, Save } from 'lucide-react'
import { useAdvancedFeatures } from '@/hooks/useAdvanced'
import { toast } from 'sonner'

interface AlertConfigModalProps {
  isOpen: boolean
  onClose: () => void
  convocatoriaId?: string
  convocatoriaTitle?: string
}

export function AlertConfigModal({ 
  isOpen, 
  onClose, 
  convocatoriaId, 
  convocatoriaTitle 
}: AlertConfigModalProps) {
  const [alertType, setAlertType] = useState<string>('email')
  const [daysBeforeDeadline, setDaysBeforeDeadline] = useState<number>(7)
  const { configureAlert, isConfiguringAlert } = useAdvancedFeatures()
  
  const handleSaveAlert = async () => {
    if (!convocatoriaId) {
      toast.error('Error: ID de convocatoria no válido')
      return
    }
    
    try {
      await configureAlert({
        convocatoriaId,
        alertType,
        daysBeforeDeadline
      })
      
      toast.success('Alerta configurada correctamente', {
        description: `Recibirás una notificación ${daysBeforeDeadline} días antes del cierre`
      })
      
      onClose()
    } catch (error) {
      console.error('Error al configurar alerta:', error)
    }
  }
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Configurar Alerta
          </DialogTitle>
          <DialogDescription>
            {convocatoriaTitle ? (
              <>Configurar recordatorio para: <strong>{convocatoriaTitle}</strong></>
            ) : (
              'Configurar un recordatorio personalizado'
            )}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 mt-6">
          <div className="space-y-2">
            <Label htmlFor="alert-type">Tipo de Alerta</Label>
            <Select value={alertType} onValueChange={setAlertType}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="email">📧 Email</SelectItem>
                <SelectItem value="browser">🔔 Notificación del navegador</SelectItem>
                <SelectItem value="both">📧🔔 Email + Navegador</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="days-before">Días antes del cierre</Label>
            <Select 
              value={daysBeforeDeadline.toString()} 
              onValueChange={(value) => setDaysBeforeDeadline(parseInt(value))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 día antes</SelectItem>
                <SelectItem value="3">3 días antes</SelectItem>
                <SelectItem value="7">1 semana antes</SelectItem>
                <SelectItem value="14">2 semanas antes</SelectItem>
                <SelectItem value="30">1 mes antes</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="p-4 rounded-lg bg-muted/50 border">
            <div className="text-sm">
              <strong>Resumen:</strong> Recibirás una {alertType} {daysBeforeDeadline} días antes de la fecha límite.
            </div>
          </div>
        </div>
        
        <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={isConfiguringAlert}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSaveAlert}
            disabled={isConfiguringAlert}
            className="gap-2"
          >
            <Save className="w-4 h-4" />
            {isConfiguringAlert ? 'Guardando...' : 'Guardar Alerta'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
