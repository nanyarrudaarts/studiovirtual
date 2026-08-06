import { useState, useEffect, useRef, useMemo } from 'react';
import { Plus, X, Sparkles, Loader2, Camera, Check, FileText, FileUp, Globe, PenLine, BookOpen, Award, Briefcase, User, Bookmark } from 'lucide-react';
import { supabase } from '../services/supabase';

// ─── Image Compression Helper ──────────────────────────────────────────────
async function compressImage(file: File, maxSize: number = 1600): Promise<File | Blob> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxSize) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = Math.round((width * maxSize) / height);
            height = maxSize;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            } else {
              resolve(file);
            }
          },
          'image/jpeg',
          0.8
        );
      };
      img.onerror = () => resolve(file);
      img.src = e.target?.result as string;
    };
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
}

import { useTranslation } from 'react-i18next';
import { callAI, readURLWithJina } from '../services/ai';

import * as pdfjsLib from 'pdfjs-dist';

// Avoid worker issues in Vite by loading from CDN
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;



function extractJson(text: string) {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try { return JSON.parse(match[0]); } catch { return null; }
}

const PROFILE_JSON_SCHEMA = `{
  "nome": "string",
  "nomeArtistico": "string",
  "nacionalidade": "string",
  "cidade": "string",
  "email": "string",
  "bioShort": "string (máx 120 palavras)",
  "bioLong": "string (3-4 parágrafos)",
  "website": "string",
  "instagrams": ["string"],
  "formacao": [{"curso":"","instituicao":"","anoInicio":"","anoFim":""}],
  "exposIndividuais": [{"titulo":"","local":"","cidade":"","pais":"","ano":"","curador":""}],
  "exposColetivas": [{"titulo":"","local":"","cidade":"","pais":"","ano":"","curador":""}],
  "premios": [{"nome":"","instituicao":"","ano":""}],
  "residencias": [{"nome":"","local":"","ano":""}],
  "publicacoes": [{"tipo":"Livro|Jornal|Website|Revista|Catálogo|Exposição|Outro","titulo":"","tituloLivro":"","autor":"","editora":"","ano":"","isbn":"","contribuicao":"Ilustração|Texto|Fotografia|Capa|Prefácio|Outro","localContribuicao":"","link":""}]
}`;

type ImportedData = Record<string, unknown>;

/* ---- Diff Preview ---- */
function DiffPreview({ current, imported, onApply, t }: {
  current: Record<string, unknown>;
  imported: ImportedData;
  onApply: (selected: ImportedData) => void;
  t: (k: string) => string;
}) {
  const [prevImported, setPrevImported] = useState<ImportedData | null>(null);
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  const keys = Object.keys(imported).filter(k => imported[k] !== undefined && imported[k] !== null && imported[k] !== '');

  if (imported !== prevImported) {
    setPrevImported(imported);
    const initial: Record<string, boolean> = {};
    keys.forEach(k => { initial[k] = true; });
    setChecked(initial);
  }

  const toggle = (k: string) => setChecked(c => ({ ...c, [k]: !c[k] }));

  const apply = () => {
    const selected: ImportedData = {};
    keys.filter(k => checked[k]).forEach(k => { selected[k] = imported[k]; });
    onApply(selected);
  };

  const fmt = (v: unknown) => {
    if (Array.isArray(v)) return `[${v.length} itens]`;
    return String(v || '—');
  };

  return (
    <div className="border border-border rounded-xl overflow-hidden bg-surface-raised">
      <div className="grid grid-cols-2 text-xs font-bold bg-surface px-4 py-2.5 border-b border-border text-text-muted">
        <span>{t('perfil.dados_atuais')}</span>
        <span className="text-emerald-500">{t('perfil.dados_importados')}</span>
      </div>
      <div className="divide-y divide-border max-h-72 overflow-y-auto bg-bg">
        {keys.map(k => {
          const isNew = !current[k] || current[k] === '';
          const isConflict = current[k] && current[k] !== imported[k];
          return (
            <label key={k} className="grid grid-cols-[auto_1fr_1fr] items-center gap-4 px-4 py-2.5 cursor-pointer hover:bg-surface-raised transition-colors">
              <input type="checkbox" aria-label={`Selecionar ${k}`} checked={!!checked[k]} onChange={() => toggle(k)}
                className="accent-gold w-4 h-4 cursor-pointer" title={`Selecionar ${k}`} />
              <span className="text-xs text-text-muted truncate">{fmt(current[k])}</span>
              <span className={`text-xs font-medium truncate ${isNew ? 'text-emerald-500' : isConflict ? 'text-amber-500' : 'text-text-main'}`}>
                {fmt(imported[k])}
              </span>
            </label>
          );
        })}
      </div>
      <div className="px-4 py-3 bg-surface border-t border-border flex justify-between items-center">
        <span className="text-xs text-text-muted">{keys.filter(k => checked[k]).length} de {keys.length} {t('campos_selecionados')}</span>
        <button onClick={apply}
          className="flex items-center gap-2 px-5 py-2 bg-gold text-bg text-sm font-bold rounded-lg hover:bg-gold-light hover-lift transition-all shadow-gold-glow-sm">
          <Check size={14} /> {t('perfil.aplicar_selecionados')}
        </button>
      </div>
    </div>
  );
}

const SECTION_LABELS: Record<string, string> = {
  all: 'Geral (Auto-detectar tudo)',
  identidade: 'Identidade (Nome, Nacionalidade, Cidade, Website)',
  biografia: 'Biografia (Bio Curta, Bio Longa)',
  formacao: 'Formação e Trajetória',
  premios: 'Prêmios e Distinções',
  residencias: 'Residências Artísticas',
  exposIndividuais: 'Exposições Individuais',
  exposColetivas: 'Exposições Coletivas',
  publicacoes: 'Publicações'
};

function getSectionSchema(section: string): string {
  switch (section) {
    case 'identidade':
      return `{
        "nome": "string",
        "nomeArtistico": "string",
        "nacionalidade": "string",
        "cidade": "string",
        "email": "string",
        "website": "string"
      }`;
    case 'biografia':
      return `{
        "bioShort": "string (máx 120 palavras)",
        "bioLong": "string (3-4 parágrafos)"
      }`;
    case 'formacao':
      return `{
        "formacao": [{"curso":"string","instituicao":"string","anoInicio":"string","anoFim":"string"}]
      }`;
    case 'premios':
      return `{
        "premios": [{"nome":"string","instituicao":"string","ano":"string"}]
      }`;
    case 'residencias':
      return `{
        "residencias": [{"nome":"string","local":"string","ano":"string"}]
      }`;
    case 'exposIndividuais':
      return `{
        "exposIndividuais": [{"titulo":"string","local":"string","cidade":"string","pais":"string","ano":"string","curador":"string"}]
      }`;
    case 'exposColetivas':
      return `{
        "exposColetivas": [{"titulo":"string","local":"string","cidade":"string","pais":"string","ano":"string","curador":"string"}]
      }`;
    case 'publicacoes':
      return `{
        "publicacoes": [{
          "tipo": "Livro|Jornal|Website|Revista|Catálogo|Exposição|Outro",
          "titulo": "string",
          "tituloLivro": "string",
          "autor": "string",
          "editora": "string",
          "ano": "string",
          "isbn": "string",
          "contribuicao": "Ilustração|Texto|Fotografia|Capa|Prefácio|Outro",
          "localContribuicao": "string",
          "link": "string"
        }]
      }`;
    default:
      return '{}';
  }
}

async function extractTextFromPDF(base64Data: string) {
  const binaryString = window.atob(base64Data);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  const loadingTask = pdfjsLib.getDocument({ data: bytes });
  const pdf = await loadingTask.promise;
  let fullText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((item: unknown) => (item as { str: string }).str).join(' ');
    fullText += pageText + '\n';
  }
  return fullText;
}

