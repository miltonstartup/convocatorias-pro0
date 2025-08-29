# Configuración de Backend Supabase - Convocatorias Pro

## 🚀 Guía de Despliegue Completo

### 1. Configuración de Variables de Entorno

En tu proyecto de Supabase, ve a **Settings > Environment Variables** y añade:

```bash
# OpenRouter API para agentes IA
OPENROUTER_API_KEY=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

# MercadoPago Chile (obtener desde tu cuenta)
MERCADOPAGO_ACCESS_TOKEN=tu_access_token_de_mercadopago
```

### 2. Aplicar Migraciones de Base de Datos

En **Supabase Dashboard > SQL Editor**, ejecuta en este orden:

1. **001_base_schema.sql** - Esquema base de tablas
2. **002_functions_and_triggers.sql** - Funciones y triggers

### 3. Desplegar Edge Functions

Usando Supabase CLI:

```bash
# Instalar Supabase CLI si no lo tienes
npm i supabase --save-dev

# Login
supabase login

# Vincular tu proyecto
supabase link --project-ref zkqdieifjrodriepjldn

# Desplegar todas las funciones
supabase functions deploy parse-content
supabase functions deploy validate-convocatoria  
supabase functions deploy enhance-preview
supabase functions deploy track-suggestions
supabase functions deploy get-recommendations
supabase functions deploy mp-webhook
```

### 4. Configurar Planes de MercadoPago

#### Paso 1: Crear Enlaces de Suscripción

1. Ve a **MercadoPago > Suscripciones**
2. Crea un plan mensual: **$8.990 CLP**
3. Crea un plan anual: **$84.990 CLP**
4. Copia las URLs de checkout

#### Paso 2: Actualizar Enlaces en Base de Datos

Ejecuta en **SQL Editor**:

```sql
-- Actualizar enlaces de MercadoPago
UPDATE plans SET mp_checkout_url = 'https://link.mercadopago.cl/tu_enlace_mensual' 
WHERE id = 'pro_monthly';

UPDATE plans SET mp_checkout_url = 'https://link.mercadopago.cl/tu_enlace_anual' 
WHERE id = 'pro_annual';
```

### 5. Configurar Webhook de MercadoPago

1. Ve a **MercadoPago > Webhooks**
2. Añade endpoint: `https://zkqdieifjrodriepjldn.supabase.co/functions/v1/mp-webhook`
3. Selecciona eventos: `payment`

### 6. Verificar Despliegue

#### Endpoints Disponibles:

- `POST /functions/v1/parse-content` - Procesar archivos/clipboard
- `POST /functions/v1/validate-convocatoria` - Validar completitud
- `POST /functions/v1/enhance-preview` - Mejorar vista previa
- `GET /functions/v1/track-suggestions` - Obtener sugerencias
- `GET /functions/v1/get-recommendations` - Recomendaciones personalizadas
- `POST /functions/v1/mp-webhook` - Webhook MercadoPago

#### Test de Funcionalidad:

```bash
# Test de autenticación y agentes IA
curl -X POST 'https://zkqdieifjrodriepjldn.supabase.co/functions/v1/track-suggestions' \
  -H 'Authorization: Bearer tu_access_token' \
  -H 'Content-Type: application/json'
```

### 7. Actualización del Frontend

El frontend en https://5e9q2suaukyp.space.minimax.io ya está configurado para usar estos endpoints. Una vez desplegado el backend, las funcionalidades estarán disponibles automáticamente.

### 8. Monitoreo y Logs

- **Supabase > Logs > Edge Functions** - Logs de las funciones
- **Supabase > Database > Logs** - Logs de la base de datos
- **MercadoPago > Integraciones** - Estado de webhooks

## 🔒 Seguridad Implementada

- **Row Level Security (RLS)** en todas las tablas
- **Control de planes** para funcionalidades Premium
- **Validación de tokens** en todas las Edge Functions
- **Límites por plan** (5 convocatorias en plan Free)
- **Webhook seguro** con validación de MercadoPago

## 📊 Funcionalidades Disponibles

### Plan Free:
- Ingreso manual de convocatorias
- Máximo 5 convocatorias
- Vista básica del dashboard

### Plan Pro:
- **Agentes IA completos** (parser, validator, preview, tracker, recommender)
- **Sin límites** de convocatorias
- **Rastreo automático** de nuevas oportunidades
- **Recomendaciones personalizadas**
- **Exportación** de datos

## ⚙️ Troubleshooting

### Error: "Esta funcionalidad requiere plan Pro"
- Verificar que el usuario tenga plan `pro_monthly` o `pro_annual`
- Comprobar que el trigger de sincronización funciona

### Error: "OpenRouter API error"
- Verificar variable `OPENROUTER_API_KEY`
- Comprobar límites de uso de la API

### Error: "MercadoPago webhook failed"
- Verificar variable `MERCADOPAGO_ACCESS_TOKEN`
- Comprobar configuración del webhook en MercadoPago

---

**✅ Estado del Backend:** Listo para despliegue

**🔗 Frontend desplegado:** https://5e9q2suaukyp.space.minimax.io

**💾 Credenciales:** Usar las proporcionadas anteriormente