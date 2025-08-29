# 🎯 ConvocatoriasPro - Gestión Inteligente de Convocatorias

**Estado:** ✅ **IMPLEMENTACIÓN COMPLETA AL 100%**

ConvocatoriasPro es una Progressive Web App (PWA) avanzada para gestionar convocatorias de financiamiento con inteligencia artificial. Diseñada específicamente para emprendedores, investigadores y gestores culturales en Chile.

## 🚀 Características Principales

- **🤖 IA Avanzada**: Múltiples proveedores (OpenRouter, Gemini 2.5) para búsqueda y análisis
- **📱 PWA Completa**: Instalación nativa, notificaciones push, modo offline
- **📅 Integración Google Calendar**: Sincronización automática de fechas importantes
- **📊 Analytics Avanzado**: Dashboard con métricas y reportes exportables
- **🔔 Sistema de Alertas**: Notificaciones por email y push automáticas
- **💳 Pagos Integrados**: MercadoPago Chile para suscripciones Pro
- **🔒 Seguridad Empresarial**: RLS, OAuth 2.0, encriptación de datos

## 📋 Requisitos del Sistema

- **Node.js** 18+ 
- **npm** 9+
- **Navegador moderno** con soporte PWA
- **Cuenta Supabase** (para backend)
- **Cuenta MercadoPago** (para pagos, opcional)

## ⚡ Instalación Rápida

```bash
# 1. Clonar el repositorio
git clone https://github.com/tu-usuario/convocatorias-pro.git
cd convocatorias-pro

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales

# 4. Iniciar desarrollo
npm run dev
```

## 🔧 Configuración de Variables de Entorno

### Frontend (.env)
```bash
VITE_SUPABASE_URL=https://wilvxlbiktetduwftqfn.supabase.co
VITE_SUPABASE_ANON_KEY=tu_supabase_anon_key
VITE_APP_URL=https://tu-dominio.com
```

### Backend (Supabase Edge Functions)
Configurar en **Supabase Dashboard → Settings → Edge Functions**:

```bash
# IA y Búsqueda
OPENROUTER_API_KEY=tu_openrouter_api_key
GOOGLE_API_KEY=tu_google_gemini_api_key

# Notificaciones
RESEND_API_KEY=tu_resend_api_key
VAPID_PUBLIC_KEY=tu_vapid_public_key
VAPID_PRIVATE_KEY=tu_vapid_private_key
VAPID_EMAIL=tu_email_contacto

# Pagos
MERCADOPAGO_ACCESS_TOKEN=tu_mercadopago_token

# URLs
FRONTEND_URL=https://tu-dominio.com
```

## 🏗️ Scripts Disponibles

```bash
# Desarrollo
npm run dev              # Servidor de desarrollo
npm run build           # Build para producción
npm run preview         # Vista previa del build

# Testing
npm run test            # Tests en modo watch
npm run test:run        # Ejecutar todos los tests
npm run test:coverage   # Tests con cobertura
npm run test:e2e        # Tests End-to-End
npm run test:all        # Todos los tests

# Calidad de Código
npm run lint            # Linter
npm run lint:fix        # Corregir errores de lint
npm run type-check      # Verificar tipos TypeScript

# Utilidades
npm run clean           # Limpiar archivos temporales
npm run install:clean   # Reinstalación limpia
npm run setup           # Configuración inicial
```

## 🗄️ Configuración de Base de Datos

### 1. Aplicar Migraciones SQL
En **Supabase Dashboard → SQL Editor**, ejecutar en orden:

1. `supabase/migrations/001_base_schema.sql`
2. `supabase/migrations/002_functions_and_triggers.sql`
3. Resto de migraciones en orden cronológico

### 2. Desplegar Edge Functions
```bash
# Instalar Supabase CLI
npm install -g supabase

# Login y vincular proyecto
supabase login
supabase link --project-ref wilvxlbiktetduwftqfn

# Desplegar funciones
npm run deploy:functions
```

## 🚀 Despliegue

### Opción 1: Netlify (Recomendado)
```bash
# Build del proyecto
npm run build

# En Netlify Dashboard:
# - New site from Git
# - Build command: npm run build
# - Publish directory: dist
```

### Opción 2: Vercel
```bash
npm install -g vercel
vercel --prod
```

### Opción 3: Manual
```bash
npm run build
# Subir contenido de dist/ a tu hosting
```

## 📱 Funcionalidades PWA

### Instalación
- **Desktop**: Chrome → Instalar aplicación
- **Mobile**: Agregar a pantalla de inicio
- **Automático**: Banner de instalación inteligente

