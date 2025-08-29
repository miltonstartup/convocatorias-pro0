# 🛠️ ConvocatoriasPro - Guía de Configuración

Esta guía te ayudará a configurar ConvocatoriasPro desde cero en tu entorno local y en producción.

## 📋 Requisitos Previos

- **Node.js** 18+ y **npm** 9+
- **Cuenta Supabase** (gratuita)
- **Navegador moderno** con soporte PWA
- **Cuenta OpenRouter** (para IA - opcional)
- **Cuenta Google Cloud** (para Gemini API - opcional)
- **Cuenta MercadoPago** (para pagos - opcional)

## 🚀 Configuración Local

### 1. Clonar y Configurar Proyecto

```bash
# Clonar repositorio
git clone https://github.com/tu-usuario/convocatorias-pro.git
cd convocatorias-pro

# Instalar dependencias
npm install

# Copiar archivo de configuración
cp .env.example .env
```

### 2. Configurar Variables de Entorno Frontend

Edita el archivo `.env` con tus credenciales:

```bash
# Supabase (Obligatorio)
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu_clave_anonima_aqui

# Aplicación
VITE_APP_URL=http://localhost:5173
```

### 3. Configurar Supabase

#### A. Crear Proyecto Supabase
1. Ve a [supabase.com](https://supabase.com)
2. Crear nuevo proyecto
3. Copiar URL y claves del proyecto

#### B. Aplicar Migraciones de Base de Datos
En **Supabase Dashboard → SQL Editor**, ejecutar en orden:

1. `supabase/migrations/001_base_schema.sql`
2. `supabase/migrations/002_functions_and_triggers.sql`
3. Resto de migraciones en orden cronológico

#### C. Configurar Variables de Entorno Backend
En **Supabase Dashboard → Settings → Edge Functions**, agregar:

```bash
# IA y Búsqueda
OPENROUTER_API_KEY=tu_clave_openrouter
GOOGLE_API_KEY=tu_clave_google_gemini

# Notificaciones
RESEND_API_KEY=tu_clave_resend
VAPID_PUBLIC_KEY=tu_clave_vapid_publica
VAPID_PRIVATE_KEY=tu_clave_vapid_privada
VAPID_EMAIL=tu_email_contacto

# Pagos (Opcional)
MERCADOPAGO_ACCESS_TOKEN=tu_token_mercadopago

# URLs
FRONTEND_URL=http://localhost:5173
```

### 4. Desplegar Edge Functions

```bash
# Instalar Supabase CLI
npm install -g supabase

# Login y vincular proyecto
supabase login
supabase link --project-ref tu_project_ref

# Desplegar funciones principales
supabase functions deploy parse-content
supabase functions deploy validate-convocatoria
supabase functions deploy enhance-preview
supabase functions deploy track-suggestions
supabase functions deploy get-recommendations
supabase functions deploy push-notifications
supabase functions deploy send-email-alerts
```

### 5. Iniciar Desarrollo

```bash
npm run dev
```

## 🌐 Configuración de Producción

### 1. Despliegue Frontend

#### Opción A: Netlify (Recomendado)
```bash
# Build del proyecto
npm run build

# En Netlify Dashboard:
# - New site from Git
# - Build command: npm run build
# - Publish directory: dist
# - Environment variables: Copiar desde .env
```

#### Opción B: Vercel
```bash
npm install -g vercel
vercel --prod
```

### 2. Configurar Servicios Externos

#### A. OpenRouter (IA)
1. Registrarse en [openrouter.ai](https://openrouter.ai)
2. Obtener API key gratuita
3. Configurar en variables de entorno

#### B. Google Gemini (IA)
1. Crear proyecto en [Google Cloud Console](https://console.cloud.google.com)
2. Habilitar Generative AI API
3. Crear API key
4. Configurar en variables de entorno

#### C. Resend (Emails)
1. Registrarse en [resend.com](https://resend.com)
2. Verificar dominio de envío
3. Obtener API key
4. Configurar en variables de entorno

#### D. MercadoPago (Pagos)
1. Crear cuenta en [mercadopago.cl](https://mercadopago.cl)
2. Obtener credenciales de producción
3. Crear enlaces de suscripción
4. Configurar webhook: `https://tu-proyecto.supabase.co/functions/v1/mp-webhook`

### 3. Configurar PWA

#### A. Generar Claves VAPID
```bash
# Usar herramienta online o generar con Node.js
npx web-push generate-vapid-keys
```

#### B. Configurar Notificaciones Push
1. Agregar claves VAPID a variables de entorno
2. Configurar dominio en service worker
3. Probar notificaciones en desarrollo

## 🔧 Configuraciones Avanzadas

### 1. Google Calendar Integration

```bash
# Variables adicionales para Google Calendar
GOOGLE_CLIENT_ID=tu_client_id_oauth
GOOGLE_CLIENT_SECRET=tu_client_secret_oauth
```

### 2. Analytics y Monitoreo

```bash
# Configuración opcional para analytics
ENABLE_SOURCE_VALIDATION=true
VALIDATION_MAX_CONCURRENT=3
VALIDATION_TIMEOUT_SECONDS=10
```

### 3. Configuración de Seguridad

```bash
# Configuración de CORS y seguridad
ALLOWED_ORIGINS=https://tu-dominio.com,http://localhost:5173
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW=3600
```

## 🧪 Testing y Validación

### 1. Tests Locales
```bash
# Tests unitarios
npm run test

# Tests E2E
npm run test:e2e

# Cobertura
npm run test:coverage
```

### 2. Validar Configuración
```bash
# Verificar variables de entorno
npm run check:env

# Probar Edge Functions
npm run test:functions

# Validar PWA
npm run test:pwa
```

## 🆘 Solución de Problemas

### Error: "Missing environment variables"
- Verificar que todas las variables estén configuradas
- Comprobar sintaxis en archivos .env
- Reiniciar servidor de desarrollo

### Error: "Edge Function not found"
- Verificar que las funciones estén desplegadas
- Comprobar nombres de funciones en código
- Revisar logs en Supabase Dashboard

### Error: "PWA not installing"
- Verificar que el sitio use HTTPS
- Comprobar manifest.json válido
- Revisar service worker registrado

### Error: "Notifications not working"
- Verificar permisos del navegador
- Comprobar claves VAPID configuradas
- Revisar logs de push notifications

## 📚 Recursos Adicionales

- **[Documentación Supabase](https://supabase.com/docs)**
- **[Guía PWA](https://web.dev/progressive-web-apps/)**
- **[OpenRouter API](https://openrouter.ai/docs)**
- **[Google Gemini API](https://ai.google.dev/docs)**
- **[MercadoPago API](https://www.mercadopago.cl/developers)**

## 🤝 Soporte

Si necesitas ayuda:
1. Revisar esta documentación
2. Consultar logs en Supabase Dashboard
3. Crear issue en GitHub
4. Contactar soporte: soporte@convocatoriaspro.cl

---

**¡Tu aplicación ConvocatoriasPro estará lista para usar!** 🎉