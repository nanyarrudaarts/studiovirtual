-- 1. Tabelas de Coleções
CREATE TABLE IF NOT EXISTS public.collections (
    collection_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    collection_name TEXT NOT NULL,
    collection_description TEXT,
    start_date TEXT,
    end_date TEXT,
    total_items INTEGER DEFAULT 0,
    item_types TEXT[],
    provenance_history JSONB,
    acquisition_method TEXT,
    keywords TEXT[],
    thematic_descriptors TEXT[],
    artistic_theme TEXT,
    relevance_notes TEXT,
    physical_location TEXT,
    storage_reference TEXT,
    visibility_status TEXT DEFAULT 'private',
    cover_image TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Atualiza a tabela collections caso já exista, mas falte colunas
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='collections' AND column_name='collection_name') THEN
        ALTER TABLE public.collections ADD COLUMN collection_name TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='collections' AND column_name='collection_description') THEN
        ALTER TABLE public.collections ADD COLUMN collection_description TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='collections' AND column_name='artistic_theme') THEN
        ALTER TABLE public.collections ADD COLUMN artistic_theme TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='collections' AND column_name='start_date') THEN
        ALTER TABLE public.collections ADD COLUMN start_date TEXT;
    END IF;
END $$;


-- 2. Tabela de Séries
CREATE TABLE IF NOT EXISTS public.series (
    series_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_collection_id UUID REFERENCES public.collections(collection_id),
    series_title TEXT NOT NULL,
    series_number INTEGER,
    conceptual_statement TEXT,
    thematic_connection TEXT,
    narrative_description TEXT,
    edition_type TEXT,
    edition_fraction TEXT,
    print_run_total INTEGER,
    display_order INTEGER DEFAULT 0,
    group_label TEXT,
    keywords TEXT[],
    cover_image TEXT,
    cor TEXT DEFAULT '#6B5CE7',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Tabela de Obras (Artworks)
CREATE TABLE IF NOT EXISTS public.artworks (
    artwork_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    accession_number TEXT,
    inventory_number TEXT,
    artwork_title TEXT NOT NULL,
    alternative_title TEXT,
    artwork_description TEXT,
    creation_date TEXT,
    creation_year INTEGER,
    creation_city TEXT,
    creation_country TEXT,
    artist_name TEXT,
    studio_name TEXT,
    attribution TEXT,
    medium TEXT,
    support TEXT,
    materials TEXT[],
    artistic_technique TEXT,
    interpretive_title TEXT,
    summary_sentence TEXT,
    curatorial_narrative TEXT,
    epigraph TEXT,
    intent_note TEXT,
    height NUMERIC,
    width NUMERIC,
    depth NUMERIC,
    weight NUMERIC,
    dimensions_unit TEXT,
    dimensions_formatted TEXT,
    dpi INTEGER,
    resolution_px TEXT,
    condition_state TEXT,
    conservation_notes TEXT,
    restoration_history JSONB,
    certificate_of_authenticity BOOLEAN DEFAULT false,
    certificate_url TEXT,
    signature_status TEXT,
    provenance_chain JSONB,
    artwork_images TEXT[],
    artwork_images_labels TEXT[],
    detail_images TEXT[],
    process_images TEXT[],
    video_documentation TEXT[],
    cover_image TEXT,
    collection_reference UUID REFERENCES public.collections(collection_id),
    series_reference UUID REFERENCES public.series(series_id),
    classification TEXT,
    display_order INTEGER DEFAULT 0,
    tags TEXT[],
    keywords TEXT[],
    exhibition_history JSONB,
    publication_history JSONB,
    exposed BOOLEAN DEFAULT false,
    sale_status TEXT DEFAULT 'available',
    price NUMERIC,
    edition_number TEXT,
    copyright_holder TEXT,
    visibility_status TEXT DEFAULT 'private',
    physical_location TEXT,
    sustainable_materials BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Tabelas de Vínculos
CREATE TABLE IF NOT EXISTS public.artworks_collections (
    artwork_id UUID REFERENCES public.artworks(artwork_id) ON DELETE CASCADE,
    collection_id UUID REFERENCES public.collections(collection_id) ON DELETE CASCADE,
    order_in_collection INTEGER DEFAULT 0,
    PRIMARY KEY (artwork_id, collection_id)
);

CREATE TABLE IF NOT EXISTS public.artworks_series (
    artwork_id UUID REFERENCES public.artworks(artwork_id) ON DELETE CASCADE,
    series_id UUID REFERENCES public.series(series_id) ON DELETE CASCADE,
    order_in_series INTEGER DEFAULT 0,
    PRIMARY KEY (artwork_id, series_id)
);

-- 5. DESATIVAR RLS (Row Level Security) 
-- Como a aplicação usa a Chave Anon para inserir dados diretamente pelo form, 
-- é necessário desativar o RLS ou criar Policies permissivas.
ALTER TABLE public.collections DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.series DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.artworks DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.artworks_collections DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.artworks_series DISABLE ROW LEVEL SECURITY;

-- 6. CRIAR E LIBERAR BUCKET DE IMAGENS
-- Cria o bucket se não existir
INSERT INTO storage.buckets (id, name, public)
VALUES ('obras-images', 'obras-images', true)
ON CONFLICT (id) DO NOTHING;

-- Permite inserção, visualização e deleção públicas nas imagens
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access"
ON storage.objects FOR ALL
USING (bucket_id = 'obras-images');

-- Recarregar cache de schema
NOTIFY pgrst, reload_schema;
