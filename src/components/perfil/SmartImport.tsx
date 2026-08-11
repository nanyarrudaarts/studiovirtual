import { useState, useRef } from 'react';
import { FileText, FileUp, Globe, Loader2 } from 'lucide-react';
import { callAI, readURLWithJina } from '../../services/ai';
import { DiffPreview } from './DiffPreview';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

type ImportedData = Record<string, unknown>;

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

const SECTION_LABELS: Record<string, string> = {
  all: 'Geral (Auto-detectar tudo)',
  identidade: 'Identidade (Nome, Nacionalidade, Cidade, Website)',
  biografia: 'Biografia (Bio Curta, Bio Longa)',
  formacao: 'Formação e Trajetória',
  premios: 'Prêmios e Distinções',
  residencias: 'Residências Artísticas',
  exposIndividuais: 'Exposições Individuais',
  exposColetivas: 'Exposições Coletivas',
  publicacoes: 'Publicações',
};

function getSectionSchema(section: string): string {
  switch (section) {
    case 'identidade':
      return `{"nome":"string","nomeArtistico":"string","nacionalidade":"string","cidade":"string","email":"string","website":"string"}`;
    case 'biografia':
      return `{"bioShort":"string (máx 120 palavras)","bioLong":"string (3-4 parágrafos)"}`;
    case 'formacao':
      return `{"formacao":[{"curso":"string","instituicao":"string","anoInicio":"string","anoFim":"string"}]}`;
    case 'premios':
      return `{"premios":[{"nome":"string","instituicao":"string","ano":"string"}]}`;
    case 'residencias':
      return `{"residencias":[{"nome":"string","local":"string","ano":"string"}]}`;
    case 'exposIndividuais':
      return `{"exposIndividuais":[{"titulo":"string","local":"string","cidade":"string","pais":"string","ano":"string","curador":"string"}]}`;
    case 'exposColetivas':
      return `{"exposColetivas":[{"titulo":"string","local":"string","cidade":"string","pais":"string","ano":"string","curador":"string"}]}`;
    case 'publicacoes':
      return `{"publicacoes":[{"tipo":"Livro|Jornal|Website|Revista|Catálogo|Exposição|Outro","titulo":"string","tituloLivro":"string","autor":"string","editora":"string","ano":"string","isbn":"string","contribuicao":"Ilustração|Texto|Fotografia|Capa|Prefácio|Outro","localContribuicao":"string","link":"string"}]}`;
    default:
      return '{}';
  }
}

function extractJson(text: string) {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try { return JSON.parse(match[0]); } catch { return null; }
}

async function extractTextFromPDF(base64Data: string) {
  const binaryString = window.atob(base64Data);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
  const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
  let fullText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    fullText += textContent.items.map((item: unknown) => (item as { str: string }).str).join(' ') + '\n';
  }
  return fullText;
}

interface Props {
  currentData: Record<string, unknown>;
  onImport: (data: ImportedData) => void;
  t: (k: string) => string;
}

