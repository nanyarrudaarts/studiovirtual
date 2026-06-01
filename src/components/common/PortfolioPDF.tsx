import React from 'react';
import {
  Document, Page, View, Text, Image, StyleSheet, Font,
} from '@react-pdf/renderer';
import type { Artwork } from '../../types';

// ─── Font Registration ─────────────────────────────────────────────────────────
Font.register({
  family: 'EBGaramond',
  fonts: [
    { src: '/fonts/NotoSerif-Regular.ttf', fontWeight: 'normal' },
    { src: '/fonts/NotoSerif-Italic.ttf', fontWeight: 'normal', fontStyle: 'italic' },
    { src: '/fonts/NotoSerif-Bold.ttf', fontWeight: 'bold' },
  ],
});
Font.register({
  family: 'Inter',
  fonts: [
    { src: '/fonts/NotoSerif-Regular.ttf', fontWeight: 'normal' },
    { src: '/fonts/NotoSerif-Bold.ttf', fontWeight: 'bold' },
  ],
});

import { buildTechnicalLegend } from '../../lib/pdfHelpers';

// ─── Shared Styles ────────────────────────────────────────────────────────────
const shared = StyleSheet.create({
  page: {
    backgroundColor: '#ffffff',
    paddingTop: 60,
    paddingBottom: 60,
    paddingLeft: 64,
    paddingRight: 64,
    fontFamily: 'Inter',
  },
  titleItalic: {
    fontFamily: 'EBGaramond',
    fontStyle: 'italic',
    fontSize: 9,
    color: '#1A1816',
    letterSpacing: 0.3,
    marginBottom: 3,
  },
  legend: {
    fontFamily: 'Inter',
    fontSize: 8,
    color: '#6B6762',
    lineHeight: 1.5,
    marginTop: 4,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 64,
    right: 64,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 0.5,
    borderTopColor: '#E0DDD8',
    paddingTop: 6,
  },
  footerText: {
    fontFamily: 'Inter',
    fontSize: 7,
    color: '#B0ADA8',
    letterSpacing: 0.5,
  },
  coverHeader: {
    fontFamily: 'Inter',
    fontSize: 7,
    letterSpacing: 2,
    color: '#6B5CE7',
    textTransform: 'uppercase',
    marginBottom: 60,
  },
  coverArtistName: {
    fontFamily: 'EBGaramond',
    fontSize: 48,
    color: '#1A1816',
    lineHeight: 1.1,
  },
  coverAccent: {
    width: 40,
    height: 2,
    backgroundColor: '#6B5CE7',
    marginTop: 20,
    marginBottom: 20,
  },
  coverSubtitle: {
    fontFamily: 'Inter',
    fontSize: 9,
    letterSpacing: 2,
    color: '#6B6762',
    textTransform: 'uppercase',
  },
  coverDate: {
    fontFamily: 'Inter',
    fontSize: 7,
    color: '#B0ADA8',
    marginTop: 8,
    letterSpacing: 1,
  },
});

// ─── Cover Page ────────────────────────────────────────────────────────────────
function CoverPage({ artistName }: { artistName: string }) {
  return (
    <Page size="A4" style={shared.page}>
      <Text style={shared.coverHeader}>Curatorial Portfolio · Studio Virtual</Text>
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <Text style={shared.coverArtistName}>{artistName}</Text>
        <View style={shared.coverAccent} />
        <Text style={shared.coverSubtitle}>Portfolio · Catalogue of Works</Text>
        <Text style={shared.coverDate}>
          Edition {new Date().getFullYear()} · Object ID Standard
        </Text>
      </View>
      <View style={shared.footer}>
        <Text style={shared.footerText}>{artistName}</Text>
        <Text style={shared.footerText}>{new Date().toLocaleDateString('en-GB')}</Text>
      </View>
    </Page>
  );
}

