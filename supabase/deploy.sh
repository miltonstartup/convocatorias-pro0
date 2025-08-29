#!/bin/bash

# Script de despliegue automático para Supabase
# Ejecutar desde la raíz del proyecto

echo "🚀 Desplegando backend de Convocatorias Pro..."

# Verificar que Supabase CLI esté instalado
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI no encontrado. Instalando..."
    npm install -g supabase
fi

# Verificar que estamos logueados
echo "🔐 Verificando autenticación..."
supabase projects list > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "❌ No autenticado en Supabase. Ejecuta: supabase login"
    exit 1
fi

# Vincular proyecto
echo "🔗 Vinculando proyecto..."
supabase link --project-ref zkqdieifjrodriepjldn

# Desplegar Edge Functions
echo "📡 Desplegando Edge Functions..."

functions=("parse-content" "validate-convocatoria" "enhance-preview" "track-suggestions" "get-recommendations" "mp-webhook")

for func in "${functions[@]}"; do
    echo "  Desplegando $func..."
    supabase functions deploy $func
    if [ $? -eq 0 ]; then
        echo "  ✅ $func desplegado"
    else
        echo "  ❌ Error desplegando $func"
    fi
done

echo "🎉 Despliegue completado!"
echo ""
echo "📋 Próximos pasos:"
echo "1. Aplicar migraciones SQL en Supabase Dashboard"
echo "2. Configurar variables de entorno (OPENROUTER_API_KEY, MERCADOPAGO_ACCESS_TOKEN)"
echo "3. Configurar enlaces de MercadoPago en la tabla plans"
echo "4. Configurar webhook de MercadoPago"
echo ""
echo "📖 Ver README.md para instrucciones detalladas"
echo "🌐 Frontend: https://5e9q2suaukyp.space.minimax.io"