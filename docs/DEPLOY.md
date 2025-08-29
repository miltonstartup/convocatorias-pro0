# 🚀 Guía de Despliegue y Configuración Avanzada

## 📋 Lista de Verificación Pre-Deploy

### ✅ Requisitos Técnicos
- [ ] Node.js 18+ instalado
- [ ] pnpm v8+ (recomendado) o npm v9+
- [ ] Cuenta en Supabase configurada
- [ ] Credenciales de MercadoPago Chile
- [ ] Dominio propio (opcional)

### ✅ Configuración de Servicios
- [ ] Base de datos Supabase configurada con `setup-database.sql`
- [ ] RLS policies activadas y funcionando
- [ ] OAuth providers configurados (Google, GitHub)
- [ ] Enlaces de MercadoPago creados
- [ ] Webhooks configurados (recomendado)

---

## 🌐 Opciones de Deploy

### 1. Netlify (Recomendado) ⭐

**Ventajas**: Deploy automático, CDN global, SSL gratis, rollbacks fáciles

#### Deploy Manual
```bash
# 1. Build del proyecto
cd convocatorias-pro
pnpm install
pnpm build

# 2. En Netlify Dashboard:
# - New site from Git
# - Connect GitHub repo
# - Build settings:
#   - Base directory: convocatorias-pro
#   - Build command: pnpm install && pnpm build
#   - Publish directory: convocatorias-pro/dist
```

#### Deploy con CLI
```bash
npm install -g netlify-cli
netlify login
netlify deploy --prod --dir=convocatorias-pro/dist
```

### 2. Vercel

**Ventajas**: Integración perfecta con Next.js, edge functions

```bash
npm i -g vercel
cd convocatorias-pro
vercel --prod
# Configurar root directory como "convocatorias-pro"
```

### 3. GitHub Pages

```bash
# 1. Crear repositorio en GitHub
# 2. Push del código
# 3. GitHub Actions workflow:

# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [ main ]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: cd convocatorias-pro && npm ci
      - run: cd convocatorias-pro && npm run build
      - uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./convocatorias-pro/dist
```

### 4. VPS/Servidor Propio

```bash
# Con nginx como reverse proxy
sudo apt update
sudo apt install nginx nodejs npm
npm install -g pnpm pm2

# Clonar proyecto
git clone [REPO_URL]
cd convocatorias-pro
pnpm install
pnpm build

# Servir archivos estáticos
sudo cp -r dist/* /var/www/html/
sudo systemctl restart nginx
```

---

## ⚙️ Configuración de Variables de Entorno

### Variables Frontend (.env)
```bash
# No es necesario para este proyecto
# Las credenciales están hardcodeadas en src/lib/supabase.ts
# para simplificar el deploy
```

### Variables Supabase (Edge Functions)
```bash
# En Supabase Dashboard → Settings → Edge Functions
MERCADOPAGO_ACCESS_TOKEN=tu_access_token_aqui
MERCADOPAGO_WEBHOOK_SECRET=tu_webhook_secret
SUPABASE_URL=https://zkqdieifjrodriepjldn.supabase.co
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key
```

---

## 🔧 Configuración de Supabase Auth

### URLs de Redirección
En Supabase Dashboard → Authentication → URL Configuration:

```
# Site URL
https://tudominio.com

# Redirect URLs
http://localhost:5173/auth/callback
https://tudominio.com/auth/callback
https://*.netlify.app/auth/callback
https://*.vercel.app/auth/callback
```

