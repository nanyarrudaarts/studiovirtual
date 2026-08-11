import { createClient } from '@supabase/supabase-js';
import type { Artwork, Collection, Series } from '../types';

// ─── Portfolio Type ────────────────────────────────────────────────────────────
export interface PortfolioProject {
  portfolio_id: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  portfolio_title: string;
  artist_statement: string | null;
  template_type: 'A' | 'B' | 'C';
  grid_columns: 2 | 4;
  include_cover: boolean;
  include_cv: boolean;
  selected_artworks: string[];
  image_scales: Record<string, number>;
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key';

export const supabase = createClient(supabaseUrl, supabaseKey);

export async function uploadToStorage(file: File | Blob, folder: string): Promise<string> {
  const ext = file instanceof File ? file.name.split('.').pop() : 'jpg';
  const name = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabase.storage.from('obras-images').upload(name, file, { upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from('obras-images').getPublicUrl(name);
  return data.publicUrl;
}

async function uploadImage(file: File, folder: string): Promise<string> {
  return uploadToStorage(file, folder);
}


async function generateAccessionNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const { count } = await supabase
    .from('artworks')
    .select('*', { count: 'exact', head: true });
  const sequence = 1000 + (count ?? 0) + 1;
  return `NA-${year}-${sequence}`;
}

// ─── ARTWORKS ─────────────────────────────────────────────────────────────────

export async function getArtworks(filters?: {
  classification?: string;
  sale_status?: string;
  series_id?: string;
  collection_id?: string;
  search?: string;
}): Promise<Artwork[]> {
  let q = supabase.from('artworks').select('*').order('created_at', { ascending: false });
  if (filters?.classification) q = q.eq('classification', filters.classification);
  if (filters?.sale_status) q = q.eq('sale_status', filters.sale_status);
  if (filters?.series_id) q = q.eq('series_reference', filters.series_id);
  if (filters?.collection_id) q = q.eq('collection_reference', filters.collection_id);
  if (filters?.search) q = q.ilike('artwork_title', `%${filters.search}%`);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as Artwork[];
}

export async function getArtwork(id: string): Promise<Artwork | null> {
  const { data, error } = await supabase
    .from('artworks')
    .select('*')
    .eq('artwork_id', id)
    .single();
  if (error) throw error;
  return data as Artwork;
}

export async function saveArtwork(artwork: Partial<Artwork>, imageFiles: File[] = []): Promise<Artwork> {
  const uploadedUrls: string[] = [];
  for (const file of imageFiles) {
    const url = await uploadImage(file, 'artworks');
    uploadedUrls.push(url);
  }

  const payload: Partial<Artwork> = { ...artwork };
  if (uploadedUrls.length > 0) {
    payload.artwork_images = [...(artwork.artwork_images ?? []), ...uploadedUrls];
    if (!payload.cover_image) payload.cover_image = uploadedUrls[0];
  }
  if (!payload.classification) payload.classification = 'singular';
  if (!payload.edition_number) {
    payload.edition_number = 
      payload.classification === 'singular' ? 'Original Único' :
      (payload as { print_run_total?: number }).print_run_total ? `1/${(payload as { print_run_total?: number }).print_run_total}` :
      'Original Único';
  }
  if (!payload.accession_number) {
    payload.accession_number = await generateAccessionNumber();
  }
  if (!payload.artist_name || !payload.copyright_holder) {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: artistaData } = await supabase
        .from('artista')
        .select('nomeartistico, nome')
        .eq('user_id', user.id)
        .maybeSingle();
      const resolvedName = 
        (artistaData?.nomeartistico as string | null)?.trim() ||
        (artistaData?.nome as string | null)?.trim() ||
        'Artista';
      if (!payload.artist_name) payload.artist_name = resolvedName;
      if (payload.copyright_holder === undefined) payload.copyright_holder = resolvedName;
    } else {
      if (!payload.artist_name) payload.artist_name = 'Artista';
      if (payload.copyright_holder === undefined) payload.copyright_holder = 'Artista';
    }
  } else if (payload.copyright_holder === undefined) {
    // artist_name já foi resolvido acima, mas copyright_holder ainda pode estar undefined
    payload.copyright_holder = payload.artist_name;
  }
  if (payload.certificate_of_authenticity === undefined) payload.certificate_of_authenticity = false;
  if (payload.exposed === undefined) payload.exposed = false;
  if (payload.sustainable_materials === undefined) payload.sustainable_materials = false;
  if (payload.visibility_status === undefined) payload.visibility_status = 'private';
  if (payload.display_order === undefined) payload.display_order = 0;

  if (payload.artwork_id) {
    const { data, error } = await supabase
      .from('artworks')
      .update(payload)
      .eq('artwork_id', payload.artwork_id)
      .select()
      .single();
    if (error) throw error;
    return data as Artwork;
  }