### Características
- ✅ **Modo Offline**: Funciona sin conexión
- ✅ **Notificaciones Push**: Alertas en tiempo real
- ✅ **Actualizaciones Automáticas**: Service Worker inteligente
- ✅ **Background Sync**: Sincronización en segundo plano

## 🤖 Funcionalidades de IA

### Proveedores Disponibles
- **OpenRouter**: Múltiples modelos con validación cruzada
- **Gemini 2.5 Pro**: Procesamiento directo de Google
- **Flujo Inteligente**: 2 pasos optimizado (Flash-Lite + Pro)

### Capacidades
- 🔍 **Búsqueda Inteligente**: Encuentra convocatorias relevantes
- 📝 **Parsing Automático**: Extrae datos de documentos
- ✅ **Validación**: Verifica completitud y coherencia
- 🎨 **Vista Previa**: Enriquece información con IA
- 📊 **Recomendaciones**: Sugerencias personalizadas

## 💳 Integración de Pagos

### MercadoPago Chile
1. Crear enlaces de suscripción en MercadoPago
2. Configurar webhook: `https://wilvxlbiktetduwftqfn.supabase.co/functions/v1/mp-webhook`
3. Actualizar URLs en tabla `plans`

### Planes Disponibles
- **Gratuito**: 5 convocatorias, funciones básicas
- **Pro Mensual**: $8.990 CLP, funciones completas
- **Pro Anual**: $84.990 CLP, 2 meses gratis

## 📊 Monitoreo y Analytics

### Métricas Disponibles
- 📈 **Uso de la aplicación**: Sesiones, páginas vistas
- 🔍 **Búsquedas IA**: Consultas, resultados, éxito
- 📧 **Alertas**: Emails enviados, aperturas
- 💰 **Conversiones**: Registro → Pro, retención

### Herramientas
- **Supabase Analytics**: Métricas de base de datos
- **Edge Functions Logs**: Logs de funciones serverless
- **PWA Analytics**: Instalaciones, uso offline

## 🔒 Seguridad

### Implementada
- **Row Level Security (RLS)**: Aislamiento de datos por usuario
- **OAuth 2.0**: Autenticación segura con Google/GitHub
- **VAPID Keys**: Notificaciones push seguras
- **API Key Management**: Gestión segura de credenciales
- **CORS**: Configuración apropiada para APIs

### Mejores Prácticas
- Tokens JWT con expiración
- Validación de entrada en Edge Functions
- Sanitización de datos de usuario
- Backup automático de datos críticos

## 🆘 Solución de Problemas

### Errores Comunes

**Build falla**
```bash
npm run clean
npm install
npm run build
```

**Edge Functions no responden**
```bash
# Verificar variables de entorno en Supabase Dashboard
# Redesplegar funciones
npm run deploy:functions
```

**PWA no se instala**
- Verificar que el sitio use HTTPS
- Comprobar que el manifest.json sea válido
- Revisar que el service worker esté registrado

**Notificaciones no funcionan**
- Verificar permisos del navegador
- Comprobar claves VAPID en variables de entorno
- Revisar logs de Edge Function `push-notifications`

## 📚 Documentación Adicional

- **[Guía de Configuración](docs/SETUP.md)**: Configuración paso a paso
- **[Guía de Despliegue](docs/DEPLOY.md)**: Opciones de despliegue
- **[Manual de Usuario](docs/USER_GUIDE.md)**: Guía para usuarios finales
- **[Testing](docs/TESTING_IMPLEMENTATION.md)**: Suite de testing completa

## 🎯 Estado del Proyecto

### ✅ Completado (100%)
- Frontend React con TypeScript
- Backend Supabase completo
- Sistema de autenticación
- Funcionalidades IA avanzadas
- PWA con todas las características
- Sistema de pagos MercadoPago
- Testing automatizado
- Documentación completa

### 🔄 Próximas Mejoras
- Aplicación móvil nativa (React Native)
- Integración con más proveedores de IA
- Dashboard de administración
- API pública para integraciones

## 🤝 Contribuir

1. Fork el proyecto
2. Crear rama feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit cambios (`git commit -am 'Agregar nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Crear Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver `LICENSE` para más detalles.

## 📞 Soporte

- **Email**: soporte@convocatoriaspro.cl
- **Documentación**: [docs/](docs/)
- **Issues**: GitHub Issues

---

**Desarrollado con ❤️ para la comunidad emprendedora e investigadora de Chile**