/* ---- Smart Import ---- */
function SmartImport({ currentData, onImport, t }: {
  currentData: Record<string, unknown>;
  onImport: (data: ImportedData) => void;
  t: (k: string) => string;
}) {
  const [tab, setTab] = useState<'text' | 'pdf' | 'url'>('text');
  const [targetSection, setTargetSection] = useState<string>('all');
  const [textInput, setTextInput] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [importedData, setImportedData] = useState<ImportedData | null>(null);
  const [error, setError] = useState('');
  const pdfRef = useRef<HTMLInputElement>(null);

  const getPrompt = (inputText: string) => {
    if (targetSection === 'all') {
      return `Analise o texto abaixo. Extraia todas as informações do artista e retorne APENAS JSON válido em português brasileiro com este schema exato:\n${PROFILE_JSON_SCHEMA}\n\nCONTEÚDO DO TEXTO:\n${inputText.substring(0, 50000)}`;
    }
    return `Você é um curador de arte especialista e assistente pessoal de IA. Analise o texto fornecido e extraia informações com foco total e absoluto na seção específica: "${SECTION_LABELS[targetSection]}".
Se o texto descrever participações, livros contendo obras do artista, exposições ou qualquer prêmio/formação do artista no contexto do texto, capture e retorne corretamente estruturado.
Retorne APENAS um JSON válido em português brasileiro contendo esses dados mapeados exatamente para este schema (seja extremamente preciso e não perca nenhum detalhe de ano, local ou editora):

${getSectionSchema(targetSection)}

CONTEÚDO DO TEXTO:
${inputText.substring(0, 50000)}`;
  };

  const importFromText = async () => {
    if (!textInput.trim() || textInput.trim().length < 5) { setError('O texto inserido é muito curto ou inválido.'); return; }
    setError(''); setLoading(true); setImportedData(null);
    try {
      setLoadingStep(`Extraindo dados de ${SECTION_LABELS[targetSection]} com IA...`);
      const prompt = getPrompt(textInput);
      const text = await callAI(prompt, 'groq');
      setLoadingStep(t('perfil.preenchendo_perfil'));
      await new Promise(r => setTimeout(r, 400));
      const data = extractJson(text);
      if (data) {
        setImportedData(data);
      } else {
        setError('A IA não conseguiu encontrar os dados ou gerou um formato inválido.');
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro de comunicação com IA');
    }
    setLoading(false); setLoadingStep('');
  };

  const importFromPdf = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(''); setLoading(true); setImportedData(null);
    try {
      setLoadingStep('Extraindo texto do PDF localmente...');
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const base64 = await base64Promise;
      const extractedText = await extractTextFromPDF(base64);

      setLoadingStep(`Analisando currículo com IA (Foco: ${SECTION_LABELS[targetSection]})...`);
      const prompt = getPrompt(extractedText);
      const text = await callAI(prompt, 'groq');
      setLoadingStep(t('perfil.preenchendo_perfil'));
      await new Promise(r => setTimeout(r, 400));
      const data = extractJson(text);
      if (data) setImportedData(data);
      else setError('A IA não conseguiu estruturar as informações do PDF.');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro ao processar PDF');
    }
    setLoading(false); setLoadingStep('');
  };

  const importFromUrl = async () => {
    if (!urlInput.trim()) { setError('Insira uma URL válida.'); return; }
    setError(''); setLoading(true); setImportedData(null);
    try {
      setLoadingStep('Extraindo conteúdo da página via Jina Reader...');
      const webText = await readURLWithJina(urlInput);
      setLoadingStep(`Analisando dados do site com IA (Foco: ${SECTION_LABELS[targetSection]})...`);
      const prompt = getPrompt(webText);
      const text = await callAI(prompt, 'groq');
      setLoadingStep(t('perfil.preenchendo_perfil'));
      await new Promise(r => setTimeout(r, 400));
      const data = extractJson(text);
      if (data) {
        setImportedData(data);
      } else {
        setError('A IA não conseguiu estruturar as informações da página.');
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro ao importar da URL');
    }
    setLoading(false); setLoadingStep('');
  };

  return (
    <section className="glass-slab rounded-2xl overflow-hidden">
      <div className="px-7 py-5 border-b border-border bg-surface-raised/35">
        <h2 className="text-lg font-serif mb-0.5 text-gold font-bold">{t('perfil.importar_title')}</h2>
        <p className="text-sm text-text-muted">{t('perfil.importar_subtitle')}</p>
      </div>
      <div className="p-7 space-y-5">
        {/* Tabs & Section Target */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
          <div className="flex gap-2">
            <button onClick={() => { setTab('text'); setImportedData(null); setError(''); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${tab === 'text' ? 'bg-gold text-bg shadow-gold-glow-sm' : 'bg-surface-raised border border-border text-text-muted hover:text-text-main'}`}>
              <FileText size={15}/> Colar texto
            </button>
            <button onClick={() => { setTab('pdf'); setImportedData(null); setError(''); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${tab === 'pdf' ? 'bg-gold text-bg shadow-gold-glow-sm' : 'bg-surface-raised border border-border text-text-muted hover:text-text-main'}`}>
              <FileUp size={15}/> Enviar PDF
            </button>
            <button onClick={() => { setTab('url'); setImportedData(null); setError(''); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${tab === 'url' ? 'bg-gold text-bg shadow-gold-glow-sm' : 'bg-surface-raised border border-border text-text-muted hover:text-text-main'}`}>
              <Globe size={15}/> Importar de URL
            </button>
          </div>
          
          <div className="flex items-center gap-2">
            <label htmlFor="section-select" className="text-xs font-bold text-text-muted whitespace-nowrap">Seção para preencher:</label>
            <select
              id="section-select"
              value={targetSection}
              onChange={(e) => { setTargetSection(e.target.value); setImportedData(null); setError(''); }}
              className="border border-border rounded-lg px-3 py-1.5 text-xs focus:border-gold focus:ring-1 focus:ring-gold/30 outline-none bg-bg font-bold text-text-main cursor-pointer"
            >
              {Object.entries(SECTION_LABELS).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Text Panel */}
        {tab === 'text' && (
          <div className="space-y-3">
            <textarea value={textInput} onChange={e => setTextInput(e.target.value)}
              placeholder={targetSection === 'all' 
                ? "Cole aqui a biografia do seu site, um currículo copiado, perfil do Instagram, etc..."
                : `Cole aqui as informações correspondentes a: ${SECTION_LABELS[targetSection]}...`
              }
              className="w-full border border-border rounded-xl px-4 py-3 text-sm focus:border-gold focus:ring-1 focus:ring-gold/30 outline-none bg-bg h-32 resize-none text-text-main" />
            <div className="flex justify-end">
              <button onClick={importFromText} disabled={loading || !textInput.trim()}
                className="px-5 py-2.5 bg-gold text-bg font-bold rounded-xl text-sm hover:bg-gold-light disabled:opacity-60 transition-all whitespace-nowrap shadow-gold-glow-sm">
                {loading ? <div className="flex items-center gap-2"><Loader2 size={16} className="animate-spin" /> Analisando...</div> : "Analisar com IA"}
              </button>
            </div>
          </div>
        )}

        {/* PDF Panel */}
        {tab === 'pdf' && (
          <div className="border border-dashed border-gold-dim rounded-xl p-8 text-center bg-surface hover:bg-gold/5 transition-colors relative cursor-pointer group shadow-gold-glow-sm"
            onClick={() => pdfRef.current?.click()}>
            <input type="file" ref={pdfRef} onChange={importFromPdf} accept="application/pdf" className="hidden" aria-label="Upload de arquivo PDF" />
            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-full bg-gold/10 flex items-center justify-center text-gold group-hover:scale-110 transition-transform">
                <FileUp size={24} />
              </div>
              <p className="text-sm font-bold text-text-main">Escolha seu arquivo PDF ou arraste aqui</p>
              <p className="text-xs text-text-muted">Currículos artísticos, biografias e dossiês</p>
            </div>
          </div>
        )}

        {/* URL Panel */}
        {tab === 'url' && (
          <div className="space-y-3">
            <div className="flex gap-2">
              <input
                type="url"
                value={urlInput}
                onChange={e => setUrlInput(e.target.value)}
                placeholder="https://seu-site.com/biografia ou link do portfolio"
                aria-label="URL para importação"
                className="w-full border border-border rounded-xl px-4 py-2 text-sm focus:border-gold focus:ring-1 focus:ring-gold/30 outline-none bg-bg text-text-main"
              />
              <button
                onClick={importFromUrl}
                disabled={loading || !urlInput.trim()}
                className="px-5 py-2 bg-gold text-bg font-bold rounded-xl text-sm hover:bg-gold-light disabled:opacity-60 transition-all whitespace-nowrap shadow-gold-glow-sm"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : "Importar"}
              </button>
            </div>
            <p className="text-xs text-text-muted">Busca e extrai automaticamente o conteúdo visível de qualquer página pública utilizando o Jina Reader.</p>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center gap-3 py-3 text-gold">
            <Loader2 size={18} className="animate-spin" />
            <span className="text-sm font-medium">{loadingStep}</span>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-rose-950/20 border border-rose-900/40 text-rose-400 text-sm px-4 py-3 rounded-xl">{error}</div>
        )}

        {/* Diff Preview */}
        {importedData && !loading && (
          <div className="space-y-3">
            <p className="text-sm font-bold text-emerald-500">✓ {t('dados_extraidos')}</p>
            <DiffPreview current={currentData} imported={importedData} onApply={data => { onImport(data); setImportedData(null); setTextInput(''); setUrlInput(''); }} t={t} />
          </div>
        )}
      </div>
    </section>

  );
}




const NACIONALIDADE_SUGGESTIONS = [
  "Brasileira",
  "Brasileiro",
  "Portuguesa",
  "Português",
  "Americana",
  "Americano",
  "Italiana",
  "Italiano",
  "Espanhola",
  "Espanhol",
  "Francesa",
  "Francês",
  "Alemã",
  "Alemão",
  "Inglesa",
  "Inglês",
  "Argentina",
  "Argentino",
  "Chilena",
  "Chileno",
  "Uruguaia",
  "Uruguaio",
  "Canadense",
  "Japonesa",
  "Japonês",
  "Chinesa",
  "Chinês",
  "Mexicana",
  "Mexicano",
  "Colombiana",
  "Colombiano"
];

const RESIDENCIA_SUGGESTIONS = [
  "Rio de Janeiro, RJ, Brasil",
  "São Paulo, SP, Brasil",
  "Belo Horizonte, MG, Brasil",
  "Porto Alegre, RS, Brasil",
  "Curitiba, PR, Brasil",
  "Salvador, BA, Brasil",
  "Recife, PE, Brasil",
  "Fortaleza, CE, Brasil",
  "Brasília, DF, Brasil",
  "Florianópolis, SC, Brasil",
  "Vitória, ES, Brasil",
  "Goiânia, GO, Brasil",
  "Manaus, AM, Brasil",
  "Belém, PA, Brasil",
  "Lisboa, Portugal",
  "Porto, Portugal",
  "Coimbra, Portugal",
  "Braga, Portugal",
  "Faro, Portugal",
  "Funchal, Madeira, Portugal",
  "Ponta Delgada, Açores, Portugal",
  "Madrid, Espanha",
  "Barcelona, Espanha",
  "Paris, França",
  "Berlim, Alemanha",
  "Londres, Reino Unido",
  "Roma, Itália",
  "Milão, Itália",
  "Nova York, NY, EUA",
  "Miami, FL, EUA",
  "Los Angeles, CA, EUA",
  "Tóquio, Japão",
  "Buenos Aires, Argentina"
];

function AutocompleteInput({
  id,
  label,
  value,
  onChange,
  placeholder,
  suggestions,
  className = "",
  disabled = false
}: {
  id: string;
  label: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  suggestions: string[];
  className?: string;
  disabled?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const safeVal = (value || '').trim();
  const filtered = useMemo(() => {
    if (!safeVal) {
      return suggestions;
    }
    const query = safeVal.toLowerCase();
    return suggestions.filter(item =>
      item.toLowerCase().includes(query) && item.toLowerCase() !== query
    );
  }, [safeVal, suggestions]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <label htmlFor={id} className="block text-sm font-bold text-text-muted mb-1">{label}</label>
      <input
        id={id}
        aria-label={label}
        value={value}
        disabled={disabled}
        onChange={e => {
          onChange(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        placeholder={placeholder}
        className="w-full border border-border rounded-lg px-4 py-2 text-sm focus:border-gold focus:ring-1 focus:ring-gold/30 outline-none bg-surface/50 text-text-main disabled:opacity-75 disabled:cursor-not-allowed transition-all"
        autoComplete="off"
      />
      {isOpen && !disabled && filtered.length > 0 && (
        <ul className="absolute z-[999] left-0 right-0 mt-1 bg-surface border border-border rounded-lg shadow-gold-glow max-h-48 overflow-y-auto divide-y divide-border">
          {filtered.map((item, idx) => (
            <li key={idx}>
              <button
                type="button"
                onClick={() => {
                  onChange(item);
                  setIsOpen(false);
                }}
                className="w-full text-left px-4 py-2 text-sm hover:bg-gold/10 hover:text-gold transition-colors"
              >
                {item}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

interface TagInputProps {
  id: string;
  label: string;
  value: string;
  onChange: (val: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

function TagInput({ id, label, value, onChange, disabled, placeholder }: TagInputProps) {
  const [inputValue, setInputValue] = useState('');
  const tags = value ? value.split(',').map(t => t.trim()).filter(Boolean) : [];

  const addTag = (tag: string) => {
    const trimmed = tag.trim();
    if (trimmed && !tags.includes(trimmed)) {
      const newTags = [...tags, trimmed];
      onChange(newTags.join(', '));
    }
  };

  const removeTag = (indexToRemove: number) => {
    const newTags = tags.filter((_, i) => i !== indexToRemove);
    onChange(newTags.join(', '));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(inputValue);
      setInputValue('');
    }
  };

  return (
    <div>
      <label htmlFor={id} className="block text-xs font-bold text-text-muted mb-1">{label}</label>
      <div className={`flex flex-wrap gap-2 p-2 border border-border rounded-xl min-h-[46px] bg-surface/50 ${disabled ? 'opacity-75 cursor-not-allowed' : 'focus-within:border-gold focus-within:ring-1 focus-within:ring-gold/30'}`}>
        {tags.map((tag, idx) => (
          <span key={idx} className="flex items-center gap-1 bg-gold/10 text-gold border border-gold/20 text-xs font-medium px-2.5 py-1 rounded-full">
            {tag}
            {!disabled && (
              <button
                type="button"
                onClick={() => removeTag(idx)}
                className="hover:bg-gold/20 rounded-full p-0.5"
                aria-label={`Remover tag ${tag}`}
              >
                <X size={12} />
              </button>
            )}
          </span>
        ))}
        {!disabled && (
          <input
            id={id}
            type="text"
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => {
              if (inputValue.trim()) {
                addTag(inputValue);
                setInputValue('');
              }
            }}
            placeholder={tags.length === 0 ? placeholder : ''}
            className="flex-1 min-w-[120px] bg-transparent border-none outline-none text-sm text-text-main py-0.5 px-1 placeholder-text-muted"
          />
        )}
      </div>
    </div>
  );
}

interface ListItem {

  id: string;
  [key: string]: string;
}

const uid = () => Math.random().toString(36).slice(2);

function AddList({ title, fields, items, onChange, t, disabled }: {
  title: string;
  fields: { key: string; label: string; type?: string; options?: string[]; className?: string }[];
  items: ListItem[];
  onChange: (items: ListItem[]) => void;
  t: (k: string) => string;
  disabled?: boolean;
}) {
  const add = () => {
    if (disabled) return;
    const empty: ListItem = { id: uid() };
    fields.forEach(f => { empty[f.key] = ''; });
    onChange([...items, empty]);
  };
  const remove = (id: string) => {
    if (disabled) return;
    onChange(items.filter(i => i.id !== id));
  };
  const update = (id: string, key: string, value: string) => {
    if (disabled) return;
    onChange(items.map(i => i.id === id ? { ...i, [key]: value } : i));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-bold text-sm text-text-muted">{title}</h4>
        {!disabled && (
          <button onClick={add} className="flex items-center gap-1 text-gold text-xs font-bold hover:text-gold-light transition-colors">
            <Plus size={14} /> {t('perfil.adicionar')}
          </button>
        )}
      </div>
      {items.map(item => (
        <div key={item.id} className="bg-surface/30 border border-border rounded-xl p-4 relative">
          {!disabled && (
            <button onClick={() => remove(item.id)}
              aria-label="Remover item"
              className="absolute right-3 top-3 text-gray-400 hover:text-red-500 transition-colors">
              <X size={16} />
            </button>
          )}
          <div className="grid grid-cols-2 gap-3 pr-6">
            {fields.map(f => (
              <div key={f.key} className={f.className || (f.key === fields[0].key ? 'col-span-2' : '')}>
                <label htmlFor={`${item.id}-${f.key}`} className="block text-xs text-text-muted mb-1">{f.label}</label>
                {f.options ? (
                  <select
                    id={`${item.id}-${f.key}`}
                    aria-label={f.label}
                    value={item[f.key] || ''}
                    disabled={disabled}
                    onChange={e => update(item.id, f.key, e.target.value)}
                    className="w-full border border-border rounded-lg px-3 py-1.5 text-sm focus:border-gold focus:ring-1 focus:ring-gold/30 outline-none bg-bg font-medium text-text-main cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed transition-all"
                  >
                    <option value="">{t('perfil.selecione') || 'Selecione...'}</option>
                    {f.options.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    id={`${item.id}-${f.key}`}
                    aria-label={f.label}
                    type={f.type || 'text'}
                    value={item[f.key] || ''}
                    disabled={disabled}
                    onChange={e => update(item.id, f.key, e.target.value)}
                    className="w-full border border-border rounded-lg px-3 py-1.5 text-sm focus:border-gold focus:ring-1 focus:ring-gold/30 outline-none bg-bg text-text-main disabled:opacity-75 disabled:cursor-not-allowed transition-all"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Perfil() {
  const { t } = useTranslation();
  
  const fileRef = useRef<HTMLInputElement>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [generatingBioCurta, setGeneratingBioCurta] = useState(false);
  const [generatingBioCompleta, setGeneratingBioCompleta] = useState(false);
  const [generatingStatement, setGeneratingStatement] = useState(false);
  const [optimizingProcesso, setOptimizingProcesso] = useState(false);

  const [profileTab, setProfileTab] = useState<'pessoal' | 'artistico' | 'trajetoria' | 'identidadeVisual'>('pessoal');
  const [seloUrl, setSeloUrl] = useState<string | null>(null);
  const [assinaturaUrl, setAssinaturaUrl] = useState<string | null>(null);
  const [fotosProfissionais, setFotosProfissionais] = useState<string[]>([]);
  const [isEditing, setIsEditing] = useState(false);

  const [artistId, setArtistId] = useState<number | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  console.log("Perfil.tsx rendering state:", { profileLoaded, saving, artistId, isEditing });
  const [form, setForm] = useState({
    nome: '',
    nomeArtistico: '',
    nacionalidade: '',
    cidade: '',
    nascimento: '',
    email: '',
    website: '',
    bioShort: '',
    bioLong: '',
    tags: '',
    telefone: '',
    whatsapp: '',
    // Novos campos Pessoais
    pronome: '',
    cidade_nascimento: '',
    pais_nascimento: '',
    pais_atual: '',
    mostrar_contato_publico: false,
    disponivel_exposicoes: false,
    disponivel_residencias: false,
    disponivel_comissoes: false,
    disponivel_colaboracoes: false,
    // Novos campos Artísticos
    statement: '',
    processo_criativo: '',
    tecnicas_recorrentes: '',
    temas_centrais: '',
    pesquisa_artistica: '',
    referencias_conceituais: '',
    ano_inicio_carreira: '',
  });

  const [instagrams, setInstagrams] = useState<string[]>([]);
  const [socialLinks, setSocialLinks] = useState<{id:string; label:string; url:string}[]>([]);
  
  // Listas de Trajetória / Currículo originais
  const [formacao, setFormacao] = useState<ListItem[]>([]);
  const [premios, setPremios] = useState<ListItem[]>([]);
  const [residencias, setResidencias] = useState<ListItem[]>([]);
  const [exposIndividuais, setExposIndividuais] = useState<ListItem[]>([]);
  const [exposColetivas, setExposColetivas] = useState<ListItem[]>([]);
  const [publicacoes, setPublicacoes] = useState<ListItem[]>([]);
  
  // Novas listas dinâmicas virtualizadas
  const [bolsas, setBolsas] = useState<ListItem[]>([]);
  const [feiras, setFeiras] = useState<ListItem[]>([]);
  const [bienais, setBienais] = useState<ListItem[]>([]);
  const [bibliografia, setBibliografia] = useState<ListItem[]>([]);
  const [publicacoesAutora, setPublicacoesAutora] = useState<ListItem[]>([]);
  const [clipping, setClipping] = useState<ListItem[]>([]);
  const [colecoesPublicas, setColecoesPublicas] = useState<ListItem[]>([]);
  const [colecoesPrivadas, setColecoesPrivadas] = useState<ListItem[]>([]);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase.from('artista').select('*').eq('user_id', user.id).maybeSingle();
        if (error && error.code !== 'PGRST116') {
          alert('Erro ao carregar perfil: ' + error.message);
        }
        if (data) {
          if (data.id) setArtistId(data.id);
          
          // Clean null and undefined values from database response before merging
          const cleanData: Record<string, unknown> = {};
          Object.entries(data as Record<string, unknown>).forEach(([key, val]) => {
            if (val !== null && val !== undefined) {
              const lowerKey = key.toLowerCase();
              if (lowerKey === 'nomeartistico') cleanData.nomeArtistico = val;
              else if (lowerKey === 'bioshort') cleanData.bioShort = val;
              else if (lowerKey === 'biolong') cleanData.bioLong = val;
              else cleanData[key] = val;
            }
          });

          interface CustomMetadata {
            pronome?: string;
            cidade_nascimento?: string;
            pais_nascimento?: string;
            pais_atual?: string;
            mostrar_contato_publico?: boolean;
            disponivel_exposicoes?: boolean;
            disponivel_residencias?: boolean;
            disponivel_comissoes?: boolean;
            disponivel_colaboracoes?: boolean;
            processo_criativo?: string;
            tecnicas_recorrentes?: string;
            temas_centrais?: string;
            pesquisa_artistica?: string;
            referencias_conceituais?: string;
            ano_inicio_carreira?: string;
            bolsas?: unknown[];
            feiras?: unknown[];
            bienais?: unknown[];
            bibliografia?: unknown[];
            publicacoesAutora?: unknown[];
            clipping?: unknown[];
            colecoesPublicas?: unknown[];
            colecoesPrivadas?: unknown[];
          }

          // Extract metadata if exists in social_links
          let meta: CustomMetadata = {};
          const ensureArray = (v: unknown): unknown[] => {
            if (Array.isArray(v)) return v;
            if (typeof v === 'string' && v.trim().startsWith('[')) {
              try {
                const parsed = JSON.parse(v);
                if (Array.isArray(parsed)) return parsed;
              } catch { /* ignore */ }
            }
            return [];
          };

          if (data.social_links) {
            const arr = ensureArray(data.social_links) as { id: string; [key: string]: unknown }[];
            const found = arr.find((l) => l.id === 'custom_metadata');
            if (found) {
              meta = found as unknown as CustomMetadata;
            }
            setSocialLinks(arr.filter((l) => l.id !== 'custom_metadata') as { id: string; label: string; url: string }[]);
          }

          setForm(f => ({
            ...f,
            ...(cleanData as unknown as Partial<typeof form>),
            pronome: meta.pronome || '',
            cidade_nascimento: meta.cidade_nascimento || '',
            pais_nascimento: meta.pais_nascimento || '',
            pais_atual: meta.pais_atual || '',
            mostrar_contato_publico: !!meta.mostrar_contato_publico,
            disponivel_exposicoes: !!meta.disponivel_exposicoes,
            disponivel_residencias: !!meta.disponivel_residencias,
            disponivel_comissoes: !!meta.disponivel_comissoes,
            disponivel_colaboracoes: !!meta.disponivel_colaboracoes,
            processo_criativo: meta.processo_criativo || '',
            tecnicas_recorrentes: meta.tecnicas_recorrentes || '',
            temas_centrais: meta.temas_centrais || '',
            pesquisa_artistica: meta.pesquisa_artistica || '',
            referencias_conceituais: meta.referencias_conceituais || '',
            ano_inicio_carreira: meta.ano_inicio_carreira || '',
          }));

          if (data.foto_url) setPhotoUrl(data.foto_url);
          if (data.selo_url) setSeloUrl(data.selo_url);
          if (data.assinatura_url) setAssinaturaUrl(data.assinatura_url);
          if (data.fotos_profissionais) setFotosProfissionais(ensureArray(data.fotos_profissionais) as string[]);
          if (data.instagrams) setInstagrams(ensureArray(data.instagrams) as string[]);
          if (data.formacao) setFormacao(ensureArray(data.formacao) as ListItem[]);
          if (data.premios) setPremios(ensureArray(data.premios) as ListItem[]);
          if (data.residencias) setResidencias(ensureArray(data.residencias) as ListItem[]);
          if (data.expos_individuais) setExposIndividuais(ensureArray(data.expos_individuais) as ListItem[]);
          if (data.expos_coletivas) setExposColetivas(ensureArray(data.expos_coletivas) as ListItem[]);
          if (data.publicacoes) setPublicacoes(ensureArray(data.publicacoes) as ListItem[]);

          // Load virtualized metadata lists
          if (meta.bolsas) setBolsas(ensureArray(meta.bolsas) as ListItem[]);
          if (meta.feiras) setFeiras(ensureArray(meta.feiras) as ListItem[]);
          if (meta.bienais) setBienais(ensureArray(meta.bienais) as ListItem[]);
          if (meta.bibliografia) setBibliografia(ensureArray(meta.bibliografia) as ListItem[]);
          if (meta.publicacoesAutora) setPublicacoesAutora(ensureArray(meta.publicacoesAutora) as ListItem[]);
          if (meta.clipping) setClipping(ensureArray(meta.clipping) as ListItem[]);
          if (meta.colecoesPublicas) setColecoesPublicas(ensureArray(meta.colecoesPublicas) as ListItem[]);
          if (meta.colecoesPrivadas) setColecoesPrivadas(ensureArray(meta.colecoesPrivadas) as ListItem[]);
        }
      } catch (err) {
        console.error('Falha severa ao carregar perfil:', err);
      } finally {
        setProfileLoaded(true);
      }
    };
    loadProfile();
  }, []);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    const file = e.target.files[0];
    setUploading(true);
    const ext = file.name.split('.').pop();
    const path = `perfil/foto.${ext}`;
    const { error } = await supabase.storage.from('perfil').upload(path, file, { upsert: true });
    if (error) {
      alert('Erro ao enviar foto: ' + error.message);
    } else {
      const { data: { publicUrl } } = supabase.storage.from('perfil').getPublicUrl(path);
      setPhotoUrl(publicUrl);
    }
    setUploading(false);
  };

  const handleGenerateBioCurta = async () => {
    setGeneratingBioCurta(true);
    try {
      const prompt = `Você é um curador de arte contemporânea de prestígio. Escreva uma Biografia Curta (Short Bio) institucional de impacto para a artista ${form.nomeArtistico || form.nome || 'Nany Arruda'}, de nacionalidade ${form.nacionalidade || 'Brasil'}, cidade atual ${form.cidade || 'Rio de Janeiro'}.
Foque em resumir sua formação, principais mídias e trajetória em um tom profissional, elegante e conciso.
REQUISITO CRÍTICO: O texto gerado deve ter no MÁXIMO 120 palavras.
Retorne APENAS o texto puro da biografia curta, sem introduções ou observações.`;
      const text = await callAI(prompt, 'groq');
      if (text) {
        setForm(f => ({ ...f, bioShort: text.trim() }));
      }
    } catch (e) {
      alert((e as Error).message || 'Erro ao gerar bio curta com IA');
    }
    setGeneratingBioCurta(false);
  };

  const handleGenerateBioCompleta = async () => {
    setGeneratingBioCompleta(true);
    try {
      const prompt = `Você é um crítico e curador de arte internacional. Escreva uma Biografia Completa / Institucional de alto impacto para a artista ${form.nomeArtistico || form.nome || 'Nany Arruda'}, de nacionalidade ${form.nacionalidade || 'Brasil'}, cidade atual ${form.cidade || 'Rio de Janeiro'}.
O texto deve descrever a formação artística, a pesquisa de atelier, o histórico de participações/exposições de forma fluida, e o posicionamento da artista no circuito de arte contemporânea.
Mantenha a biografia estruturada em 3 a 4 parágrafos bem elaborados, em tom institucional elegante.
Retorne APENAS o texto completo da biografia, sem introduções ou formatação markdown adicional.`;
      const text = await callAI(prompt, 'groq');
      if (text) {
        setForm(f => ({ ...f, bioLong: text.trim() }));
      }
    } catch (e) {
      alert((e as Error).message || 'Erro ao gerar biografia completa com IA');
    }
    setGeneratingBioCompleta(false);
  };

  const handleOptimizeProcessoCriativo = async () => {
    if (!form.processo_criativo.trim()) {
      alert('Por favor, escreva um rascunho ou algumas palavras sobre seu processo criativo antes de otimizar.');
      return;
    }
    setOptimizingProcesso(true);
    try {
      const prompt = `Você é um curador e revisor de textos de arte. Otimize e amadureça o rascunho de texto abaixo sobre o Processo Criativo da artista ${form.nomeArtistico || form.nome || 'Nany Arruda'}.
Deixe o texto mais poético, profissional, coeso e fluído, elevando o vocabulário para os padrões de catálogos e dossiês de arte contemporânea. Preserve a essência e as técnicas relatadas.
RASCUNHO DA ARTISTA:
"${form.processo_criativo}"

Retorne APENAS o texto otimizado, sem introduções ou explicações.`;
      const text = await callAI(prompt, 'groq');
      if (text) {
        setForm(f => ({ ...f, processo_criativo: text.trim() }));
      }
    } catch (e) {
      alert((e as Error).message || 'Erro ao otimizar texto com IA');
    }
    setOptimizingProcesso(false);
  };

  const handleGenerateStatement = async () => {
    setGeneratingStatement(true);
    try {
      const prompt = `Você é um curador de arte contemporânea. Escreva um Artist Statement (Declaração de Artista) conceitual e poético para a artista ${form.nomeArtistico || form.nome || 'Nany Arruda'}. Foque em temas centrais como ${form.temas_centrais || 'a memória, a transitoriedade e a forma'} e técnicas recorrentes como ${form.tecnicas_recorrentes || 'técnicas conceituais'}. Mantenha em torno de 150 a 200 palavras. Retorne apenas o texto puro do statement.`;
      const text = await callAI(prompt, 'groq');
      if (text) {
        setForm(f => ({ ...f, statement: text.trim() }));
      }
    } catch (e) {
      alert((e as Error).message || 'Erro ao gerar statement com IA');
    }
    setGeneratingStatement(false);
  };

  const handleSave = async () => {
    if (!profileLoaded) {
      alert('Aguarde o carregamento do perfil.');
      return;
    }
    setSaving(true);
    
    try {
      // Group all non-existent DB columns into our virtualized metadata item
      const metadataItem = {
        id: 'custom_metadata',
        pronome: form.pronome,
        cidade_nascimento: form.cidade_nascimento,
        pais_nascimento: form.pais_nascimento,
        pais_atual: form.pais_atual,
        mostrar_contato_publico: form.mostrar_contato_publico,
        disponivel_exposicoes: form.disponivel_exposicoes,
        disponivel_residencias: form.disponivel_residencias,
        disponivel_comissoes: form.disponivel_comissoes,
        disponivel_colaboracoes: form.disponivel_colaboracoes,
        processo_criativo: form.processo_criativo,
        tecnicas_recorrentes: form.tecnicas_recorrentes,
        temas_centrais: form.temas_centrais,
        pesquisa_artistica: form.pesquisa_artistica,
        referencias_conceituais: form.referencias_conceituais,
        ano_inicio_carreira: form.ano_inicio_carreira,
        // Novas listas
        bolsas,
        feiras,
        bienais,
        bibliografia,
        publicacoesAutora,
        clipping,
        colecoesPublicas,
        colecoesPrivadas
      };

      const cleanLinks = socialLinks.filter(l => l.id !== 'custom_metadata');
      const socialLinksPayload = [...cleanLinks, metadataItem];

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const payload = {
        ...(artistId ? { id: artistId } : {}),
        user_id: user.id,
        nome: form.nome,
        nacionalidade: form.nacionalidade,
        cidade: form.cidade,
        nascimento: form.nascimento,
        email: form.email,
        website: form.website,
        nomeartistico: form.nomeArtistico,
        bioshort: form.bioShort,
        biolong: form.bioLong,
        tags: form.tags,
        telefone: form.telefone,
        whatsapp: form.whatsapp,
        statement: form.statement,
        foto_url: photoUrl,
        selo_url: seloUrl,
        assinatura_url: assinaturaUrl,
        fotos_profissionais: fotosProfissionais,
        instagrams: instagrams,
        social_links: socialLinksPayload,
        formacao: formacao,
        premios: premios,
        residencias: residencias,
        expos_individuais: exposIndividuais,
        expos_coletivas: exposColetivas,
        publicacoes: publicacoes,
        updated_at: new Date().toISOString(),
      };

      if (artistId) {
        const { error } = await supabase.from('artista').update(payload).eq('id', artistId);
        if (error) {
          alert('Erro ao atualizar perfil: ' + error.message);
          return;
        }
      } else {
        const { error } = await supabase.from('artista').insert(payload);
        if (error) {
          alert('Erro ao criar perfil: ' + error.message);
          return;
        }
      }
      alert('Perfil salvo com sucesso!');
    } catch (err) {
      console.error(err);
      alert('Erro inesperado ao salvar o perfil.');
    } finally {
      setSaving(false);
    }
  };

  const set = (key: keyof typeof form, value: string | boolean) =>
    setForm(f => ({ ...f, [key]: value }));

  const wordCount = (text: string) => (text || '').trim().split(/\s+/).filter(Boolean).length;

  const handleImport = (data: ImportedData) => {
    const strKeys = ['nome', 'nomeArtistico', 'nacionalidade', 'cidade', 'email', 'bioShort', 'bioLong', 'website', 'telefone', 'whatsapp', 'statement'] as const;
    strKeys.forEach(k => { if (data[k]) setForm(f => ({ ...f, [k]: String(data[k]) })); });
    if (Array.isArray(data.instagrams)) {
      setInstagrams(prev => Array.from(new Set([...prev, ...(data.instagrams as string[])])));
    }
    const toList = (arr: unknown[]) => arr.map(i => ({ id: uid(), ...(i as object) }));
    if (Array.isArray(data.formacao)) setFormacao(prev => [...prev, ...toList(data.formacao as unknown[])]);
    if (Array.isArray(data.premios)) setPremios(prev => [...prev, ...toList(data.premios as unknown[])]);
    if (Array.isArray(data.residencias)) setResidencias(prev => [...prev, ...toList(data.residencias as unknown[])]);
    if (Array.isArray(data.exposIndividuais)) setExposIndividuais(prev => [...prev, ...toList(data.exposIndividuais as unknown[])]);
    if (Array.isArray(data.exposColetivas)) setExposColetivas(prev => [...prev, ...toList(data.exposColetivas as unknown[])]);
    if (Array.isArray(data.publicacoes)) setPublicacoes(prev => [...prev, ...toList(data.publicacoes as unknown[])]);
  };

  const currentFormAsRecord: Record<string, unknown> = {
    ...form,
    instagrams,
    formacao,
    premios,
    residencias,
    exposIndividuais,
    exposColetivas,
    publicacoes,
    bolsas,
    feiras,
    bienais,
    bibliografia,
    publicacoesAutora,
    clipping,
    colecoesPublicas,
    colecoesPrivadas
  };

  return (
    <div className="max-w-[900px] mx-auto pb-28 space-y-8">
      <div>
        <h1 className="text-3xl font-serif mb-1">{t('perfil.title', 'Meu Perfil')}</h1>
        <p className="text-text-muted">{t('perfil.subtitle', 'Gerencie suas informações profissionais, artísticas e de carreira.')}</p>
      </div>

      {isEditing && (
        <SmartImport currentData={currentFormAsRecord} onImport={handleImport} t={t} />
      )}

      {/* Modern Premium Tabs */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setProfileTab('pessoal')}
          className={`flex-1 py-4 text-center font-bold text-sm transition-all border-b-2 outline-none flex items-center justify-center gap-2 ${
            profileTab === 'pessoal'
              ? 'border-gold text-gold font-serif'
              : 'border-transparent text-text-muted hover:text-text-main hover:border-border'
          }`}
        >
          <User size={16} />
          {t('perfil.pessoal', 'Perfil Pessoal')}
        </button>
        <button
          onClick={() => setProfileTab('artistico')}
          className={`flex-1 py-4 text-center font-bold text-sm transition-all border-b-2 outline-none flex items-center justify-center gap-2 ${
            profileTab === 'artistico'
              ? 'border-gold text-gold font-serif'
              : 'border-transparent text-text-muted hover:text-text-main hover:border-border'
          }`}
        >
          <Sparkles size={16} />
          {t('perfil.artistico', 'Perfil Artístico')}
        </button>
        <button
          onClick={() => setProfileTab('trajetoria')}
          className={`flex-1 py-4 text-center font-bold text-sm transition-all border-b-2 outline-none flex items-center justify-center gap-2 ${
            profileTab === 'trajetoria'
              ? 'border-gold text-gold font-serif'
              : 'border-transparent text-text-muted hover:text-text-main hover:border-border'
          }`}
        >
          <Briefcase size={16} />
          {t('perfil.trajetoria_curriculo', 'Trajetória & Currículo')}
        </button>
        <button
          onClick={() => setProfileTab('identidadeVisual')}
          className={`flex-1 py-4 text-center font-bold text-sm transition-all border-b-2 outline-none flex items-center justify-center gap-2 ${
            profileTab === 'identidadeVisual'
              ? 'border-gold text-gold font-serif'
              : 'border-transparent text-text-muted hover:text-text-main hover:border-border'
          }`}
        >
          <Sparkles size={16} />
          {t('perfil.identidade_visual_fotos', 'Identidade Visual & Fotos')}
        </button>
      </div>

      {/* Tab 1: PERFIL PESSOAL */}
      {profileTab === 'pessoal' && (
        <div className="space-y-8 animate-fadeIn">
          {/* Identificação Profissional */}
          <section className="glass-slab rounded-2xl overflow-hidden">
            <div className="px-7 py-5 border-b border-border bg-surface-raised/35">
              <h2 className="text-lg font-serif text-gold font-bold">{t('perfil.identidade_pessoal', 'Identificação Profissional')}</h2>
            </div>
            <div className="p-7">
              <div className="flex flex-col md:flex-row gap-8">
                {/* Photo Upload Box */}
                <div className="flex flex-col items-center gap-4 md:w-1/3">
                  <div className="relative w-[130px] h-[130px]">
                    <div className="w-[130px] h-[130px] rounded-full overflow-hidden bg-surface border-2 border-gold/20 flex items-center justify-center relative">
                      {photoUrl ? (
                        <img src={photoUrl} alt="Foto" className="w-full h-full object-cover" />
                      ) : (
                        <Camera size={36} className="text-text-muted" />
                      )}
                      {isEditing && (
                        <button onClick={() => fileRef.current?.click()}
                          aria-label="Alterar foto de perfil"
                          className="absolute inset-0 bg-black/60 text-white flex flex-col items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-pointer">
                          {uploading ? <Loader2 size={20} className="animate-spin" /> : <Camera size={20} />}
                          <span className="text-[10px] mt-1 font-bold">{t('perfil.alterar', 'Alterar')}</span>
                        </button>
                      )}
                    </div>
                    <input ref={fileRef} type="file" accept="image/*" aria-label="Selecionar foto de perfil" className="hidden" onChange={handlePhotoUpload} />
                  </div>
                  <p className="text-xs text-text-muted text-center max-w-[150px]">{t('perfil.clique_alterar_foto', 'Recomendado imagem quadrada de alta resolução.')}</p>
                </div>

                {/* Form Fields */}
                <div className="flex-1 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="perfil-nome-artistico" className="block text-xs font-bold text-text-muted mb-1">{t('perfil.nome_artistico', 'Nome Artístico / Profissional')}</label>
                      <input id="perfil-nome-artistico" aria-label={t('perfil.nome_artistico')} value={form.nomeArtistico} disabled={!isEditing} onChange={e => set('nomeArtistico', e.target.value)}
                        className="w-full border border-border rounded-lg px-4 py-2 text-sm focus:border-gold focus:ring-1 focus:ring-gold/30 outline-none bg-surface/50 text-text-main disabled:opacity-75 disabled:cursor-not-allowed transition-all" />
                    </div>
                    <div>
                      <label htmlFor="perfil-nome" className="block text-xs font-bold text-text-muted mb-1">{t('perfil.nome_completo', 'Nome Completo')}</label>
                      <input id="perfil-nome" aria-label={t('perfil.nome_completo')} value={form.nome} disabled={!isEditing} onChange={e => set('nome', e.target.value)}
                        className="w-full border border-border rounded-lg px-4 py-2 text-sm focus:border-gold focus:ring-1 focus:ring-gold/30 outline-none bg-surface/50 text-text-main disabled:opacity-75 disabled:cursor-not-allowed transition-all" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="col-span-2">
                      <label htmlFor="perfil-pronome" className="block text-xs font-bold text-text-muted mb-1">{t('perfil.pronome', 'Pronome (Opcional)')}</label>
                      <input id="perfil-pronome" placeholder="Ex: ela/dela, ele/dele" aria-label={t('perfil.pronome')} value={form.pronome} disabled={!isEditing} onChange={e => set('pronome', e.target.value)}
                        className="w-full border border-border rounded-lg px-4 py-2 text-sm focus:border-gold focus:ring-1 focus:ring-gold/30 outline-none bg-surface/50 text-text-main disabled:opacity-75 disabled:cursor-not-allowed transition-all placeholder-text-muted" />
                    </div>
                    <div className="col-span-2">
                      <label htmlFor="perfil-nascimento" className="block text-xs font-bold text-text-muted mb-1">{t('perfil.ano_nascimento', 'Ano de Nascimento')}</label>
                      <input id="perfil-nascimento" aria-label={t('perfil.ano_nascimento')} type="number" placeholder="Ex: 1990" value={form.nascimento} disabled={!isEditing} onChange={e => set('nascimento', e.target.value)}
                        className="w-full border border-border rounded-lg px-4 py-2 text-sm focus:border-gold focus:ring-1 focus:ring-gold/30 outline-none bg-surface/50 text-text-main disabled:opacity-75 disabled:cursor-not-allowed transition-all placeholder-text-muted" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="perfil-cidade-nascimento" className="block text-xs font-bold text-text-muted mb-1">{t('perfil.cidade_nascimento', 'Cidade de Nascimento')}</label>
                      <input id="perfil-cidade-nascimento" aria-label={t('perfil.cidade_nascimento')} placeholder="Cidade" value={form.cidade_nascimento} disabled={!isEditing} onChange={e => set('cidade_nascimento', e.target.value)}
                        className="w-full border border-border rounded-lg px-4 py-2 text-sm focus:border-gold focus:ring-1 focus:ring-gold/30 outline-none bg-surface/50 text-text-main disabled:opacity-75 disabled:cursor-not-allowed transition-all placeholder-text-muted" />
                    </div>
                    <div>
                      <label htmlFor="perfil-pais-nascimento" className="block text-xs font-bold text-text-muted mb-1">{t('perfil.pais_nascimento', 'País de Nascimento')}</label>
                      <input id="perfil-pais-nascimento" aria-label={t('perfil.pais_nascimento')} placeholder="País" value={form.pais_nascimento} disabled={!isEditing} onChange={e => set('pais_nascimento', e.target.value)}
                        className="w-full border border-border rounded-lg px-4 py-2 text-sm focus:border-gold focus:ring-1 focus:ring-gold/30 outline-none bg-surface/50 text-text-main disabled:opacity-75 disabled:cursor-not-allowed transition-all placeholder-text-muted" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="col-span-2">
                      <AutocompleteInput
                        id="perfil-cidade"
                        label={t('perfil.cidade_atual', 'Cidade Atual / Residência')}
                        value={form.cidade}
                        disabled={!isEditing}
                        onChange={val => set('cidade', val)}
                        placeholder="Ex: Rio de Janeiro, RJ"
                        suggestions={RESIDENCIA_SUGGESTIONS}
                      />
                    </div>
                    <div>
                      <label htmlFor="perfil-pais-atual" className="block text-xs font-bold text-text-muted mb-1">{t('perfil.pais_atual', 'País Atual')}</label>
                      <input id="perfil-pais-atual" aria-label={t('perfil.pais_atual')} placeholder="Ex: Brasil" value={form.pais_atual} disabled={!isEditing} onChange={e => set('pais_atual', e.target.value)}
                        className="w-full border border-border rounded-lg px-4 py-2 text-sm focus:border-gold focus:ring-1 focus:ring-gold/30 outline-none bg-surface/50 text-text-main disabled:opacity-75 disabled:cursor-not-allowed transition-all placeholder-text-muted" />
                    </div>
                  </div>

                  <div>
                    <AutocompleteInput
                      id="perfil-nacionalidade"
                      label={t('perfil.nacionalidade', 'Nacionalidade')}
                      value={form.nacionalidade}
                      disabled={!isEditing}
                      onChange={val => set('nacionalidade', val)}
                      placeholder="Ex: Brasileira"
                      suggestions={NACIONALIDADE_SUGGESTIONS}
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Contato Profissional & Presença Digital */}
          <section className="glass-slab rounded-2xl overflow-hidden">
            <div className="px-7 py-5 border-b border-border bg-surface-raised/35">
              <h2 className="text-lg font-serif text-gold font-bold">{t('perfil.contato_presenca', 'Contato Profissional & Presença Digital')}</h2>
            </div>
            <div className="p-7 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label htmlFor="perfil-email" className="block text-xs font-bold text-text-muted mb-1">{t('perfil.email', 'E-mail Profissional')}</label>
                  <input id="perfil-email" aria-label={t('perfil.email')} type="email" placeholder="email@exemplo.com" value={form.email} disabled={!isEditing} onChange={e => set('email', e.target.value)}
                    className="w-full border border-border rounded-lg px-4 py-2 text-sm focus:border-gold focus:ring-1 focus:ring-gold/30 outline-none bg-surface/50 text-text-main disabled:opacity-75 disabled:cursor-not-allowed transition-all placeholder-text-muted" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="perfil-telefone" className="block text-xs font-bold text-text-muted mb-1">{t('perfil.telefone', 'Telefone Internacional')}</label>
                    <input id="perfil-telefone" aria-label={t('perfil.telefone')} placeholder="+55 21 99999-9999" value={form.telefone} disabled={!isEditing} onChange={e => set('telefone', e.target.value)}
                      className="w-full border border-border rounded-lg px-4 py-2 text-sm focus:border-gold focus:ring-1 focus:ring-gold/30 outline-none bg-surface/50 text-text-main disabled:opacity-75 disabled:cursor-not-allowed transition-all placeholder-text-muted" />
                  </div>
                  <div>
                    <label htmlFor="perfil-whatsapp" className="block text-xs font-bold text-text-muted mb-1">{t('perfil.whatsapp', 'WhatsApp')}</label>
                    <input id="perfil-whatsapp" aria-label={t('perfil.whatsapp')} placeholder="+55 21 99999-9999" value={form.whatsapp} disabled={!isEditing} onChange={e => set('whatsapp', e.target.value)}
                      className="w-full border border-border rounded-lg px-4 py-2 text-sm focus:border-gold focus:ring-1 focus:ring-gold/30 outline-none bg-surface/50 text-text-main disabled:opacity-75 disabled:cursor-not-allowed transition-all placeholder-text-muted" />
                  </div>
                </div>

                <div>
                  <label htmlFor="perfil-website" className="block text-xs font-bold text-text-muted mb-1">{t('perfil.website', 'Website Oficial')}</label>
                  <input id="perfil-website" aria-label={t('perfil.website')} placeholder="https://..." value={form.website} disabled={!isEditing} onChange={e => set('website', e.target.value)}
                    className="w-full border border-border rounded-lg px-4 py-2 text-sm focus:border-gold focus:ring-1 focus:ring-gold/30 outline-none bg-surface/50 text-text-main disabled:opacity-75 disabled:cursor-not-allowed transition-all placeholder-text-muted" />
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-text-muted">{t('perfil.instagram', 'Instagram Profissional')}</label>
                    {isEditing && (
                      <button onClick={() => setInstagrams(ig => [...ig, ''])}
                        className="text-gold hover:text-gold-light text-xs font-bold flex items-center gap-1 transition-colors">
                        <Plus size={12} /> {t('perfil.adicionar', 'Adicionar')}
                      </button>
                    )}
                  </div>
                  <div className="space-y-2">
                    {instagrams.length === 0 && <p className="text-xs text-text-muted italic">{t('perfil.sem_instagram', 'Nenhum instagram cadastrado.')}</p>}
                    {instagrams.map((ig, i) => (
                      <div key={i} className="flex gap-2">
                        <input aria-label={`Instagram ${i + 1}`} placeholder="@usuario" value={ig} disabled={!isEditing} onChange={e => {
                          const n = [...instagrams]; n[i] = e.target.value; setInstagrams(n);
                        }} className="flex-1 border border-border rounded-lg px-4 py-2 text-sm focus:border-gold focus:ring-1 focus:ring-gold/30 outline-none bg-surface/50 text-text-main disabled:opacity-75 disabled:cursor-not-allowed transition-all placeholder-text-muted" />
                        {isEditing && (
                          <button onClick={() => setInstagrams(ig => ig.filter((_, j) => j !== i))}
                            aria-label="Remover Instagram"
                            className="text-gray-400 hover:text-red-500 px-2 flex items-center justify-center">
                            <X size={16} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-text-muted">{t('perfil.outros_links', 'Outras Redes (Behance, ArtStation, LinkedIn)')}</label>
                    {isEditing && (
                      <button onClick={() => setSocialLinks(s => [...s, { id: uid(), label: '', url: '' }])}
                        className="text-gold hover:text-gold-light text-xs font-bold flex items-center gap-1 transition-colors">
                        <Plus size={12} /> {t('perfil.adicionar_campo', 'Adicionar')}
                      </button>
                    )}
                  </div>
                  <div className="space-y-2">
                    {socialLinks.length === 0 && <p className="text-xs text-text-muted italic">{t('perfil.sem_links', 'Nenhum outro link cadastrado.')}</p>}
                    {socialLinks.map(link => (
                      <div key={link.id} className="flex gap-2">
                        <input aria-label="Nome do link" placeholder="Ex: Behance" value={link.label}
                          disabled={!isEditing}
                          onChange={e => setSocialLinks(s => s.map(l => l.id === link.id ? {...l, label: e.target.value} : l))}
                          className="w-28 border border-border rounded-lg px-3 py-2 text-sm focus:border-gold focus:ring-1 focus:ring-gold/30 outline-none bg-surface/50 text-text-main disabled:opacity-75 disabled:cursor-not-allowed transition-all placeholder-text-muted" />
                        <input aria-label="URL do link" placeholder="https://..." value={link.url}
                          disabled={!isEditing}
                          onChange={e => setSocialLinks(s => s.map(l => l.id === link.id ? {...l, url: e.target.value} : l))}
                          className="flex-1 border border-border rounded-lg px-3 py-2 text-sm focus:border-gold focus:ring-1 focus:ring-gold/30 outline-none bg-surface/50 text-text-main disabled:opacity-75 disabled:cursor-not-allowed transition-all placeholder-text-muted" />
                        {isEditing && (
                          <button onClick={() => setSocialLinks(s => s.filter(l => l.id !== link.id))}
                            aria-label="Remover link"
                            className="text-gray-400 hover:text-red-500 px-2 flex items-center justify-center">
                            <X size={16} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Configuração Pública */}
          <section className="glass-slab rounded-2xl overflow-hidden">
            <div className="px-7 py-5 border-b border-border bg-surface-raised/35">
              <h2 className="text-lg font-serif text-gold font-bold">{t('perfil.config_publica', 'Configuração Pública & Disponibilidade')}</h2>
            </div>
            <div className="p-7 space-y-4">
              <label className="flex items-center gap-3 cursor-pointer p-3 bg-surface/30 border border-border/50 rounded-xl hover:bg-surface/55 transition-colors">
                <input
                  type="checkbox"
                  aria-label="Mostrar Contato Publicamente"
                  checked={form.mostrar_contato_publico}
                  disabled={!isEditing}
                  onChange={e => set('mostrar_contato_publico', e.target.checked)}
                  className="accent-gold w-5 h-5 cursor-pointer rounded"
                />
                <div>
                  <span className="text-sm font-bold block text-text-main">{t('perfil.mostrar_contato', 'Mostrar Contato Publicamente')}</span>
                  <span className="text-xs text-text-muted">{t('perfil.mostrar_contato_desc', 'Permite que visitantes vejam seu e-mail e telefone no portfólio público.')}</span>
                </div>
              </label>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="flex items-center gap-3 cursor-pointer p-3 bg-surface/30 border border-border/50 rounded-xl hover:bg-surface/55 transition-colors">
                  <input
                    type="checkbox"
                    aria-label="Disponível para Exposições"
                    checked={form.disponivel_exposicoes}
                    disabled={!isEditing}
                    onChange={e => set('disponivel_exposicoes', e.target.checked)}
                    className="accent-gold w-4 h-4 cursor-pointer rounded"
                  />
                  <div>
                    <span className="text-xs font-bold block text-text-main">{t('perfil.disp_exposicoes', 'Disponível para Exposições')}</span>
                  </div>
                </label>

                <label className="flex items-center gap-3 cursor-pointer p-3 bg-surface/30 border border-border/50 rounded-xl hover:bg-surface/55 transition-colors">
                  <input
                    type="checkbox"
                    aria-label="Disponível para Residências"
                    checked={form.disponivel_residencias}
                    disabled={!isEditing}
                    onChange={e => set('disponivel_residencias', e.target.checked)}
                    className="accent-gold w-4 h-4 cursor-pointer rounded"
                  />
                  <div>
                    <span className="text-xs font-bold block text-text-main">{t('perfil.disp_residencias', 'Disponível para Residências')}</span>
                  </div>
                </label>

                <label className="flex items-center gap-3 cursor-pointer p-3 bg-surface/30 border border-border/50 rounded-xl hover:bg-surface/55 transition-colors">
                  <input
                    type="checkbox"
                    aria-label="Disponível para Comissões"
                    checked={form.disponivel_comissoes}
                    disabled={!isEditing}
                    onChange={e => set('disponivel_comissoes', e.target.checked)}
                    className="accent-gold w-4 h-4 cursor-pointer rounded"
                  />
                  <div>
                    <span className="text-xs font-bold block text-text-main">{t('perfil.disp_comissoes', 'Disponível para Comissões (Projetos Comissionados)')}</span>
                  </div>
                </label>

                <label className="flex items-center gap-3 cursor-pointer p-3 bg-surface/30 border border-border/50 rounded-xl hover:bg-surface/55 transition-colors">
                  <input
                    type="checkbox"
                    aria-label="Disponível para Colaborações"
                    checked={form.disponivel_colaboracoes}
                    disabled={!isEditing}
                    onChange={e => set('disponivel_colaboracoes', e.target.checked)}
                    className="accent-gold w-4 h-4 cursor-pointer rounded"
                  />
                  <div>
                    <span className="text-xs font-bold block text-text-main">
                      {t('perfil.disp_colaboracoes', 'Disponível para Colaborações (Parcerias e Projetos Conjuntos)')}
                    </span>
                  </div>
                </label>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* Tab 2: PERFIL ARTÍSTICO & POÉTICA */}
      {profileTab === 'artistico' && (
        <div className="space-y-8 animate-fadeIn">
          {/* Biografias Institucionais */}
          <section className="glass-slab rounded-2xl overflow-hidden">
            <div className="px-7 py-5 border-b border-border bg-surface-raised/35">
              <h2 className="text-lg font-serif text-gold font-bold">{t('perfil.biografia', 'Biografias Institucionais')}</h2>
            </div>
            <div className="p-7 space-y-6">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-bold text-text-muted">{t('perfil.bio_curta', 'Biografia Curta (máx. 120 palavras)')}</label>
                    {isEditing && (
                      <button
                        onClick={handleGenerateBioCurta}
                        disabled={generatingBioCurta}
                        className="flex items-center gap-1 px-2.5 py-1 bg-gold/10 text-gold border border-gold/20 text-[11px] font-bold rounded-lg hover:bg-gold/20 transition-colors disabled:opacity-50"
                      >
                        {generatingBioCurta ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
                        {t('perfil.gerar_bio_curta', 'Gerar Bio Curta')}
                      </button>
                    )}
                  </div>
                  <span className={`text-xs ${wordCount(form.bioShort) > 120 ? 'text-red-500 font-semibold' : 'text-gray-400'}`}>
                    {wordCount(form.bioShort)}/120 {t('perfil.palavras', 'palavras')}
                  </span>
                </div>
                <textarea
                  value={form.bioShort}
                  disabled={!isEditing}
                  onChange={e => set('bioShort', e.target.value)}
                  placeholder={t('perfil.usada_capa', 'Escreva uma bio rápida para previews, feiras ou capas...')}
                  className="w-full border border-border rounded-xl px-4 py-3 text-sm focus:border-gold focus:ring-1 focus:ring-gold/30 outline-none bg-surface/50 text-text-main h-24 resize-none disabled:opacity-75 disabled:cursor-not-allowed transition-all placeholder-text-muted"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-bold text-text-muted">{t('perfil.bio_longa', 'Biografia Completa (Institucional)')}</label>
                    {isEditing && (
                      <button
                        onClick={handleGenerateBioCompleta}
                        disabled={generatingBioCompleta}
                        className="flex items-center gap-1 px-2.5 py-1 bg-gold/10 text-gold border border-gold/20 text-[11px] font-bold rounded-lg hover:bg-gold/20 transition-colors disabled:opacity-50"
                      >
                        {generatingBioCompleta ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
                        {t('perfil.gerar_bio_completa', 'Gerar Bio Completa')}
                      </button>
                    )}
                  </div>
                  <span className="text-xs text-gray-400">{wordCount(form.bioLong)} {t('perfil.palavras', 'palavras')}</span>
                </div>
                <textarea
                  value={form.bioLong}
                  disabled={!isEditing}
                  onChange={e => set('bioLong', e.target.value)}
                  placeholder={t('perfil.usada_portfolio', 'Escreva sua trajetória institucional completa, percurso, locais por onde passou...')}
                  className="w-full border border-border rounded-xl px-4 py-3 text-sm focus:border-gold focus:ring-1 focus:ring-gold/30 outline-none bg-surface/50 text-text-main h-40 resize-none disabled:opacity-75 disabled:cursor-not-allowed transition-all placeholder-text-muted"
                />
              </div>
            </div>
          </section>

          {/* Artist Statement */}
          <section className="glass-slab rounded-2xl overflow-hidden">
            <div className="px-7 py-5 border-b border-border bg-surface-raised/35 flex items-center justify-between">
              <h2 className="text-lg font-serif text-gold font-bold">{t('perfil.artist_statement', 'Artist Statement (Declaração de Artista)')}</h2>
              {isEditing && (
                <button
                  onClick={handleGenerateStatement}
                  disabled={generatingStatement}
                  className="flex items-center gap-2 px-4 py-2 bg-gold/10 text-gold border border-gold/20 text-xs font-bold rounded-lg hover:bg-gold/20 transition-colors disabled:opacity-50"
                >
                  {generatingStatement ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                  {t('perfil.gerar_statement', 'Gerar Statement com IA')}
                </button>
              )}
            </div>
            <div className="p-7">
              <p className="text-xs text-text-muted mb-3">
                {t('perfil.statement_info', 'O Artist Statement é o texto conceitual que traduz a poética do seu trabalho e norteia o espectador sobre suas motivações e abordagens.')}
              </p>
              <textarea
                value={form.statement}
                disabled={!isEditing}
                onChange={e => set('statement', e.target.value)}
                placeholder={t('perfil.statement_placeholder', 'Escreva sobre suas motivações, inquietações poéticas e abordagens conceituais...')}
                className="w-full border border-border rounded-xl px-4 py-3 text-sm focus:border-gold focus:ring-1 focus:ring-gold/30 outline-none bg-surface/50 text-text-main h-44 resize-none disabled:opacity-75 disabled:cursor-not-allowed transition-all placeholder-text-muted"
              />
            </div>
          </section>

          {/* Pesquisa e Poética Detalhada */}
          <section className="glass-slab rounded-2xl overflow-hidden">
            <div className="px-7 py-5 border-b border-border bg-surface-raised/35">
              <h2 className="text-lg font-serif text-gold font-bold">{t('perfil.pesquisa_poetica_detalhada', 'Pesquisa e Poética Detalhada')}</h2>
            </div>
            <div className="p-7 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label htmlFor="perfil-ano-inicio-carreira" className="block text-xs font-bold text-text-muted mb-1">
                    {t('perfil.ano_inicio_carreira', 'Ano de início da carreira')}
                  </label>
                  <input
                    id="perfil-ano-inicio-carreira"
                    type="number"
                    value={form.ano_inicio_carreira}
                    disabled={!isEditing}
                    onChange={e => set('ano_inicio_carreira', e.target.value)}
                    placeholder="Ex: 2012"
                    className="w-full border border-border rounded-lg px-4 py-2 text-sm focus:border-gold focus:ring-1 focus:ring-gold/30 outline-none bg-surface/50 text-text-main disabled:opacity-75 disabled:cursor-not-allowed transition-all"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="perfil-processo-criativo" className="block text-xs font-bold text-text-muted">
                    {t('perfil.processo_criativo', 'Processo Criativo (Como o trabalho se desenvolve)')}
                  </label>
                  {isEditing && (
                    <button
                      onClick={handleOptimizeProcessoCriativo}
                      disabled={optimizingProcesso}
                      className="flex items-center gap-1.5 px-2.5 py-1 bg-gold/10 text-gold border border-gold/20 text-[11px] font-bold rounded-lg hover:bg-gold/20 transition-colors disabled:opacity-50"
                    >
                      {optimizingProcesso ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
                      {t('perfil.otimizar_processo', 'Otimizar Rascunho com IA')}
                    </button>
                  )}
                </div>
                <textarea
                  id="perfil-processo-criativo"
                  value={form.processo_criativo}
                  disabled={!isEditing}
                  onChange={e => set('processo_criativo', e.target.value)}
                  placeholder="Escreva um rascunho de como o seu trabalho se desenvolve no ateliê e use a IA para amadurecê-lo..."
                  className="w-full border border-border rounded-xl px-4 py-2.5 text-sm focus:border-gold focus:ring-1 focus:ring-gold/30 outline-none bg-surface/50 text-text-main h-28 resize-none disabled:opacity-75 disabled:cursor-not-allowed transition-all placeholder-text-muted"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <TagInput
                  id="perfil-tecnicas-recorrentes"
                  label={t('perfil.tecnicas_recorrentes', 'Técnicas e Materiais Recorrentes')}
                  value={form.tecnicas_recorrentes}
                  onChange={val => set('tecnicas_recorrentes', val)}
                  disabled={!isEditing}
                  placeholder="Pressione Enter ou vírgula para adicionar técnicas (ex: Pintura a óleo, Acrílica, Gravura)"
                />

                <TagInput
                  id="perfil-temas-centrais"
                  label={t('perfil.temas_centrais', 'Temas Centrais de Pesquisa')}
                  value={form.temas_centrais}
                  onChange={val => set('temas_centrais', val)}
                  disabled={!isEditing}
                  placeholder="Pressione Enter ou vírgula para adicionar temas (ex: Memória, Cidade, Identidade)"
                />
              </div>

              <div>
                <label htmlFor="perfil-pesquisa-artistica" className="block text-xs font-bold text-text-muted mb-1">
                  {t('perfil.pesquisa_artistica', 'Pesquisa Artística Atual')}
                </label>
                <textarea
                  id="perfil-pesquisa-artistica"
                  value={form.pesquisa_artistica}
                  disabled={!isEditing}
                  onChange={e => set('pesquisa_artistica', e.target.value)}
                  placeholder="No que você está trabalhando ou investigando no momento?"
                  className="w-full border border-border rounded-xl px-4 py-2.5 text-sm focus:border-gold focus:ring-1 focus:ring-gold/30 outline-none bg-surface/50 text-text-main h-24 resize-none disabled:opacity-75 disabled:cursor-not-allowed transition-all placeholder-text-muted"
                />
              </div>

              <div>
                <label htmlFor="perfil-referencias-conceituais" className="block text-xs font-bold text-text-muted mb-1">
                  {t('perfil.referencias_conceituais', 'Referências Teóricas / Conceituais / Artísticas')}
                </label>
                <textarea
                  id="perfil-referencias-conceituais"
                  value={form.referencias_conceituais}
                  disabled={!isEditing}
                  onChange={e => set('referencias_conceituais', e.target.value)}
                  placeholder="Filósofos, teóricos, livros, cineastas ou outros artistas influentes na sua produção..."
                  className="w-full border border-border rounded-xl px-4 py-2.5 text-sm focus:border-gold focus:ring-1 focus:ring-gold/30 outline-none bg-surface/50 text-text-main h-24 resize-none disabled:opacity-75 disabled:cursor-not-allowed transition-all placeholder-text-muted"
                />
              </div>

              <div className="border-t border-border pt-6">
                <TagInput
                  id="perfil-tags"
                  label={t('perfil.tags_portfolio', 'Tags do Portfólio (Palavras-chave de busca)')}
                  value={form.tags}
                  onChange={val => set('tags', val)}
                  disabled={!isEditing}
                  placeholder="Pressione Enter ou vírgula para adicionar tags gerais de pesquisa e curadoria"
                />
              </div>
            </div>
          </section>
        </div>
      )}

      {/* Tab 3: EXPOSIÇÕES & TRAJETÓRIA */}
      {profileTab === 'trajetoria' && (
        <div className="space-y-8 animate-fadeIn">
          {/* Formação Acadêmica & Prêmios */}
          <section className="glass-slab rounded-2xl overflow-hidden">
            <div className="px-7 py-5 border-b border-border bg-surface-raised/35 flex items-center gap-2">
              <BookOpen size={20} className="text-gold" />
              <h2 className="text-lg font-serif text-gold font-bold">{t('perfil.formacao_premios', 'Formação Acadêmica & Prêmios')}</h2>
            </div>
            <div className="p-7 space-y-8">
              {/* Formação */}
              <AddList title={t('perfil.educacao', 'Educação / Formação')} items={formacao} disabled={!isEditing} onChange={setFormacao} t={t} fields={[
                { key: 'curso', label: t('perfil.curso', 'Curso / Habilitação') },
                {
                  key: 'tipo',
                  label: t('perfil.tipo_curso', 'Tipo'),
                  options: ['Graduação', 'Mestrado', 'Doutorado', 'Especialização', 'Curso Livre', 'Workshop', 'Mentoria']
                },
                { key: 'instituicao', label: t('perfil.instituicao', 'Instituição') },
                { key: 'cidade', label: t('perfil.cidade', 'Cidade') },
                { key: 'pais', label: t('perfil.pais', 'País') },
                { key: 'anoInicio', label: t('perfil.ano_inicio', 'Ano de Início'), type: 'number' },
                { key: 'anoFim', label: t('perfil.ano_fim', 'Ano de Conclusão'), type: 'number' },
                { key: 'descricao', label: t('perfil.descricao', 'Descrição (Opcional)'), className: 'col-span-2' },
              ]} />

              {/* Prêmios */}
              <div className="border-t border-border pt-8">
                <AddList title={t('perfil.premios_distincoes', 'Prêmios, Distinções & Títulos')} items={premios} disabled={!isEditing} onChange={setPremios} t={t} fields={[
                  { key: 'nome', label: t('perfil.nome_premio', 'Nome do Prêmio') },
                  { key: 'categoria', label: t('perfil.categoria', 'Categoria') },
                  { key: 'instituicao', label: t('perfil.instituicao', 'Instituição Outorgante') },
                  { key: 'cidade', label: t('perfil.cidade', 'Cidade') },
                  { key: 'pais', label: t('perfil.pais', 'País') },
                  { key: 'ano', label: t('perfil.ano', 'Ano'), type: 'number' },
                  { key: 'colocacao', label: t('perfil.colocacao', 'Colocação / Seleção') },
                  { key: 'descricao', label: t('perfil.descricao', 'Descrição (Opcional)'), className: 'col-span-2' },
                ]} />
              </div>

              {/* Bolsas & Grants */}
              <div className="border-t border-border pt-8">
                <AddList title={t('perfil.bolsas_grants', 'Bolsas, Grants e Fomentos')} items={bolsas} disabled={!isEditing} onChange={setBolsas} t={t} fields={[
                  { key: 'nome', label: t('perfil.nome_bolsa', 'Nome da Bolsa / Fomento') },
                  { key: 'instituicao', label: t('perfil.instituicao', 'Instituição Financiadora') },
                  { key: 'pais', label: t('perfil.pais', 'País') },
                  { key: 'ano', label: t('perfil.ano', 'Ano'), type: 'number' },
                  { key: 'valor', label: t('perfil.valor_grant', 'Valor (Opcional)') },
                  { key: 'descricao', label: t('perfil.descricao', 'Descrição do Projeto Contemplado'), className: 'col-span-2' },
                ]} />
              </div>
            </div>
          </section>

          {/* Exposições & Residências */}
          <section className="glass-slab rounded-2xl overflow-hidden">
            <div className="px-7 py-5 border-b border-border bg-surface-raised/35 flex items-center gap-2">
              <Award size={20} className="text-gold" />
              <h2 className="text-lg font-serif text-gold font-bold">{t('perfil.trajetoria_expositiva', 'Trajetória Expositiva & Residências')}</h2>
            </div>
            <div className="p-7 space-y-8">
              {/* Residências */}
              <AddList title={t('perfil.residencias_artisticas', 'Residências Artísticas')} items={residencias} disabled={!isEditing} onChange={setResidencias} t={t} fields={[
                { key: 'nome', label: t('perfil.nome_residencia', 'Nome da Residência') },
                { key: 'instituicao', label: t('perfil.instituicao', 'Instituição Organizadora') },
                { key: 'cidade', label: t('perfil.cidade', 'Cidade') },
                { key: 'pais', label: t('perfil.pais', 'País') },
                { key: 'ano', label: t('perfil.ano', 'Ano'), type: 'number' },
                { key: 'curador', label: t('perfil.curador_opcional', 'Curador / Orientador') },
                { key: 'descricao', label: t('perfil.descricao', 'Resumo da Experiência / Obra Produzida'), className: 'col-span-2' },
              ]} />

              {/* Individuais */}
              <div className="border-t border-border pt-8">
                <AddList title={t('perfil.individuais', 'Exposições Individuais')} items={exposIndividuais} disabled={!isEditing} onChange={setExposIndividuais} t={t} fields={[
                  { key: 'titulo', label: t('perfil.titulo_expo', 'Título da Exposição') },
                  { key: 'local', label: t('perfil.galeria_museu', 'Espaço / Galeria / Museu') },
                  { key: 'curador', label: t('perfil.curador_opcional', 'Curadoria') },
                  { key: 'cidade', label: t('perfil.cidade', 'Cidade') },
                  { key: 'pais', label: t('perfil.pais', 'País') },
                  { key: 'ano', label: t('perfil.ano', 'Ano'), type: 'number' },
                  { key: 'link', label: t('perfil.link_opcional', 'Link para registro ou catálogo') },
                  { key: 'descricao', label: t('perfil.descricao', 'Breve descrição / Conceito exposto'), className: 'col-span-2' },
                ]} />
              </div>

              {/* Coletivas */}
              <div className="border-t border-border pt-8">
                <AddList title={t('perfil.coletivas', 'Exposições Coletivas')} items={exposColetivas} disabled={!isEditing} onChange={setExposColetivas} t={t} fields={[
                  { key: 'titulo', label: t('perfil.titulo_expo', 'Título da Exposição') },
                  { key: 'local', label: t('perfil.galeria_museu', 'Espaço / Galeria / Museu') },
                  { key: 'curador', label: t('perfil.curador_opcional', 'Curadoria') },
                  { key: 'cidade', label: t('perfil.cidade', 'Cidade') },
                  { key: 'pais', label: t('perfil.pais', 'País') },
                  { key: 'ano', label: t('perfil.ano', 'Ano'), type: 'number' },
                  { key: 'participacao', label: t('perfil.obras_expostas', 'Obras expostas') },
                  { key: 'link', label: t('perfil.link_opcional', 'Link da exposição') },
                ]} />
              </div>

              {/* Feiras de Arte */}
              <div className="border-t border-border pt-8">
                <AddList title={t('perfil.feiras_arte', 'Feiras de Arte')} items={feiras} disabled={!isEditing} onChange={setFeiras} t={t} fields={[
                  { key: 'nome', label: t('perfil.nome_feira', 'Nome da Feira') },
                  { key: 'galeria', label: t('perfil.galeria_representante', 'Galeria Representante') },
                  { key: 'cidade', label: t('perfil.cidade', 'Cidade') },
                  { key: 'pais', label: t('perfil.pais', 'País') },
                  { key: 'ano', label: t('perfil.ano', 'Ano'), type: 'number' },
                ]} />
              </div>

              {/* Bienais e Festivais */}
              <div className="border-t border-border pt-8">
                <AddList title={t('perfil.bienais_festivais', 'Bienais & Festivais')} items={bienais} disabled={!isEditing} onChange={setBienais} t={t} fields={[
                  { key: 'nome', label: t('perfil.nome_evento', 'Nome da Bienal ou Festival') },
                  { key: 'obra', label: t('perfil.obra_exposta', 'Título da Obra / Projeto Exposto') },
                  { key: 'curadoria', label: t('perfil.curador_opcional', 'Curador responsável') },
                  { key: 'cidade', label: t('perfil.cidade', 'Cidade') },
                  { key: 'pais', label: t('perfil.pais', 'País') },
                  { key: 'ano', label: t('perfil.ano', 'Ano'), type: 'number' },
                  { key: 'link', label: t('perfil.link_opcional', 'Link oficial'), className: 'col-span-2' },
                ]} />
              </div>
            </div>
          </section>

          {/* Publicações e Fortuna Crítica */}
          <section className="glass-slab rounded-2xl overflow-hidden">
            <div className="px-7 py-5 border-b border-border bg-surface-raised/35 flex items-center gap-2">
              <FileText size={20} className="text-gold" />
              <h2 className="text-lg font-serif text-gold font-bold">{t('perfil.publicacoes_critica', 'Publicações & Fortuna Crítica')}</h2>
            </div>
            <div className="p-7 space-y-8">
              {/* Bibliografia Crítica */}
              <AddList title={t('perfil.bibliografia_sobre', 'Bibliografia (Textos Críticos e Ensaios sobre a Artista)')} items={bibliografia} disabled={!isEditing} onChange={setBibliografia} t={t} fields={[
                { key: 'titulo', label: t('perfil.titulo_texto', 'Título do Texto / Resenha') },
                { key: 'autor', label: t('perfil.autor_critico', 'Autor / Crítico') },
                { key: 'veiculo', label: t('perfil.veiculo_publicacao', 'Veículo, Catálogo ou Revista') },
                { key: 'ano', label: t('perfil.ano', 'Ano'), type: 'number' },
                { key: 'link', label: t('perfil.link_opcional', 'Link para leitura'), className: 'col-span-2' },
              ]} />

              {/* Publicações da Artista */}
              <div className="border-t border-border pt-8">
                <AddList title={t('perfil.publicacoes_autora', 'Publicações da Artista (Livros, Zines, Artigos)')} items={publicacoesAutora} disabled={!isEditing} onChange={setPublicacoesAutora} t={t} fields={[
                  { key: 'titulo', label: t('perfil.titulo_publicacao', 'Título da Publicação') },
                  {
                    key: 'tipo',
                    label: t('perfil.tipo_publicacao', 'Tipo'),
                    options: ['Livro de Artista', 'Livro Acadêmico', 'Zine', 'Artigo de Opinião', 'Ensaio Teórico', 'Outro']
                  },
                  { key: 'editora', label: t('perfil.editora', 'Editora / Auto-publicação') },
                  { key: 'cidade', label: t('perfil.cidade', 'Cidade') },
                  { key: 'pais', label: t('perfil.pais', 'País') },
                  { key: 'ano', label: t('perfil.ano', 'Ano'), type: 'number' },
                  { key: 'link', label: t('perfil.link_opcional', 'Link oficial'), className: 'col-span-2' },
                ]} />
              </div>

              {/* Clipping / Press */}
              <div className="border-t border-border pt-8">
                <AddList title={t('perfil.clipping_press', 'Clipping / Press (Matérias, Entrevistas e Mídia)')} items={clipping} disabled={!isEditing} onChange={setClipping} t={t} fields={[
                  { key: 'titulo', label: t('perfil.titulo_materia', 'Título da Matéria / Entrevista') },
                  { key: 'veiculo', label: t('perfil.veiculo_comunicacao', 'Veículo de Comunicação') },
                  { key: 'autor', label: t('perfil.autor_jornalista', 'Jornalista (Opcional)') },
                  { key: 'data', label: t('perfil.data_publicacao', 'Data de Publicação'), type: 'date' },
                  {
                    key: 'tipo',
                    label: t('perfil.tipo_midia', 'Tipo de Mídia'),
                    options: ['Online', 'Impresso', 'TV / Vídeo', 'Rádio / Podcast']
                  },
                  { key: 'link', label: t('perfil.link_opcional', 'Link da matéria'), className: 'col-span-2' },
                ]} />
              </div>
            </div>
          </section>

          {/* Coleções */}
          <section className="glass-slab rounded-2xl overflow-hidden">
            <div className="px-7 py-5 border-b border-border bg-surface-raised/35 flex items-center gap-2">
              <Bookmark size={20} className="text-gold" />
              <h2 className="text-lg font-serif text-gold font-bold">{t('perfil.colecoes_acervos', 'Coleções & Acervos')}</h2>
            </div>
            <div className="p-7 space-y-8">
              {/* Coleções Públicas */}
              <AddList title={t('perfil.colecoes_publicas', 'Coleções Públicas (Museus, Centros Culturais)')} items={colecoesPublicas} disabled={!isEditing} onChange={setColecoesPublicas} t={t} fields={[
                { key: 'instituicao', label: t('perfil.instituicao_acervo', 'Nome da Instituição / Museu') },
                { key: 'cidade', label: t('perfil.cidade', 'Cidade') },
                { key: 'pais', label: t('perfil.pais', 'País') },
                { key: 'obra', label: t('perfil.obra_acervo', 'Obra incorporada ao Acervo') },
                { key: 'ano', label: t('perfil.ano_aquisicao', 'Ano de Aquisição'), type: 'number' },
              ]} />

              {/* Coleções Privadas */}
              <div className="border-t border-border pt-8">
                <AddList title={t('perfil.colecoes_privadas', 'Coleções Privadas (Colecionadores Relevantes)')} items={colecoesPrivadas} disabled={!isEditing} onChange={setColecoesPrivadas} t={t} fields={[
                  { key: 'colecionador', label: t('perfil.colecionador', 'Nome do Colecionador / Nome da Coleção') },
                  { key: 'pais', label: t('perfil.pais_regiao', 'País / Região') },
                  { key: 'ano', label: t('perfil.ano_aquisicao', 'Ano de Aquisição'), type: 'number' },
                ]} />
              </div>
            </div>
          </section>
        </div>
      )}

      {/* Tab 4: IDENTIDADE VISUAL & FOTOS */}
      {profileTab === 'identidadeVisual' && (
        <div className="space-y-8 animate-fadeIn">
          {/* Identidade Visual */}
          <section className="glass-slab rounded-2xl overflow-hidden">
            <div className="px-7 py-5 border-b border-border bg-surface-raised/35">
              <h2 className="text-lg font-serif text-gold font-bold">{t('perfil.identidade_visual', 'Identidade Visual')}</h2>
            </div>
            <div className="p-7">
              <p className="text-sm text-text-muted mb-6">
                {t('perfil.identidade_visual_desc', 'Faça upload do seu selo/carimbo e assinatura para uso em certificados de autenticidade e rodapés de portfólio.')}
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Brand Seal */}
                <div className="flex flex-col gap-3">
                  <h3 className="text-sm font-bold text-text-main">{t('perfil.selo_marca', 'Selo / Carimbo da Marca')}</h3>
                  <p className="text-xs text-text-muted">{t('perfil.selo_desc', 'Usado no rodapé do portfólio PDF e certificado de autenticidade. PNG com fundo transparente recomendado.')}</p>
                  
                  {seloUrl ? (
                    <div className="relative border border-border bg-surface rounded-xl p-4 flex flex-col items-center justify-center gap-4 h-48 group">
                      <img src={seloUrl} alt="Selo" className="max-h-32 object-contain" />
                      {isEditing && (
                        <button
                          onClick={() => setSeloUrl(null)}
                          title={t('common.remover', 'Remover')}
                          aria-label={t('common.remover', 'Remover')}
                          className="absolute top-2 right-2 bg-red-600/90 text-white rounded-full p-1.5 hover:bg-red-700 transition-colors shadow-lg animate-fadeIn"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="border border-dashed border-border rounded-xl h-48 flex flex-col items-center justify-center p-6 text-center bg-surface-raised/35">
                      <FileUp size={24} className="text-text-muted mb-2" />
                      <p className="text-xs text-text-muted mb-3">{t('perfil.sem_selo', 'Nenhum selo carregado')}</p>
                      {isEditing && (
                        <button
                          onClick={() => {
                            const input = document.createElement('input');
                            input.type = 'file';
                            input.accept = 'image/*';
                            input.onchange = async (e) => {
                              const file = (e.target as HTMLInputElement).files?.[0];
                              if (file) {
                                try {
                                  const compressed = await compressImage(file, 1200);
                                  const ext = compressed instanceof File ? compressed.name.split('.').pop() : 'jpg';
                                  const path = `onboarding/selo/${Date.now()}-${uid()}.${ext}`;
                                  const { error } = await supabase.storage.from('obras-images').upload(path, compressed, { upsert: true });
                                  if (error) throw error;
                                  const { data: { publicUrl } } = supabase.storage.from('obras-images').getPublicUrl(path);
                                  setSeloUrl(publicUrl);
                                } catch (err) {
                                  alert('Erro ao carregar selo: ' + (err as Error).message);
                                }
                              }
                            };
                            input.click();
                          }}
                          className="px-4 py-2 bg-gold text-bg text-xs font-bold rounded-lg hover:bg-gold-light transition-all shadow-gold-glow-sm"
                        >
                          {t('perfil.carregar_selo', 'Carregar Selo')}
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Digital Signature */}
                <div className="flex flex-col gap-3">
                  <h3 className="text-sm font-bold text-text-main">{t('perfil.assinatura_digital', 'Assinatura Digital')}</h3>
                  <p className="text-xs text-text-muted">{t('perfil.assinatura_desc', 'Assinatura visual alternativa para validação de autoria nos documentos. JPG, PNG ou WebP.')}</p>
                  
                  {assinaturaUrl ? (
                    <div className="relative border border-border bg-surface rounded-xl p-4 flex flex-col items-center justify-center gap-4 h-48 group">
                      <img src={assinaturaUrl} alt="Assinatura" className="max-h-32 object-contain" />
                      {isEditing && (
                        <button
                          onClick={() => setAssinaturaUrl(null)}
                          title={t('common.remover', 'Remover')}
                          aria-label={t('common.remover', 'Remover')}
                          className="absolute top-2 right-2 bg-red-600/90 text-white rounded-full p-1.5 hover:bg-red-700 transition-colors shadow-lg animate-fadeIn"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="border border-dashed border-border rounded-xl h-48 flex flex-col items-center justify-center p-6 text-center bg-surface-raised/35">
                      <FileUp size={24} className="text-text-muted mb-2" />
                      <p className="text-xs text-text-muted mb-3">{t('perfil.sem_assinatura', 'Nenhuma assinatura carregada')}</p>
                      {isEditing && (
                        <button
                          onClick={() => {
                            const input = document.createElement('input');
                            input.type = 'file';
                            input.accept = 'image/*';
                            input.onchange = async (e) => {
                              const file = (e.target as HTMLInputElement).files?.[0];
                              if (file) {
                                try {
                                  const compressed = await compressImage(file, 1200);
                                  const ext = compressed instanceof File ? compressed.name.split('.').pop() : 'jpg';
                                  const path = `onboarding/assinatura/${Date.now()}-${uid()}.${ext}`;
                                  const { error } = await supabase.storage.from('obras-images').upload(path, compressed, { upsert: true });
                                  if (error) throw error;
                                  const { data: { publicUrl } } = supabase.storage.from('obras-images').getPublicUrl(path);
                                  setAssinaturaUrl(publicUrl);
                                } catch (err) {
                                  alert('Erro ao carregar assinatura: ' + (err as Error).message);
                                }
                              }
                            };
                            input.click();
                          }}
                          className="px-4 py-2 bg-gold text-bg text-xs font-bold rounded-lg hover:bg-gold-light transition-all shadow-gold-glow-sm"
                        >
                          {t('perfil.carregar_assinatura', 'Carregar Assinatura')}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Fotos Profissionais */}
          <section className="glass-slab rounded-2xl overflow-hidden">
            <div className="px-7 py-5 border-b border-border bg-surface-raised/35 flex items-center justify-between">
              <h2 className="text-lg font-serif text-gold font-bold">{t('perfil.fotos_profissionais', 'Fotos Profissionais')}</h2>
              <span className="text-xs text-text-muted font-bold">
                {fotosProfissionais.length} / 5
              </span>
            </div>
            <div className="p-7 space-y-6">
              <p className="text-sm text-text-muted">
                {t('perfil.fotos_desc', 'Envie fotos do seu atelier, retratos de perfil ou processos de montagem para exibição institucional. Reordene-as conforme preferir.')}
              </p>

              {/* Gallery Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                {fotosProfissionais.map((url, i) => (
                  <div key={i} className="relative aspect-square border border-border rounded-xl overflow-hidden bg-surface group flex flex-col justify-end">
                    <img src={url} alt={`Foto profissional ${i + 1}`} className="absolute inset-0 w-full h-full object-cover" />
                    
                    {isEditing && (
                      <div className="absolute inset-x-0 bottom-0 bg-black/60 backdrop-blur-[2px] p-2 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="flex gap-1">
                          <button
                            type="button"
                            disabled={i === 0}
                            onClick={() => {
                              const list = [...fotosProfissionais];
                              const temp = list[i - 1];
                              list[i - 1] = list[i];
                              list[i] = temp;
                              setFotosProfissionais(list);
                            }}
                            className="bg-white/90 hover:bg-white text-gray-800 disabled:opacity-40 rounded p-1 text-xs shadow flex items-center justify-center w-5 h-5 font-bold"
                          >
                            ←
                          </button>
                          <button
                            type="button"
                            disabled={i === fotosProfissionais.length - 1}
                            onClick={() => {
                              const list = [...fotosProfissionais];
                              const temp = list[i + 1];
                              list[i + 1] = list[i];
                              list[i] = temp;
                              setFotosProfissionais(list);
                            }}
                            className="bg-white/90 hover:bg-white text-gray-800 disabled:opacity-40 rounded p-1 text-xs shadow flex items-center justify-center w-5 h-5 font-bold"
                          >
                            →
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setFotosProfissionais(fotosProfissionais.filter((_, idx) => idx !== i));
                          }}
                          title={t('common.remover', 'Remover')}
                          aria-label={t('common.remover', 'Remover')}
                          className="bg-red-600 text-white rounded p-1 hover:bg-red-700 shadow text-xs flex items-center justify-center w-5 h-5"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                ))}

                {/* Upload Placeholder */}
                {isEditing && fotosProfissionais.length < 5 && (
                  <div
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = 'image/*';
                      input.multiple = true;
                      input.onchange = async (e) => {
                        const files = (e.target as HTMLInputElement).files;
                        if (files) {
                          const slotsLeft = 5 - fotosProfissionais.length;
                          const selectedFiles = Array.from(files).slice(0, slotsLeft);
                          const newUrls: string[] = [];
                          
                          for (const file of selectedFiles) {
                            try {
                              const compressed = await compressImage(file, 1600);
                              const ext = compressed instanceof File ? compressed.name.split('.').pop() : 'jpg';
                              const path = `onboarding/fotos/${Date.now()}-${uid()}.${ext}`;
                              const { error } = await supabase.storage.from('obras-images').upload(path, compressed, { upsert: true });
                              if (error) throw error;
                              const { data: { publicUrl } } = supabase.storage.from('obras-images').getPublicUrl(path);
                              newUrls.push(publicUrl);
                            } catch (err) {
                              alert('Erro ao carregar foto: ' + (err as Error).message);
                            }
                          }
                          setFotosProfissionais(prev => [...prev, ...newUrls]);
                        }
                      };
                      input.click();
                    }}
                    className="aspect-square border border-dashed border-gold/40 hover:border-gold hover:bg-gold/5 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-colors"
                  >
                    <Plus size={20} className="text-gold" />
                    <span className="text-[10px] text-gold font-bold mt-1 uppercase tracking-wider">{t('adicionar', 'Adicionar')}</span>
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      )}

      {/* Fixed Save Button */}
      <div className="fixed bottom-0 md:left-[220px] left-0 right-0 bg-bg/85 backdrop-blur-md border-t border-border p-4 flex justify-end z-20 shadow-gold-glow-sm">
        {!isEditing ? (
          <button onClick={() => setIsEditing(true)}
            className="flex items-center justify-center w-full md:w-auto gap-2 px-8 py-3 bg-gold text-bg font-bold rounded-xl hover:bg-gold-light transition-all shadow-gold-glow hover-lift">
            <PenLine size={18} /> {t('perfil.editar_perfil', 'Editar Perfil')}
          </button>
        ) : (
          <div className="flex gap-3 w-full md:w-auto">
            <button onClick={() => {
              setIsEditing(false);
              window.location.reload();
            }}
              className="flex items-center justify-center flex-1 md:flex-none gap-2 px-6 py-3 bg-surface border border-border text-text-muted hover:text-text-main font-bold rounded-xl transition-all">
              {t('cancelar', 'Cancelar')}
            </button>
            <button onClick={async () => {
              await handleSave();
              setIsEditing(false);
            }}
              disabled={saving}
              className="flex items-center justify-center flex-1 md:flex-none gap-2 px-8 py-3 bg-gold text-bg font-bold rounded-xl hover:bg-gold-light disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-gold-glow hover-lift">
              {saving ? <><Loader2 size={18} className="animate-spin" /> {t('perfil.salvando', 'Salvando')}...</> : t('perfil.salvar_perfil', 'Salvar Perfil')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