  const { data, error } = await supabase
    .from('artworks')
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  const saved = data as Artwork;

  if (artwork.series_reference) {
    await addArtworkToSerie(saved.artwork_id, artwork.series_reference);
  }
  if (artwork.collection_reference) {
    await addArtworkToCollection(saved.artwork_id, artwork.collection_reference);
  }

  return saved;
}

export async function updateArtwork(id: string, data: Partial<Artwork>): Promise<Artwork> {
  const { data: updated, error } = await supabase
    .from('artworks')
    .update(data)
    .eq('artwork_id', id)
    .select()
    .single();
  if (error) throw error;
  return updated as Artwork;
}

export async function deleteArtwork(id: string) {
  // Delete images from storage first
  try {
    const artwork = await getArtwork(id);
    if (artwork?.artwork_images?.length) {
      const fileNames = artwork.artwork_images
        .map((url: string) => url.split('/').pop())
        .filter((name): name is string => !!name);
      if (fileNames.length) {
        await supabase.storage.from('obras-images').remove(fileNames);
      }
    }
  } catch {
    // Storage cleanup failed silently — proceed with record delete
  }
  
  // Remove vínculos com séries e coleções para evitar erro de chave estrangeira
  await supabase.from('artworks_series').delete().eq('artwork_id', id);
  await supabase.from('artworks_collections').delete().eq('artwork_id', id);
  
  // Delete the record
  const { data, error } = await supabase
    .from('artworks').delete().eq('artwork_id', id).select();
  
  if (error) return { error };
  if (!data || data.length === 0) {
    return { error: new Error('Nenhuma obra foi deletada. Verifique as permissões de RLS no Supabase.') };
  }
  
  return { error: null };
}

// ─── COLLECTIONS ─────────────────────────────────────────────────────────────

export async function getCollections(): Promise<Collection[]> {
  const { data, error } = await supabase
    .from('collections')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Collection[];
}

export async function getCollection(id: string): Promise<Collection | null> {
  const { data, error } = await supabase
    .from('collections')
    .select('*')
    .eq('collection_id', id)
    .single();
  if (error) throw error;
  return data as Collection;
}

export async function createCollection(data: Partial<Collection>): Promise<Collection> {
  const payload = { total_items: 0, visibility_status: 'private', ...data };
  const { data: created, error } = await supabase
    .from('collections')
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return created as Collection;
}

export async function updateCollection(id: string, data: Partial<Collection>): Promise<Collection> {
  const { data: updated, error } = await supabase
    .from('collections')
    .update(data)
    .eq('collection_id', id)
    .select()
    .single();
  if (error) throw error;
  return updated as Collection;
}

export async function deleteCollection(id: string): Promise<void> {
  const { data, error } = await supabase.from('collections').delete().eq('collection_id', id).select();
  if (error) throw error;
  if (!data || data.length === 0) throw new Error('Nenhuma coleção foi deletada. Verifique as permissões de RLS no Supabase.');
}

export async function getArtworksInCollection(collectionId: string): Promise<Artwork[]> {
  const { data, error } = await supabase
    .from('artworks_collections')
    .select('artworks(*), order_in_collection')
    .eq('collection_id', collectionId)
    .order('order_in_collection');
  if (error) throw error;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data ?? []).map((r: any) => r.artworks)) as Artwork[];
}

export async function addArtworkToCollection(artworkId: string, collectionId: string): Promise<void> {
  const { error } = await supabase
    .from('artworks_collections')
    .upsert({ artwork_id: artworkId, collection_id: collectionId });
  if (error) throw error;
}

export async function removeArtworkFromCollection(artworkId: string, collectionId: string): Promise<void> {
  const { error } = await supabase
    .from('artworks_collections')
    .delete()
    .eq('artwork_id', artworkId)
    .eq('collection_id', collectionId);
  if (error) throw error;
}

// ─── SERIES ───────────────────────────────────────────────────────────────────

export async function getSeries(): Promise<Series[]> {
  const { data, error } = await supabase
    .from('series')
    .select('*')
    .order('display_order')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Series[];
}

export async function getSerie(id: string): Promise<Series | null> {
  const { data, error } = await supabase
    .from('series')
    .select('*')
    .eq('series_id', id)
    .single();
  if (error) throw error;
  return data as Series;
}

export async function createSerie(data: Partial<Series>): Promise<Series> {
  const payload = { display_order: 0, cor: '#6B5CE7', ...data };
  const { data: created, error } = await supabase
    .from('series')
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return created as Series;
}

export async function updateSerie(id: string, data: Partial<Series>): Promise<Series> {
  const { data: updated, error } = await supabase
    .from('series')
    .update(data)
    .eq('series_id', id)
    .select()
    .single();
  if (error) throw error;
  return updated as Series;
}

