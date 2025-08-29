#!/bin/bash

# Script para desplegar las Edge Functions corregidas de ConvocatoriasPro
# INSTRUCCIONES:
# 1. Ejecutar desde el directorio raíz del proyecto convocatorias-pro
# 2. Tener instalado Supabase CLI
# 3. Estar logueado en Supabase CLI (supabase login)

echo "🚀 Desplegando Edge Functions corregidas para ConvocatoriasPro..."

# Verificar que estamos en el directorio correcto
if [ ! -f "package.json" ]; then
    echo "❌ Error: Ejecute este script desde el directorio raíz del proyecto"
    exit 1
fi

# Verificar que Supabase CLI esté instalado
if ! command -v supabase &> /dev/null; then
    echo "❌ Error: Supabase CLI no está instalado"
    echo "Instale con: npm i supabase@latest"
    exit 1
fi

# Verificar que estamos logueados
if ! supabase projects list &> /dev/null; then
    echo "❌ Error: No está logueado en Supabase CLI"
    echo "Ejecute: supabase login"
    exit 1
fi

# Desplegar función manage-saved-convocatorias corregida
echo "💾 Desplegando manage-saved-convocatorias..."
supabase functions deploy manage-saved-convocatorias --project-ref wilvxlbiktetduwftqfn

if [ $? -eq 0 ]; then
    echo "✅ manage-saved-convocatorias desplegada exitosamente"
else
    echo "❌ Error desplegando manage-saved-convocatorias"
    exit 1
fi

# Desplegar función manage-ai-config-fixed
echo "🤖 Desplegando manage-ai-config-fixed..."
supabase functions deploy manage-ai-config-fixed --project-ref wilvxlbiktetduwftqfn

if [ $? -eq 0 ]; then
    echo "✅ manage-ai-config-fixed desplegada exitosamente"
else
    echo "❌ Error desplegando manage-ai-config-fixed"
    exit 1
fi

echo ""
echo "✅ ¡Todas las Edge Functions desplegadas exitosamente!"
echo ""
echo "Funciones disponibles:"
echo "- https://wilvxlbiktetduwftqfn.supabase.co/functions/v1/manage-saved-convocatorias"
echo "- https://wilvxlbiktetduwftqfn.supabase.co/functions/v1/manage-ai-config-fixed"
echo ""
echo "Ahora ejecute el script SQL para crear las tablas si aún no existen:"
echo "supabase/setup/create_missing_tables.sql"
echo ""
echo "🚀 Listo para probar la aplicación!"