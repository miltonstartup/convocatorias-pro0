@@ .. @@
 -- Actualizar enlaces de MercadoPago en la tabla plans
--- NOTA: Reemplazar con tus URLs reales de MercadoPago
+-- NOTA: Configurar con tus URLs reales de MercadoPago desde el dashboard

--- Enlaces de ejemplo (REEMPLAZAR con los reales)
-UPDATE plans SET mp_checkout_url = 'https://link.mercadopago.cl/pro-mensual-convocatorias' 
-WHERE id = 'pro_monthly';
-
-UPDATE plans SET mp_checkout_url = 'https://link.mercadopago.cl/pro-anual-convocatorias' 
-WHERE id = 'pro_annual';
+-- Configurar enlaces desde variables de entorno o dashboard
+-- UPDATE plans SET mp_checkout_url = 'TU_ENLACE_MENSUAL' WHERE id = 'pro_monthly';
+-- UPDATE plans SET mp_checkout_url = 'TU_ENLACE_ANUAL' WHERE id = 'pro_annual';