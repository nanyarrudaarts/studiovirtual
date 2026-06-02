import { useState, useEffect } from 'react';
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

const STATUS_STYLE: Record<string, { background: string; color: string; border: string }> = {
  available:          { background: 'rgba(16,185,129,0.12)', color: '#10B981', border: '1px solid rgba(16,185,129,0.3)' },
  sold:               { background: 'rgba(100,100,115,0.10)', color: 'var(--text-faint)', border: '1px solid var(--border)' },
  reserved:           { background: 'rgba(245,158,11,0.12)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.3)' },
  private_collection: { background: 'rgba(139,92,246,0.10)', color: '#8B5CF6', border: '1px solid rgba(139,92,246,0.25)' },
  not_for_sale:       { background: 'rgba(59,130,246,0.10)', color: '#3B82F6', border: '1px solid rgba(59,130,246,0.25)' },
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
  const filteredArtworks = artworks.filter(a =>
    !q || a.artwork_title.toLowerCase().includes(q) || (a.medium ?? '').toLowerCase().includes(q)
  );
  const filteredSeries = series.filter(s => !q || s.series_title.toLowerCase().includes(q));
  const filteredCollections = collections.filter(c => !q || c.collection_name.toLowerCase().includes(q));

  const tabs: { id: Tab; label: string; icon: React.ReactNode; count: number }[] = [
    { id: 'unicas', label: 'Únicas', icon: <Palette size={15} />, count: artworks.length },
    { id: 'series', label: 'Séries', icon: <Layers size={15} />, count: series.length },
    { id: 'colecoes', label: 'Coleções', icon: <Archive size={15} />, count: collections.length },
  ];

  return (
    <div className="space-y-7 relative pb-20 md:pb-0">

      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif" style={{ color: 'var(--text-main)' }}>Obras</h1>
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
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer hover-lift"
              style={i === 0 ? {
                background: 'linear-gradient(135deg, var(--gold-dark), var(--gold))',
                color: '#050507',
                boxShadow: '0 4px 16px var(--gold-glow)',
              } : {
                background: 'var(--surface)',
                color: 'var(--text-main)',
                border: '1px solid var(--border)',
              }}
            >
              <Plus size={14} /> {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: 'var(--surface)' }}>
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer"
            style={tab === t.id ? {
              background: 'var(--surface-raised)',
              color: 'var(--gold)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
              border: '1px solid rgba(201,168,76,0.2)',
            } : {
              color: 'var(--text-muted)',
            }}
          >
            {t.icon} {t.label}
            <span
              className="text-xs px-1.5 py-0.5 rounded-full"
              style={tab === t.id ? {
                background: 'rgba(201,168,76,0.15)',
                color: 'var(--gold)',
              } : {
                background: 'var(--surface-raised)',
                color: 'var(--text-faint)',
              }}
            >
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* ── Search ── */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2" size={16} style={{ color: 'var(--text-faint)' }} />
        <input
          type="text"
          placeholder="Buscar obra..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm outline-none transition-all"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            color: 'var(--text-main)',
          }}
          onFocus={e => (e.currentTarget.style.borderColor = 'var(--gold)')}
          onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
        />
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="rounded-xl px-4 py-3 text-sm" style={{ background: 'rgba(244,63,94,0.10)', border: '1px solid rgba(244,63,94,0.3)', color: '#F43F5E' }}>
          {error}
        </div>
      )}

      {/* ── Loading ── */}
      {loading && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="rounded-2xl aspect-square animate-pulse" style={{ background: 'var(--surface-raised)' }} />
          ))}
        </div>
      )}

      {/* ── TAB: ÚNICAS ── */}
      {!loading && tab === 'unicas' && (
        <>
          {filteredArtworks.length === 0 ? (
            <div className="text-center py-24" style={{ color: 'var(--text-muted)' }}>
              <Palette size={48} className="mx-auto mb-4 opacity-20" />
              <p className="font-medium">Nenhuma obra encontrada.</p>
              <button
                onClick={() => navigate('/upload')}
                className="mt-4 text-sm hover-lift inline-flex items-center gap-1 px-4 py-2 rounded-xl transition-all"
                style={{ color: 'var(--gold)', border: '1px solid rgba(201,168,76,0.25)', background: 'rgba(201,168,76,0.05)' }}
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
                  <div className="h-px" style={{ background: 'linear-gradient(90deg, transparent, var(--gold), transparent)', opacity: 0.5 }} />

                  <div className="relative aspect-square overflow-hidden" style={{ background: 'var(--surface-raised)' }}>
                    {obra.cover_image || obra.artwork_images?.[0] ? (
                      <img src={obra.cover_image || obra.artwork_images![0]} alt={obra.artwork_title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center" style={{ color: 'var(--text-faint)' }}>
                        <Palette size={40} />
                      </div>
                    )}
                    {/* Status badge */}
                    <span
                      className="absolute top-2 right-2 text-[10px] font-semibold px-2.5 py-1 rounded-full"
                      style={STATUS_STYLE[obra.sale_status] ?? {}}
                    >
                      {STATUS_LABEL[obra.sale_status]}
                    </span>
                    {obra.sustainable_materials && (
                      <span className="absolute top-2 left-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5"
                        style={{ background: 'rgba(16,185,129,0.15)', color: '#10B981', border: '1px solid rgba(16,185,129,0.3)' }}>
                        <Leaf size={10} />eco
                      </span>
                    )}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
                  </div>

                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-[10px] font-mono mb-0.5" style={{ color: 'var(--gold)' }}>
                          {obra.accession_number}
                        </p>
                        <h3 className="font-serif text-base leading-snug" style={{ color: 'var(--text-main)' }}>
                          {obra.artwork_title}
                        </h3>
                      </div>
                      <button
                        onClick={e => { e.stopPropagation(); handleDelete(obra.artwork_id, obra.artwork_title); }}
                        className="p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-all"
                        style={{ color: '#F43F5E' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(244,63,94,0.12)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                        aria-label={`Excluir obra ${obra.artwork_title}`}
                        disabled={deletingId === obra.artwork_id}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                    {obra.interpretive_title && (
                      <p className="text-xs italic mt-1" style={{ color: 'var(--text-muted)' }}>{obra.interpretive_title}</p>
                    )}
                    <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                      {obra.creation_year} · {obra.medium}{obra.support ? ` sobre ${obra.support}` : ''}
                    </p>
                    {obra.tags && obra.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {obra.tags.slice(0, 3).map(tag => (
                          <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full"
                            style={{ background: 'rgba(201,168,76,0.10)', color: 'var(--gold)' }}>
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
            <div className="text-center py-24" style={{ color: 'var(--text-muted)' }}>
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
                  <div className="aspect-video overflow-hidden relative" style={{ background: 'var(--surface-raised)' }}>
                    {s.cover_image ? (
                      <img src={s.cover_image} alt={s.series_title}
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
                      <h3 className="font-serif text-lg" style={{ color: 'var(--text-main)' }}>{s.series_title}</h3>
                      <div className="flex items-center gap-2">
                        {s.series_number && (
                          <span className="text-xs font-mono mt-1" style={{ color: 'var(--gold)' }}>#{s.series_number}</span>
                        )}
                        <button
                          onClick={e => { e.stopPropagation(); handleDeleteSerie(s.series_id, s.series_title); }}
                          className="p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-all"
                          style={{ color: '#F43F5E' }}
                          aria-label={`Excluir série ${s.series_title}`}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                    {s.conceptual_statement && (
                      <p className="text-sm line-clamp-2 mb-3" style={{ color: 'var(--text-muted)' }}>{s.conceptual_statement}</p>
                    )}
                    <div className="flex flex-wrap gap-2">
                      {s.edition_type && (
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--surface-raised)', color: 'var(--text-muted)' }}>
                          {s.edition_type === 'unique' ? 'Única' : s.edition_type === 'limited' ? 'Edição Limitada' : s.edition_type === 'open' ? 'Edição Aberta' : 'Prova de Artista'}
                        </span>
                      )}
                      {s.group_label && (
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(201,168,76,0.10)', color: 'var(--gold)' }}>
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
            <div className="text-center py-24" style={{ color: 'var(--text-muted)' }}>
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
                  <div className="h-px" style={{ background: 'linear-gradient(90deg, transparent, var(--gold), transparent)', opacity: 0.5 }} />
                  <div className="aspect-video overflow-hidden relative" style={{ background: 'var(--surface-raised)' }}>
                    {c.cover_image ? (
                      <img src={c.cover_image} alt={c.collection_name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center" style={{ background: 'rgba(201,168,76,0.05)' }}>
                        <Archive size={40} style={{ color: 'var(--gold)' }} className="opacity-40" />
                      </div>
                    )}
                  </div>
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="font-serif text-lg" style={{ color: 'var(--text-main)' }}>{c.collection_name}</h3>
                      <button
                        onClick={e => { e.stopPropagation(); handleDeleteCollection(c.collection_id, c.collection_name); }}
                        className="p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-all"
                        style={{ color: '#F43F5E' }}
                        aria-label={`Excluir coleção ${c.collection_name}`}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                    {c.collection_description && (
                      <p className="text-sm line-clamp-2 mb-3" style={{ color: 'var(--text-muted)' }}>{c.collection_description}</p>
                    )}
                    <div className="flex items-center justify-between text-xs" style={{ color: 'var(--text-faint)' }}>
                      <span>{c.total_items} obras</span>
                      {c.artistic_theme && <span className="italic">{c.artistic_theme}</span>}
                      <span
                        className="px-2 py-0.5 rounded-full"
                        style={c.visibility_status === 'public'
                          ? { background: 'rgba(16,185,129,0.12)', color: '#10B981' }
                          : { background: 'var(--surface-raised)', color: 'var(--text-faint)' }}
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
        className="md:hidden fixed bottom-6 right-6 w-14 h-14 rounded-full flex items-center justify-center transition-transform hover:scale-105 z-50 gold-pulse cursor-pointer"
        style={{
          background: 'linear-gradient(135deg, var(--gold-dark), var(--gold))',
          color: '#050507',
          boxShadow: '0 8px 32px rgba(201,168,76,0.4)',
        }}
      >
        <Plus size={24} />
      </button>

      {/* ── ARTWORK DETAIL MODAL ── */}
      {selected && (
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={() => setSelected(null)} />
          <div className="relative z-10 w-full md:max-w-4xl max-h-[92vh] md:max-h-[88vh] rounded-t-3xl md:rounded-2xl overflow-y-auto"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 32px 80px rgba(0,0,0,0.7)' }}>

            {/* Modal top gold edge */}
            <div className="absolute top-0 left-8 right-8 h-px" style={{ background: 'linear-gradient(90deg, transparent, var(--gold), transparent)', opacity: 0.7 }} />

            <div className="sticky top-0 z-20 px-6 py-4 flex items-center justify-between"
              style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
              <div>
                <h2 className="font-serif text-xl" style={{ color: 'var(--text-main)' }}>{selected.artwork_title}</h2>
                {selected.interpretive_title && (
                  <p className="text-xs italic" style={{ color: 'var(--text-muted)' }}>{selected.interpretive_title}</p>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span
                  className="text-[10px] font-semibold px-3 py-1.5 rounded-full"
                  style={STATUS_STYLE[selected.sale_status] ?? {}}
                >
                  {STATUS_LABEL[selected.sale_status]}
                </span>
                <button aria-label="Deletar" onClick={() => handleDelete(selected.artwork_id, selected.artwork_title)}
                  className="p-2 rounded-xl transition-all" style={{ color: '#F43F5E' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(244,63,94,0.10)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <Trash2 size={18} />
                </button>
                <button aria-label="Fechar" onClick={() => setSelected(null)}
                  className="p-2 rounded-xl transition-all" style={{ color: 'var(--text-muted)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-raised)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-8">
              {/* Photos */}
              <div className="relative rounded-2xl overflow-hidden aspect-video" style={{ background: 'var(--surface-raised)' }}>
                {(selected.artwork_images?.[photoIdx] || selected.cover_image) ? (
                  <img src={selected.artwork_images?.[photoIdx] || selected.cover_image}
                    alt={selected.artwork_title} className="w-full h-full object-contain" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center" style={{ color: 'var(--text-faint)' }}>
                    <Palette size={60} />
                  </div>
                )}
                {(selected.artwork_images?.length ?? 0) > 1 && (
                  <>
                    <button aria-label="Anterior" onClick={() => setPhotoIdx(i => Math.max(0, i - 1))}
                      className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full p-2 backdrop-blur-md"
                      style={{ background: 'rgba(10,10,16,0.7)', color: 'var(--text-main)' }}>
                      <ChevronLeft size={18} />
                    </button>
                    <button aria-label="Próxima" onClick={() => setPhotoIdx(i => Math.min((selected.artwork_images?.length ?? 1) - 1, i + 1))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-2 backdrop-blur-md"
                      style={{ background: 'rgba(10,10,16,0.7)', color: 'var(--text-main)' }}>
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
                <p className="text-[10px] font-bold tracking-[0.2em] uppercase mb-4" style={{ color: 'var(--gold)' }}>
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
                    <div key={k} className="p-3 rounded-xl" style={{ background: 'var(--surface-raised)', border: '1px solid var(--border)' }}>
                      <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--text-faint)' }}>{k}</p>
                      <p className="text-sm" style={{ color: 'var(--text-main)' }}>{String(v)}</p>
                    </div>
                  ))}
                </div>
              </section>

              {/* Curatorial */}
              {(selected.curatorial_narrative || selected.summary_sentence) && (
                <section>
                  <p className="text-[10px] font-bold tracking-[0.2em] uppercase mb-4" style={{ color: 'var(--gold)' }}>
                    II — Texto Curatorial
                  </p>
                  {selected.summary_sentence && (
                    <p className="text-sm mb-3 font-medium" style={{ color: 'var(--text-muted)' }}>{selected.summary_sentence}</p>
                  )}
                  {selected.curatorial_narrative && (
                    <blockquote className="pl-5 pr-4 py-4 rounded-r-xl"
                      style={{ borderLeft: '3px solid var(--gold)', background: 'rgba(201,168,76,0.05)' }}>
                      <p className="font-serif italic leading-relaxed" style={{ color: 'var(--text-main)' }}>
                        {selected.curatorial_narrative}
                      </p>
                    </blockquote>
                  )}
                  {selected.epigraph && (
                    <p className="mt-3 text-sm italic text-center" style={{ color: 'var(--text-muted)' }}>"{selected.epigraph}"</p>
                  )}
                </section>
              )}

              {/* Tags */}
              {selected.tags && selected.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selected.tags.map(tag => (
                    <span key={tag} className="text-xs font-bold px-3 py-1 rounded-full"
                      style={{ background: 'rgba(201,168,76,0.10)', color: 'var(--gold)', border: '1px solid rgba(201,168,76,0.2)' }}>
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 px-6 py-4 flex gap-3"
              style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)' }}>
              <button
                onClick={() => navigate(`/upload?id=${selected.artwork_id}`)}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all"
                style={{ background: 'var(--surface-raised)', color: 'var(--text-main)', border: '1px solid var(--border)' }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--gold)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
              >
                Editar ficha
              </button>
              <button
                onClick={() => handleExportPDF(selected)}
                disabled={isGeneratingCOA}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-60 disabled:cursor-wait"
                style={{
                  background: 'linear-gradient(135deg, var(--gold-dark), var(--gold))',
                  color: '#050507',
                  boxShadow: '0 4px 16px var(--gold-glow)',
                }}
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
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}>
          <div className="glass-slab rounded-2xl w-full max-w-md p-6 space-y-5 relative overflow-hidden">
            <div className="absolute top-0 left-4 right-4 h-px" style={{ background: 'linear-gradient(90deg, transparent, #F43F5E, transparent)', opacity: 0.6 }} />
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                style={{ background: 'rgba(244,63,94,0.12)', border: '1px solid rgba(244,63,94,0.25)' }}>
                <Trash2 size={18} style={{ color: '#F43F5E' }} />
              </div>
              <div>
                <h3 className="font-serif text-lg" style={{ color: 'var(--text-main)' }}>
                  Deletar {itemToDelete.type === 'artwork' ? 'Obra' : itemToDelete.type === 'series' ? 'Série' : 'Coleção'}
                </h3>
                <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                  Tem certeza que deseja deletar <strong style={{ color: 'var(--text-main)' }}>{itemToDelete.title}</strong>? Esta ação não pode ser desfeita.
                </p>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setItemToDelete(null)}
                className="px-5 py-2 rounded-xl text-sm font-medium transition-all"
                style={{ background: 'var(--surface-raised)', color: 'var(--text-main)', border: '1px solid var(--border)' }}
              >
                Cancelar
              </button>
              <button
                onClick={executeDelete}
                className="px-5 py-2 rounded-xl text-sm font-bold transition-all"
                style={{ background: '#F43F5E', color: '#fff', boxShadow: '0 4px 16px rgba(244,63,94,0.3)' }}
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
