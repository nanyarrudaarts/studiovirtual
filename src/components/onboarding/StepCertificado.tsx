import { useState, useCallback, useRef } from 'react';
import { extractStyleFromFile, type FontCategory, type Orientation } from '../../lib/colorExtractor';
import { saveCertificateTemplate } from '../../services/supabase';

// ─── Design tokens (mirrors the rest of onboarding) ───────────────────────────

const DT = {
  text: '#1D1D1F',
  textMuted: '#86868B',
  gold: '#C5A059',
  fontSans: 'system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", sans-serif',
};

// ─── Constants ────────────────────────────────────────────────────────────────

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const MAX_SIZE_MB = 10;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

const FONT_CATEGORIES: { id: FontCategory; label: string; description: string }[] = [
  { id: 'serif', label: 'Serif', description: 'Times, Garamond, Georgia — elegância clássica' },
  { id: 'sans-serif', label: 'Sans-serif', description: 'Helvetica, Inter, Futura — clean e moderno' },
  { id: 'script', label: 'Script / Cursivo', description: 'Caligráfico, manuscrito, orgânico' },
  { id: 'display', label: 'Display / Decorativo', description: 'Tipografia expressiva e singular' },
];

// ─── Phase types ──────────────────────────────────────────────────────────────

type Phase = 'idle' | 'extracting' | 'confirm' | 'saving' | 'done';

interface ExtractedData {
  palette: string[];
  orientation: Orientation;
  aspectRatio: number;
  previewUrl: string;
  originalFile: File;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  /** Called when the user confirms and the template is saved. */
  onSaved: () => void;
  /** Called when the user chooses to skip this step. */
  onSkip: () => void;
  /** Artist's name to use when creating the Artwork record. */
  artistName?: string;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Interactive colour swatch with inline colour picker */
function Swatch({ hex, onChange }: { hex: string; onChange: (h: string) => void }) {
  return (
    <label
      className="relative w-12 h-12 rounded-xl border-2 border-white shadow-md cursor-pointer overflow-hidden transition-transform hover:scale-110 focus-within:ring-2 focus-within:ring-offset-1"
      style={{ background: hex }}
      title={hex}
    >
      <input
        type="color"
        value={hex}
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
        aria-label={`Editar cor ${hex}`}
      />
    </label>
  );
}

/** Dropzone area */
function Dropzone({
  onFile,
  error,
}: {
  onFile: (f: File) => void;
  error: string | null;
}) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const validate = (file: File): string | null => {
    if (!ACCEPTED_TYPES.includes(file.type) && !file.name.toLowerCase().endsWith('.pdf')) {
      return 'Formato inválido. Aceito: JPG, PNG, WebP ou PDF.';
    }
    if (file.size > MAX_SIZE_BYTES) {
      return `O arquivo é muito grande. Máximo: ${MAX_SIZE_MB} MB.`;
    }
    return null;
  };

  const handleFile = (file: File) => {
    const err = validate(file);
    if (err) {
      alert(err);
      return;
    }
    onFile(file);
  };