### Google OAuth Setup
1. Ve a [Google Cloud Console](https://console.cloud.google.com)
2. Crea nuevo proyecto o selecciona existente
3. Habilita Google+ API
4. Crea credenciales OAuth 2.0
5. Configura JavaScript origins:
   ```
   http://localhost:5173
   https://tudominio.com
   ```
6. Configura redirect URIs:
   ```
   https://zkqdieifjrodriepjldn.supabase.co/auth/v1/callback
   ```
7. En Supabase → Auth → Providers → Google:
   - Client ID: [tu_google_client_id]
   - Client Secret: [tu_google_client_secret]

### GitHub OAuth Setup
1. Ve a GitHub → Settings → Developer settings → OAuth Apps
2. New OAuth App
3. Configura:
   - Application name: ConvocatoriasPro
   - Homepage URL: https://tudominio.com
   - Callback URL: `https://zkqdieifjrodriepjldn.supabase.co/auth/v1/callback`
4. En Supabase → Auth → Providers → GitHub:
   - Client ID: [tu_github_client_id]
   - Client Secret: [tu_github_client_secret]

---

## 💳 Configuración Completa de MercadoPago

### 1. Crear Aplicación en MercadoPago
1. Ve a [MercadoPago Developers](https://www.mercadopago.cl/developers)
2. Crea nueva aplicación
3. Obtén credenciales de producción y sandbox

### 2. Crear Enlaces de Suscripción

#### Pro Mensual ($8.990 CLP)
```bash
# En MercadoPago Dashboard → Herramientas → Crear enlace de pago
# Configurar:
# - Título: Suscripción ConvocatoriasPro - Plan Mensual
# - Precio: $8.990 CLP
# - Descripción: Acceso completo a funciones premium por 1 mes
# - Metadata personalizada:
#   user_id: (se enviará desde la app)
#   plan_id: pro_monthly
```

#### Pro Anual ($84.990 CLP)
```bash
# Configurar:
# - Título: Suscripción ConvocatoriasPro - Plan Anual
# - Precio: $84.990 CLP
# - Descripción: Acceso completo a funciones premium por 12 meses
# - Metadata personalizada:
#   user_id: (se enviará desde la app)
#   plan_id: pro_annual
```

### 3. Actualizar URLs en Base de Datos
```sql
-- Ejecutar en Supabase SQL Editor
UPDATE plans SET 
  mp_checkout_url = 'https://mpago.la/TU_ENLACE_MENSUAL'
WHERE id = 'pro_monthly';

UPDATE plans SET 
  mp_checkout_url = 'https://mpago.la/TU_ENLACE_ANUAL'
WHERE id = 'pro_annual';
```

### 4. Configurar Webhooks
```bash
# 1. Deploy Edge Function
cd convocatorias-pro
supabase functions deploy mp-webhook

# 2. En MercadoPago Dashboard → Webhooks
# URL: https://zkqdieifjrodriepjldn.supabase.co/functions/v1/mp-webhook
# Eventos: payment.created, payment.updated
```

---

## 📊 Monitoreo y Analytics

### Supabase Analytics
```sql
-- Queries útiles para monitoreo

-- Usuarios registrados por día
SELECT 
  DATE(created_at) as fecha,
  COUNT(*) as nuevos_usuarios
FROM profiles 
GROUP BY DATE(created_at) 
ORDER BY fecha DESC;

-- Conversión de planes
SELECT 
  plan,
  COUNT(*) as usuarios
FROM profiles 
GROUP BY plan;

-- Convocatorias creadas por mes
SELECT 
  DATE_TRUNC('month', created_at) as mes,
  COUNT(*) as convocatorias
FROM convocatorias 
GROUP BY DATE_TRUNC('month', created_at)
ORDER BY mes DESC;

-- Pagos exitosos
SELECT 
  DATE(created_at) as fecha,
  COUNT(*) as pagos,
  SUM(amount) as ingresos
FROM payments 
WHERE status = 'approved'
GROUP BY DATE(created_at)
ORDER BY fecha DESC;
```

### Google Analytics 4 (Opcional)
```javascript
// En index.html
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');
</script>
```

---

## 🔒 Seguridad en Producción

### Headers de Seguridad
Configurar en tu hosting (Netlify `_headers`):
```
/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  X-XSS-Protection: 1; mode=block
  Content-Security-Policy: default-src 'self' https://zkqdieifjrodriepjldn.supabase.co https://www.mercadopago.com
```

### Rate Limiting
```sql
-- En Supabase, crear función de rate limiting
CREATE OR REPLACE FUNCTION rate_limit(user_id UUID, action_type TEXT, max_requests INT, time_window_seconds INT)
RETURNS BOOLEAN AS $$
DECLARE
  request_count INT;
BEGIN
  -- Implementar lógica de rate limiting
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;
```

### Backup Automático
```bash
# Script para backup diario
#!/bin/bash
DATE=$(date +%Y%m%d)
supabase db dump --db-url="postgresql://[CONNECTION_STRING]" > backup_$DATE.sql
aws s3 cp backup_$DATE.sql s3://tu-bucket/backups/
```

---

## 📱 PWA y Optimizaciones

### Service Worker
```javascript
// public/sw.js
const CACHE_NAME = 'convocatorias-pro-v1';
const urlsToCache = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});
```

### Web App Manifest
```json
// public/manifest.json
{
  "name": "ConvocatoriasPro",
  "short_name": "ConvocatoriasPro",
  "description": "Gestión inteligente de convocatorias de financiamiento",
  "start_url": "/",
  "display": "standalone",
  "theme_color": "#1e40af",
  "background_color": "#ffffff",
  "icons": [
    {
      "src": "/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

---

## 🚀 Performance Optimization

### Bundle Analysis
```bash
# Analizar tamaño del bundle
cd convocatorias-pro
npx vite-bundle-analyzer dist/stats.json
```

### Code Splitting Mejorado
```typescript
// src/App.tsx - Lazy loading
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const CalendarPage = lazy(() => import('./pages/CalendarPage'));

// Usar Suspense
<Suspense fallback={<LoadingSpinner />}>
  <Routes>
    <Route path="/dashboard" element={<DashboardPage />} />
    <Route path="/calendar" element={<CalendarPage />} />
  </Routes>
</Suspense>
```

### Optimización de Imágenes
```bash
# Generar múltiples tamaños
for img in public/images/*.png; do
  convert "$img" -resize 800x600 "${img%.png}-800w.png"
  convert "$img" -resize 400x300 "${img%.png}-400w.png"
done
```

---

## 📊 Métricas y KPIs

### Métricas de Negocio
- **Usuarios registrados**: Target 100/mes
- **Tasa de conversión a Pro**: Target 15%
- **Retención 30 días**: Target 60%
- **NPS (Net Promoter Score)**: Target 8+
- **MRR (Monthly Recurring Revenue)**: Target $500.000 CLP/mes

### Métricas Técnicas
- **Core Web Vitals**: LCP < 2.5s, FID < 100ms, CLS < 0.1
- **Time to Interactive**: < 3s
- **Uptime**: > 99.5%
- **Error rate**: < 1%

### Monitoring Setup
```javascript
// Error tracking con Sentry
import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: "YOUR_SENTRY_DSN",
  environment: process.env.NODE_ENV,
});

// Performance monitoring
const observer = new PerformanceObserver((list) => {
  list.getEntries().forEach((entry) => {
    if (entry.name === 'largest-contentful-paint') {
      console.log('LCP:', entry.startTime);
    }
  });
});
observer.observe({entryTypes: ['largest-contentful-paint']});
```

---

## 🆘 Troubleshooting Avanzado

### Problemas Comunes de Deploy

**Build falla por memoria insuficiente**
```bash
# Aumentar memoria para Node.js
export NODE_OPTIONS="--max-old-space-size=4096"
npm run build
```

**CORS errors en producción**
```sql
-- Verificar allowed origins en Supabase
SELECT * FROM auth.config WHERE key = 'site_url';
-- Debe incluir tu dominio de producción
```

**RLS policies no funcionan**
```sql
-- Debug RLS
SET row_security = off;
SELECT * FROM convocatorias; -- Debe funcionar
SET row_security = on;
SELECT * FROM convocatorias; -- Debe fallar sin auth.uid()
```

### Logs y Debugging
```bash
# Logs de Supabase Edge Functions
supabase functions logs mp-webhook

# Logs de Netlify
netlify logs --site-id YOUR_SITE_ID

# Performance profiling
node --prof app.js
node --prof-process --preprocess -j isolate*.log | flamebearer
```

---

## 🔄 CI/CD Completo

### GitHub Actions Workflow
```yaml
# .github/workflows/deploy.yml
name: Deploy ConvocatoriasPro

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'pnpm'
      - name: Install dependencies
        run: cd convocatorias-pro && pnpm install
      - name: Type check
        run: cd convocatorias-pro && pnpm type-check
      - name: Lint
        run: cd convocatorias-pro && pnpm lint
      - name: Test
        run: cd convocatorias-pro && pnpm test

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'pnpm'
      - name: Install and build
        run: |
          cd convocatorias-pro
          pnpm install
          pnpm build
      - name: Deploy to Netlify
        uses: nwtgck/actions-netlify@v2.0
        with:
          publish-dir: './convocatorias-pro/dist'
          production-branch: main
          github-token: ${{ secrets.GITHUB_TOKEN }}
          deploy-message: "Deploy from GitHub Actions"
        env:
          NETLIFY_AUTH_TOKEN: ${{ secrets.NETLIFY_AUTH_TOKEN }}
          NETLIFY_SITE_ID: ${{ secrets.NETLIFY_SITE_ID }}
```

---

<div align="center">
  <strong>🎉 ¡Tu aplicación está lista para producción! 🎉</strong><br>
  <em>Con esta guía tienes todo lo necesario para un deploy exitoso y mantenimiento profesional</em>
</div>
