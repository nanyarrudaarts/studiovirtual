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

import {
  translateTitle,
  formatCOAID,
  getCategory,
  getMediumDisplay,
  getEditionDisplay,
  getVisualDescription
} from '../../lib/pdfHelpers';

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
  const editionDisplay = getEditionDisplay(data.editionNumber, data.printRunTotal);

  // Category: map medium to English category
  const categoryDisplay = getCategory(data.medium || data.category);

  // Medium: translate and combine with support
  const mediumDisplay = getMediumDisplay(data.medium, data.support);

  // Description: prefer curatorial narrative, fallback to standard text
  const descriptionText = getVisualDescription();

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
