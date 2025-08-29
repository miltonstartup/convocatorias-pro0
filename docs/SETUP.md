# 📚 Guía de Configuración - ConvocatoriasPro

## 🎯 Resumen

Esta guía te ayudará a configurar completamente la aplicación ConvocatoriasPro, incluyendo la base de datos Supabase, autenticación, sistema de pagos con MercadoPago Chile y despliegue.

---

## 🗄️ 1. Configuración de Base de Datos (Supabase)

### Paso 1: Ejecutar Script de Configuración
1. Ve a tu dashboard de Supabase: https://supabase.com/dashboard
2. Selecciona tu proyecto
3. Ve a **SQL Editor**
4. Ejecuta el contenido del archivo `supabase/setup-database.sql`
5. Verifica que todas las tablas se crearon correctamente en **Table Editor**

### Paso 2: Verificar Tablas Creadas
- ✅ `profiles` - Perfiles de usuario con planes
- ✅ `convocatorias` - Convocatorias de financiamiento
- ✅ `plans` - Planes de suscripción
- ✅ `payments` - Registro de pagos
- ✅ `rastreo_automatico` - Configuración de rastreo automático

---

## 🔐 2. Configuración de Autenticación

### OAuth Providers (Opcional)
1. Ve a **Authentication > Providers** en Supabase
2. Habilita **Google** y **GitHub** si deseas estas opciones
3. Configura las credenciales de OAuth de cada proveedor
4. Añade tu dominio a la lista de URLs autorizadas

### Configurar URLs de Redirección
- Desarrollo: `http://localhost:5173/auth/callback`
- Producción: `https://tudominio.com/auth/callback`

---

## 💰 3. Configuración de MercadoPago Chile

### Paso 1: Crear Enlaces de Suscripción
1. Ve a tu dashboard de MercadoPago: https://www.mercadopago.cl/tools/list
2. Crea dos enlaces de pago:
   - **Pro Mensual**: $8.990 CLP
   - **Pro Anual**: $84.990 CLP

### Paso 2: Actualizar URLs en la Base de Datos
```sql
UPDATE plans SET mp_checkout_url = 'TU_ENLACE_MENSUAL' WHERE id = 'pro_monthly';
UPDATE plans SET mp_checkout_url = 'TU_ENLACE_ANUAL' WHERE id = 'pro_annual';
```

### Paso 3: Configurar Webhook (Opcional)
1. Crea la Edge Function en Supabase:
   ```bash
   supabase functions deploy mp-webhook
   ```
2. Configura el webhook en MercadoPago apuntando a:
   `https://TU_PROYECTO.supabase.co/functions/v1/mp-webhook`

---

## 🚀 4. Despliegue

### Opción A: Netlify (Recomendado)
1. Fork este repositorio a tu GitHub
2. Ve a [Netlify](https://netlify.com)
3. **New site from Git** → Conecta tu repositorio
4. Configuración de build:
   - **Build command**: `cd convocatorias-pro && pnpm install && pnpm build`
   - **Publish directory**: `convocatorias-pro/dist`
5. Deploy!

### Opción B: Vercel
1. Instala Vercel CLI: `npm i -g vercel`
2. En el directorio del proyecto: `vercel --prod`
3. Configura el directorio raíz como `convocatorias-pro`

### Opción C: Manual
1. Ejecuta: `cd convocatorias-pro && pnpm build`
2. Sube el contenido de `dist/` a tu hosting

---

## 🔧 5. Variables de Entorno

### Para Edge Functions (si usas webhooks)
En Supabase Dashboard → Settings → Edge Functions:
```
MERCADOPAGO_ACCESS_TOKEN=tu_access_token_de_mercadopago
SUPABASE_URL=https://zkqdieifjrodriepjldn.supabase.co
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key
```

---

## 📱 6. Pruebas

### Funcionalidades a Probar
- [ ] Registro de usuario
- [ ] Selección de plan (obligatoria)
- [ ] Login con email/password
- [ ] Crear convocatoria manual
- [ ] Dashboard con filtros
- [ ] Calendario con fechas
- [ ] Funciones premium (si es usuario Pro)
- [ ] Pago de suscripción (en sandbox)
- [ ] Actualización automática de plan después del pago

---

## 🎨 7. Personalización

### Colores de Marca
Edita `convocatorias-pro/src/index.css` para cambiar los colores:
```css
:root {
  --primary: 220 90% 56%;     /* Azul corporativo */
  --secondary: 220 14.3% 95.9%; /* Gris claro */
  /* ... más variables */
}
```

### Datos de Ejemplo
El script SQL incluye una convocatoria de ejemplo. Puedes modificarla o agregar más en el archivo `setup-database.sql`.

---

## 🆘 Solución de Problemas

### Error: "User not found"
- Verifica que el trigger `on_auth_user_created` esté funcionando
- Manualmente ejecuta: `SELECT handle_new_user()` después de registrarte

### Error en Build
- Asegúrate de tener Node.js 18+ y pnpm instalado
- Ejecuta `pnpm install` antes de `pnpm build`

### Problemas de CORS
- Verifica que tu dominio esté en la lista de URLs permitidas en Supabase

---

## 📞 Soporte

Si tienes problemas con la configuración:
1. Revisa los logs en el navegador (F12 → Console)
2. Verifica los logs de Supabase en Dashboard → Logs
3. Consulta la documentación oficial de [Supabase](https://supabase.com/docs) y [MercadoPago](https://www.mercadopago.com.ar/developers)

¡Tu aplicación ConvocatoriasPro estará lista para ayudarte a gestionar convocatorias de financiamiento! 🎉