// ─── Template A — "The Collector" (1 artwork per page, max 80% height) ────────
function TemplateAPage({
  artwork, scale, pageNum, total, artistName,
}: {
  artwork: Artwork; scale: number; pageNum: number; total: number; artistName: string;
}) {
  const imageHeightPct = Math.min(scale, 100) / 100;
  const legend = buildTechnicalLegend(artwork);
  const imageHeight = 550 * 0.80 * imageHeightPct;

  return (
    <Page size="A4" style={shared.page}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        {artwork.cover_image ? (
          <Image
            src={artwork.cover_image}
            style={{ maxHeight: imageHeight, maxWidth: '100%', objectFit: 'contain' }}
          />
        ) : (
          <View style={{ height: imageHeight, width: '100%', backgroundColor: '#F5F3EE', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontFamily: 'Inter', fontSize: 8, color: '#B0ADA8' }}>No image registered</Text>
          </View>
        )}

        <View style={{ alignItems: 'center', marginTop: 12 }}>
          <Text style={shared.titleItalic}>
            {(artwork.artwork_title || '').toUpperCase()}
          </Text>
          <Text style={shared.legend}>{legend.split(', ').slice(1).join(', ')}</Text>
        </View>
      </View>

      <View style={shared.footer}>
        <Text style={shared.footerText}>{artistName}</Text>
        <Text style={shared.footerText}>{pageNum} / {total}</Text>
      </View>
    </Page>
  );
}

// ─── Template B — "The Gallery" (grid of 2 or 4 artworks per page) ────────────
function TemplateBPage({
  artworks, cols, pageNum, total, artistName,
}: {
  artworks: Artwork[]; cols: 2 | 4;
  pageNum: number; total: number; artistName: string;
}) {
  const imageHeight = cols === 2 ? 220 : 110;
  const colWidth = cols === 2 ? '48%' : '23%';

  return (
    <Page size="A4" style={shared.page}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, flex: 1, alignContent: 'flex-start' }}>
        {artworks.map((aw) => (
          <View key={aw.artwork_id} style={{ width: colWidth }}>
            {aw.cover_image ? (
              <Image
                src={aw.cover_image}
                style={{ height: imageHeight, objectFit: 'contain', backgroundColor: '#F5F3EE' }}
              />
            ) : (
              <View style={{ height: imageHeight, backgroundColor: '#F5F3EE', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontFamily: 'Inter', fontSize: 7, color: '#B0ADA8' }}>No image</Text>
              </View>
            )}
            <Text style={[shared.titleItalic, { marginTop: 4 }]}>
              {(aw.artwork_title || '').toUpperCase()}
            </Text>
            {aw.creation_year && (
              <Text style={[shared.legend, { marginTop: 1 }]}>{aw.creation_year}</Text>
            )}
          </View>
        ))}
      </View>
      <View style={shared.footer}>
        <Text style={shared.footerText}>{artistName}</Text>
        <Text style={shared.footerText}>{pageNum} / {total}</Text>
      </View>
    </Page>
  );
}

// ─── Template C — "The Chronological" (vertical list, miniature + full data) ──
function TemplateCPage({
  artworks, pageNum, total, artistName,
}: {
  artworks: Artwork[]; pageNum: number; total: number; artistName: string;
}) {
  return (
    <Page size="A4" style={shared.page}>
      <View style={{ flex: 1, gap: 24 }}>
        {artworks.map((aw) => (
          <View key={aw.artwork_id} style={{ flexDirection: 'row', gap: 16 }}>
            {/* Miniature ~30% width */}
            <View style={{ width: '30%' }}>
              {aw.cover_image ? (
                <Image
                  src={aw.cover_image}
                  style={{ height: 90, objectFit: 'contain', backgroundColor: '#F5F3EE' }}
                />
              ) : (
                <View style={{ height: 90, backgroundColor: '#F5F3EE' }} />
              )}
            </View>
            {/* Description 70% width */}
            <View style={{ flex: 1, justifyContent: 'flex-start' }}>
              <Text style={shared.titleItalic}>
                {(aw.artwork_title || '').toUpperCase()}
              </Text>
              <Text style={shared.legend}>{buildTechnicalLegend(aw).split(', ').slice(1).join(', ')}</Text>
              {aw.curatorial_narrative ? (
                <Text style={[shared.legend, { marginTop: 6, fontStyle: 'italic', color: '#1A1816' }]}>
                  {aw.curatorial_narrative.slice(0, 280)}{aw.curatorial_narrative.length > 280 ? '…' : ''}
                </Text>
              ) : null}
            </View>
          </View>
        ))}
      </View>
      <View style={shared.footer}>
        <Text style={shared.footerText}>{artistName}</Text>
        <Text style={shared.footerText}>{pageNum} / {total}</Text>
      </View>
    </Page>
  );
}

