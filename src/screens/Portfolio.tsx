import { useState, useEffect, useCallback } from 'react';
import { pdf } from '@react-pdf/renderer';
import {
  BookOpen, Plus, Trash2, Download, Save, GripVertical,
  FileText, Grid, AlignLeft,
  Check, Loader2, X,
} from 'lucide-react';
import { getArtworks, getPortfolios, savePortfolio, deletePortfolio } from '../services/supabase';
import { PortfolioPDF, buildTechnicalLegend } from '../components/common/PortfolioPDF';
import type { Artwork } from '../types';
import type { PortfolioProject } from '../services/supabase';

// ─── Template Definitions ─────────────────────────────────────────────────────
const TEMPLATES = [
  {
    id: 'A' as const,
    label: 'The Collector',
    desc: '1 artwork per page. Centered image, full technical legend. Ideal for collectors and institutions.',
    icon: FileText,
  },
  {
    id: 'B' as const,
    label: 'The Gallery',
    desc: 'Grid of 2 or 4 artworks per page. Quick visual overview. Ideal for galleries and art fairs.',
    icon: Grid,
  },
  {
    id: 'C' as const,
    label: 'The Chronological',
    desc: 'Vertical list with thumbnails and full description. Inverse chronological order. Ideal for residencies and curators.',
    icon: AlignLeft,
  },
];

