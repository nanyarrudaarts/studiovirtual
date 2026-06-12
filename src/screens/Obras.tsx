import { useState, useEffect, useMemo } from 'react';
import { Search, Plus, X, ChevronLeft, ChevronRight, Leaf, Palette, Archive, Layers, Trash2, FileDown } from 'lucide-react';
import { getArtworks, getSeries, getCollections, deleteArtwork, deleteSerie, deleteCollection } from '../services/supabase';
import type { Artwork, Series, Collection } from '../types';
import { useNavigate } from 'react-router-dom';
import { downloadCertificate } from '../lib/generateCertificate';
import { formatCOAID, translateTitle } from '../lib/pdfHelpers';

type Tab = 'unicas' | 'series' | 'colecoes';

const STATUS_LABEL: Record<string, string> = {
  available: 'Disponível', sold: 'Vendida', reserved: 'Reservada',
  private_collection: 'Coleção Privada', not_for_sale: 'Não à venda',
};

const STATUS_CLASS: Record<string, string> = {
  available:          'bg-[#10B981]/12 text-[#10B981] border border-[#10B981]/30',
  sold:               'bg-[#646473]/10 text-[var(--text-faint)] border border-[var(--border)]',
  reserved:           'bg-[#F59E0B]/12 text-[#F59E0B] border border-[#F59E0B]/30',
  private_collection: 'bg-[#8B5CF6]/10 text-[#8B5CF6] border border-[#8B5CF6]/25',
  not_for_sale:       'bg-[#3B82F6]/10 text-[#3B82F6] border border-[#3B82F6]/25',
};