export function SmartImport({ currentData, onImport, t }: Props) {
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
    return `Você é um curador de arte especialista. Analise o texto e extraia informações com foco na seção: "${SECTION_LABELS[targetSection]}".\nRetorne APENAS um JSON válido com este schema:\n\n${getSectionSchema(targetSection)}\n\nCONTEÚDO DO TEXTO:\n${inputText.substring(0, 50000)}`;
  };

  const importFromText = async () => {
    if (!textInput.trim() || textInput.trim().length < 5) { setError('O texto inserido é muito curto ou inválido.'); return; }
    setError(''); setLoading(true); setImportedData(null);
    try {
      setLoadingStep(`Extraindo dados de ${SECTION_LABELS[targetSection]} com IA...`);
      const data = extractJson(await callAI(getPrompt(textInput)));
      if (data) setImportedData(data);
      else setError('A IA não conseguiu encontrar os dados ou gerou um formato inválido.');
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Erro de comunicação com IA'); }
    setLoading(false); setLoadingStep('');
  };

  const importFromPdf = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(''); setLoading(true); setImportedData(null);
    try {
      setLoadingStep('Extraindo texto do PDF localmente...');
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      setLoadingStep(`Analisando currículo com IA (Foco: ${SECTION_LABELS[targetSection]})...`);
      const data = extractJson(await callAI(getPrompt(await extractTextFromPDF(base64))));
      if (data) setImportedData(data);
      else setError('A IA não conseguiu estruturar as informações do PDF.');
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Erro ao processar PDF'); }
    setLoading(false); setLoadingStep('');
  };

  const importFromUrl = async () => {
    if (!urlInput.trim()) { setError('Insira uma URL válida.'); return; }
    setError(''); setLoading(true); setImportedData(null);
    try {
      setLoadingStep('Extraindo conteúdo da página via Jina Reader...');
      const webText = await readURLWithJina(urlInput);
      setLoadingStep(`Analisando dados do site com IA (Foco: ${SECTION_LABELS[targetSection]})...`);
      const data = extractJson(await callAI(getPrompt(webText)));
      if (data) setImportedData(data);
      else setError('A IA não conseguiu estruturar as informações da página.');
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Erro ao importar da URL'); }
    setLoading(false); setLoadingStep('');
  };

  const resetTab = (newTab: 'text' | 'pdf' | 'url') => {
    setTab(newTab);
    setImportedData(null);
    setError('');
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
            {(['text', 'pdf', 'url'] as const).map((t_) => {
              const icons = { text: <FileText size={15}/>, pdf: <FileUp size={15}/>, url: <Globe size={15}/> };
              const labels = { text: 'Colar texto', pdf: 'Enviar PDF', url: 'Importar de URL' };
              return (
                <button
                  key={t_}
                  onClick={() => resetTab(t_)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${tab === t_ ? 'bg-gold text-bg shadow-gold-glow-sm' : 'bg-surface-raised border border-border text-text-muted hover:text-text-main'}`}
                >
                  {icons[t_]} {labels[t_]}
                </button>
              );
            })}
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
            <textarea
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder={targetSection === 'all' ? 'Cole aqui a biografia do seu site, um currículo copiado, perfil do Instagram, etc...' : `Cole aqui as informações correspondentes a: ${SECTION_LABELS[targetSection]}...`}
              className="w-full border border-border rounded-xl px-4 py-3 text-sm focus:border-gold focus:ring-1 focus:ring-gold/30 outline-none bg-bg h-32 resize-none text-text-main"
            />
            <div className="flex justify-end">
              <button
                onClick={importFromText}
                disabled={loading || !textInput.trim()}
                className="px-5 py-2.5 bg-gold text-bg font-bold rounded-xl text-sm hover:bg-gold-light disabled:opacity-60 transition-all whitespace-nowrap shadow-gold-glow-sm"
              >
                {loading ? <div className="flex items-center gap-2"><Loader2 size={16} className="animate-spin" /> Analisando...</div> : 'Analisar com IA'}
              </button>
            </div>
          </div>
        )}

        {/* PDF Panel */}
        {tab === 'pdf' && (
          <div
            className="border border-dashed border-gold-dim rounded-xl p-8 text-center bg-surface hover:bg-gold/5 transition-colors relative cursor-pointer group shadow-gold-glow-sm"
            onClick={() => pdfRef.current?.click()}
          >
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
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://seu-site.com/biografia ou link do portfolio"
                aria-label="URL para importação"
                className="w-full border border-border rounded-xl px-4 py-2 text-sm focus:border-gold focus:ring-1 focus:ring-gold/30 outline-none bg-bg text-text-main"
              />
              <button
                onClick={importFromUrl}
                disabled={loading || !urlInput.trim()}
                className="px-5 py-2 bg-gold text-bg font-bold rounded-xl text-sm hover:bg-gold-light disabled:opacity-60 transition-all whitespace-nowrap shadow-gold-glow-sm"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : 'Importar'}
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
            <DiffPreview
              current={currentData}
              imported={importedData}
              onApply={(data) => { onImport(data); setImportedData(null); setTextInput(''); setUrlInput(''); }}
              t={t}
            />
          </div>
        )}
      </div>
    </section>
  );
}
