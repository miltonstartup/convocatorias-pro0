-- Configuración inicial para MercadoPago Chile
-- Ejecutar después de obtener los enlaces de suscripción

-- Actualizar enlaces de MercadoPago en la tabla plans
-- NOTA: Reemplazar con tus URLs reales de MercadoPago

-- Enlaces de ejemplo (REEMPLAZAR con los reales)
UPDATE plans SET mp_checkout_url = 'https://link.mercadopago.cl/pro-mensual-convocatorias' 
WHERE id = 'pro_monthly';

UPDATE plans SET mp_checkout_url = 'https://link.mercadopago.cl/pro-anual-convocatorias' 
WHERE id = 'pro_annual';

-- Insertar datos de ejemplo para testing (opcional)
INSERT INTO profiles (id, full_name, plan) VALUES 
('00000000-0000-0000-0000-000000000001', 'Usuario Test', 'pro_monthly')
ON CONFLICT (id) DO NOTHING;

-- Verificar configuración
SELECT id, name, price_clp, max_convocatorias, 
       CASE 
         WHEN mp_checkout_url IS NOT NULL THEN 'Configurado' 
         ELSE 'Falta configurar' 
       END as mercadopago_status
FROM plans
ORDER BY price_clp;

-- Mostrar estadísticas de la base de datos
SELECT 
  'profiles' as tabla, COUNT(*) as registros 
FROM profiles
UNION ALL
SELECT 
  'convocatorias' as tabla, COUNT(*) as registros 
FROM convocatorias
UNION ALL
SELECT 
  'payments' as tabla, COUNT(*) as registros 
FROM payments;