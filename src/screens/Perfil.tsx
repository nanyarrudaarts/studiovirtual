import { useState, useEffect, useRef } from 'react';
import { Plus, X, Sparkles, Loader2, Camera, Check, FileText, FileUp, Database } from 'lucide-react';
import { supabase } from '../services/supabase';
import { useTranslation } from 'react-i18next';
import { callAI } from '../services/ai';

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: (k: string) => string;
}) {
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  const keys = Object.keys(imported).filter(k => imported[k] !== undefined && imported[k] !== null && imported[k] !== '');

  useEffect(() => {
    const initial: Record<string, boolean> = {};
    keys.forEach(k => { initial[k] = true; });
    setChecked(initial);
  }, [imported]);

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
    <div className="border border-gray-100 rounded-xl overflow-hidden">
      <div className="grid grid-cols-2 text-xs font-bold bg-gray-50 text-gray-500 px-4 py-2.5 border-b border-gray-100">
        <span>{t('perfil.dados_atuais')}</span>
        <span className="text-emerald-600">{t('perfil.dados_importados')}</span>
      </div>
      <div className="divide-y divide-gray-50 max-h-72 overflow-y-auto">
        {keys.map(k => {
          const isNew = !current[k] || current[k] === '';
          const isConflict = current[k] && current[k] !== imported[k];
          return (
            <label key={k} className="grid grid-cols-[auto_1fr_1fr] items-center gap-4 px-4 py-2.5 cursor-pointer hover:bg-gray-50 transition-colors">
              <input type="checkbox" aria-label={`Selecionar ${k}`} checked={!!checked[k]} onChange={() => toggle(k)}
                className="accent-accent w-4 h-4" title={`Selecionar ${k}`} />
              <span className="text-xs text-gray-400 truncate">{fmt(current[k])}</span>
              <span className={`text-xs font-medium truncate ${isNew ? 'text-emerald-600' : isConflict ? 'text-amber-600' : 'text-gray-600'}`}>
                {fmt(imported[k])}
              </span>
            </label>
          );
        })}
      </div>
      <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
        <span className="text-xs text-gray-500">{keys.filter(k => checked[k]).length} de {keys.length} {t('campos_selecionados')}</span>
        <button onClick={apply}
          className="flex items-center gap-2 px-5 py-2 bg-accent text-white text-sm font-bold rounded-lg hover:bg-accent/90 transition-colors">
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
    const pageText = textContent.items.map((item: any) => item.str).join(' ');
    fullText += pageText + '\n';
  }
  return fullText;
}

