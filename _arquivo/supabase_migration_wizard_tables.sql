-- ==============================================================================
-- MIGRATION: certificados_config, materiais, portfolios (com trigger de artist_id)
-- Padrão de segurança: dono via artist_id -> artista.user_id (igual collections/series)
-- ==============================================================================

-- 1. CERTIFICADOS_CONFIG
CREATE TABLE IF NOT EXISTS public.certificados_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id bigint NOT NULL REFERENCES public.artista(id) ON DELETE CASCADE,
  modelo_tipo text NOT NULL CHECK (modelo_tipo IN ('padrao_1', 'padrao_2', 'padrao_3', 'personalizado')),
  arquivo_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.certificados_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "certificados_config owner all" ON public.certificados_config;
CREATE POLICY "certificados_config owner all" ON public.certificados_config
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.artista a WHERE a.id = certificados_config.artist_id AND a.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.artista a WHERE a.id = certificados_config.artist_id AND a.user_id = auth.uid()));

-- 2. MATERIAIS
CREATE TABLE IF NOT EXISTS public.materiais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id bigint NOT NULL REFERENCES public.artista(id) ON DELETE CASCADE,
  nome text NOT NULL,
  categoria text,
  quantidade numeric,
  unidade text,
  foto_url text,
  origem_registro text CHECK (origem_registro IN ('manual', 'foto')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.materiais ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "materiais owner all" ON public.materiais;
CREATE POLICY "materiais owner all" ON public.materiais
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.artista a WHERE a.id = materiais.artist_id AND a.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.artista a WHERE a.id = materiais.artist_id AND a.user_id = auth.uid()));

-- 3. PORTFOLIOS (artist_id NULLABLE + trigger de autopreenchimento)
CREATE TABLE IF NOT EXISTS public.portfolios (
  portfolio_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id bigint REFERENCES public.artista(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  portfolio_title text NOT NULL,
  artist_statement text,
  template_type text DEFAULT 'A' CHECK (template_type IN ('A', 'B', 'C')),
  grid_columns integer DEFAULT 2 CHECK (grid_columns IN (2, 4)),
  include_cover boolean DEFAULT true,
  include_cv boolean DEFAULT true,
  selected_artworks jsonb DEFAULT '[]'::jsonb,
  image_scales jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.fill_portfolio_artist_id()
RETURNS trigger AS $$
BEGIN
  IF NEW.artist_id IS NULL THEN
    SELECT id INTO NEW.artist_id
    FROM public.artista
    WHERE user_id = COALESCE(NEW.user_id, auth.uid())
    LIMIT 1;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_fill_portfolio_artist_id ON public.portfolios;
CREATE TRIGGER trg_fill_portfolio_artist_id
  BEFORE INSERT ON public.portfolios
  FOR EACH ROW
  EXECUTE FUNCTION public.fill_portfolio_artist_id();

ALTER TABLE public.portfolios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "portfolios_owner_policy" ON public.portfolios;
CREATE POLICY "portfolios_owner_policy" ON public.portfolios
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.artista a WHERE a.id = portfolios.artist_id AND a.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.artista a WHERE a.id = portfolios.artist_id AND a.user_id = auth.uid()));
