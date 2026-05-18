-- ====================================================================
-- ESTABELECER ROW LEVEL SECURITY (RLS) E POLICIES NO SUPABASE
-- PROJETO: Studio Virtual (Nany Arruda)
-- ====================================================================

-- --------------------------------------------------------------------
-- 1. ENTRADAS DE TABELAS E RLS
-- --------------------------------------------------------------------

-- Habilitar RLS em todas as tabelas
ALTER TABLE artista ENABLE ROW LEVEL SECURITY;
ALTER TABLE artworks ENABLE ROW LEVEL SECURITY;
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE series ENABLE ROW LEVEL SECURITY;
ALTER TABLE artworks_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE artworks_series ENABLE ROW LEVEL SECURITY;

-- --------------------------------------------------------------------
-- 2. POLÍTICAS PARA A TABELA 'artista'
-- --------------------------------------------------------------------
-- Permitir leitura pública (anon e authenticated) para o portfólio
DROP POLICY IF EXISTS "Permitir leitura pública de artista" ON artista;
CREATE POLICY "Permitir leitura pública de artista" 
ON artista FOR SELECT 
TO anon, authenticated 
USING (true);

-- Permitir qualquer alteração apenas para usuários autenticados (artista logado)
DROP POLICY IF EXISTS "Permitir modificação apenas para autenticados" ON artista;
CREATE POLICY "Permitir modificação apenas para autenticados" 
ON artista FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);


-- --------------------------------------------------------------------
-- 3. POLÍTICAS PARA A TABELA 'artworks' (Obras)
-- --------------------------------------------------------------------
-- Permitir leitura pública das obras
DROP POLICY IF EXISTS "Permitir leitura pública de obras" ON artworks;
CREATE POLICY "Permitir leitura pública de obras" 
ON artworks FOR SELECT 
TO anon, authenticated 
USING (true);

-- Permitir modificação apenas para o artista autenticado
DROP POLICY IF EXISTS "Permitir modificação de obras apenas para autenticados" ON artworks;
CREATE POLICY "Permitir modificação de obras apenas para autenticados" 
ON artworks FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);


-- --------------------------------------------------------------------
-- 4. POLÍTICAS PARA A TABELA 'collections' (Coleções)
-- --------------------------------------------------------------------
-- Leitura pública de coleções
DROP POLICY IF EXISTS "Permitir leitura pública de coleções" ON collections;
CREATE POLICY "Permitir leitura pública de coleções" 
ON collections FOR SELECT 
TO anon, authenticated 
USING (true);

-- Modificação apenas para autenticados
DROP POLICY IF EXISTS "Permitir modificação de coleções apenas para autenticados" ON collections;
CREATE POLICY "Permitir modificação de coleções apenas para autenticados" 
ON collections FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);


-- --------------------------------------------------------------------
-- 5. POLÍTICAS PARA A TABELA 'series' (Séries)
-- --------------------------------------------------------------------
-- Leitura pública de séries
DROP POLICY IF EXISTS "Permitir leitura pública de séries" ON series;
CREATE POLICY "Permitir leitura pública de séries" 
ON series FOR SELECT 
TO anon, authenticated 
USING (true);

-- Modificação apenas para autenticados
DROP POLICY IF EXISTS "Permitir modificação de séries apenas para autenticados" ON series;
CREATE POLICY "Permitir modificação de séries apenas para autenticados" 
ON series FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);


-- --------------------------------------------------------------------
-- 6. POLÍTICAS PARA AS TABELAS DE VÍNCULO (artworks_collections e artworks_series)
-- --------------------------------------------------------------------
-- Leitura pública de vínculos
DROP POLICY IF EXISTS "Permitir leitura pública de artworks_collections" ON artworks_collections;
CREATE POLICY "Permitir leitura pública de artworks_collections" 
ON artworks_collections FOR SELECT 
TO anon, authenticated 
USING (true);

DROP POLICY IF EXISTS "Permitir leitura pública de artworks_series" ON artworks_series;
CREATE POLICY "Permitir leitura pública de artworks_series" 
ON artworks_series FOR SELECT 
TO anon, authenticated 
USING (true);

-- Modificação apenas para autenticados
DROP POLICY IF EXISTS "Permitir modificação de artworks_collections apenas para autenticados" ON artworks_collections;
CREATE POLICY "Permitir modificação de artworks_collections apenas para autenticados" 
ON artworks_collections FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir modificação de artworks_series apenas para autenticados" ON artworks_series;
CREATE POLICY "Permitir modificação de artworks_series apenas para autenticados" 
ON artworks_series FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);


-- --------------------------------------------------------------------
-- 7. POLÍTICAS PARA ARMAZENAMENTO DE ARQUIVOS (Storage Buckets)
-- --------------------------------------------------------------------

-- Criar os buckets caso eles não existam
INSERT INTO storage.buckets (id, name, public) 
VALUES ('obras-images', 'obras-images', true) 
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('perfil', 'perfil', true) 
ON CONFLICT (id) DO NOTHING;

-- Leitura pública de qualquer imagem do portfólio ou perfil
DROP POLICY IF EXISTS "Permitir visualização pública de imagens de obras" ON storage.objects;
CREATE POLICY "Permitir visualização pública de imagens de obras" 
ON storage.objects FOR SELECT 
TO anon, authenticated 
USING (bucket_id IN ('obras-images', 'perfil'));

-- Upload de imagens apenas para usuários autenticados
DROP POLICY IF EXISTS "Permitir upload apenas para usuários autenticados" ON storage.objects;
CREATE POLICY "Permitir upload apenas para usuários autenticados" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id IN ('obras-images', 'perfil'));

-- Atualização e exclusão de imagens apenas para usuários autenticados
DROP POLICY IF EXISTS "Permitir atualização e exclusão apenas para autenticados" ON storage.objects;
CREATE POLICY "Permitir atualização e exclusão apenas para autenticados" 
ON storage.objects FOR UPDATE 
TO authenticated 
USING (bucket_id IN ('obras-images', 'perfil'));

DROP POLICY IF EXISTS "Permitir exclusão apenas para autenticados" ON storage.objects;
CREATE POLICY "Permitir exclusão apenas para autenticados" 
ON storage.objects FOR DELETE 
TO authenticated 
USING (bucket_id IN ('obras-images', 'perfil'));
