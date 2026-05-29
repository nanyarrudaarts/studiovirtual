// ─── Shared sub-types ───────────────────────────────────────────────────────

export interface ProvenanceEntry {
  owner: string
  acquisition_date: string
  acquisition_method: string
  notes?: string
}

export interface ExhibitionEntry {
  exhibition_title: string
  gallery: string
  city: string
  country: string
  year: string
  curator?: string
}

export interface RestorationEntry {
  date: string
  description: string
  restorer?: string
}

export interface PublicationEntry {
  title: string
  publisher: string
  year: string
  link?: string
}

// ─── COLLECTION ──────────────────────────────────────────────────────────────

export interface Collection {
  collection_id: string
  collection_name: string
  collection_description?: string
  start_date?: string
  end_date?: string
  total_items: number
  item_types?: string[]
  provenance_history?: ProvenanceEntry[]
  acquisition_method?: string
  keywords?: string[]
  thematic_descriptors?: string[]
  artistic_theme?: string
  relevance_notes?: string
  physical_location?: string
  storage_reference?: string
  visibility_status: 'public' | 'private' | 'archived'
  cover_image?: string
  created_at: string
  updated_at: string
}

// ─── SERIES ──────────────────────────────────────────────────────────────────

export interface Series {
  series_id: string
  parent_collection_id?: string
  series_title: string
  series_number?: number

  // Curatorial texts
  conceptual_statement?: string    // legacy
  conceptual_summary?: string      // new
  curatorial_narrative?: string    // new
  thematic_connection?: string
  narrative_description?: string

  // Period & geography
  start_year?: number
  end_year?: number
  production_period?: string
  creation_locations?: string

  // Materials & techniques
  predominant_materials?: string[]
  predominant_techniques?: string[]

  // Edition
  edition_type?: 'unique' | 'limited' | 'open' | 'artist_proof'
  edition_fraction?: string
  print_run_total?: number

  // Display
  display_order: number
  group_label?: string
  keywords?: string[]
  cover_image?: string
  cor: string

  // Status
  series_status?: string
  visibility_status?: 'public' | 'private' | 'archived'

  created_at: string
  updated_at: string
}

// ─── ARTWORK ─────────────────────────────────────────────────────────────────

export interface Artwork {
  artwork_id: string
  accession_number?: string
  inventory_number?: string

  // Basic info
  artwork_title: string
  alternative_title?: string
  artwork_description?: string
  creation_date?: string
  creation_year?: number
  creation_city?: string
  creation_country?: string

  // Authorship
  artist_name: string
  studio_name?: string
  attribution?: string

  // Technique
  medium?: string
  support?: string
  materials?: string[]
  artistic_technique?: string

  // Curatorial texts
  interpretive_title?: string
  summary_sentence?: string
  curatorial_narrative?: string
  epigraph?: string
  intent_note?: string

  // Dimensions
  height?: number
  width?: number
  depth?: number
  weight?: number
  dimensions_unit: string
  dimensions_formatted?: string

  // Image quality
  dpi?: number
  resolution_px?: string

  // Conservation
  condition_state?: 'excellent' | 'good' | 'fair' | 'poor' | 'in_restoration'
  conservation_notes?: string
  restoration_history?: RestorationEntry[]

  // Authenticity
  certificate_of_authenticity: boolean
  certificate_url?: string
  signature_status?: 'signed' | 'unsigned' | 'monogrammed' | 'stamped'
  provenance_chain?: ProvenanceEntry[]

  // Files
  artwork_images?: string[]
  artwork_images_labels?: string[]
  detail_images?: string[]
  process_images?: string[]
  video_documentation?: string[]
  cover_image?: string

  // Organization
  collection_reference?: string
  series_reference?: string
  classification: 'singular' | 'series' | 'collection'
  display_order: number
  tags?: string[]
  keywords?: string[]

  // Exhibition
  exhibition_history?: ExhibitionEntry[]
  publication_history?: PublicationEntry[]
  exposed: boolean

  // Commercial
  sale_status: 'available' | 'sold' | 'reserved' | 'private_collection' | 'not_for_sale'
  price?: number
  edition_number?: string

  // Rights
  copyright_holder: string
  visibility_status: 'public' | 'private' | 'archived'
  physical_location?: string
  sustainable_materials: boolean

  created_at: string
  updated_at: string
}

// ─── Legacy (keep for compatibility) ─────────────────────────────────────────

export interface Material {
  id: string
  nome: string
  categoria: string
  quantidade: number
  unidade: string
  status_estoque: 'ok' | 'baixo' | 'esgotado'
  ultima_compra?: string
}

export interface DashboardMetrics {
  totalObras: number
  obrasDisponiveis: number
  valorEstimado: number
  exposicoesAtivas: number
}