export async function deleteSerie(id: string): Promise<void> {
  const { data, error } = await supabase.from('series').delete().eq('series_id', id).select();
  if (error) throw error;
  if (!data || data.length === 0) throw new Error('Nenhuma série foi deletada. Verifique as permissões de RLS no Supabase.');
}

export async function getArtworksInSerie(serieId: string): Promise<Artwork[]> {
  const { data, error } = await supabase
    .from('artworks_series')
    .select('artworks(*), order_in_series')
    .eq('series_id', serieId)
    .order('order_in_series');
  if (error) throw error;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data ?? []).map((r: any) => r.artworks)) as Artwork[];
}

export async function addArtworkToSerie(artworkId: string, serieId: string): Promise<void> {
  const { error } = await supabase
    .from('artworks_series')
    .upsert({ artwork_id: artworkId, series_id: serieId });
  if (error) throw error;
}

export async function removeArtworkFromSerie(artworkId: string, serieId: string): Promise<void> {
  const { error } = await supabase
    .from('artworks_series')
    .delete()
    .eq('artwork_id', artworkId)
    .eq('series_id', serieId);
  if (error) throw error;
}

// ─── PORTFOLIOS ───────────────────────────────────────────────────────────────

export async function getPortfolios(): Promise<PortfolioProject[]> {
  const { data, error } = await supabase
    .from('portfolios')
    .select('*')
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as PortfolioProject[];
}

export async function savePortfolio(
  portfolio: Partial<PortfolioProject> & { portfolio_title: string }
): Promise<PortfolioProject> {
  const { data: { user } } = await supabase.auth.getUser();
  const payload = { ...portfolio, user_id: user?.id };

  if (portfolio.portfolio_id) {
    const { data, error } = await supabase
      .from('portfolios')
      .update(payload)
      .eq('portfolio_id', portfolio.portfolio_id)
      .select()
      .single();
    if (error) throw error;
    return data as PortfolioProject;
  }

  const { data, error } = await supabase
    .from('portfolios')
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data as PortfolioProject;
}

export async function deletePortfolio(id: string): Promise<void> {
  const { error } = await supabase
    .from('portfolios')
    .delete()
    .eq('portfolio_id', id);
  if (error) throw error;
}

// ─── ONBOARDING ───────────────────────────────────────────────────────────────

export interface OnboardingData {
  // Step 1 – Conta / Perfil Pessoal
  nome?: string;
  nomeartistico?: string;
  email?: string;
  nascimento?: string;
  nacionalidade?: string;
  cidade?: string;
  telefone?: string;
  whatsapp?: string;
  website?: string;
  foto_url?: string;
  // Extra pessoal (virtualized via social_links → custom_metadata)
  pronome?: string;
  cidade_nascimento?: string;
  pais_nascimento?: string;
  pais_atual?: string;
  // Step 2 – Perfil Artístico
  bioshort?: string;
  biolong?: string;
  statement?: string;
  tags?: string;
  instagrams?: string[];
  // Artistic virtual metadata
  processo_criativo?: string;
  tecnicas_recorrentes?: string;
  temas_centrais?: string;
  pesquisa_artistica?: string;
  referencias_conceituais?: string;
  ano_inicio_carreira?: string;
  // Step 3 – Trajetória
  formacao?: object[];
  expos_individuais?: object[];
  expos_coletivas?: object[];
  premios?: object[];
  residencias?: object[];
  publicacoes?: object[];
  // Extra trajectory (virtualized)
  bolsas?: object[];
  feiras?: object[];
  bienais?: object[];
  clipping?: object[];
  colecoesPublicas?: object[];
  colecoesPrivadas?: object[];
  // Step 4 – Marca & Identidade
  selo_url?: string;
  assinatura_url?: string;
  // Step 5 – Fotos profissionais
  fotos_profissionais?: string[];
  // Completion
  onboarding_completed?: boolean;
}

/** Returns onboarding_completed flag (false = not started or pending). */
export async function getOnboardingStatus(): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data, error } = await supabase
    .from('artista')
    .select('onboarding_completed')
    .eq('user_id', user.id)
    .maybeSingle();
  if (error) {
    console.error('Error fetching onboarding status:', error);
    throw error;
  }
  if (!data) return false;
  return data.onboarding_completed === true;
}

/**
 * Builds the social_links payload with custom_metadata virtualized fields.
 * Reads existing social links first to avoid overwriting user's other links.
 */