export default function Obras() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('unicas');
  const [search, setSearch] = useState('');
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [series, setSeries] = useState<Series[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Artwork | null>(null);
  const [photoIdx, setPhotoIdx] = useState(0);
  const [error, setError] = useState('');
  const [itemToDelete, setItemToDelete] = useState<{ id: string; type: 'artwork' | 'series' | 'collection'; title: string } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isGeneratingCOA, setIsGeneratingCOA] = useState(false);

  useEffect(() => {
    Promise.all([
      getArtworks({ classification: 'singular' }).catch(() => []),
      getSeries().catch(() => []),
      getCollections().catch(() => []),
    ]).then(([a, s, c]) => {
      setArtworks(a);
      setSeries(s);
      setCollections(c);
    }).catch(e => setError(e.message)).finally(() => setLoading(false));
  }, []);

  const handleDelete = (id: string, title: string) => setItemToDelete({ id, type: 'artwork', title });
  const handleDeleteSerie = (id: string, title: string) => setItemToDelete({ id, type: 'series', title });
  const handleDeleteCollection = (id: string, title: string) => setItemToDelete({ id, type: 'collection', title });

  const executeDelete = async () => {
    if (!itemToDelete) return;
    await new Promise(resolve => setTimeout(resolve, 0));
    const { id, type } = itemToDelete;
    setError('');
    setDeletingId(id);
    try {
      if (type === 'artwork') {
        const { error } = await deleteArtwork(id);
        if (error) throw error;
        setArtworks(prev => prev.filter(a => a.artwork_id !== id));
        if (selected?.artwork_id === id) setSelected(null);
      } else if (type === 'series') {
        await deleteSerie(id);
        setSeries(prev => prev.filter(s => s.series_id !== id));
      } else if (type === 'collection') {
        await deleteCollection(id);
        setCollections(prev => prev.filter(c => c.collection_id !== id));
      }
      setItemToDelete(null);
    } catch (e) {
      setError('Erro ao deletar: ' + (e as Error).message);
      setItemToDelete(null);
    } finally {
      setDeletingId(null);
    }
  };

  const handleExportPDF = async (artwork: Artwork) => {
    setIsGeneratingCOA(true);
    try {
      const seriesTitle = artwork.series_reference
        ? series.find(s => s.series_id === artwork.series_reference)?.series_title || '—'
        : '—';
      const coaId = artwork.accession_number || `NA-${new Date().getFullYear()}-${1000 + artworks.indexOf(artwork) + 1}`;
      const data = {
        title: artwork.artwork_title || 'Sem Título',
        artist: artwork.artist_name || 'Nany Arruda',
        year: artwork.creation_year?.toString() || 'N/A',
        medium: artwork.medium || '',
        dimensions: artwork.dimensions_formatted || 'N/A',
        status: 'Original',
        coaId,
        edition: artwork.classification === 'singular' ? 'Unique' : artwork.edition_number || 'N/A',
        seriesTitle,
        description: (artwork as Artwork & { artwork_description?: string }).artwork_description || '',
        artworkImage: artwork.cover_image || artwork.artwork_images?.[0] || '',
        sealImage: `${window.location.origin}/stamp.png`,
        issueDate: new Date(),
        support: artwork.support || undefined,
        artisticTechnique: artwork.artistic_technique || undefined,
        creationYear: artwork.creation_year || undefined,
        curatorialNarrative: artwork.curatorial_narrative || undefined,
        editionNumber: artwork.edition_number || undefined,
        saleStatus: artwork.sale_status || undefined,
      };
      const formattedCoaId = formatCOAID(coaId);
      const translatedTitle = translateTitle(artwork.artwork_title || 'obra');
      const fileName = `COA_${formattedCoaId}_${translatedTitle.replace(/\s+/g, '_')}.pdf`;
      await downloadCertificate(data, fileName);
    } catch (error) {
      alert('Erro ao gerar o certificado: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsGeneratingCOA(false);
    }
  };

  const q = search.toLowerCase();

  // ⚡ BOLT OPTIMIZATION: Memoize filtered results to prevent expensive re-filtering on every render
  const filteredArtworks = useMemo(() =>
    artworks.filter(a =>
      !q || a.artwork_title.toLowerCase().includes(q) || (a.medium ?? '').toLowerCase().includes(q)
    ), [artworks, q]
  );

  const filteredSeries = useMemo(() =>
    series.filter(s => !q || s.series_title.toLowerCase().includes(q)),
    [series, q]
  );

  const filteredCollections = useMemo(() =>
    collections.filter(c => !q || c.collection_name.toLowerCase().includes(q)),
    [collections, q]
  );

  // ⚡ BOLT OPTIMIZATION: Memoize tabs configuration array
  const tabs: { id: Tab; label: string; icon: React.ReactNode; count: number }[] = useMemo(() => [
    { id: 'unicas', label: 'Únicas', icon: <Palette size={15} />, count: artworks.length },
    { id: 'series', label: 'Séries', icon: <Layers size={15} />, count: series.length },
    { id: 'colecoes', label: 'Coleções', icon: <Archive size={15} />, count: collections.length },
  ], [artworks.length, series.length, collections.length]);

  return (
    <div className="space-y-7 relative pb-20 md:pb-0">

      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif text-text-main">Obras</h1>
          <div className="gold-line mt-2 w-16" />
        </div>
        <div className="hidden md:flex items-center gap-2">
          {[
            { label: 'Obra Singular', type: 'singular' },
            { label: 'Série', type: 'serie' },
            { label: 'Coleção', type: 'colecao' },
          ].map((btn, i) => (
            <button
              key={btn.type}
              onClick={() => navigate(`/upload?type=${btn.type}`)}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer hover-lift ${
                i === 0
                  ? 'btn-gold-gradient shadow-[0_4px_16px_var(--gold-glow)]'
                  : 'bg-surface text-text-main border border-border'
              }`}
            >
              <Plus size={14} /> {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 p-1 rounded-xl w-fit bg-surface">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
              tab === t.id
                ? 'bg-surface-raised text-gold shadow-[0_2px_8px_rgba(0,0,0,0.2)] border border-[rgba(201,168,76,0.2)]'
                : 'text-text-muted'
            }`}
          >
            {t.icon} {t.label}
            <span
              className={`text-xs px-1.5 py-0.5 rounded-full ${
                tab === t.id
                  ? 'bg-[rgba(201,168,76,0.15)] text-gold'
                  : 'bg-surface-raised text-text-faint'
              }`}
            >
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* ── Search ── */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-faint" size={16} />
        <input
          type="text"
          placeholder="Buscar obra..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm outline-none transition-all bg-surface border border-border text-text-main focus:border-gold"
        />
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="rounded-xl px-4 py-3 text-sm bg-[#F43F5E]/10 border border-[#F43F5E]/30 text-[#F43F5E]">
          {error}
        </div>
      )}

      {/* ── Loading ── */}
      {loading && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="rounded-2xl aspect-square animate-pulse bg-surface-raised" />
          ))}
        </div>
      )}

      {/* ── TAB: ÚNICAS ── */}
      {!loading && tab === 'unicas' && (
        <>
          {filteredArtworks.length === 0 ? (
            <div className="text-center py-24 text-text-muted">
              <Palette size={48} className="mx-auto mb-4 opacity-20" />
              <p className="font-medium">Nenhuma obra encontrada.</p>
              <button
                onClick={() => navigate('/upload')}
                className="mt-4 text-sm hover-lift inline-flex items-center gap-1 px-4 py-2 rounded-xl transition-all text-gold border border-[rgba(201,168,76,0.25)] bg-[rgba(201,168,76,0.05)]"
              >
                <Plus size={14} /> Adicionar primeira obra
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {filteredArtworks.map((obra, idx) => (
                <div
                  key={obra.artwork_id}
                  onClick={() => { setSelected(obra); setPhotoIdx(0); }}
                  className={`glass-slab rounded-2xl overflow-hidden group cursor-pointer hover-lift transition-all float-anim ${deletingId === obra.artwork_id ? 'opacity-50 pointer-events-none' : ''}`}
                  style={{ animationDelay: `${(idx % 4) * 0.15}s` }}
                >
                  {/* Top gold edge */}
                  <div className="gold-line opacity-50" />

                  <div className="relative aspect-square overflow-hidden bg-surface-raised">
                    {obra.cover_image || obra.artwork_images?.[0] ? (
                      <img src={obra.cover_image || obra.artwork_images![0]} alt={obra.artwork_title}
                        loading="lazy"
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-text-faint">
                        <Palette size={40} />
                      </div>
                    )}
                    {/* Status badge */}
                    <span
                      className={`absolute top-2 right-2 text-[10px] font-semibold px-2.5 py-1 rounded-full ${STATUS_CLASS[obra.sale_status] ?? ''}`}
                    >
                      {STATUS_LABEL[obra.sale_status]}
                    </span>
                    {obra.sustainable_materials && (
                      <span className="absolute top-2 left-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5 bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30">
                        <Leaf size={10} />eco
                      </span>
                    )}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
                  </div>

                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-[10px] font-mono mb-0.5 text-gold">
                          {obra.accession_number}
                        </p>
                        <h3 className="font-serif text-base leading-snug text-text-main">
                          {obra.artwork_title}
                        </h3>
                      </div>
                      <button
                        onClick={e => { e.stopPropagation(); handleDelete(obra.artwork_id, obra.artwork_title); }}
                        className="p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-all text-[#F43F5E] hover:bg-[#F43F5E]/12"
                        aria-label={`Excluir obra ${obra.artwork_title}`}
                        disabled={deletingId === obra.artwork_id}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                    {obra.interpretive_title && (
                      <p className="text-xs italic mt-1 text-text-muted">{obra.interpretive_title}</p>
                    )}
                    <p className="text-sm mt-1 text-text-muted">
                      {obra.creation_year} · {obra.medium}{obra.support ? ` sobre ${obra.support}` : ''}
                    </p>
                    {obra.tags && obra.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {obra.tags.slice(0, 3).map(tag => (
                          <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-[rgba(201,168,76,0.10)] text-gold">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── TAB: SÉRIES ── */}
      {!loading && tab === 'series' && (
        <>
          {filteredSeries.length === 0 ? (
            <div className="text-center py-24 text-text-muted">
              <Layers size={48} className="mx-auto mb-4 opacity-20" />
              <p className="font-medium">Nenhuma série criada ainda.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredSeries.map((s, idx) => (
                <div
                  key={s.series_id}
                  onClick={() => navigate(`/obras/serie/${s.series_id}`)}
                  className="glass-slab rounded-2xl overflow-hidden cursor-pointer group hover-lift float-anim"
                  style={{ animationDelay: `${idx * 0.1}s` }}
                >
                  {/* Series color bar */}
                  <div className="h-1.5" style={{ background: s.cor || 'var(--gold)' }} />
                  <div className="aspect-video overflow-hidden relative bg-surface-raised">
                    {s.cover_image ? (
                      <img src={s.cover_image} alt={s.series_title}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center" style={{ background: `${s.cor}20`, color: s.cor || 'var(--gold)' }}>
                        <Layers size={40} />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
                      <span className="opacity-0 group-hover:opacity-100 text-white font-medium transition-all">Ver série →</span>
                    </div>
                  </div>
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-serif text-lg text-text-main">{s.series_title}</h3>
                      <div className="flex items-center gap-2">
                        {s.series_number && (
                          <span className="text-xs font-mono mt-1 text-gold">#{s.series_number}</span>
                        )}
                        <button
                          onClick={e => { e.stopPropagation(); handleDeleteSerie(s.series_id, s.series_title); }}
                          className="p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-all text-[#F43F5E] hover:bg-[#F43F5E]/12"
                          aria-label={`Excluir série ${s.series_title}`}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                    {s.conceptual_statement && (
                      <p className="text-sm line-clamp-2 mb-3 text-text-muted">{s.conceptual_statement}</p>
                    )}
                    <div className="flex flex-wrap gap-2">
                      {s.edition_type && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-surface-raised text-text-muted">
                          {s.edition_type === 'unique' ? 'Única' : s.edition_type === 'limited' ? 'Edição Limitada' : s.edition_type === 'open' ? 'Edição Aberta' : 'Prova de Artista'}
                        </span>
                      )}
                      {s.group_label && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-[rgba(201,168,76,0.10)] text-gold">
                          {s.group_label}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── TAB: COLEÇÕES ── */}
      {!loading && tab === 'colecoes' && (
        <>
          {filteredCollections.length === 0 ? (
            <div className="text-center py-24 text-text-muted">
              <Archive size={48} className="mx-auto mb-4 opacity-20" />
              <p className="font-medium">Nenhuma coleção criada ainda.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredCollections.map((c, idx) => (
                <div
                  key={c.collection_id}
                  className="glass-slab rounded-2xl overflow-hidden cursor-pointer group hover-lift float-anim"
                  style={{ animationDelay: `${idx * 0.1}s` }}
                >
                  <div className="gold-line opacity-50" />
                  <div className="aspect-video overflow-hidden relative bg-surface-raised">
                    {c.cover_image ? (
                      <img src={c.cover_image} alt={c.collection_name}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-[rgba(201,168,76,0.05)]">
                        <Archive size={40} className="text-gold opacity-40" />
                      </div>
                    )}
                  </div>
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="font-serif text-lg text-text-main">{c.collection_name}</h3>
                      <button
                        onClick={e => { e.stopPropagation(); handleDeleteCollection(c.collection_id, c.collection_name); }}
                        className="p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-all text-[#F43F5E] hover:bg-[#F43F5E]/12"
                        aria-label={`Excluir coleção ${c.collection_name}`}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                    {c.collection_description && (
                      <p className="text-sm line-clamp-2 mb-3 text-text-muted">{c.collection_description}</p>
                    )}
                    <div className="flex items-center justify-between text-xs text-text-faint">
                      <span>{c.total_items} obras</span>
                      {c.artistic_theme && <span className="italic">{c.artistic_theme}</span>}
                      <span
                        className={`px-2 py-0.5 rounded-full ${
                          c.visibility_status === 'public'
                            ? 'bg-[#10B981]/12 text-[#10B981]'
                            : 'bg-surface-raised text-text-faint'
                        }`}
                      >
                        {c.visibility_status === 'public' ? 'Pública' : c.visibility_status === 'archived' ? 'Arquivada' : 'Privada'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── FAB mobile ── */}
      <button
        aria-label="Nova obra"
        onClick={() => navigate('/upload')}
        className="md:hidden fixed bottom-6 right-6 w-14 h-14 rounded-full flex items-center justify-center transition-transform hover:scale-105 z-50 gold-pulse cursor-pointer btn-gold-gradient shadow-[0_8px_32px_rgba(201,168,76,0.4)]"
      >
        <Plus size={24} />
      </button>

      {/* ── ARTWORK DETAIL MODAL ── */}
      {selected && (
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={() => setSelected(null)} />
          <div className="relative z-10 w-full md:max-w-4xl max-h-[92vh] md:max-h-[88vh] rounded-t-3xl md:rounded-2xl overflow-y-auto bg-surface border border-border shadow-[0_32px_80px_rgba(0,0,0,0.7)]">

            {/* Modal top gold edge */}
            <div className="card-shimmer-top-strong" />

            <div className="sticky top-0 z-20 px-6 py-4 flex items-center justify-between bg-surface border-b border-border">
              <div>
                <h2 className="font-serif text-xl text-text-main">{selected.artwork_title}</h2>
                {selected.interpretive_title && (
                  <p className="text-xs italic text-text-muted">{selected.interpretive_title}</p>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`text-[10px] font-semibold px-3 py-1.5 rounded-full ${STATUS_CLASS[selected.sale_status] ?? ''}`}
                >
                  {STATUS_LABEL[selected.sale_status]}
                </span>
                <button aria-label="Deletar" onClick={() => handleDelete(selected.artwork_id, selected.artwork_title)}
                  className="p-2 rounded-xl transition-all text-[#F43F5E] hover:bg-[#F43F5E]/10">
                  <Trash2 size={18} />
                </button>
                <button aria-label="Fechar" onClick={() => setSelected(null)}
                  className="p-2 rounded-xl transition-all text-text-muted hover:bg-surface-raised">
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-8">
              {/* Photos */}
              <div className="relative rounded-2xl overflow-hidden aspect-video bg-surface-raised">
                {(selected.artwork_images?.[photoIdx] || selected.cover_image) ? (
                  <img src={selected.artwork_images?.[photoIdx] || selected.cover_image}
                    alt={selected.artwork_title}
                    loading="lazy"
                    className="w-full h-full object-contain" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-text-faint">
                    <Palette size={60} />
                  </div>
                )}
                {(selected.artwork_images?.length ?? 0) > 1 && (
                  <>
                    <button aria-label="Anterior" onClick={() => setPhotoIdx(i => Math.max(0, i - 1))}
                      className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full p-2 backdrop-blur-md bg-[#0A0A10]/70 text-text-main">
                      <ChevronLeft size={18} />
                    </button>
                    <button aria-label="Próxima" onClick={() => setPhotoIdx(i => Math.min((selected.artwork_images?.length ?? 1) - 1, i + 1))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-2 backdrop-blur-md bg-[#0A0A10]/70 text-text-main">
                      <ChevronRight size={18} />
                    </button>
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                      {selected.artwork_images!.map((_, i) => (
                        <div key={i} className="w-2 h-2 rounded-full transition-all"
                          style={{ background: i === photoIdx ? 'var(--gold)' : 'rgba(255,255,255,0.4)' }} />
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Metadata */}
              <section>
                <p className="text-[10px] font-bold tracking-[0.2em] uppercase mb-4 text-gold">
                  I — Metadados
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {[
                    ['Artista', selected.artist_name],
                    ['Ano', selected.creation_year ?? selected.creation_date ?? '—'],
                    ['Técnica', selected.medium ?? '—'],
                    ['Suporte', selected.support ?? '—'],
                    ['Dimensões', selected.dimensions_formatted ?? '—'],
                    ['Localização', selected.physical_location ?? '—'],
                    ['Nº de Acesso', selected.accession_number ?? '—'],
                    ['Assinatura', selected.signature_status ?? '—'],
                    ['Condição', selected.condition_state ?? '—'],
                  ].map(([k, v]) => (
                    <div key={k} className="p-3 rounded-xl bg-surface-raised border border-border">
                      <p className="text-[10px] font-bold uppercase tracking-widest mb-1 text-text-faint">{k}</p>
                      <p className="text-sm text-text-main">{String(v)}</p>
                    </div>
                  ))}
                </div>
              </section>

              {/* Curatorial */}
              {(selected.curatorial_narrative || selected.summary_sentence) && (
                <section>
                  <p className="text-[10px] font-bold tracking-[0.2em] uppercase mb-4 text-gold">
                    II — Texto Curatorial
                  </p>
                  {selected.summary_sentence && (
                    <p className="text-sm mb-3 font-medium text-text-muted">{selected.summary_sentence}</p>
                  )}
                  {selected.curatorial_narrative && (
                    <blockquote className="pl-5 pr-4 py-4 rounded-r-xl border-l-[3px] border-gold bg-[rgba(201,168,76,0.05)]">
                      <p className="font-serif italic leading-relaxed text-text-main">
                        {selected.curatorial_narrative}
                      </p>
                    </blockquote>
                  )}
                  {selected.epigraph && (
                    <p className="mt-3 text-sm italic text-center text-text-muted">"{selected.epigraph}"</p>
                  )}
                </section>
              )}

              {/* Tags */}
              {selected.tags && selected.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selected.tags.map(tag => (
                    <span key={tag} className="text-xs font-bold px-3 py-1 rounded-full bg-[rgba(201,168,76,0.10)] text-gold border border-[rgba(201,168,76,0.2)]">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 px-6 py-4 flex gap-3 bg-surface border-t border-border">
              <button
                onClick={() => navigate(`/upload?id=${selected.artwork_id}`)}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all btn-ghost-border"
              >
                Editar ficha
              </button>
              <button
                onClick={() => handleExportPDF(selected)}
                disabled={isGeneratingCOA}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-60 disabled:cursor-wait btn-gold-gradient shadow-[0_4px_16px_var(--gold-glow)]"
              >
                {isGeneratingCOA ? (
                  <span className="animate-spin inline-block w-4 h-4 border-2 border-black/20 border-t-black/80 rounded-full" />
                ) : (
                  <FileDown size={16} />
                )}
                {isGeneratingCOA ? 'Gerando...' : 'Exportar COA PDF'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Modal ── */}
      {itemToDelete && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
          <div className="glass-slab rounded-2xl w-full max-w-md p-6 space-y-5 relative overflow-hidden">
            <div className="absolute top-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-[#F43F5E] to-transparent opacity-60" />
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-[#F43F5E]/12 border border-[#F43F5E]/25">
                <Trash2 size={18} className="text-[#F43F5E]" />
              </div>
              <div>
                <h3 className="font-serif text-lg text-text-main">
                  Deletar {itemToDelete.type === 'artwork' ? 'Obra' : itemToDelete.type === 'series' ? 'Série' : 'Coleção'}
                </h3>
                <p className="text-sm mt-1 text-text-muted">
                  Tem certeza que deseja deletar <strong className="text-text-main">{itemToDelete.title}</strong>? Esta ação não pode ser desfeita.
                </p>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setItemToDelete(null)}
                className="px-5 py-2 rounded-xl text-sm font-medium transition-all bg-surface-raised text-text-main border border-border"
              >
                Cancelar
              </button>
              <button
                onClick={executeDelete}
                className="px-5 py-2 rounded-xl text-sm font-bold transition-all bg-[#F43F5E] text-white shadow-[0_4px_16px_rgba(244,63,94,0.3)]"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
