-- Migration: add_missing_columns_convocatorias
-- Created at: 1755312774

-- Agregar columnas faltantes a la tabla convocatorias
ALTER TABLE convocatorias 
ADD COLUMN IF NOT EXISTS tipo_fondo TEXT,
ADD COLUMN IF NOT EXISTS area TEXT,
ADD COLUMN IF NOT EXISTS notas_usuario TEXT;;