async function buildSocialLinksPayload(d: OnboardingData, existingSocialLinks: unknown[] = []): Promise<unknown[]> {
  const cleanLinks = (existingSocialLinks as { id?: string }[]).filter(
    (l) => l.id !== 'custom_metadata'
  );
  const metadataItem = {
    id: 'custom_metadata',
    pronome: d.pronome ?? '',
    cidade_nascimento: d.cidade_nascimento ?? '',
    pais_nascimento: d.pais_nascimento ?? '',
    pais_atual: d.pais_atual ?? '',
    processo_criativo: d.processo_criativo ?? '',
    tecnicas_recorrentes: d.tecnicas_recorrentes ?? '',
    temas_centrais: d.temas_centrais ?? '',
    pesquisa_artistica: d.pesquisa_artistica ?? '',
    referencias_conceituais: d.referencias_conceituais ?? '',
    ano_inicio_carreira: d.ano_inicio_carreira ?? '',
    bolsas: d.bolsas ?? [],
    feiras: d.feiras ?? [],
    bienais: d.bienais ?? [],
    clipping: d.clipping ?? [],
    colecoesPublicas: d.colecoesPublicas ?? [],
    colecoesPrivadas: d.colecoesPrivadas ?? [],
  };
  return [...cleanLinks, metadataItem];
}

/** Persists partial onboarding data without marking as complete. */
export async function saveOnboardingStep(payload: OnboardingData): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Não autenticado');

  // Read existing data to preserve any existing entries
  const { data: existing } = await supabase
    .from('artista')
    .select('id, social_links')
    .eq('user_id', user.id)
    .maybeSingle();

  const existingLinks = Array.isArray(existing?.social_links) ? existing.social_links : [];
  const socialLinksPayload = await buildSocialLinksPayload(payload, existingLinks);

  const dbPayload = {
    ...(existing?.id ? { id: existing.id } : {}),
    user_id: user.id,
    nome: payload.nome,
    nomeartistico: payload.nomeartistico,
    email: payload.email,
    nascimento: payload.nascimento,
    nacionalidade: payload.nacionalidade,
    cidade: payload.cidade,
    telefone: payload.telefone,
    whatsapp: payload.whatsapp,
    website: payload.website,
    foto_url: payload.foto_url,
    bioshort: payload.bioshort,
    biolong: payload.biolong,
    statement: payload.statement,
    tags: payload.tags,
    instagrams: payload.instagrams,
    formacao: payload.formacao,
    expos_individuais: payload.expos_individuais,
    expos_coletivas: payload.expos_coletivas,
    premios: payload.premios,
    residencias: payload.residencias,
    publicacoes: payload.publicacoes,
    selo_url: payload.selo_url,
    assinatura_url: payload.assinatura_url,
    fotos_profissionais: payload.fotos_profissionais,
    social_links: socialLinksPayload,
    updated_at: new Date().toISOString(),
  };

  // Remove undefined keys so we don't accidentally null out existing data
  const cleanPayload = Object.fromEntries(
    Object.entries(dbPayload).filter(([, v]) => v !== undefined)
  );

  if (existing?.id) {
    const { error } = await supabase
      .from('artista')
      .update(cleanPayload)
      .eq('id', existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('artista')
      .insert(cleanPayload);
    if (error) throw error;
  }
}

/** Marks onboarding as done and saves all collected data in one transaction. */
export async function completeOnboarding(payload: OnboardingData): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Não autenticado');

  const { data: existing } = await supabase
    .from('artista')
    .select('id, social_links')
    .eq('user_id', user.id)
    .maybeSingle();

  const existingLinks = Array.isArray(existing?.social_links) ? existing.social_links : [];
  const socialLinksPayload = await buildSocialLinksPayload(payload, existingLinks);

  const dbPayload = {
    ...(existing?.id ? { id: existing.id } : {}),
    user_id: user.id,
    nome: payload.nome,
    nomeartistico: payload.nomeartistico,
    email: payload.email,
    nascimento: payload.nascimento,
    nacionalidade: payload.nacionalidade,
    cidade: payload.cidade,
    telefone: payload.telefone,
    whatsapp: payload.whatsapp,
    website: payload.website,
    foto_url: payload.foto_url,
    bioshort: payload.bioshort,
    biolong: payload.biolong,
    statement: payload.statement,
    tags: payload.tags,
    instagrams: payload.instagrams,
    formacao: payload.formacao,
    expos_individuais: payload.expos_individuais,
    expos_coletivas: payload.expos_coletivas,
    premios: payload.premios,
    residencias: payload.residencias,
    publicacoes: payload.publicacoes,
    selo_url: payload.selo_url,
    assinatura_url: payload.assinatura_url,
    fotos_profissionais: payload.fotos_profissionais,
    social_links: socialLinksPayload,
    onboarding_completed: true,
    updated_at: new Date().toISOString(),
  };

  const cleanPayload = Object.fromEntries(
    Object.entries(dbPayload).filter(([, v]) => v !== undefined)
  );

  if (existing?.id) {
    const { error } = await supabase
      .from('artista')
      .update(cleanPayload)
      .eq('id', existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('artista')
      .insert(cleanPayload);
    if (error) throw error;
  }
}
