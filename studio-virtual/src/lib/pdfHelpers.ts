import type { Artwork } from '../types';

// ─── HELPERS FROM CertificatePDF ─────────────────────────────────────────────

export const MEDIUM_MAP: Record<string, string> = {
  'acrílica': 'ACRYLIC',
  'acrilica': 'ACRYLIC',
  'acrílico': 'ACRYLIC',
  'acrilico': 'ACRYLIC',
  'óleo': 'OIL',
  'oleo': 'OIL',
  'aquarela': 'WATERCOLOR',
  'técnica mista': 'MIXED MEDIA',
  'tecnica mista': 'MIXED MEDIA',
  'pastel': 'PASTEL',
  'guache': 'GOUACHE',
  'nanquim': 'INK',
  'lápis': 'PENCIL',
  'lapis': 'PENCIL',
  'grafite': 'GRAPHITE',
};

export const SUPPORT_MAP_CERT: Record<string, string> = {
  'tela': 'CANVAS',
  'tela de linho': 'LINEN CANVAS',
  'tela de algodão': 'COTTON CANVAS',
  'tela de algodao': 'COTTON CANVAS',
  'papel': 'PAPER',
  'mdf': 'MDF BOARD',
  'madeira': 'WOOD',
  'cartão': 'CARDBOARD',
  'cartao': 'CARDBOARD',
};

export const TITLE_MAP: Record<string, string> = {
  'noite em flor': 'NIGHT IN BLOOM',
  'noite em flor i': 'NIGHT IN BLOOM I',
  'noite em flor ii': 'NIGHT IN BLOOM II',
  'noite em flor iii': 'NIGHT IN BLOOM III',
  'noite em flor iv': 'NIGHT IN BLOOM IV',
};

export function translateTitle(title?: string): string {
  if (!title) return '—';
  const tKey = title.toLowerCase().trim();
  const translated = TITLE_MAP[tKey] || title;
  return translated.toUpperCase();
}

export function formatCOAID(coaId?: string): string {
  if (!coaId) return '';
  const cleanId = coaId.trim().toUpperCase();

  const matchIdeal = cleanId.match(/^NA-(\d{4})-(\d{4,})$/);
  if (matchIdeal) return cleanId;

  const matchShort = cleanId.match(/^NA-(\d{4})-(\d+)$/);
  if (matchShort) {
    const year = matchShort[1];
    let num = parseInt(matchShort[2], 10);
    if (num < 1000) num = 1000 + num;
    return `NA-${year}-${num}`;
  }

  const matchLegacy = cleanId.match(/^(\d{4})NA(\d+)/);
  if (matchLegacy) {
    const year = matchLegacy[1];
    let num = parseInt(matchLegacy[2], 10);
    if (num < 1000) num = 1000 + num;
    return `NA-${year}-${num}`;
  }

  const yearMatch = cleanId.match(/\b(19\d{2}|20\d{2})\b/);
  const numMatch = cleanId.match(/(\d+)(?!.*\d)/);
  const year = yearMatch ? yearMatch[1] : new Date().getFullYear().toString();
  if (numMatch) {
    let num = parseInt(numMatch[1], 10);
    if (num < 1000) num = 1000 + num;
    return `NA-${year}-${num}`;
  }

  return `NA-${year}-1001`;
}

export function getCategory(medium?: string): string {
  const m = medium?.toLowerCase() || '';
  if (m.includes('acrílica') || m.includes('acrilica') || m.includes('óleo') || m.includes('oleo') || m.includes('aquarela') || m.includes('guache')) return 'PAINTING';
  if (m.includes('escultura')) return 'SCULPTURE';
  if (m.includes('fotografia')) return 'PHOTOGRAPHY';
  if (m.includes('digital')) return 'DIGITAL ART';
  if (m.includes('gravura')) return 'PRINTMAKING';
  if (m.includes('instalação') || m.includes('instalacao')) return 'INSTALLATION';
  if (m.includes('desenho') || m.includes('grafite') || m.includes('lápis') || m.includes('nanquim')) return 'DRAWING';
  return 'PAINTING';
}

export function getMediumDisplay(medium?: string, support?: string): string {
  const m = medium?.toLowerCase() || '';
  const s = support?.toLowerCase() || '';
  
  if ((m.includes('acrílica') || m.includes('acrilica')) && (m.includes('tela') || s.includes('tela'))) {
    return 'ACRYLIC ON COTTON CANVAS';
  }
  if ((m.includes('óleo') || m.includes('oleo')) && (m.includes('tela') || s.includes('tela'))) {
    return 'OIL ON COTTON CANVAS';
  }

  const mKey = m.trim();
  const sKey = s.trim();
  const medTranslated = MEDIUM_MAP[mKey] || medium || '';
  const supTranslated = SUPPORT_MAP_CERT[sKey] || support || '';
  const result = supTranslated ? `${medTranslated} ON ${supTranslated}` : medTranslated;
  return result.toUpperCase();
}

