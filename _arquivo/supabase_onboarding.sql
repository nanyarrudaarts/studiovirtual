-- Onboarding Wizard — Migration Script
-- Execute este script no SQL Editor do seu Supabase Dashboard

-- 1. Adicionar flag de onboarding completado
ALTER TABLE public.artista
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT false;

-- 2. Adicionar campos de identidade visual
ALTER TABLE public.artista
  ADD COLUMN IF NOT EXISTS selo_url TEXT;

ALTER TABLE public.artista
  ADD COLUMN IF NOT EXISTS assinatura_url TEXT;

-- 3. Adicionar fotos profissionais (array de URLs)
ALTER TABLE public.artista
  ADD COLUMN IF NOT EXISTS fotos_profissionais TEXT[] NOT NULL DEFAULT '{}';

-- Verificar
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'artista' 
  AND column_name IN ('onboarding_completed','selo_url','assinatura_url','fotos_profissionais');