// ─── Artist Statement Page ─────────────────────────────────────────────────────
function StatementPage({ statement, artistName }: { statement: string; artistName: string }) {
  return (
    <Page size="A4" style={shared.page}>
      <Text style={[shared.titleItalic, { fontSize: 7, letterSpacing: 2, color: '#6B5CE7', marginBottom: 24 }]}>
        ARTIST STATEMENT
      </Text>
      <Text style={{
        fontFamily: 'EBGaramond',
        fontStyle: 'italic',
        fontSize: 13,
        color: '#1A1816',
        lineHeight: 1.8,
        flex: 1,
      }}>
        {statement}
      </Text>
      <View style={shared.footer}>
        <Text style={shared.footerText}>{artistName}</Text>
        <Text style={shared.footerText}>Artist Statement</Text>
      </View>
    </Page>
  );
}

// ─── Main PDF Document ─────────────────────────────────────────────────────────
interface PortfolioPDFProps {
  artworks: Artwork[];
  template: 'A' | 'B' | 'C';
  artistName: string;
  portfolioTitle: string;
  artistStatement?: string | null;
  imageScales: Record<string, number>;
  includeCover: boolean;
  gridColumns: 2 | 4;
}

export function PortfolioPDF({
  artworks,
  template,
  artistName,
  portfolioTitle,
  artistStatement,
  imageScales,
  includeCover,
  gridColumns,
}: PortfolioPDFProps) {
  // Sort chronologically inverse for Template C
  const sortedArtworks = template === 'C'
    ? [...artworks].sort((a, b) => (b.creation_year || 0) - (a.creation_year || 0))
    : artworks;

  const artworkPages: React.ReactElement[] = [];

  if (template === 'A') {
    sortedArtworks.forEach((aw, idx) => {
      artworkPages.push(
        <TemplateAPage
          key={aw.artwork_id}
          artwork={aw}
          scale={imageScales[aw.artwork_id] ?? 100}
          pageNum={idx + 1}
          total={sortedArtworks.length}
          artistName={artistName}
        />
      );
    });
  } else if (template === 'B') {
    // Chunk into groups of gridColumns
    for (let i = 0; i < sortedArtworks.length; i += gridColumns) {
      const chunk = sortedArtworks.slice(i, i + gridColumns);
      const pageNum = Math.floor(i / gridColumns) + 1;
      const total = Math.ceil(sortedArtworks.length / gridColumns);
      artworkPages.push(
        <TemplateBPage
          key={i}
          artworks={chunk}
          cols={gridColumns}
          pageNum={pageNum}
          total={total}
          artistName={artistName}
        />
      );
    }
  } else {
    // Template C: 3 artworks per page
    for (let i = 0; i < sortedArtworks.length; i += 3) {
      const chunk = sortedArtworks.slice(i, i + 3);
      const pageNum = Math.floor(i / 3) + 1;
      const total = Math.ceil(sortedArtworks.length / 3);
      artworkPages.push(
        <TemplateCPage
          key={i}
          artworks={chunk}
          pageNum={pageNum}
          total={total}
          artistName={artistName}
        />
      );
    }
  }

  return (
    <Document
      title={portfolioTitle}
      author={artistName}
      creator="Studio Virtual — Curatorial Brain"
      producer="@react-pdf/renderer"
    >
      {includeCover && <CoverPage artistName={artistName} />}
      {artistStatement && <StatementPage statement={artistStatement} artistName={artistName} />}
      {artworkPages}
    </Document>
  );
}