/* ---- Smart Import ---- */
function SmartImport({ currentData, onImport, t }: {
  currentData: Record<string, unknown>;
  onImport: (data: ImportedData) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: (k: string) => string;
}) {
  const [tab, setTab] = useState<'text' | 'pdf'>('text');
  const [targetSection, setTargetSection] = useState<string>('all');
  const [textInput, setTextInput] = useState('');
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
    const groqKey = localStorage.getItem('groq_api_key') || import.meta.env.VITE_GROQ_API_KEY;
    if (!groqKey) { setError('Configure a chave API do Groq nas configurações.'); return; }
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
      setError((e as Error).message || 'Erro de comunicação com Groq');
    }
    setLoading(false); setLoadingStep('');
  };

  const importFromPdf = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const groqKey = localStorage.getItem('groq_api_key') || import.meta.env.VITE_GROQ_API_KEY;
    if (!groqKey) { setError('Configure a chave API do Groq nas configurações.'); return; }
    setError(''); setLoading(true); setImportedData(null);
    setLoadingStep('Extraindo texto do PDF...');
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      const base64 = (reader.result as string).split(',')[1];
      setLoadingStep(`Analisando currículo com IA (Foco: ${SECTION_LABELS[targetSection]})...`);
      try {
        const extractedText = await extractTextFromPDF(base64);
        const prompt = getPrompt(extractedText);
        const text = await callAI(prompt, 'groq');
        setLoadingStep(t('perfil.preenchendo_perfil'));
        await new Promise(r => setTimeout(r, 400));
        const data = extractJson(text);
        if (data) setImportedData(data);
        else setError('A IA não conseguiu estruturar as informações do PDF.');
      } catch (e) {
        setError((e as Error).message || 'Erro ao processar PDF');
      }
      setLoading(false); setLoadingStep('');
    };
  };

  return (
    <section className="bg-white rounded-2xl shadow-float border border-gray-100 overflow-hidden">
      <div className="px-7 py-5 border-b border-gray-100">
        <h2 className="text-lg font-serif mb-0.5">{t('perfil.importar_title')}</h2>
        <p className="text-sm text-text-muted">{t('perfil.importar_subtitle')}</p>
      </div>
      <div className="p-7 space-y-5">
        {/* Tabs & Section Target */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-4">
          <div className="flex gap-2">
            <button onClick={() => { setTab('text'); setImportedData(null); setError(''); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-colors ${tab === 'text' ? 'bg-accent text-white' : 'bg-gray-100 text-text-muted hover:text-text-main'}`}>
              <FileText size={15}/> Colar texto
            </button>
            <button onClick={() => { setTab('pdf'); setImportedData(null); setError(''); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-colors ${tab === 'pdf' ? 'bg-accent text-white' : 'bg-gray-100 text-text-muted hover:text-text-main'}`}>
              <FileUp size={15}/> Enviar PDF
            </button>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-text-muted whitespace-nowrap">Seção para preencher:</span>
            <select
              value={targetSection}
              onChange={(e) => { setTargetSection(e.target.value); setImportedData(null); setError(''); }}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:border-accent outline-none bg-white font-bold text-text-main cursor-pointer"
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
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-accent outline-none bg-bg h-32 resize-none" />
            <div className="flex justify-end">
              <button onClick={importFromText} disabled={loading || !textInput.trim()}
                className="px-5 py-2.5 bg-accent text-white font-bold rounded-xl text-sm hover:bg-accent/90 disabled:opacity-60 transition-colors whitespace-nowrap">
                {loading ? <div className="flex items-center gap-2"><Loader2 size={16} className="animate-spin" /> Analisando...</div> : "Analisar com IA"}
              </button>
            </div>
          </div>
        )}

        {/* PDF Panel */}
        {tab === 'pdf' && (
          <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center bg-bg hover:border-accent transition-colors relative cursor-pointer"
            onClick={() => pdfRef.current?.click()}>
            <input type="file" ref={pdfRef} onChange={importFromPdf} accept="application/pdf" className="hidden" />
            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center text-accent">
                <FileUp size={24} />
              </div>
              <p className="text-sm font-bold text-text-main">Escolha seu arquivo PDF ou arraste aqui</p>
              <p className="text-xs text-text-muted">Currículos artísticos, biografias e dossiês</p>
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center gap-3 py-3 text-accent">
            <Loader2 size={18} className="animate-spin" />
            <span className="text-sm font-medium">{loadingStep}</span>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-rose-50 border border-rose-100 text-rose-600 text-sm px-4 py-3 rounded-xl">{error}</div>
        )}

        {/* Diff Preview */}
        {importedData && !loading && (
          <div className="space-y-3">
            <p className="text-sm font-bold text-emerald-600">✓ {t('dados_extraidos')}</p>
            <DiffPreview current={currentData} imported={importedData} onApply={data => { onImport(data); setImportedData(null); setTextInput(''); }} t={t} />
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
  className = ""
}: {
  id: string;
  label: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  suggestions: string[];
  className?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [filtered, setFiltered] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!value.trim()) {
      setFiltered([]);
      return;
    }
    const query = value.toLowerCase();
    const matches = suggestions.filter(item =>
      item.toLowerCase().includes(query) && item.toLowerCase() !== query
    );
    setFiltered(matches);
  }, [value, suggestions]);

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
        onChange={e => {
          onChange(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        placeholder={placeholder}
        className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:border-accent outline-none bg-bg text-text-main"
        autoComplete="off"
      />
      {isOpen && filtered.length > 0 && (
        <ul className="absolute z-[999] left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto divide-y divide-gray-50">
          {filtered.map((item, idx) => (
            <li key={idx}>
              <button
                type="button"
                onClick={() => {
                  onChange(item);
                  setIsOpen(false);
                }}
                className="w-full text-left px-4 py-2 text-sm hover:bg-accent hover:text-white transition-colors"
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

interface ListItem {

  id: string;
  [key: string]: string;
}

const uid = () => Math.random().toString(36).slice(2);

function AddList({ title, fields, items, onChange, t }: {
  title: string;
  fields: { key: string; label: string; type?: string; options?: string[]; className?: string }[];
  items: ListItem[];
  onChange: (items: ListItem[]) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: (k: string) => string;
}) {
  const add = () => {
    const empty: ListItem = { id: uid() };
    fields.forEach(f => { empty[f.key] = ''; });
    onChange([...items, empty]);
  };
  const remove = (id: string) => onChange(items.filter(i => i.id !== id));
  const update = (id: string, key: string, value: string) =>
    onChange(items.map(i => i.id === id ? { ...i, [key]: value } : i));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-bold text-sm text-text-muted">{title}</h4>
        <button onClick={add} className="flex items-center gap-1 text-accent text-xs font-bold hover:underline">
          <Plus size={14} /> {t('perfil.adicionar')}
        </button>
      </div>
      {items.map(item => (
        <div key={item.id} className="bg-bg rounded-xl p-4 relative">
          <button onClick={() => remove(item.id)}
            aria-label="Remover item"
            className="absolute right-3 top-3 text-gray-400 hover:text-red-500 transition-colors">
            <X size={16} />
          </button>
          <div className="grid grid-cols-2 gap-3 pr-6">
            {fields.map(f => (
              <div key={f.key} className={f.className || (f.key === fields[0].key ? 'col-span-2' : '')}>
                <label htmlFor={`${item.id}-${f.key}`} className="block text-xs text-text-muted mb-1">{f.label}</label>
                {f.options ? (
                  <select
                    id={`${item.id}-${f.key}`}
                    aria-label={f.label}
                    value={item[f.key] || ''}
                    onChange={e => update(item.id, f.key, e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:border-accent outline-none bg-white font-medium text-text-main cursor-pointer"
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
                    onChange={e => update(item.id, f.key, e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:border-accent outline-none bg-white"
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
  const [saving, setSaving] = useState(false);
  const [generatingBio, setGeneratingBio] = useState(false);
  const [profileTab, setProfileTab] = useState<'pessoal' | 'artistico'>('pessoal');

  const [form, setForm] = useState({
    nome: 'Nany Arruda',
    nomeArtistico: 'Nany Arruda',
    nacionalidade: 'Brasil',
    cidade: '',
    nascimento: '',
    email: '',
    website: 'nanyarruda.com',
    bioShort: '',
    bioLong: '',
    tags: '',
    telefone: '',
    whatsapp: '',
  });


  const [instagrams, setInstagrams] = useState(['@nany_arruda', '@nanyarrudaart']);
  const [socialLinks, setSocialLinks] = useState<{id:string; label:string; url:string}[]>([]);
  const [formacao, setFormacao] = useState<ListItem[]>([]);
  const [premios, setPremios] = useState<ListItem[]>([]);
  const [residencias, setResidencias] = useState<ListItem[]>([]);
  const [exposIndividuais, setExposIndividuais] = useState<ListItem[]>([]);
  const [exposColetivas, setExposColetivas] = useState<ListItem[]>([]);
  const [publicacoes, setPublicacoes] = useState<ListItem[]>([]);

  useEffect(() => {
    supabase.from('artista').select('*').single().then(({ data, error }) => {
      if (error && error.code !== 'PGRST116') {
        console.error('Erro ao carregar perfil:', error);
      }
      if (data) {
        setForm(f => ({ ...f, ...data }));
        if (data.foto_url) setPhotoUrl(data.foto_url);
        const ensureArray = (v: any) => {
          if (Array.isArray(v)) return v;
          if (typeof v === 'string' && v.trim().startsWith('[')) {
            try {
              const parsed = JSON.parse(v);
              if (Array.isArray(parsed)) return parsed;
            } catch (e) { /* ignore */ }
          }
          return [];
        };
        if (data.instagrams) setInstagrams(ensureArray(data.instagrams));
        if (data.social_links) setSocialLinks(ensureArray(data.social_links));
        if (data.formacao) setFormacao(ensureArray(data.formacao));
        if (data.premios) setPremios(ensureArray(data.premios));
        if (data.residencias) setResidencias(ensureArray(data.residencias));
        if (data.expos_individuais) setExposIndividuais(ensureArray(data.expos_individuais));
        if (data.expos_coletivas) setExposColetivas(ensureArray(data.expos_coletivas));
        if (data.publicacoes) setPublicacoes(ensureArray(data.publicacoes));
      }
    });
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

  const handleGenerateBio = async () => {
    setGeneratingBio(true);
    try {
      const prompt = `Você é um curador de arte. Gere duas bios para a artista ${form.nome}, de ${form.nacionalidade}, cidade ${form.cidade}. Bio curta (até 120 palavras) e bio longa (3 parágrafos). Retorne APENAS JSON: {"short":"...", "long":"..."}`;
      const text = await callAI(prompt, 'groq');
      const data = extractJson(text);
      if (data) {
        setForm(f => ({ ...f, bioShort: data.short || f.bioShort, bioLong: data.long || f.bioLong }));
      }
    } catch (e) {
      alert((e as Error).message || 'Erro ao gerar bio com IA');
    }
    setGeneratingBio(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const payload: any = {
      id: 1,
      ...form,
      foto_url: photoUrl,
      instagrams,
      social_links: socialLinks,
      formacao,
      premios,
      residencias,
      expos_individuais: exposIndividuais,
      expos_coletivas: exposColetivas,
      publicacoes,
      updated_at: new Date().toISOString(),
    };

    let { error } = await supabase.from('artista').upsert(payload);
    
    if (error) {
      const isMissingColumn = error.code === '42703' || error.message?.toLowerCase().includes('column') || error.hint?.toLowerCase().includes('column');
      if (isMissingColumn) {
        console.warn('Alguma coluna nova não existe no banco. Tentando salvar sem e-mail, telefone e whatsapp...');
        const { email, telefone, whatsapp, ...safePayload } = payload;
        const { error: retryError } = await supabase.from('artista').upsert(safePayload);
        
        if (retryError) {
          alert('Erro ao salvar perfil: ' + retryError.message);
        } else {
          alert('Perfil salvo com sucesso! (Nota: O campo de e-mail, telefone ou whatsapp não pôde ser gravado no banco. Execute a instrução SQL no final do painel de controle do perfil no Supabase para ativá-los definitivamente).');
        }
      } else {
        alert('Erro ao salvar perfil: ' + error.message);
      }
    } else {
      alert('Perfil salvo com sucesso!');
    }
    setSaving(false);
  };

  const set = (key: keyof typeof form, value: string) =>
    setForm(f => ({ ...f, [key]: value }));

  const wordCount = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;

  const handleImport = (data: ImportedData) => {
    const strKeys = ['nome', 'nomeArtistico', 'nacionalidade', 'cidade', 'email', 'bioShort', 'bioLong', 'website', 'telefone', 'whatsapp'] as const;
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

  const currentFormAsRecord: Record<string, unknown> = { ...form, instagrams, formacao, premios, residencias, exposIndividuais, exposColetivas, publicacoes };

  return (
    <div className="max-w-[900px] mx-auto pb-28 space-y-8">
      <div>
        <h1 className="text-3xl font-serif mb-1">{t('perfil.title')}</h1>
        <p className="text-text-muted">{t('perfil.subtitle')}</p>
      </div>

      <SmartImport currentData={currentFormAsRecord} onImport={handleImport} t={t} />

      {/* Modern Premium Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setProfileTab('pessoal')}
          className={`flex-1 py-4 text-center font-bold text-sm transition-all border-b-2 outline-none ${
            profileTab === 'pessoal'
              ? 'border-accent text-accent'
              : 'border-transparent text-text-muted hover:text-text hover:border-gray-300'
          }`}
        >
          {t('perfil.pessoal', 'Perfil Pessoal')}
        </button>
        <button
          onClick={() => setProfileTab('artistico')}
          className={`flex-1 py-4 text-center font-bold text-sm transition-all border-b-2 outline-none ${
            profileTab === 'artistico'
              ? 'border-accent text-accent'
              : 'border-transparent text-text-muted hover:text-text hover:border-gray-300'
          }`}
        >
          {t('perfil.artistico', 'Perfil Artístico')}
        </button>
      </div>

      {/* Tab 1: PERFIL PESSOAL */}
      {profileTab === 'pessoal' && (
        <div className="space-y-8 animate-fadeIn">
          {/* Identity + Digital Presence */}
          <section className="bg-white rounded-2xl shadow-float border border-gray-100 overflow-hidden">
            <div className="px-7 py-5 border-b border-gray-100">
              <h2 className="text-lg font-serif">{t('perfil.identidade_pessoal', 'Identificação Pessoal')}</h2>
            </div>
            <div className="p-7">
              <div className="flex flex-col md:flex-row gap-8">
                {/* Left — Identity */}
                <div className="flex flex-col items-center md:items-start gap-6 md:w-1/2">
                  {/* Photo */}
                  <div className="flex flex-col items-center gap-2">
                    <div className="relative w-[120px] h-[120px]">
                      <div className="w-[120px] h-[120px] rounded-full overflow-hidden bg-gray-100 border-2 border-accent/20 flex items-center justify-center">
                        {photoUrl ? (
                          <img src={photoUrl} alt="Foto" className="w-full h-full object-cover" />
                        ) : (
                          <Camera size={32} className="text-gray-400" />
                        )}
                      </div>
                      <button onClick={() => fileRef.current?.click()}
                        aria-label="Alterar foto de perfil"
                        className="absolute bottom-1 right-1 w-8 h-8 bg-accent text-white rounded-full flex items-center justify-center shadow hover:bg-accent/90 transition-colors">
                        {uploading ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
                      </button>
                      <input ref={fileRef} type="file" accept="image/*" aria-label="Selecionar foto de perfil" className="hidden" onChange={handlePhotoUpload} />
                    </div>
                    <p className="text-xs text-text-muted">{t('perfil.clique_alterar_foto')}</p>
                  </div>

                  <div className="w-full space-y-3">
                    <div>
                      <label htmlFor="perfil-nome" className="block text-sm font-bold text-text-muted mb-1">{t('perfil.nome_completo')}</label>
                      <input id="perfil-nome" aria-label={t('perfil.nome_completo')} value={form.nome} onChange={e => set('nome', e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:border-accent outline-none bg-bg text-text-main" />
                    </div>
                    
                    <div>
                      <label htmlFor="perfil-email" className="block text-sm font-bold text-text-muted mb-1">{t('perfil.email', 'E-mail Profissional')}</label>
                      <input id="perfil-email" aria-label={t('perfil.email')} type="email" placeholder="email@exemplo.com" value={form.email} onChange={e => set('email', e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:border-accent outline-none bg-bg text-text-main" />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="perfil-telefone" className="block text-sm font-bold text-text-muted mb-1">{t('perfil.telefone', 'Telefone')}</label>
                        <input id="perfil-telefone" aria-label={t('perfil.telefone')} placeholder="+55 21 99999-9999" value={form.telefone} onChange={e => set('telefone', e.target.value)}
                          className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:border-accent outline-none bg-bg text-text-main" />
                      </div>
                      <div>
                        <label htmlFor="perfil-whatsapp" className="block text-sm font-bold text-text-muted mb-1">{t('perfil.whatsapp', 'WhatsApp')}</label>
                        <input id="perfil-whatsapp" aria-label={t('perfil.whatsapp')} placeholder="+55 21 99999-9999" value={form.whatsapp} onChange={e => set('whatsapp', e.target.value)}
                          className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:border-accent outline-none bg-bg text-text-main" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <AutocompleteInput
                        id="perfil-nacionalidade"
                        label={t('perfil.nacionalidade')}
                        value={form.nacionalidade}
                        onChange={val => set('nacionalidade', val)}
                        placeholder="Ex: Brasileira"
                        suggestions={NACIONALIDADE_SUGGESTIONS}
                      />
                      <AutocompleteInput
                        id="perfil-cidade"
                        label="Residência: (Cidade / Estado / País)"
                        value={form.cidade}
                        onChange={val => set('cidade', val)}
                        placeholder="Ex: Rio de Janeiro, RJ, Brasil"
                        suggestions={RESIDENCIA_SUGGESTIONS}
                      />
                    </div>

                    <div>
                      <label htmlFor="perfil-nascimento" className="block text-sm font-bold text-text-muted mb-1">{t('perfil.nascimento')}</label>
                      <input id="perfil-nascimento" aria-label={t('perfil.nascimento')} type="date" value={form.nascimento} onChange={e => set('nascimento', e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:border-accent outline-none bg-bg text-text-main" />
                    </div>
                  </div>
                </div>

                {/* Right — Digital Presence */}
                <div className="md:w-1/2 space-y-4">
                  <div>
                    <label htmlFor="perfil-website" className="block text-sm font-bold text-text-muted mb-1">{t('perfil.website')}</label>
                    <input id="perfil-website" aria-label={t('perfil.website')} value={form.website} onChange={e => set('website', e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:border-accent outline-none bg-bg text-text-main" />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-sm font-bold text-text-muted">{t('perfil.instagram')}</label>
                      <button onClick={() => setInstagrams(ig => [...ig, ''])}
                        className="text-accent text-xs font-bold hover:underline flex items-center gap-1">
                        <Plus size={12} /> {t('perfil.adicionar')}
                      </button>
                    </div>
                    <div className="space-y-2">
                      {instagrams.map((ig, i) => (
                        <div key={i} className="flex gap-2">
                          <input aria-label={`Instagram ${i + 1}`} placeholder="@usuario" value={ig} onChange={e => {
                            const n = [...instagrams]; n[i] = e.target.value; setInstagrams(n);
                          }} className="flex-1 border border-gray-200 rounded-lg px-4 py-2 text-sm focus:border-accent outline-none bg-bg text-text-main" />
                          <button onClick={() => setInstagrams(ig => ig.filter((_, j) => j !== i))}
                            aria-label="Remover Instagram"
                            className="text-gray-400 hover:text-red-500 px-2">
                            <X size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-sm font-bold text-text-muted">{t('perfil.outros_links')}</label>
                      <button onClick={() => setSocialLinks(s => [...s, { id: uid(), label: '', url: '' }])}
                        className="text-accent text-xs font-bold hover:underline flex items-center gap-1">
                        <Plus size={12} /> {t('perfil.adicionar_campo')}
                      </button>
                    </div>
                    <div className="space-y-2">
                      {socialLinks.map(link => (
                        <div key={link.id} className="flex gap-2">
                          <input aria-label="Nome do link (ex: LinkedIn)" placeholder="LinkedIn" value={link.label}
                            onChange={e => setSocialLinks(s => s.map(l => l.id === link.id ? {...l, label: e.target.value} : l))}
                            className="w-28 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-accent outline-none bg-bg text-text-main" />
                          <input aria-label="URL do link" placeholder="https://..." value={link.url}
                            onChange={e => setSocialLinks(s => s.map(l => l.id === link.id ? {...l, url: e.target.value} : l))}
                            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-accent outline-none bg-bg text-text-main" />
                          <button onClick={() => setSocialLinks(s => s.filter(l => l.id !== link.id))}
                            aria-label="Remover link"
                            className="text-gray-400 hover:text-red-500 px-2">
                            <X size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Informações de Banco de Dados / Supabase */}
              <div className="mt-8 pt-6 border-t border-gray-100 space-y-4">
                <div className="bg-amber-50 rounded-xl p-5 border border-amber-200 flex items-start gap-4">
                  <div className="bg-amber-100 p-2 rounded-lg text-amber-800 shrink-0">
                    <Database size={20} />
                  </div>
                  <div className="space-y-2 w-full">
                    <h3 className="text-sm font-bold text-amber-900">Integração de Campos no Supabase</h3>
                    <p className="text-xs text-amber-800 leading-relaxed">
                      Se você encontrar algum erro de coluna ao salvar, o seu banco de dados Supabase pode precisar das novas colunas de biografia, identificação e contatos na tabela <strong>artista</strong>. Execute o seguinte comando SQL completo no SQL Editor do seu painel do Supabase:
                    </p>
                    <pre className="bg-amber-900/5 text-amber-950 p-3 rounded-lg text-xs font-mono select-all overflow-x-auto block w-full whitespace-pre-wrap break-all leading-normal">
{`-- Criar ou atualizar a tabela 'artista' para suportar todos os dados do perfil
CREATE TABLE IF NOT EXISTS artista (
    id bigint PRIMARY KEY DEFAULT 1,
    nome text DEFAULT '',
    "nomeArtistico" text DEFAULT '',
    nacionalidade text DEFAULT '',
    cidade text DEFAULT '',
    nascimento text DEFAULT '',
    email text DEFAULT '',
    website text DEFAULT '',
    "bioShort" text DEFAULT '',
    "bioLong" text DEFAULT '',
    tags text DEFAULT '',
    telefone text DEFAULT '',
    whatsapp text DEFAULT '',
    foto_url text DEFAULT '',
    instagrams jsonb DEFAULT '[]'::jsonb,
    social_links jsonb DEFAULT '[]'::jsonb,
    formacao jsonb DEFAULT '[]'::jsonb,
    premios jsonb DEFAULT '[]'::jsonb,
    residencias jsonb DEFAULT '[]'::jsonb,
    expos_individuais jsonb DEFAULT '[]'::jsonb,
    expos_coletivas jsonb DEFAULT '[]'::jsonb,
    publicacoes jsonb DEFAULT '[]'::jsonb,
    updated_at timestamptz DEFAULT now()
);

-- Garantir que todos os campos existam se a tabela já existia
ALTER TABLE artista ADD COLUMN IF NOT EXISTS "nomeArtistico" text DEFAULT '';
ALTER TABLE artista ADD COLUMN IF NOT EXISTS nacionalidade text DEFAULT '';
ALTER TABLE artista ADD COLUMN IF NOT EXISTS cidade text DEFAULT '';
ALTER TABLE artista ADD COLUMN IF NOT EXISTS nascimento text DEFAULT '';
ALTER TABLE artista ADD COLUMN IF NOT EXISTS email text DEFAULT '';
ALTER TABLE artista ADD COLUMN IF NOT EXISTS website text DEFAULT '';
ALTER TABLE artista ADD COLUMN IF NOT EXISTS "bioShort" text DEFAULT '';
ALTER TABLE artista ADD COLUMN IF NOT EXISTS "bioLong" text DEFAULT '';
ALTER TABLE artista ADD COLUMN IF NOT EXISTS tags text DEFAULT '';
ALTER TABLE artista ADD COLUMN IF NOT EXISTS telefone text DEFAULT '';
ALTER TABLE artista ADD COLUMN IF NOT EXISTS whatsapp text DEFAULT '';
ALTER TABLE artista ADD COLUMN IF NOT EXISTS foto_url text DEFAULT '';
ALTER TABLE artista ADD COLUMN IF NOT EXISTS instagrams jsonb DEFAULT '[]'::jsonb;
ALTER TABLE artista ADD COLUMN IF NOT EXISTS social_links jsonb DEFAULT '[]'::jsonb;
ALTER TABLE artista ADD COLUMN IF NOT EXISTS formacao jsonb DEFAULT '[]'::jsonb;
ALTER TABLE artista ADD COLUMN IF NOT EXISTS premios jsonb DEFAULT '[]'::jsonb;
ALTER TABLE artista ADD COLUMN IF NOT EXISTS residencias jsonb DEFAULT '[]'::jsonb;
ALTER TABLE artista ADD COLUMN IF NOT EXISTS expos_individuais jsonb DEFAULT '[]'::jsonb;
ALTER TABLE artista ADD COLUMN IF NOT EXISTS expos_coletivas jsonb DEFAULT '[]'::jsonb;
ALTER TABLE artista ADD COLUMN IF NOT EXISTS publicacoes jsonb DEFAULT '[]'::jsonb;`}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* Tab 2: PERFIL ARTÍSTICO */}
      {profileTab === 'artistico' && (
        <div className="space-y-8 animate-fadeIn">
          {/* Professional Artistic Name */}
          <section className="bg-white rounded-2xl shadow-float border border-gray-100 overflow-hidden p-7">
            <div>
              <label htmlFor="perfil-nomeArtistico" className="block text-sm font-bold text-text-muted mb-1">{t('perfil.nome_artistico', 'Nome Artístico / Profissional')}</label>
              <input id="perfil-nomeArtistico" aria-label={t('perfil.nome_artistico')} value={form.nomeArtistico} onChange={e => set('nomeArtistico', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:border-accent outline-none bg-bg" />
            </div>
          </section>

          {/* Bio */}
          <section className="bg-white rounded-2xl shadow-float border border-gray-100 overflow-hidden">
            <div className="px-7 py-5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-serif">{t('perfil.biografia')}</h2>
              <button onClick={handleGenerateBio}
                className="flex items-center gap-2 px-4 py-2 bg-accent/10 text-accent text-sm font-bold rounded-lg hover:bg-accent/20 transition-colors">
                {generatingBio ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                {t('perfil.gerar_bio')}
              </button>
            </div>
            <div className="p-7 space-y-5">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-bold text-text-muted">{t('perfil.bio_curta')}</label>
                  <span className={`text-xs ${wordCount(form.bioShort) > 120 ? 'text-red-500' : 'text-gray-400'}`}>
                    {wordCount(form.bioShort)}/120 {t('perfil.palavras')}
                  </span>
                </div>
                <textarea value={form.bioShort} onChange={e => set('bioShort', e.target.value)}
                  placeholder={t('perfil.usada_capa')}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-accent outline-none bg-bg h-28 resize-none" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-bold text-text-muted">{t('perfil.bio_longa')}</label>
                  <span className="text-xs text-gray-400">{wordCount(form.bioLong)} {t('perfil.palavras')}</span>
                </div>
                <textarea value={form.bioLong} onChange={e => set('bioLong', e.target.value)}
                  placeholder={t('perfil.usada_portfolio')}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-accent outline-none bg-bg h-40 resize-none" />
              </div>
            </div>
          </section>

          {/* Formação e Trajetória */}
          <section className="bg-white rounded-2xl shadow-float border border-gray-100 overflow-hidden">
            <div className="px-7 py-5 border-b border-gray-100">
              <h2 className="text-lg font-serif">{t('perfil.formacao_traj')}</h2>
            </div>
            <div className="p-7 space-y-7">
              <AddList title={t('perfil.educacao')} items={formacao} onChange={setFormacao} t={t} fields={[
                { key: 'curso', label: t('perfil.curso') },
                { key: 'instituicao', label: t('perfil.instituicao') },
                { key: 'anoInicio', label: t('perfil.ano_inicio') },
                { key: 'anoFim', label: t('perfil.ano_fim') },
              ]} />
              <div className="border-t border-gray-100 pt-6">
                <AddList title={t('perfil.premios_distincoes')} items={premios} onChange={setPremios} t={t} fields={[
                  { key: 'nome', label: t('perfil.nome_premio') },
                  { key: 'instituicao', label: t('perfil.instituicao') },
                  { key: 'ano', label: t('ano') },
                ]} />
              </div>
              <div className="border-t border-gray-100 pt-6">
                <AddList title={t('perfil.residencias_artisticas')} items={residencias} onChange={setResidencias} t={t} fields={[
                  { key: 'nome', label: t('nome') },
                  { key: 'local', label: t('perfil.local') },
                  { key: 'ano', label: t('ano') },
                ]} />
              </div>
            </div>
          </section>

          {/* Exposições */}
          <section className="bg-white rounded-2xl shadow-float border border-gray-100 overflow-hidden">
            <div className="px-7 py-5 border-b border-gray-100">
              <h2 className="text-lg font-serif">{t('exposicoes')}</h2>
            </div>
            <div className="p-7 space-y-7">
              <AddList title={t('perfil.individuais')} items={exposIndividuais} onChange={setExposIndividuais} t={t} fields={[
                { key: 'titulo', label: t('titulo') },
                { key: 'local', label: t('perfil.galeria_museu') },
                { key: 'cidade', label: t('perfil.cidade') },
                { key: 'pais', label: t('perfil.pais') },
                { key: 'ano', label: t('ano') },
              ]} />
              <div className="border-t border-gray-100 pt-6">
                <AddList title={t('perfil.coletivas')} items={exposColetivas} onChange={setExposColetivas} t={t} fields={[
                  { key: 'titulo', label: t('titulo') },
                  { key: 'local', label: t('perfil.galeria_museu') },
                  { key: 'cidade', label: t('perfil.cidade') },
                  { key: 'pais', label: t('perfil.pais') },
                  { key: 'ano', label: t('ano') },
                ]} />
              </div>
            </div>
          </section>

          {/* Publicações */}
          <section className="bg-white rounded-2xl shadow-float border border-gray-100 overflow-hidden">
            <div className="px-7 py-5 border-b border-gray-100">
              <h2 className="text-lg font-serif">{t('perfil.publicacoes')}</h2>
            </div>
            <div className="p-7">
              <AddList title={t('perfil.publicacoes')} items={publicacoes} onChange={setPublicacoes} t={t} fields={[
                { key: 'titulo', label: t('titulo') },
                { key: 'editora', label: t('perfil.editora_veiculo') },
                { key: 'ano', label: t('ano') },
                { key: 'link', label: t('perfil.link_opcional') },
              ]} />
            </div>
          </section>
        </div>
      )}

      {/* Fixed Save Button */}
      <div className="fixed bottom-0 md:left-[220px] left-0 right-0 bg-white/80 backdrop-blur-md border-t border-gray-100 p-4 flex justify-end z-20">
        <button onClick={handleSave}
          className="flex items-center justify-center w-full md:w-auto gap-2 px-8 py-3 bg-accent text-white font-bold rounded-xl hover:bg-accent/90 transition-all shadow-lg">
          {saving ? <><Loader2 size={18} className="animate-spin" /> {t('perfil.salvando')}...</> : t('perfil.salvar_perfil')}
        </button>
      </div>
    </div>
  );
}
