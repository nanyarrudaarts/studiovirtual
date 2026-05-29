import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";

// ─── FONT REGISTRATION ──────────────────────────────────────────────────────

Font.register({
  family: 'Droid Serif',
  fonts: [
    { src: `${window.location.origin}/fonts/NotoSerif-Regular.ttf` },
    { src: `${window.location.origin}/fonts/NotoSerif-Bold.ttf`, fontWeight: 'bold' },
    { src: `${window.location.origin}/fonts/NotoSerif-Italic.ttf`, fontStyle: 'italic' },
  ],
});
Font.register({
  family: 'Great Vibes',
  src: `${window.location.origin}/fonts/GreatVibes-Regular.ttf`,
});

// ─── HELPERS ────────────────────────────────────────────────────────────────

const MEDIUM_MAP: Record<string, string> = {
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

const SUPPORT_MAP: Record<string, string> = {
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

const TITLE_MAP: Record<string, string> = {
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

  // 1. Já está no formato ideal "NA-2026-1002"
  const matchIdeal = cleanId.match(/^NA-(\d{4})-(\d{4,})$/);
  if (matchIdeal) {
    return cleanId;
  }

  // 2. Está no formato "NA-2026-002" ou "NA-2026-2" (menos de 4 dígitos)
  const matchShort = cleanId.match(/^NA-(\d{4})-(\d+)$/);
  if (matchShort) {
    const year = matchShort[1];
    const numStr = matchShort[2];
    let num = parseInt(numStr, 10);
    if (num < 1000) {
      num = 1000 + num;
    }
    return `NA-${year}-${num}`;
  }

  // 3. Formato legado complexo como "2026NA001C0A001E" ou "2026NA..."
  const matchLegacy = cleanId.match(/^(\d{4})NA(\d+)/);
  if (matchLegacy) {
    const year = matchLegacy[1];
    const numStr = matchLegacy[2];
    let num = parseInt(numStr, 10);
    if (num < 1000) {
      num = 1000 + num;
    }
    return `NA-${year}-${num}`;
  }

  // 4. Qualquer string contendo ano e algum número
  const yearMatch = cleanId.match(/\b(19\d{2}|20\d{2})\b/);
  const numMatch = cleanId.match(/(\d+)(?!.*\d)/); // último número na string
  const year = yearMatch ? yearMatch[1] : new Date().getFullYear().toString();
  if (numMatch) {
    let num = parseInt(numMatch[1], 10);
    if (num < 1000) {
      num = 1000 + num;
    }
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
  const supTranslated = SUPPORT_MAP[sKey] || support || '';
  const result = supTranslated ? `${medTranslated} ON ${supTranslated}` : medTranslated;
  return result.toUpperCase();
}

export function getEditionDisplay(editionNumber?: string, printRunTotal?: number, creationYear?: number): string {
  if (editionNumber && editionNumber !== 'Original Único' && editionNumber !== 'Original Unico' && editionNumber !== 'original unico') {
    return editionNumber.toUpperCase();
  }
  if (printRunTotal && printRunTotal > 1) {
    const num = editionNumber?.split('/')[0] || '1';
    return `${num}/${printRunTotal}`;
  }
  return 'UNIQUE ORIGINAL';
}

export function getVisualDescription(description?: string): string {
  // Retorna o texto poético padrão em inglês inteiramente em ALL CAPS para registro oficial
  return 'FOUR MOVEMENTS—NIGHT IN BLOOM, THE SEARCH, THE ENCOUNTER, AND GOLDEN EPIPHANY—NARRATE A JOURNEY OF HEALING. MERGING ORIGINAL POETRY AND IMAGE, GOLD FLOWS THROUGH COMPOSITIONS LIKE KINTSUGI, A TRACE OF LIGHT ENDURING SHADOW. THIS LUMINOSITY REVEALS THAT BEAUTY RESIDES IN TRANSCENDENCE.';
}

// ─── STYLESHEET ──────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    paddingTop: 85,
    paddingBottom: 85,
    paddingLeft: 85,
    paddingRight: 85,
    fontFamily: 'Courier',
  },

  // ── HEADER ──
  header: {
    alignItems: 'center',
    marginBottom: 0,
  },
  title1: {
    fontFamily: 'Droid Serif',
    fontSize: 38,
    fontWeight: 'bold',
    color: '#000000',
    letterSpacing: 3,
    textAlign: 'center',
    lineHeight: 1.1,
  },
  title2: {
    fontFamily: 'Great Vibes',
    fontSize: 58,
    color: '#c29b57',
    textAlign: 'center',
    marginTop: -26,
    marginBottom: -16,
  },
  title3: {
    fontFamily: 'Droid Serif',
    fontSize: 10,
    fontWeight: 'bold',
    color: '#000000',
    letterSpacing: 4,
    textAlign: 'center',
  },
  artistName: {
    fontFamily: 'Droid Serif',
    fontSize: 22,
    fontWeight: 'bold',
    color: '#c29b57',
    textAlign: 'center',
    marginTop: 8,
  },

  // ── IMAGE ──
  imageWrapper: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 10,
  },
  artworkImage: {
    width: 190,
    height: 250,
    objectFit: 'contain',
    alignSelf: 'center',
  },
  imagePlaceholder: {
    width: 190,
    height: 250,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    border: '0.75pt dotted #000000',
  },
  imagePlaceholderText: {
    fontFamily: 'Courier',
    fontSize: 11,
    color: '#9ca3af',
    letterSpacing: 1,
  },

  // ── METADATA TABLE ──
  metadataContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 24,
  },
  metadataColumn: {
    width: '48%',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    gap: 5,
    alignItems: 'flex-end',
    borderBottom: '0.75pt dotted #999999',
    paddingBottom: 2,
    marginBottom: 4,
  },
  label: {
    fontFamily: 'Courier',
    fontSize: 9,
    color: '#000000',
    textTransform: 'uppercase',
    flexShrink: 0,
  },
  value: {
    fontFamily: 'Courier',
    fontSize: 9,
    fontWeight: 'bold',
    color: '#000000',
    textAlign: 'left',
  },
  valueTrim: {
    fontFamily: 'Courier',
    fontSize: 9,
    fontWeight: 'bold',
    color: '#000000',
    textAlign: 'left',
    maxWidth: 180,
    maxLines: 1,
  },
  valueTitle: {
    fontFamily: 'Droid Serif',
    fontSize: 9,
    fontWeight: 'bold',
    fontStyle: 'italic',
    color: '#000000',
    textAlign: 'left',
    maxWidth: 180,
    maxLines: 1,
  },

  // ── VISUAL DESCRIPTION ──
  descriptionSection: {
    marginTop: 10,
    paddingTop: 6,
    borderTop: '0.75pt dotted #999999',
  },
  descriptionLabelInline: {
    fontFamily: 'Droid Serif',
    fontSize: 9,
    fontWeight: 'bold',
    color: '#000000',
  },
  descriptionText: {
    fontFamily: 'Droid Serif',
    fontSize: 9,
    fontStyle: 'italic',
    color: '#000000',
    textAlign: 'justify',
    lineHeight: 1.4,
  },

  // ── FOOTER ──
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 'auto',
    paddingTop: 10,
  },
  footerBlock: {
    width: '33.33%',
    alignItems: 'center',
  },
  signatureLine: {
    width: 140,
    borderTop: '0.5pt solid #999999',
    marginBottom: 6,
  },
  signatureLabel: {
    fontFamily: 'Courier',
    fontSize: 6,
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  signatureDate: {
    fontFamily: 'Courier',
    fontSize: 8,
    color: '#000000',
    marginTop: 4,
  },
  signatureLocation: {
    fontFamily: 'Courier',
    fontSize: 8,
    color: '#000000',
    textTransform: 'uppercase',
    marginTop: 2,
  },
  stampImage: {
    width: 70,
    height: 70,
    objectFit: 'contain',
    alignSelf: 'center',
    marginTop: -10,
  },
  sealText: {
    fontFamily: 'Droid Serif',
    fontSize: 9,
    color: '#b0ada8',
    textAlign: 'center',
    marginBottom: 10,
  },
});

