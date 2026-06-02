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
const STATUS_COLOR: Record<string, string> = {
  available: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  sold: 'bg-zinc-800/80 text-zinc-400 border border-zinc-700/30',
  reserved: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  private_collection: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
  not_for_sale: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
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

  const handleDelete = (id: string, title: string) => {
    setItemToDelete({ id, type: 'artwork', title });
  };

  const handleDeleteSerie = (id: string, title: string) => {
    setItemToDelete({ id, type: 'series', title });
  };

  const handleDeleteCollection = (id: string, title: string) => {
    setItemToDelete({ id, type: 'collection', title });
  };

  const executeDelete = async () => {
    if (!itemToDelete) return;
    
    // Yield to browser immediately so UI can update
    await new Promise(resolve => setTimeout(resolve, 0));
    
    const { id, type } = itemToDelete;
    setError('');
    setDeletingId(id);
    
    try {
      if (type === 'artwork') {
        const { error } = await deleteArtwork(id);
        if (error) throw error;
        setArtworks(prev => prev.filter(a => a.artwork_id !== id));
        if (selected?.artwork_id === id) {
          setSelected(null);
        }
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

      const coaId =
        artwork.accession_number ||
        `NA-${new Date().getFullYear()}-${1000 + artworks.indexOf(artwork) + 1}`;

      const data = {
        title: artwork.artwork_title || 'Sem Título',
        artist: artwork.artist_name || 'Nany Arruda',
        year: artwork.creation_year?.toString() || 'N/A',
        medium: artwork.medium || '',
        dimensions: artwork.dimensions_formatted || 'N/A',
        status: 'Original',
        coaId,
        edition:
          artwork.classification === 'singular'
            ? 'Unique'
            : artwork.edition_number || 'N/A',
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
      alert(
        'Erro ao gerar o certificado: ' +
          (error instanceof Error ? error.message : String(error))
      );
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
    { id: 'unicas', label: 'Únicas', icon: <Palette size={16} />, count: artworks.length },
    { id: 'series', label: 'Séries', icon: <Layers size={16} />, count: series.length },
    { id: 'colecoes', label: 'Coleções', icon: <Archive size={16} />, count: collections.length },
  ];

  return (
    <div className="space-y-6 relative pb-20 md:pb-0">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <h1 className="text-3xl font-serif text-text-main">Obras</h1>
        <div className="hidden md:flex items-center gap-2">
          <button onClick={() => navigate('/upload?type=singular')} className="bg-accent text-[#0A0A0C] px-4 py-2.5 rounded-xl font-bold hover:bg-accent/80 transition-colors text-sm cursor-pointer"><Plus size={16} className="inline mr-1 -mt-0.5"/> Obra Singular</button>
          <button onClick={() => navigate('/upload?type=serie')} className="bg-surface text-accent border border-accent/30 px-4 py-2.5 rounded-xl font-medium hover:bg-accent/10 hover:border-accent transition-colors text-sm cursor-pointer"><Plus size={16} className="inline mr-1 -mt-0.5"/> Série</button>
          <button onClick={() => navigate('/upload?type=colecao')} className="bg-surface text-accent border border-accent/30 px-4 py-2.5 rounded-xl font-medium hover:bg-accent/10 hover:border-accent transition-colors text-sm cursor-pointer"><Plus size={16} className="inline mr-1 -mt-0.5"/> Coleção</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-surface-raised p-1 rounded-xl w-fit">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${tab === t.id ? 'bg-surface shadow text-text-main' : 'text-text-muted hover:text-text-main'}`}>
            {t.icon} {t.label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${tab === t.id ? 'bg-accent/10 text-accent' : 'bg-surface-raised text-text-muted'}`}>
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
        <input type="text" placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-surface focus:border-accent outline-none text-sm text-text-main" />
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>
      )}

      {/* Loading */}
      {loading && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-gray-100 rounded-xl aspect-square animate-pulse" />
          ))}
        </div>
      )}

      {/* ── TAB: ÚNICAS ── */}
      {!loading && tab === 'unicas' && (
        <>
          {filteredArtworks.length === 0 ? (
            <div className="text-center py-20 text-text-muted">
              <Palette size={48} className="mx-auto mb-4 opacity-20" />
              <p className="font-medium">Nenhuma obra encontrada.</p>
              <button onClick={() => navigate('/upload')}
                className="mt-4 text-accent text-sm hover:underline">+ Adicionar primeira obra</button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredArtworks.map(obra => (
                <div key={obra.artwork_id} onClick={() => { setSelected(obra); setPhotoIdx(0); }}
                  className={`bg-surface rounded-xl overflow-hidden shadow-sm border border-border hover:border-accent group cursor-pointer transition-all ${deletingId === obra.artwork_id ? 'opacity-50 pointer-events-none' : ''}`}>
                  <div className="relative aspect-square bg-surface-raised overflow-hidden">
                    {obra.cover_image || (obra.artwork_images?.[0]) ? (
                      <img src={obra.cover_image || obra.artwork_images![0]} alt={obra.artwork_title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300">
                        <Palette size={40} />
                      </div>
                    )}
                    <span className={`absolute top-2 right-2 text-xs font-bold px-2 py-1 rounded-full ${STATUS_COLOR[obra.sale_status] ?? ''}`}>
                      {STATUS_LABEL[obra.sale_status]}
                    </span>
                    {obra.sustainable_materials && (
                      <span className="absolute top-2 left-2 bg-emerald-100 text-emerald-700 text-xs font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                        <Leaf size={10} />eco
                      </span>
                    )}
                  </div>
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs text-text-muted font-mono mb-0.5">{obra.accession_number}</p>
                        <h3 className="font-serif text-lg text-text-main leading-snug">{obra.artwork_title}</h3>
                      </div>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDelete(obra.artwork_id, obra.artwork_title); }}
                        className="p-1.5 hover:bg-red-100 text-red-600 rounded-full opacity-0 group-hover:opacity-100 transition-all"
                        aria-label={`Excluir obra ${obra.artwork_title}`}
                        disabled={deletingId === obra.artwork_id}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    {obra.interpretive_title && <p className="text-text-muted text-xs italic mb-1">{obra.interpretive_title}</p>}
                    <p className="text-text-muted text-sm">{obra.creation_year} · {obra.medium}{obra.support ? ` sobre ${obra.support}` : ''}</p>
                    {obra.dimensions_formatted && <p className="text-text-muted text-xs mt-1">{obra.dimensions_formatted}</p>}
                    {obra.tags && obra.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {obra.tags.slice(0, 3).map(tag => (
                          <span key={tag} className="bg-accent/10 text-accent text-xs px-2 py-0.5 rounded-full">#{tag}</span>
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
            <div className="text-center py-20 text-text-muted">
              <Layers size={48} className="mx-auto mb-4 opacity-20" />
              <p className="font-medium">Nenhuma série criada ainda.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredSeries.map(s => (
                <div key={s.series_id}
                  onClick={() => navigate(`/obras/serie/${s.series_id}`)}
                  className="bg-surface rounded-xl overflow-hidden border border-border hover:border-accent shadow-sm transition-all cursor-pointer group">
                  <style>{`
                    #series-bar-${s.series_id} { background-color: ${s.cor}; }
                    #series-bg-${s.series_id} { background-color: ${s.cor}15; }
                    #series-icon-${s.series_id} { color: ${s.cor}; }
                  `}</style>
                  <div id={`series-bar-${s.series_id}`} className="h-2" />
                  <div className="aspect-video bg-gray-100 overflow-hidden relative">
                    {s.cover_image ? (
                      <img src={s.cover_image} alt={s.series_title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div id={`series-bg-${s.series_id}`} className="w-full h-full flex items-center justify-center">
                        <Layers size={40} id={`series-icon-${s.series_id}`} />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
                      <span className="opacity-0 group-hover:opacity-100 text-white font-medium transition-all">Ver série →</span>
                    </div>
                  </div>
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-serif text-xl text-text-main">{s.series_title}</h3>
                      <div className="flex items-center gap-2">
                        {s.series_number && (
                          <span className="text-xs font-mono text-text-muted mt-1">#{s.series_number}</span>
                        )}
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleDeleteSerie(s.series_id, s.series_title); }}
                          className="p-1.5 hover:bg-red-100 text-red-600 rounded-full opacity-0 group-hover:opacity-100 transition-all"
                          aria-label={`Excluir série ${s.series_title}`}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    {s.conceptual_statement && (
                      <p className="text-text-muted text-sm line-clamp-2 mb-3">{s.conceptual_statement}</p>
                    )}
                    <div className="flex flex-wrap gap-2">
                      {s.edition_type && (
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                          {s.edition_type === 'unique' ? 'Única' : s.edition_type === 'limited' ? 'Edição Limitada' : s.edition_type === 'open' ? 'Edição Aberta' : 'Prova de Artista'}
                        </span>
                      )}
                      {s.group_label && (
                        <span className="text-xs bg-accent/10 text-accent px-2 py-0.5 rounded-full">{s.group_label}</span>
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
            <div className="text-center py-20 text-text-muted">
              <Archive size={48} className="mx-auto mb-4 opacity-20" />
              <p className="font-medium">Nenhuma coleção criada ainda.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCollections.map(c => (
                <div key={c.collection_id}
                  className="bg-surface rounded-xl overflow-hidden border border-border hover:border-accent shadow-sm transition-all cursor-pointer group">
                  <div className="aspect-video bg-gray-100 overflow-hidden relative">
                    {c.cover_image ? (
                      <img src={c.cover_image} alt={c.collection_name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-accent/10 to-accent/5">
                        <Archive size={40} className="text-accent/40" />
                      </div>
                    )}
                  </div>
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="font-serif text-xl text-text-main">{c.collection_name}</h3>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDeleteCollection(c.collection_id, c.collection_name); }}
                        className="p-1.5 hover:bg-red-100 text-red-600 rounded-full opacity-0 group-hover:opacity-100 transition-all"
                        aria-label={`Excluir coleção ${c.collection_name}`}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    {c.collection_description && (
                      <p className="text-text-muted text-sm line-clamp-2 mb-3">{c.collection_description}</p>
                    )}
                    <div className="flex items-center justify-between text-xs text-text-muted">
                      <span>{c.total_items} obras</span>
                      {c.artistic_theme && <span className="italic">{c.artistic_theme}</span>}
                      <span className={`px-2 py-0.5 rounded-full ${c.visibility_status === 'public' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
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

      {/* FAB mobile */}
      <button aria-label="Nova obra" onClick={() => navigate('/upload')}
        className="md:hidden fixed bottom-6 right-6 w-14 h-14 bg-accent text-white rounded-full shadow-lg flex items-center justify-center hover:scale-105 transition-transform z-50">
        <Plus size={24} />
      </button>

      {/* ── ARTWORK DETAIL MODAL ── */}
      {selected && (
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSelected(null)} />
          <div className="relative z-10 bg-surface w-full md:max-w-4xl max-h-[92vh] md:max-h-[88vh] rounded-t-3xl md:rounded-2xl overflow-y-auto shadow-2xl border border-border">
            <div className="sticky top-0 z-20 bg-surface border-b border-border px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="font-serif text-xl text-text-main">{selected.artwork_title}</h2>
                {selected.interpretive_title && <p className="text-xs text-text-muted italic">{selected.interpretive_title}</p>}
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${STATUS_COLOR[selected.sale_status] ?? ''}`}>
                  {STATUS_LABEL[selected.sale_status]}
                </span>
                <button aria-label="Deletar" onClick={() => handleDelete(selected.artwork_id, selected.artwork_title)} className="p-2 rounded-xl hover:bg-red-100 text-red-600"><Trash2 size={20} /></button>
                <button aria-label="Fechar" onClick={() => setSelected(null)} className="p-2 rounded-xl hover:bg-surface-raised"><X size={20} /></button>
              </div>
            </div>
            <div className="p-6 space-y-8">
              {/* Photos */}
              <div className="relative rounded-2xl overflow-hidden aspect-video bg-surface-raised">
                {(selected.artwork_images?.[photoIdx] || selected.cover_image) ? (
                  <img src={selected.artwork_images?.[photoIdx] || selected.cover_image}
                    alt={selected.artwork_title} className="w-full h-full object-contain" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300"><Palette size={60} /></div>
                )}
                {(selected.artwork_images?.length ?? 0) > 1 && (
                  <>
                    <button aria-label="Anterior" onClick={() => setPhotoIdx(i => Math.max(0, i - 1))}
                      className="absolute left-3 top-1/2 -translate-y-1/2 bg-surface/85 rounded-full p-2 shadow hover:bg-surface border border-border text-text-main cursor-pointer">
                      <ChevronLeft size={18} />
                    </button>
                    <button aria-label="Próxima" onClick={() => setPhotoIdx(i => Math.min((selected.artwork_images?.length ?? 1) - 1, i + 1))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 bg-surface/85 rounded-full p-2 shadow hover:bg-surface border border-border text-text-main cursor-pointer">
                      <ChevronRight size={18} />
                    </button>
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                      {selected.artwork_images!.map((_, i) => (
                        <div key={i} className={`w-2 h-2 rounded-full ${i === photoIdx ? 'bg-accent' : 'bg-white/60'}`} />
                      ))}
                    </div>
                  </>
                )}
              </div>
              {/* Metadata */}
              <section>
                <p className="text-xs font-bold tracking-[0.2em] text-accent uppercase mb-4">I — Metadados</p>
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
                    <div key={k}>
                      <p className="text-xs font-bold text-text-muted mb-0.5">{k}</p>
                      <p className="text-sm text-text-main">{String(v)}</p>
                    </div>
                  ))}
                </div>
              </section>
              {/* Curatorial */}
              {(selected.curatorial_narrative || selected.summary_sentence) && (
                <section>
                  <p className="text-xs font-bold tracking-[0.2em] text-accent uppercase mb-4">II — Texto Curatorial</p>
                  {selected.summary_sentence && <p className="text-sm text-text-muted mb-3 font-medium">{selected.summary_sentence}</p>}
                  {selected.curatorial_narrative && (
                    <blockquote className="border-l-4 border-accent/40 bg-accent/5 rounded-r-xl pl-5 pr-4 py-4">
                      <p className="font-serif italic text-text-main leading-relaxed">{selected.curatorial_narrative}</p>
                    </blockquote>
                  )}
                  {selected.epigraph && <p className="mt-3 text-sm italic text-text-muted text-center">"{selected.epigraph}"</p>}
                </section>
              )}
              {/* Tags */}
              {selected.tags && selected.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selected.tags.map(tag => <span key={tag} className="bg-accent/10 text-accent text-xs font-bold px-3 py-1 rounded-full">#{tag}</span>)}
                </div>
              )}
            </div>
            <div className="sticky bottom-0 bg-surface border-t border-border px-6 py-4 flex gap-3">
              <button onClick={() => navigate(`/upload?id=${selected.artwork_id}`)}
                className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-surface-raised transition-colors cursor-pointer">
                Editar ficha
              </button>
              <button
                onClick={() => handleExportPDF(selected)}
                disabled={isGeneratingCOA}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-accent text-[#0A0A0C] text-sm font-bold hover:bg-accent/80 transition-all disabled:opacity-60 disabled:cursor-wait cursor-pointer"
              >
                {isGeneratingCOA ? (
                  <span className="animate-spin inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full" />
                ) : (
                  <FileDown size={16} />
                )}
                {isGeneratingCOA ? 'Gerando...' : 'Exportar COA PDF'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {itemToDelete && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-surface rounded-2xl shadow-xl w-full max-w-md p-6 space-y-5 border border-border">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-red-500/10 rounded-full flex items-center justify-center shrink-0">
                <Trash2 size={20} className="text-red-500" />
              </div>
              <div>
                <h3 className="font-serif text-xl text-text-main">Deletar {itemToDelete.type === 'artwork' ? 'Obra' : itemToDelete.type === 'series' ? 'Série' : 'Coleção'}</h3>
                <p className="text-sm text-text-muted mt-1">
                  Tem certeza que deseja deletar <strong>{itemToDelete.title}</strong>? Esta ação não pode ser desfeita.
                </p>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setItemToDelete(null)}
                className="px-5 py-2 border border-border rounded-lg text-sm font-medium hover:bg-surface-raised cursor-pointer">
                Cancelar
              </button>
              <button onClick={executeDelete}
                className="px-5 py-2 bg-red-600 text-white rounded-lg text-sm font-bold hover:bg-red-700 cursor-pointer">
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