  const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (!file) return;
    const err =
      (!ACCEPTED_TYPES.includes(file.type) && !file.name.toLowerCase().endsWith('.pdf'))
        ? 'Formato inválido. Aceito: JPG, PNG, WebP ou PDF.'
        : file.size > MAX_SIZE_BYTES
          ? `O arquivo é muito grande. Máximo: ${MAX_SIZE_MB} MB.`
          : null;
    if (err) { alert(err); return; }
    onFile(file);
  // onFile is a prop reference — stable within each render; no closure issue
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setDragging(true); };
  const onDragLeave = () => setDragging(false);

  return (
    <div className="space-y-3">
      <div
        role="button"
        tabIndex={0}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click(); }}
        aria-label="Área de upload de certificado"
        className={[
          'w-full h-52 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-3',
          'cursor-pointer transition-all duration-200 select-none outline-none',
          dragging
            ? 'border-[#C5A059] bg-[#C5A059]/5 scale-[1.01]'
            : 'border-[#d1ccc4] bg-[#fafaf8] hover:border-[#0f3421] hover:bg-[#f5f5f0]',
        ].join(' ')}
      >
        {/* Cloud upload icon */}
        <div
          className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${dragging ? 'bg-[#C5A059]/15' : 'bg-[#e8e4de]'}`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke={dragging ? DT.gold : '#86868B'}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-7 h-7"
          >
            <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
            <polyline points="7 9 12 4 17 9" />
            <line x1="12" y1="4" x2="12" y2="16" />
          </svg>
        </div>

        <div className="text-center px-4">
          <p className="text-sm font-semibold text-[#1D1D1F]">
            {dragging ? 'Solte o arquivo aqui' : 'Arraste um certificado ou clique para selecionar'}
          </p>
          <p className="text-xs text-[#86868B] mt-1">JPG, PNG ou PDF · máx. {MAX_SIZE_MB} MB</p>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          className="hidden"
          onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }}
        />
      </div>

      {error && (
        <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs flex gap-2 items-start">
          <span className="mt-0.5">⚠️</span>
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function StepCertificado({ onSaved, onSkip, artistName }: Props) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [extracted, setExtracted] = useState<ExtractedData | null>(null);
  const [palette, setPalette] = useState<string[]>([]);
  const [fontCategory, setFontCategory] = useState<FontCategory>('sans-serif');
  const [fileError, setFileError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // ── File picked → extract style ──────────────────────────────────────────────
  const handleFile = async (file: File) => {
    setFileError(null);
    setSaveError(null);
    setPhase('extracting');

    try {
      const { style, previewBlob } = await extractStyleFromFile(file);
      const previewUrl = URL.createObjectURL(previewBlob);

      setExtracted({
        palette: style.palette,
        orientation: style.orientation,
        aspectRatio: style.aspectRatio,
        previewUrl,
        originalFile: file,
      });
      setPalette(style.palette);
      setPhase('confirm');
    } catch (err) {
      console.error('Erro na extração de estilo:', err);
      setFileError(
        err instanceof Error
          ? err.message
          : 'Não foi possível processar o arquivo. Tente outro formato.'
      );
      setPhase('idle');
    }
  };

  // ── User confirms template ───────────────────────────────────────────────────
  const handleSave = async () => {
    if (!extracted) return;
    setSaveError(null);
    setPhase('saving');

    try {
      await saveCertificateTemplate(
        extracted.originalFile,
        {
          palette,
          font_category: fontCategory,
          orientation: extracted.orientation,
          aspect_ratio: extracted.aspectRatio,
        },
        artistName
      );
      setPhase('done');
      // Advance after a short moment so the success state is visible
      setTimeout(() => onSaved(), 1200);
    } catch (err) {
      console.error('Erro ao salvar template:', err);
      setSaveError(
        err instanceof Error
          ? err.message
          : 'Erro ao salvar. Verifique sua conexão e tente novamente.'
      );
      setPhase('confirm');
    }
  };

  // ── Restart (pick another file) ──────────────────────────────────────────────
  const handleReset = () => {
    if (extracted?.previewUrl) URL.revokeObjectURL(extracted.previewUrl);
    setExtracted(null);
    setPalette([]);
    setFontCategory('sans-serif');
    setFileError(null);
    setSaveError(null);
    setPhase('idle');
  };

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6" style={{ fontFamily: DT.fontSans }}>
      {/* Header */}
      <div>
        <h2
          style={{ color: DT.text }}
          className="text-3xl md:text-4xl font-semibold tracking-tight leading-tight mb-1.5"
        >
          Template de certificado
        </h2>
        <p className="text-[15px] font-normal leading-relaxed" style={{ color: DT.textMuted }}>
          Envie um certificado existente. Extraímos automaticamente as cores e o estilo para criar
          um template reutilizável — sem IA externa, tudo direto no seu navegador.
        </p>
      </div>

      {/* ── IDLE: dropzone ── */}
      {(phase === 'idle') && (
        <Dropzone onFile={handleFile} error={fileError} />
      )}

      {/* ── EXTRACTING: loading state ── */}
      {phase === 'extracting' && (
        <div className="h-52 rounded-2xl bg-[#fafaf8] border border-[#e8e4de] flex flex-col items-center justify-center gap-4">
          <div className="w-8 h-8 border-2 border-[#C5A059] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-[#86868B]">Analisando cores e proporções…</p>
        </div>
      )}

      {/* ── CONFIRM: preview + palette editor + font picker ── */}
      {(phase === 'confirm' || phase === 'saving') && extracted && (
        <div className="space-y-6">
          {/* Preview + palette side by side */}
          <div className="flex flex-col sm:flex-row gap-5 items-start">
            {/* Thumbnail */}
            <div className="shrink-0 w-full sm:w-48">
              <div
                className="rounded-xl overflow-hidden border border-[#e8e4de] shadow-sm bg-white"
                style={{
                  aspectRatio: `${extracted.aspectRatio}`,
                  maxHeight: '200px',
                }}
              >
                <img
                  src={extracted.previewUrl}
                  alt="Prévia do certificado"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="mt-2 flex items-center gap-1.5">
                <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-[#e8e4de] text-[#6B6762]">
                  {extracted.orientation === 'landscape' ? 'Paisagem' : 'Retrato'}
                </span>
                <span className="text-[10px] text-[#86868B]">
                  {extracted.aspectRatio.toFixed(2)}:1
                </span>
              </div>
            </div>

            {/* Palette editor */}
            <div className="flex-1 space-y-3">
              <div>
                <h3 className="text-sm font-bold text-[#1D1D1F]">Paleta extraída</h3>
                <p className="text-xs text-[#86868B] mt-0.5">
                  Clique em qualquer cor para ajustá-la manualmente.
                </p>
              </div>
              <div className="flex gap-2 flex-wrap">
                {palette.map((hex, i) => (
                  <Swatch
                    key={i}
                    hex={hex}
                    onChange={(newHex) => {
                      const next = [...palette];
                      next[i] = newHex;
                      setPalette(next);
                    }}
                  />
                ))}
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {palette.map((hex, i) => (
                  <span key={i} className="font-mono text-[10px] text-[#86868B]">
                    {hex}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Font category selector */}
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-[#1D1D1F]">Categoria tipográfica</h3>
            <p className="text-xs text-[#86868B]">
              Selecione o estilo de fonte predominante no certificado.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
              {FONT_CATEGORIES.map(({ id, label, description }) => (
                <label
                  key={id}
                  className={[
                    'flex items-start gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all',
                    fontCategory === id
                      ? 'border-[#C5A059] bg-[#C5A059]/5'
                      : 'border-[#e8e4de] bg-[#fafaf8] hover:border-[#b8b2ab]',
                  ].join(' ')}
                >
                  <input
                    type="radio"
                    name="font_category"
                    value={id}
                    checked={fontCategory === id}
                    onChange={() => setFontCategory(id)}
                    className="mt-0.5 accent-[#C5A059]"
                  />
                  <div>
                    <span className="text-sm font-semibold text-[#1D1D1F]">{label}</span>
                    <p className="text-xs text-[#86868B] mt-0.5">{description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Save error */}
          {saveError && (
            <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs">
              ⚠️ {saveError}
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={handleSave}
              disabled={phase === 'saving'}
              className="flex-1 py-3 rounded-xl bg-[#C5A059] text-white text-sm font-bold hover:opacity-90 disabled:opacity-60 disabled:cursor-wait transition-opacity flex items-center justify-center gap-2"
            >
              {phase === 'saving' ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Salvando…
                </>
              ) : (
                '✓ Usar este padrão'
              )}
            </button>
            <button
              onClick={handleReset}
              disabled={phase === 'saving'}
              className="px-5 py-3 rounded-xl border border-[#d1ccc4] text-sm font-semibold text-[#1D1D1F] hover:bg-[#F2F2F7] disabled:opacity-50 transition-colors"
            >
              Trocar arquivo
            </button>
          </div>
        </div>
      )}

      {/* ── DONE: success state ── */}
      {phase === 'done' && (
        <div className="h-52 rounded-2xl bg-[#f0f9f0] border border-[#b3e6b3] flex flex-col items-center justify-center gap-3">
          <div className="w-12 h-12 rounded-full bg-[#22c55e]/15 flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <div className="text-center">
            <p className="text-sm font-bold text-[#15803d]">Template salvo com sucesso!</p>
            <p className="text-xs text-[#86868B] mt-1">Avançando para o próximo passo…</p>
          </div>
        </div>
      )}

      {/* Skip option — always visible in idle and confirm phases */}
      {(phase === 'idle' || phase === 'confirm') && (
        <div className="pt-2 border-t border-[#E5E5EA] flex justify-center">
          <button
            onClick={onSkip}
            className="text-xs text-[#86868B] hover:text-[#1D1D1F] transition-colors underline underline-offset-2"
          >
            Pular esta etapa e configurar depois
          </button>
        </div>
      )}

      {/* Info note */}
      {phase === 'idle' && (
        <div className="rounded-xl p-4 bg-[#fafaf8] border border-[#e8e4de]">
          <p className="text-xs text-[#6B6762] leading-relaxed">
            <strong>Privacidade:</strong> A análise de cores acontece inteiramente no seu navegador,
            sem enviar a imagem para nenhuma IA externa. O arquivo original é armazenado com segurança
            no seu acervo.
          </p>
        </div>
      )}
    </div>
  );
}