// ─── TYPES ───────────────────────────────────────────────────────────────────

export interface CertificateData {
  title: string;
  artist: string;
  year: string;
  medium: string;
  dimensions: string;
  status: string;
  coaId: string;
  edition: string;
  seriesTitle: string;
  description: string;
  artworkImage: string;
  sealImage: string;
  issueDate?: Date;
  creationCity?: string;
  creationCountry?: string;
  category?: string;
  editionNumber?: string;
  saleStatus?: string;
  support?: string;
  artisticTechnique?: string;
  printRunTotal?: number;
  creationYear?: number;
  curatorialNarrative?: string;
}

// ─── COMPONENT ───────────────────────────────────────────────────────────────

export const CertificatePDF = ({ data }: { data: CertificateData }) => {
  // Translate title to English
  const translatedTitle = translateTitle(data.title);

  // Format COA ID to strict NA-[YEAR]-[ID] with 4 digits starting from 1000
  const formattedCoaId = formatCOAID(data.coaId);

  // Edition: smart logic
  const editionDisplay = getEditionDisplay(data.editionNumber, data.printRunTotal, data.creationYear);

  // Category: map medium to English category
  const categoryDisplay = getCategory(data.medium || data.category);

  // Medium: translate and combine with support
  const mediumDisplay = getMediumDisplay(data.medium, data.support);

  // Description: prefer curatorial narrative, fallback to standard text
  const descriptionText = getVisualDescription(data.curatorialNarrative || data.description);

  return (
    <Document
      title={`CERTIFICATE OF AUTHENTICITY - ${translatedTitle}`}
      author={(data.artist || "NANY ARRUDA").toUpperCase()}
      subject="CERTIFICATE OF AUTHENTICITY OF ORIGINAL ARTWORK - PDF/A COMPLIANT"
      creator="STUDIO VIRTUAL CURATORIAL BRAIN"
      producer="STUDIO VIRTUAL PRESERVATION ARCHIVE"
      keywords="OBJECT ID, PDF/A, ARTWORK, NANY ARRUDA, MUSEUM STANDARD"
    >
      <Page size="A4" style={styles.page}>

        {/* ── HEADER ── */}
        <View style={styles.header}>
          <Text style={styles.title1}>CERTIFICATE</Text>
          <Text style={styles.title2}>of Authenticity</Text>
          <Text style={styles.title3}>OF ORIGINAL ARTWORK</Text>
          <Text style={styles.artistName}>{(data.artist || 'NANY ARRUDA').toUpperCase()}</Text>
        </View>

        {/* ── IMAGE ── */}
        <View style={styles.imageWrapper}>
          {data.artworkImage ? (
            <Image
              src={data.artworkImage}
              style={styles.artworkImage}
            />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Text style={styles.imagePlaceholderText}>image</Text>
            </View>
          )}
        </View>

        {/* ── METADATA TABLE ── */}
        <View style={styles.metadataContainer}>

          {/* Left Column */}
          <View style={styles.metadataColumn}>
            <View style={styles.row}>
              <Text style={styles.label}>TITLE:</Text>
              <Text style={styles.valueTitle}>{translatedTitle}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>YEAR:</Text>
              <Text style={styles.value}>{(data.year || '—').toUpperCase()}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>CATEGORY:</Text>
              <Text style={styles.valueTrim}>{categoryDisplay}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>SERIES:</Text>
              <Text style={styles.valueTrim}>{(data.seriesTitle || '—').toUpperCase()}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>EDITION:</Text>
              <Text style={styles.valueTrim}>{editionDisplay}</Text>
            </View>
          </View>

          {/* Right Column */}
          <View style={styles.metadataColumn}>
            <View style={styles.row}>
              <Text style={styles.label}>ARTIST:</Text>
              <Text style={styles.valueTrim}>{(data.artist || 'NANY ARRUDA').toUpperCase()}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>DIMENSIONS:</Text>
              <Text style={styles.valueTrim}>{(data.dimensions || '—').toUpperCase()}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>MEDIUM:</Text>
              <Text style={styles.valueTrim}>{mediumDisplay || '—'}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>STATUS:</Text>
              <Text style={styles.value}>UNIQUE ORIGINAL - SIGNED BY THE ARTIST</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>COA ID:</Text>
              <Text style={styles.value}>{formattedCoaId}</Text>
            </View>
          </View>

        </View>

        {/* ── VISUAL DESCRIPTION ── */}
        <View style={styles.descriptionSection}>
          <Text style={styles.descriptionText}>
            <Text style={styles.descriptionLabelInline}>VISUAL DESCRIPTION: </Text>
            {descriptionText}
          </Text>
        </View>

        {/* ── FOOTER ── */}
        <View style={styles.footer}>

          {/* LEFT — Signature */}
          <View style={styles.footerBlock}>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureLabel}>SIGNATURE</Text>
            <Text style={styles.signatureDate}>__ / __ / 20__</Text>
            <Text style={styles.signatureLocation}>PORTO, PORTUGAL</Text>
          </View>

          {/* CENTER — Authenticity Stamp */}
          <View style={styles.footerBlock}>
            {data.sealImage ? (
              <Image src={data.sealImage} style={styles.stampImage} />
            ) : null}
          </View>

          {/* RIGHT — Seal */}
          <View style={styles.footerBlock}>
            <Text style={styles.sealText}>SEAL</Text>
          </View>

        </View>

      </Page>
    </Document>
  );
};