// ─── Default blank portfolio ───────────────────────────────────────────────────
function blankPortfolio(): Omit<PortfolioProject, 'portfolio_id' | 'created_at' | 'updated_at' | 'user_id'> {
  return {
    portfolio_title: 'New Portfolio',
    artist_statement: '',
    template_type: 'A',
    grid_columns: 2,
    include_cover: true,
    include_cv: false,
    selected_artworks: [],
    image_scales: {},
  };
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function Portfolio() {
  const [allArtworks, setAllArtworks] = useState<Artwork[]>([]);
  const [savedPortfolios, setSavedPortfolios] = useState<PortfolioProject[]>([]);
  const [current, setCurrent] = useState<Partial<PortfolioProject>>(blankPortfolio());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'select' | 'template' | 'statement' | 'export'>('select');

  // ── Load data on mount ──────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const [artList, portList] = await Promise.all([getArtworks(), getPortfolios()]);
        setAllArtworks(artList);
        setSavedPortfolios(portList);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ── Artwork selection ───────────────────────────────────────────────────────
  const selectedIds: string[] = current.selected_artworks ?? [];

  const toggleArtwork = (id: string) => {
    setCurrent(prev => {
      const ids = prev.selected_artworks ?? [];
      const next = ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id];
      return { ...prev, selected_artworks: next };
    });
  };

  const selectAll = () => {
    const filtered = allArtworks
      .filter(a => !searchTerm || a.artwork_title.toLowerCase().includes(searchTerm.toLowerCase()))
      .map(a => a.artwork_id);
    setCurrent(prev => ({ ...prev, selected_artworks: filtered }));
  };

  const clearAll = () => setCurrent(prev => ({ ...prev, selected_artworks: [] }));

  // ── Get ordered selected artworks ────────────────────────────────────────────
  const selectedArtworks: Artwork[] = selectedIds
    .map(id => allArtworks.find(a => a.artwork_id === id))
    .filter((a): a is Artwork => !!a);

  // ── Drag-and-drop reorder ────────────────────────────────────────────────────
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  const handleDragStart = (idx: number) => setDraggingIdx(idx);
  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    setDragOverIdx(idx);
  };
  const handleDrop = (dropIdx: number) => {
    if (draggingIdx === null || draggingIdx === dropIdx) { setDraggingIdx(null); setDragOverIdx(null); return; }
    const newOrder = [...selectedIds];
    const [moved] = newOrder.splice(draggingIdx, 1);
    newOrder.splice(dropIdx, 0, moved);
    setCurrent(prev => ({ ...prev, selected_artworks: newOrder }));
    setDraggingIdx(null);
    setDragOverIdx(null);
  };

  // ── Image scale per artwork ────────────────────────────────────────────────
  const getScale = useCallback((id: string) => (current.image_scales ?? {})[id] ?? 100, [current.image_scales]);
  const setScale = (id: string, val: number) => {
    setCurrent(prev => ({
      ...prev,
      image_scales: { ...(prev.image_scales ?? {}), [id]: val },
    }));
  };

  // ── Save portfolio project ─────────────────────────────────────────────────
  const handleSave = async () => {
    if (!current.portfolio_title) return;
    setSaving(true);
    try {
      const saved = await savePortfolio(current as PortfolioProject & { portfolio_title: string });
      setCurrent(saved);
      setSavedPortfolios(prev => {
        const idx = prev.findIndex(p => p.portfolio_id === saved.portfolio_id);
        if (idx >= 0) { const next = [...prev]; next[idx] = saved; return next; }
        return [saved, ...prev];
      });
    } catch (e) {
      alert('Error saving portfolio: ' + (e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  // ── Load a saved portfolio ─────────────────────────────────────────────────
  const handleLoad = (p: PortfolioProject) => setCurrent(p);

  // ── Delete a saved portfolio ───────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    if (!confirm('Delete this portfolio project?')) return;
    try {
      await deletePortfolio(id);
      setSavedPortfolios(prev => prev.filter(p => p.portfolio_id !== id));
      if ((current as PortfolioProject).portfolio_id === id) setCurrent(blankPortfolio());
    } catch (e) {
      alert('Error deleting portfolio: ' + (e as Error).message);
    }
  };

  // ── Export PDF ─────────────────────────────────────────────────────────────
  const handleExport = async () => {
    if (selectedArtworks.length === 0) {
      alert('Please select at least one artwork before exporting.');
      return;
    }
    setExporting(true);
    try {
      const artistName = selectedArtworks[0]?.artist_name || 'Nany Arruda';
      const doc = (
        <PortfolioPDF
          artworks={selectedArtworks}
          template={current.template_type ?? 'A'}
          artistName={artistName}
          portfolioTitle={current.portfolio_title ?? 'Portfolio'}
          artistStatement={current.artist_statement}
          imageScales={current.image_scales ?? {}}
          includeCover={current.include_cover ?? true}
          gridColumns={current.grid_columns ?? 2}
        />
      );
      const blob = await pdf(doc).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const monthStr = String(new Date().getMonth() + 1).padStart(2, '0');
      const yearStr = new Date().getFullYear();
      a.href = url;
      a.download = `Portfolio_${artistName.replace(/\s+/g, '_')}_${yearStr}-${monthStr}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert('Error generating PDF: ' + (e as Error).message);
    } finally {
      setExporting(false);
    }
  };

  const filteredArtworks = allArtworks.filter(a =>
    !searchTerm || a.artwork_title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (a.creation_year && String(a.creation_year).includes(searchTerm))
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="animate-spin text-accent h-8 w-8" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif text-text-main">Portfolio Generator</h1>
          <p className="text-text-muted text-sm mt-1">
            Select artworks, choose a museum-standard layout and export a professional PDF portfolio.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-accent text-accent hover:bg-accent/10 transition-colors font-semibold text-sm"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {saving ? 'Saving…' : 'Save Project'}
          </button>
          <button
            onClick={handleExport}
            disabled={exporting || selectedArtworks.length === 0}
            className={`flex items-center gap-2 px-5 py-2 rounded-xl text-white font-semibold text-sm transition-all shadow-float hover-float ${exporting || selectedArtworks.length === 0 ? 'bg-accent/40 cursor-not-allowed' : 'bg-accent hover:bg-accent/90'}`}
          >
            {exporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            {exporting ? 'Generating PDF…' : `Export PDF (${selectedArtworks.length} works)`}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ── LEFT: Saved Projects Sidebar ───────────────────────── */}
        <div className="lg:col-span-3 space-y-4">
          {/* New Portfolio Button */}
          <button
            onClick={() => setCurrent(blankPortfolio())}
            className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-accent/40 text-accent hover:border-accent hover:bg-accent/5 transition-colors font-semibold text-sm"
          >
            <Plus size={16} /> New Portfolio
          </button>

          {/* Saved projects */}
          {savedPortfolios.length > 0 && (
            <div className="bg-surface rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="text-xs font-bold uppercase tracking-wider text-text-muted">Saved Projects</p>
              </div>
              <div className="divide-y divide-gray-50">
                {savedPortfolios.map(p => (
                  <div
                    key={p.portfolio_id}
                    className={`flex items-center justify-between px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors ${(current as PortfolioProject).portfolio_id === p.portfolio_id ? 'bg-accent/5 border-l-2 border-accent' : ''}`}
                    onClick={() => handleLoad(p)}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-text-main truncate">{p.portfolio_title}</p>
                      <p className="text-[10px] text-text-muted">{p.selected_artworks.length} works · {p.template_type}</p>
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); handleDelete(p.portfolio_id); }}
                      className="text-gray-300 hover:text-rose-500 transition-colors shrink-0 ml-2"
                      aria-label="Delete portfolio"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT: Main Editor ──────────────────────────────────── */}
        <div className="lg:col-span-9 space-y-5">
          {/* Project title */}
          <div className="bg-surface rounded-2xl border border-gray-100 p-5 shadow-sm">
            <label className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-2">Portfolio Title</label>
            <input
              type="text"
              value={current.portfolio_title ?? ''}
              onChange={e => setCurrent(p => ({ ...p, portfolio_title: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-lg font-serif focus:border-accent outline-none bg-bg"
              placeholder="e.g. Paintings 2024 — Gallery Selection"
            />
          </div>

          {/* Step Tabs */}
          <div className="flex gap-1 bg-gray-100/80 p-1 rounded-xl w-full">
            {([
              { key: 'select', label: `Works (${selectedIds.length})` },
              { key: 'template', label: 'Template' },
              { key: 'statement', label: 'Statement' },
              { key: 'export', label: 'Preview & Export' },
            ] as const).map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-colors ${activeTab === tab.key ? 'bg-white text-accent shadow-sm' : 'text-text-muted hover:text-text-main'}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* ── Tab: SELECT ARTWORKS ────────────────────────────── */}
          {activeTab === 'select' && (
            <div className="bg-surface rounded-2xl border border-gray-100 p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Search by title or year…"
                  className="flex-1 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:border-accent outline-none bg-bg"
                />
                <button onClick={selectAll} className="text-xs font-bold text-accent hover:underline whitespace-nowrap">Select all</button>
                <button onClick={clearAll} className="text-xs font-bold text-text-muted hover:underline">Clear</button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[420px] overflow-y-auto pr-1">
                {filteredArtworks.map(a => {
                  const isSelected = selectedIds.includes(a.artwork_id);
                  return (
                    <div
                      key={a.artwork_id}
                      onClick={() => toggleArtwork(a.artwork_id)}
                      className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${isSelected ? 'border-accent/40 bg-accent/5' : 'border-gray-100 hover:border-gray-200'}`}
                    >
                      <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 bg-gray-50 border border-gray-100">
                        {a.cover_image
                          ? <img src={a.cover_image} alt={a.artwork_title} className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex items-center justify-center"><BookOpen size={18} className="text-gray-200" /></div>
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-text-main truncate">{a.artwork_title}</p>
                        <p className="text-[10px] text-text-muted">{a.creation_year}{a.medium ? ` · ${a.medium}` : ''}</p>
                      </div>
                      <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 ${isSelected ? 'bg-accent border-accent' : 'border-gray-300'}`}>
                        {isSelected && <Check size={12} className="text-white" />}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Drag-and-drop ordering */}
              {selectedArtworks.length > 1 && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-text-muted mb-3">Drag to reorder</p>
                  <div className="space-y-2">
                    {selectedArtworks.map((a, idx) => (
                      <div
                        key={a.artwork_id}
                        draggable
                        onDragStart={() => handleDragStart(idx)}
                        onDragOver={e => handleDragOver(e, idx)}
                        onDrop={() => handleDrop(idx)}
                        onDragEnd={() => { setDraggingIdx(null); setDragOverIdx(null); }}
                        className={`flex items-center gap-3 p-3 rounded-xl border bg-white transition-all cursor-grab active:cursor-grabbing ${dragOverIdx === idx ? 'border-accent bg-accent/5' : 'border-gray-100'} ${draggingIdx === idx ? 'opacity-40' : ''}`}
                      >
                        <GripVertical size={16} className="text-gray-300 shrink-0" />
                        <span className="text-[10px] font-bold text-text-muted w-5 shrink-0">{idx + 1}</span>
                        <div className="w-8 h-8 rounded overflow-hidden shrink-0 bg-gray-50">
                          {a.cover_image && <img src={a.cover_image} alt={a.artwork_title} className="w-full h-full object-cover" />}
                        </div>
                        <span className="flex-1 text-sm font-medium text-text-main truncate">{a.artwork_title}</span>
                        {/* Scale slider */}
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[10px] text-text-muted">{getScale(a.artwork_id)}%</span>
                          <input
                            type="range"
                            min={50} max={100} step={5}
                            value={getScale(a.artwork_id)}
                            onChange={e => setScale(a.artwork_id, parseInt(e.target.value))}
                            className="w-20 accent-[#6B5CE7]"
                            onClick={e => e.stopPropagation()}
                          />
                        </div>
                        <button
                          onClick={e => { e.stopPropagation(); toggleArtwork(a.artwork_id); }}
                          className="text-gray-300 hover:text-rose-400 transition-colors"
                          aria-label="Remove artwork"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Tab: TEMPLATE ────────────────────────────────────── */}
          {activeTab === 'template' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {TEMPLATES.map(tmpl => {
                  const Icon = tmpl.icon;
                  const isActive = current.template_type === tmpl.id;
                  return (
                    <button
                      key={tmpl.id}
                      onClick={() => setCurrent(p => ({ ...p, template_type: tmpl.id }))}
                      className={`rounded-2xl border-2 p-5 text-left transition-all hover-float ${isActive ? 'border-accent bg-accent/5 shadow-float' : 'border-gray-100 bg-surface hover:border-accent/30'}`}
                    >
                      <Icon size={28} className={isActive ? 'text-accent' : 'text-text-muted'} />
                      <p className={`font-bold mt-3 ${isActive ? 'text-accent' : 'text-text-main'}`}>{tmpl.label}</p>
                      <p className="text-xs text-text-muted mt-1 leading-relaxed">{tmpl.desc}</p>
                    </button>
                  );
                })}
              </div>

              {/* Template B grid columns */}
              {current.template_type === 'B' && (
                <div className="bg-surface rounded-2xl border border-gray-100 p-5 shadow-sm">
                  <p className="text-xs font-bold uppercase tracking-wider text-text-muted mb-3">Grid Columns</p>
                  <div className="flex gap-3">
                    {([2, 4] as const).map(col => (
                      <button
                        key={col}
                        onClick={() => setCurrent(p => ({ ...p, grid_columns: col }))}
                        className={`flex-1 py-3 rounded-xl border-2 font-bold text-sm transition-all ${current.grid_columns === col ? 'border-accent bg-accent/5 text-accent' : 'border-gray-100 text-text-muted'}`}
                      >
                        {col} columns
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Options */}
              <div className="bg-surface rounded-2xl border border-gray-100 p-5 shadow-sm space-y-4">
                <p className="text-xs font-bold uppercase tracking-wider text-text-muted">Options</p>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={current.include_cover ?? true}
                    onChange={e => setCurrent(p => ({ ...p, include_cover: e.target.checked }))}
                    className="rounded accent-[#6B5CE7]"
                  />
                  <span className="text-sm text-text-main font-medium">Include Cover Page</span>
                </label>
              </div>
            </div>
          )}

          {/* ── Tab: ARTIST STATEMENT ─────────────────────────────── */}
          {activeTab === 'statement' && (
            <div className="bg-surface rounded-2xl border border-gray-100 p-5 shadow-sm space-y-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-text-muted">Artist Statement / Presentation Text</p>
                <p className="text-xs text-text-muted mt-1">
                  This text appears as a dedicated page before the artworks. Leave blank to omit.
                </p>
              </div>
              <textarea
                value={current.artist_statement ?? ''}
                onChange={e => setCurrent(p => ({ ...p, artist_statement: e.target.value }))}
                rows={10}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-accent outline-none bg-bg resize-none font-serif"
                placeholder="Write your artist statement here…"
              />
              <p className="text-[10px] text-text-muted text-right">{(current.artist_statement ?? '').length} characters</p>
            </div>
          )}

          {/* ── Tab: PREVIEW & EXPORT ─────────────────────────────── */}
          {activeTab === 'export' && (
            <div className="bg-surface rounded-2xl border border-gray-100 p-5 shadow-sm space-y-5">
              <p className="text-xs font-bold uppercase tracking-wider text-text-muted">Export Summary</p>

              {selectedArtworks.length === 0 ? (
                <p className="text-text-muted text-sm py-8 text-center">
                  Go to the "Works" tab and select at least one artwork.
                </p>
              ) : (
                <>
                  {/* Summary card */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {[
                      { label: 'Artworks', value: selectedArtworks.length },
                      { label: 'Template', value: `${current.template_type} – ${TEMPLATES.find(t => t.id === current.template_type)?.label}` },
                      { label: 'Cover Page', value: current.include_cover ? 'Yes' : 'No' },
                      { label: 'Statement', value: current.artist_statement ? 'Included' : 'None' },
                    ].map(item => (
                      <div key={item.label} className="bg-bg rounded-xl p-3 border border-gray-100">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">{item.label}</p>
                        <p className="font-bold text-text-main text-sm mt-1">{String(item.value)}</p>
                      </div>
                    ))}
                  </div>

                  {/* Artwork list with legend preview */}
                  <div className="space-y-2">
                    <p className="text-xs font-bold uppercase tracking-wider text-text-muted">Technical Captions Preview</p>
                    {selectedArtworks.map((a, idx) => (
                      <div key={a.artwork_id} className="flex items-start gap-3 p-3 rounded-xl bg-bg border border-gray-100">
                        <span className="text-[10px] font-bold text-text-muted w-4 shrink-0 mt-0.5">{idx + 1}</span>
                        <div className="w-10 h-10 rounded overflow-hidden shrink-0 bg-gray-50">
                          {a.cover_image && <img src={a.cover_image} alt={a.artwork_title} className="w-full h-full object-cover" />}
                        </div>
                        <p className="text-xs text-text-main font-serif italic leading-relaxed">
                          {buildTechnicalLegend(a, getScale(a.artwork_id))}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Export button */}
                  <button
                    onClick={handleExport}
                    disabled={exporting}
                    className={`w-full py-3 rounded-xl text-white font-bold flex items-center justify-center gap-3 shadow-float hover-float transition-all ${exporting ? 'bg-accent/50 cursor-not-allowed' : 'bg-accent hover:bg-accent/90'}`}
                  >
                    {exporting ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                    {exporting ? 'Generating PDF — please wait…' : 'Download Portfolio PDF'}
                  </button>
                  <p className="text-[10px] text-text-muted text-center">
                    File will be saved as Portfolio_{selectedArtworks[0]?.artist_name?.replace(/\s+/g, '_')}_{new Date().getFullYear()}-{String(new Date().getMonth() + 1).padStart(2, '0')}.pdf
                  </p>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