export function getEditionDisplay(editionNumber?: string, printRunTotal?: number): string {
  if (editionNumber && editionNumber !== 'Original Único' && editionNumber !== 'Original Unico' && editionNumber !== 'original unico') {
    return editionNumber.toUpperCase();
  }
  if (printRunTotal && printRunTotal > 1) {
    const num = editionNumber?.split('/')[0] || '1';
    return `${num}/${printRunTotal}`;
  }
  return 'UNIQUE ORIGINAL';
}

export function getVisualDescription(): string {
  return 'FOUR MOVEMENTS—NIGHT IN BLOOM, THE SEARCH, THE ENCOUNTER, AND GOLDEN EPIPHANY—NARRATE A JOURNEY OF HEALING. MERGING ORIGINAL POETRY AND IMAGE, GOLD FLOWS THROUGH COMPOSITIONS LIKE KINTSUGI, A TRACE OF LIGHT ENDURING SHADOW. THIS LUMINOSITY REVEALS THAT BEAUTY RESIDES IN TRANSCENDENCE.';
}

// ─── HELPERS FROM PortfolioPDF ───────────────────────────────────────────────

export const MATERIAL_MAP_PORT: Record<string, string> = {
  'acrílica': 'Acrylic', 'acrilica': 'Acrylic', 'acrílico': 'Acrylic',
  'óleo': 'Oil', 'oleo': 'Oil',
  'aquarela': 'Watercolor',
  'guache': 'Gouache',
  'têmpera': 'Tempera', 'tempera': 'Tempera',
  'carvão': 'Charcoal', 'carvao': 'Charcoal',
  'grafite': 'Graphite',
  'pastel': 'Pastel',
  'tinta': 'Ink',
  'folha de ouro': 'Gold Leaf',
  'técnica mista': 'Mixed Media', 'tecnica mista': 'Mixed Media',
  'impressão': 'Print', 'impressao': 'Print',
  'pintura': 'Painting',
  'desenho': 'Drawing',
  'fotografia': 'Photography',
  'escultura': 'Sculpture',
  'instalação': 'Installation', 'instalacao': 'Installation',
};

export const SUPPORT_MAP_PORT: Record<string, string> = {
  'tela': 'Canvas',
  'tela de algodão': 'Cotton Canvas', 'tela de algodao': 'Cotton Canvas',
  'papel': 'Paper',
  'papel de algodão': 'Cotton Paper',
  'madeira': 'Wood',
  'painel de madeira': 'Wood Panel',
  'linho': 'Linen',
  'placa de mdf': 'MDF Board', 'mdf': 'MDF Board',
  'metal': 'Metal',
  'alumínio': 'Aluminium', 'aluminio': 'Aluminium',
  'vidro': 'Glass',
  'cartão': 'Cardboard', 'cartao': 'Cardboard',
  'parede': 'Wall',
};

function translateTerm(term: string, map: Record<string, string>): string {
  const key = term.toLowerCase().trim();
  return map[key] || term;
}

export function buildTechnicalLegend(artwork: Artwork, imageScale?: number): string {
  const title = (artwork.artwork_title || '').toUpperCase();
  const year = artwork.creation_year || '';

  let mediumStr = '';
  const medium = artwork.medium || '';
  const support = artwork.support || '';

  if (medium && support) {
    const medT = translateTerm(medium, MATERIAL_MAP_PORT);
    const supT = translateTerm(support, SUPPORT_MAP_PORT);
    mediumStr = `${medT} on ${supT}`;
  } else if (medium) {
    mediumStr = translateTerm(medium, MATERIAL_MAP_PORT);
  } else if (support) {
    mediumStr = translateTerm(support, SUPPORT_MAP_PORT);
  }

  let dimStr = '';
  const h = artwork.height;
  const w = artwork.width;
  const d = artwork.depth;
  if (h && w) {
    dimStr = d ? `${h} × ${w} × ${d} cm` : `${h} × ${w} cm`;
  } else if (artwork.dimensions_formatted) {
    dimStr = artwork.dimensions_formatted;
  }

  const parts: string[] = [];
  if (year) parts.push(String(year));
  if (mediumStr) parts.push(mediumStr);
  if (dimStr) parts.push(dimStr);
  if (imageScale && imageScale < 100) parts.push(`(${imageScale}%)`);

  return parts.length > 0
    ? `${title}, ${parts.join('. ')}.`
    : title;
}
