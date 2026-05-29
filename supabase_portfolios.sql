-- ─── Portfolio Generator: Supabase Migration Script ───────────────────────────
-- Run this in your Supabase SQL Editor (https://app.supabase.com → SQL Editor)
-- Project: studio-virtual

-- 1. Create the portfolios table
CREATE TABLE IF NOT EXISTS portfolios (
  portfolio_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Metadata
  portfolio_title TEXT NOT NULL DEFAULT 'Novo Portfólio',
  artist_statement TEXT,

  -- Template & Layout
  template_type TEXT NOT NULL DEFAULT 'A',       -- 'A' | 'B' | 'C'
  grid_columns INTEGER NOT NULL DEFAULT 2,        -- For Template B: 2 or 4
  include_cover BOOLEAN NOT NULL DEFAULT TRUE,
  include_cv BOOLEAN NOT NULL DEFAULT FALSE,

  -- Artwork selection (ordered list of artwork_ids)
  selected_artworks TEXT[] NOT NULL DEFAULT '{}',

  -- Per-artwork image scale overrides: { "artwork_id": 80 } (50–100)
  image_scales JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- 2. Enable Row Level Security
ALTER TABLE portfolios ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies: users can only access their own portfolios
CREATE POLICY "Users can select their own portfolios"
  ON portfolios FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own portfolios"
  ON portfolios FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own portfolios"
  ON portfolios FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own portfolios"
  ON portfolios FOR DELETE
  USING (auth.uid() = user_id);

-- 4. Auto-update updated_at timestamp on every UPDATE
CREATE OR REPLACE FUNCTION update_portfolios_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_portfolios_updated_at
  BEFORE UPDATE ON portfolios
  FOR EACH ROW
  EXECUTE PROCEDURE update_portfolios_updated_at();
