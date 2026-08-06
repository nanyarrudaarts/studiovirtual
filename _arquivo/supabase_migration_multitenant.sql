-- ──────────────────────────────────────────────────────────────────────────────
-- Migration: Multi-Tenancy & Hardened RLS Security Policies (REVISED & COMPREHENSIVE)
-- Data: 2026-08-04
-- Descrição: Adiciona user_id com FK para auth.users nas tabelas do acervo,
--            habilita RLS estrito (user_id = auth.uid()) e remove TODAS as políticas
--            antigas (públicas ou permissivas).
-- ──────────────────────────────────────────────────────────────────────────────

-- 1. ADICIONAR COLUNA user_id (NULL TEMPORÁRIO)
ALTER TABLE public.collections 
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.series 
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.artworks 
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.artworks_collections 
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.artworks_series 
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- (As tabelas portfolios e artista já possuem a coluna user_id)


-- 2. SCRIPT DE BACKFILL (PREENCHER REGISTROS EXISTENTES)
-- Substitua 'SEU_USER_ID_AQUI' pelo seu UUID de usuário no Supabase (auth.users)
DO $$
DECLARE
  target_user_id UUID := 'SEU_USER_ID_AQUI'::UUID;
BEGIN
  IF target_user_id IS NOT NULL THEN
    UPDATE public.collections SET user_id = target_user_id WHERE user_id IS NULL;
    UPDATE public.series SET user_id = target_user_id WHERE user_id IS NULL;
    UPDATE public.artworks SET user_id = target_user_id WHERE user_id IS NULL;
    UPDATE public.artworks_collections SET user_id = target_user_id WHERE user_id IS NULL;
    UPDATE public.artworks_series SET user_id = target_user_id WHERE user_id IS NULL;
    UPDATE public.portfolios SET user_id = target_user_id WHERE user_id IS NULL;
    UPDATE public.artista SET user_id = target_user_id WHERE user_id IS NULL;
  END IF;
END $$;


-- 3. ALTERAR COLUNA PARA NOT NULL
ALTER TABLE public.collections ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.series ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.artworks ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.artworks_collections ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.artworks_series ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.portfolios ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.artista ALTER COLUMN user_id SET NOT NULL;


-- 4. REAVALIAR E REGUARDAR POLÍTICAS DE RLS (STRICT USER ISOLATION)

-- Collections
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.collections;
DROP POLICY IF EXISTS "Permitir leitura pública de coleções" ON public.collections;
DROP POLICY IF EXISTS "Permitir modificação de coleções apenas para autenticados" ON public.collections;
DROP POLICY IF EXISTS "Leitura pública de coleções" ON public.collections;
DROP POLICY IF EXISTS "Leitura para autenticados" ON public.collections;
DROP POLICY IF EXISTS "Escrita para autenticados" ON public.collections;
DROP POLICY IF EXISTS "collections_user_isolation" ON public.collections;

CREATE POLICY "collections_user_isolation" ON public.collections
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Series
ALTER TABLE public.series ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.series;
DROP POLICY IF EXISTS "Permitir leitura pública de séries" ON public.series;
DROP POLICY IF EXISTS "Permitir modificação de séries apenas para autenticados" ON public.series;
DROP POLICY IF EXISTS "Leitura pública de séries" ON public.series;
DROP POLICY IF EXISTS "Leitura para autenticados" ON public.series;
DROP POLICY IF EXISTS "Escrita para autenticados" ON public.series;
DROP POLICY IF EXISTS "series_user_isolation" ON public.series;

CREATE POLICY "series_user_isolation" ON public.series
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Artworks
ALTER TABLE public.artworks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.artworks;
DROP POLICY IF EXISTS "Permitir leitura pública de obras" ON public.artworks;
DROP POLICY IF EXISTS "Permitir leitura pública das obras" ON public.artworks;
DROP POLICY IF EXISTS "Permitir modificação de obras apenas para autenticados" ON public.artworks;
DROP POLICY IF EXISTS "Leitura para autenticados" ON public.artworks;
DROP POLICY IF EXISTS "Escrita para autenticados" ON public.artworks;
DROP POLICY IF EXISTS "artworks_user_isolation" ON public.artworks;

CREATE POLICY "artworks_user_isolation" ON public.artworks
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Artworks_Collections
ALTER TABLE public.artworks_collections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.artworks_collections;
DROP POLICY IF EXISTS "Permitir leitura pública de artworks_collections" ON public.artworks_collections;
DROP POLICY IF EXISTS "Permitir modificação de artworks_collections apenas para autenticados" ON public.artworks_collections;
DROP POLICY IF EXISTS "artworks_collections_user_isolation" ON public.artworks_collections;

CREATE POLICY "artworks_collections_user_isolation" ON public.artworks_collections
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Artworks_Series
ALTER TABLE public.artworks_series ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.artworks_series;
DROP POLICY IF EXISTS "Permitir leitura pública de artworks_series" ON public.artworks_series;
DROP POLICY IF EXISTS "Permitir modificação de artworks_series apenas para autenticados" ON public.artworks_series;
DROP POLICY IF EXISTS "artworks_series_user_isolation" ON public.artworks_series;

CREATE POLICY "artworks_series_user_isolation" ON public.artworks_series
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Portfolios
ALTER TABLE public.portfolios ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can select their own portfolios" ON public.portfolios;
DROP POLICY IF EXISTS "Users can insert their own portfolios" ON public.portfolios;
DROP POLICY IF EXISTS "Users can update their own portfolios" ON public.portfolios;
DROP POLICY IF EXISTS "Users can delete their own portfolios" ON public.portfolios;
DROP POLICY IF EXISTS "Enable all for users based on user_id" ON public.portfolios;
DROP POLICY IF EXISTS "Permitir leitura pública para o portfólio" ON public.portfolios;
DROP POLICY IF EXISTS "portfolios_user_isolation" ON public.portfolios;

CREATE POLICY "portfolios_user_isolation" ON public.portfolios
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Artista
ALTER TABLE public.artista ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir leitura pública de artista" ON public.artista;
DROP POLICY IF EXISTS "Permitir modificação apenas para autenticados" ON public.artista;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.artista;
DROP POLICY IF EXISTS "artista_user_isolation" ON public.artista;

CREATE POLICY "artista_user_isolation" ON public.artista
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
