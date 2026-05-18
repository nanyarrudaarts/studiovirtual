import { createClient } from '@supabase/supabase-js';
import type { Artwork, Collection, Series } from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key';

export const supabase = createClient(supabaseUrl, supabaseKey);

// ─── Storage helpers ──────────────────────────────────────────────────────────

async function uploadImage(file: File, folder: string): Promise<string> {
  const ext = file.name.split('.').pop();
  const name = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabase.storage.from('obras-images').upload(name, file, { upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from('obras-images').getPublicUrl(name);
  return data.publicUrl;
}

async function deleteImage(url: string) {
  const path = url.split('/obras-images/')[1];
  if (path) await supabase.storage.from('obras-images').remove([path]);
}

async function generateAccessionNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const { count } = await supabase
    .from('artworks')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', `${year}-01-01`);
  const seq = String((count ?? 0) + 1).padStart(3, '0');
  return `NA-${year}-${seq}`;
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
  if (!payload.accession_number) {
    payload.accession_number = await generateAccessionNumber();
  }
  if (!payload.artist_name) payload.artist_name = 'Nany Arruda';
  if (!payload.dimensions_unit) payload.dimensions_unit = 'cm';
  if (!payload.classification) payload.classification = 'singular';
  if (!payload.sale_status) payload.sale_status = 'available';
  if (payload.copyright_holder === undefined) payload.copyright_holder = 'Nany Arruda';
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
        .filter(Boolean);
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
  const { error } = await supabase
    .from('artworks').delete().eq('artwork_id', id);
  
  return { error };
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
  const { error } = await supabase.from('collections').delete().eq('collection_id', id);
  if (error) throw error;
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
  const { error } = await supabase.from('series').delete().eq('series_id', id);
  if (error) throw error;
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
