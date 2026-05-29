import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ChevronLeft, Layers, Plus, Pencil, Palette,
  Trash2, X, ChevronRight, ChevronLeft as ChevLeft,
} from 'lucide-react';
import { supabase, deleteSerie, deleteArtwork } from '../services/supabase';
import type { Series, Artwork } from '../types';

/* ─── helpers ──────────────────────────────────────────────────────────────── */

function formatDimensions(a: Artwork) {
  const parts = [a.height, a.width, a.depth].filter(Boolean);
  if (!parts.length) return null;
  const unit = a.dimensions_unit || 'cm';
  return parts.join(' × ') + ' ' + unit;
}

function formatMedium(a: Artwork) {
  const parts = [a.artistic_technique || a.medium, a.support].filter(Boolean);
  return parts.join(' sobre ') || null;
}



/* ─── Artwork Museum Modal ──────────────────────────────────────────────────── */

function ArtworkModal({
  artwork,
  onClose,
  onEdit,
  onDelete,
}: {
  artwork: Artwork;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const images = [
    ...(artwork.cover_image ? [artwork.cover_image] : []),
    ...(artwork.artwork_images ?? []).filter((u) => u !== artwork.cover_image),
  ];
  const [idx, setIdx] = useState(0);

  return (
    <div className="fixed inset-0 z-[200] flex items-end md:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative z-10 bg-white w-full md:max-w-5xl max-h-[96vh] md:max-h-[90vh] rounded-t-3xl md:rounded-2xl overflow-hidden shadow-2xl flex flex-col md:flex-row">

        {/* ── LEFT: image ─────────────────────────────── */}
        <div className="relative md:w-1/2 bg-gray-50 flex-shrink-0">
          <div className="aspect-square md:aspect-auto md:h-full min-h-64 flex items-center justify-center">
            {images.length > 0 ? (
              <img
                src={images[idx]}
                alt={artwork.artwork_title}
                className="w-full h-full object-contain"
              />
            ) : (
              <Palette size={60} className="text-gray-200" />
            )}
          </div>

          {/* image nav */}
          {images.length > 1 && (
            <>
              <button
                aria-label="Anterior"
                onClick={() => setIdx((i) => Math.max(0, i - 1))}
                className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/90 rounded-full p-2 shadow hover:bg-white disabled:opacity-30"
                disabled={idx === 0}
              >
                <ChevLeft size={18} />
              </button>
              <button
                aria-label="Próxima"
                onClick={() => setIdx((i) => Math.min(images.length - 1, i + 1))}
                className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/90 rounded-full p-2 shadow hover:bg-white disabled:opacity-30"
                disabled={idx === images.length - 1}
              >
                <ChevronRight size={18} />
              </button>

              {/* dots */}
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                {images.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setIdx(i)}
                    className={`w-2 h-2 rounded-full transition-all ${
                      i === idx ? 'bg-accent w-4' : 'bg-gray-300'
                    }`}
                  />
                ))}
              </div>
            </>
          )}

          {/* accession / COA badge */}
          {artwork.accession_number && (
            <div className="absolute top-3 left-3 flex flex-col gap-1">
              <span className="bg-white/90 text-gray-500 text-xs font-mono px-2 py-1 rounded">
                {artwork.accession_number}
              </span>
              <span className="bg-gray-900/75 text-white text-xs font-semibold px-2 py-0.5 rounded max-w-[calc(100%-1rem)] leading-tight truncate">
                {artwork.artwork_title}
              </span>
            </div>
          )}
        </div>

        {/* ── RIGHT: ficha técnica ──────────────────────── */}
        <div className="flex flex-col flex-1 overflow-y-auto">

          {/* top bar */}
          <div className="flex items-center justify-between px-8 pt-6 pb-4 border-b border-gray-100">
            <span className="text-xs text-gray-400 tracking-[0.2em] uppercase">Ficha Técnica</span>
            <button aria-label="Fechar" onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
              <X size={20} />
            </button>
          </div>

          {/* content */}
          <div className="flex-1 px-8 py-6 space-y-5 overflow-y-auto">

            {/* Title block */}
            <div className="border-l-4 border-accent pl-5 space-y-0.5">
              <h2 className="text-2xl font-serif italic text-gray-900 leading-snug">
                {artwork.artwork_title}
              </h2>
              {artwork.alternative_title && (
                <p className="text-sm text-gray-400 italic">[{artwork.alternative_title}]</p>
              )}
            </div>

            {/* Fields list */}
            <dl className="space-y-0 divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden text-sm">

              {/* Autoria */}
              <div className="flex items-start gap-4 px-4 py-3 bg-white">
                <dt className="w-40 shrink-0 font-medium text-gray-500">Autoria</dt>
                <dd className="text-gray-900 font-semibold">{artwork.artist_name || 'Nany Arruda'}</dd>
              </div>

              {/* Série */}
              {artwork.series_reference && (
                <div className="flex items-start gap-4 px-4 py-3 odd:bg-gray-50/60">
                  <dt className="w-40 shrink-0 font-medium text-gray-500">Série</dt>
                  <dd className="text-gray-900">{artwork.series_reference}</dd>
                </div>
              )}

              {/* Data / Ano */}
              {artwork.creation_year && (
                <div className="flex items-start gap-4 px-4 py-3 odd:bg-gray-50/60">
                  <dt className="w-40 shrink-0 font-medium text-gray-500">Data / Ano</dt>
                  <dd className="text-gray-900">
                    {artwork.creation_year}
                    {artwork.creation_city ? `, ${artwork.creation_city}` : ''}
                    {artwork.creation_country ? ` — ${artwork.creation_country}` : ''}
                  </dd>
                </div>
              )}

              {/* Local */}
              {artwork.physical_location && (
                <div className="flex items-start gap-4 px-4 py-3 odd:bg-gray-50/60">
                  <dt className="w-40 shrink-0 font-medium text-gray-500">Local</dt>
                  <dd className="text-gray-900">{artwork.physical_location}</dd>
                </div>
              )}

              {/* Unique ID / COA */}
              {(() => {
                let coa: string | undefined;
                try {
                  const d = artwork.intent_note ? JSON.parse(artwork.intent_note) : null;
                  coa = d?.registroCertificado || artwork.inventory_number;
                } catch {
                  coa = artwork.inventory_number;
                }
                if (!coa) return null;
                return (
                  <div className="flex items-start gap-4 px-4 py-3 odd:bg-gray-50/60">
                    <dt className="w-40 shrink-0 font-medium text-gray-500">Nº de Registro</dt>
                    <dd className="text-gray-900 font-mono font-semibold tracking-wide">{coa}</dd>
                  </div>
                );
              })()}

              {/* Resumo Descritivo */}
              {artwork.summary_sentence && (
                <div className="flex items-start gap-4 px-4 py-3 odd:bg-gray-50/60">
                  <dt className="w-40 shrink-0 font-medium text-gray-500">Resumo</dt>
                  <dd className="text-gray-700 leading-relaxed">{artwork.summary_sentence}</dd>
                </div>
              )}

              {/* Dimensões */}
              {(artwork.dimensions_formatted || formatDimensions(artwork)) && (
                <div className="flex items-start gap-4 px-4 py-3 odd:bg-gray-50/60">
                  <dt className="w-40 shrink-0 font-medium text-gray-500">Dimensões</dt>
                  <dd className="text-gray-900">{artwork.dimensions_formatted || formatDimensions(artwork)}</dd>
                </div>
              )}

              {/* Técnica */}
              {formatMedium(artwork) && (
                <div className="flex items-start gap-4 px-4 py-3 odd:bg-gray-50/60">
                  <dt className="w-40 shrink-0 font-medium text-gray-500">Técnica</dt>
                  <dd className="text-gray-900">{formatMedium(artwork)}</dd>
                </div>
              )}

            </dl>

            {/* Curatorial narrative (expandable) */}
            {artwork.curatorial_narrative && (
              <div className="space-y-2 pt-1">
                <p className="text-xs font-bold tracking-[0.2em] text-accent uppercase">Nota Curatorial</p>
                <p className="text-sm text-gray-600 leading-relaxed italic border-l-2 border-accent/30 pl-4">
                  {artwork.curatorial_narrative}
                </p>
              </div>
            )}

            {/* Tags */}
            {artwork.tags && artwork.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {artwork.tags.map((tag) => (
                  <span key={tag} className="text-xs bg-accent/10 text-accent px-3 py-1 rounded-full font-medium">
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* footer: Edit + Delete */}
          <div className="border-t border-gray-100 px-8 py-5 flex gap-3">
            <button
              onClick={onEdit}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-accent text-white font-bold hover:bg-accent/90 transition-colors"
            >
              <Pencil size={16} /> Editar
            </button>
            <button
              onClick={onDelete}
              className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-red-200 text-red-600 font-medium hover:bg-red-50 transition-colors text-sm"
            >
              <Trash2 size={15} /> Excluir
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Main: SerieDetail ─────────────────────────────────────────────────────── */

export default function SerieDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [serie, setSerie] = useState<Series | null>(null);
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [selectedArtwork, setSelectedArtwork] = useState<Artwork | null>(null);
  const [confirmDeleteSerie, setConfirmDeleteSerie] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      try {
        const { data: s, error: sErr } = await supabase
          .from('series')
          .select('*')
          .eq('series_id', id)
          .single();
        if (sErr) throw sErr;
        setSerie(s as Series);

        const { data: a, error: aErr } = await supabase
          .from('artworks')
          .select('*')
          .eq('series_reference', id)
          .order('created_at', { ascending: false });
        if (aErr) throw aErr;
        setArtworks((a ?? []) as Artwork[]);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const handleDeleteSerie = async () => {
    if (!id) return;
    try {
      await deleteSerie(id);
      navigate('/obras');
    } catch (e) {
      setError('Erro ao deletar série: ' + (e as Error).message);
    }
  };



  if (loading)
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent" />
      </div>
    );

  if (error)
    return <div className="p-8 text-red-600 bg-red-50 rounded-xl">{error}</div>;

  if (!serie) return null;

  return (
    <div className="space-y-8 pb-24">

      {/* ── Breadcrumb ── */}
      <button
        onClick={() => navigate('/obras')}
        className="flex items-center gap-2 text-text-muted hover:text-accent transition-colors text-sm font-medium"
      >
        <ChevronLeft size={18} /> Obras
      </button>

      {/* ── Hero ── */}
      <div className="relative rounded-3xl overflow-hidden">
        {serie.cover_image ? (
          <img
            src={serie.cover_image}
            alt={serie.series_title}
            className="w-full h-64 md:h-80 object-cover"
          />
        ) : (
          <div className="w-full h-64 md:h-80 bg-gradient-to-br from-accent/10 to-accent/5 flex items-center justify-center">
            <Layers size={80} className="text-accent/20" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-8 space-y-1">
          <p className="text-white/60 text-xs uppercase tracking-[0.2em]">Série</p>
          <h1 className="text-4xl font-serif text-white">{serie.series_title}</h1>
          {serie.series_number && (
            <p className="text-white/50 text-sm font-mono">#{serie.series_number}</p>
          )}
        </div>
      </div>

      {/* ── Action bar ── */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => navigate(`/upload?type=serie&serieId=${id}`)}
          className="flex items-center gap-2 px-5 py-2.5 bg-accent text-white rounded-xl font-medium hover:bg-accent/90 transition-colors text-sm"
        >
          <Plus size={16} /> Adicionar obra
        </button>
        <button
          onClick={() => navigate(`/upload?editSerie=${id}`)}
          className="flex items-center gap-2 px-5 py-2.5 border border-gray-200 rounded-xl font-medium hover:border-accent hover:text-accent transition-colors text-sm"
        >
          <Pencil size={16} /> Editar série
        </button>
        <button
          onClick={() => setConfirmDeleteSerie(true)}
          className="flex items-center gap-2 px-5 py-2.5 border border-red-200 text-red-500 rounded-xl font-medium hover:bg-red-50 transition-colors text-sm ml-auto"
        >
          <Trash2 size={16} /> Excluir série
        </button>
      </div>

      {/* ── Info ── */}
      {(serie.conceptual_summary || serie.curatorial_narrative) && (
        <div className="bg-surface border border-gray-100 rounded-2xl p-6 space-y-3">
          <p className="text-xs font-bold tracking-[0.2em] text-accent uppercase">Sobre a série</p>
          {serie.conceptual_summary && (
            <p className="text-text-muted leading-relaxed">{serie.conceptual_summary}</p>
          )}
          {serie.curatorial_narrative && (
            <blockquote className="border-l-4 border-accent/30 pl-4 font-serif italic text-text-main">
              {serie.curatorial_narrative}
            </blockquote>
          )}
        </div>
      )}

      {/* ── Artworks ── */}
      <div>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-serif">Obras da série</h2>
          <span className="text-sm text-text-muted">
            {artworks.length} obra{artworks.length !== 1 ? 's' : ''}
          </span>
        </div>

        {artworks.length === 0 ? (
          <div
            onClick={() => navigate(`/upload?type=serie&serieId=${id}`)}
            className="border-2 border-dashed border-gray-200 rounded-2xl p-16 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-accent hover:bg-accent/5 transition-all text-text-muted hover:text-accent"
          >
            <Plus size={32} />
            <p className="font-medium">Adicionar primeira obra à série</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {artworks.map((obra) => (
              <div
                key={obra.artwork_id}
                onClick={() => setSelectedArtwork(obra)}
                className="group cursor-pointer bg-surface rounded-2xl overflow-hidden border border-gray-100 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
              >
                {/* image */}
                <div className="relative aspect-[4/5] bg-gray-50 overflow-hidden">
                  {obra.cover_image || obra.artwork_images?.[0] ? (
                    <img
                      src={obra.cover_image || obra.artwork_images![0]}
                      alt={obra.artwork_title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-200">
                      <Palette size={44} />
                    </div>
                  )}
                  {/* hover overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center">
                    <span className="opacity-0 group-hover:opacity-100 bg-white text-text-main text-xs font-bold px-4 py-2 rounded-full shadow transition-all">
                      Ver ficha técnica
                    </span>
                  </div>
                  {/* edition badge */}
                  {obra.edition_number && (
                    <span className="absolute bottom-2 right-2 bg-white/90 text-accent text-xs font-bold px-2 py-0.5 rounded">
                      {obra.edition_number}
                    </span>
                  )}
                </div>

                {/* museum label below image */}
                <div className="px-4 pt-3 pb-4 border-t border-gray-50">
                  <p className="text-[11px] text-gray-400 font-semibold tracking-wide uppercase mb-0.5">
                    {obra.artist_name}
                  </p>
                  <h3 className="font-serif text-base text-text-main italic leading-snug">
                    {obra.artwork_title}
                  </h3>
                  <p className="text-xs text-text-muted mt-1">
                    {obra.creation_year}
                    {formatMedium(obra) ? ` · ${formatMedium(obra)}` : ''}
                  </p>
                  {formatDimensions(obra) && (
                    <p className="text-xs text-gray-400 mt-0.5">{formatDimensions(obra)}</p>
                  )}
                </div>
              </div>
            ))}

            {/* Add card */}
            <div
              onClick={() => navigate(`/upload?type=serie&serieId=${id}`)}
              className="border-2 border-dashed border-gray-200 rounded-2xl aspect-[4/5] flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-accent hover:bg-accent/5 transition-all text-text-muted hover:text-accent"
            >
              <Plus size={28} />
              <span className="text-sm font-medium">Nova obra</span>
            </div>
          </div>
        )}
      </div>

      {/* ── Artwork Museum Modal ── */}
      {selectedArtwork && (
        <ArtworkModal
          artwork={selectedArtwork}
          onClose={() => setSelectedArtwork(null)}
          onEdit={() => navigate(`/upload?id=${selectedArtwork.artwork_id}`)}
          onDelete={async () => {
            if (!window.confirm(`Excluir "${selectedArtwork.artwork_title}"? Esta ação não pode ser desfeita.`)) return;
            await deleteArtwork(selectedArtwork.artwork_id);
            setArtworks(prev => prev.filter(a => a.artwork_id !== selectedArtwork.artwork_id));
            setSelectedArtwork(null);
          }}
        />
      )}

      {/* ── Delete Serie Confirm ── */}
      {confirmDeleteSerie && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-5">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center shrink-0">
                <Trash2 size={20} className="text-red-600" />
              </div>
              <div>
                <h3 className="font-serif text-xl">Excluir série</h3>
                <p className="text-sm text-text-muted mt-1">
                  Tem certeza que deseja excluir <strong>{serie.series_title}</strong>? As obras
                  vinculadas <strong>não serão excluídas</strong>.
                </p>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmDeleteSerie(false)}
                className="px-5 py-2 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteSerie}
                className="px-5 py-2 bg-red-600 text-white rounded-lg text-sm font-bold hover:bg-red-700"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
