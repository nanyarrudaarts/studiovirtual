import { useState, useEffect, useRef } from 'react';
import { Plus, X, Sparkles, Loader2, Camera, Link2, FileUp, Check } from 'lucide-react';
import { supabase } from '../services/supabase';
import { useTranslation } from 'react-i18next';

function getGeminiKey() {
  const apiKey = localStorage.getItem('gemini_api_key') || import.meta.env.VITE_GEMINI_API_KEY || '';
  console.log('API Key length:', apiKey?.length);
  console.log('Provider:', 'gemini');
  return apiKey;
}

async function callGemini(key: string, contents: object[], tools?: object[]) {
  const body: any = { contents };
  if (tools) body.tools = tools;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
  );
  if (!res.ok) throw new Error('Gemini error');
  const json = await res.json();
  return json.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

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
  "bioShort": "string (máx 120 palavras)",
  "bioLong": "string (3-4 parágrafos)",
  "website": "string",
  "instagrams": ["string"],
  "formacao": [{"curso":"","instituicao":"","anoInicio":"","anoFim":""}],
  "exposIndividuais": [{"titulo":"","local":"","cidade":"","pais":"","ano":""}],
  "exposColetivas": [{"titulo":"","local":"","cidade":"","pais":"","ano":""}],
  "premios": [{"nome":"","instituicao":"","ano":""}],
  "residencias": [{"nome":"","local":"","ano":""}],
  "publicacoes": [{"titulo":"","editora":"","ano":"","link":""}]
}`;

type ImportedData = Record<string, unknown>;

/* ---- Diff Preview ---- */
function DiffPreview({ current, imported, onApply, t }: {
  current: Record<string, unknown>;
  imported: ImportedData;
  onApply: (selected: ImportedData) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: (k: any) => string;
}) {
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  const keys = Object.keys(imported).filter(k => imported[k] !== undefined && imported[k] !== null && imported[k] !== '');

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

/* ---- Smart Import ---- */
function SmartImport({ currentData, onImport, t }: {
  currentData: Record<string, unknown>;
  onImport: (data: ImportedData) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: (k: any) => string;
}) {
  const [tab, setTab] = useState<'url' | 'pdf'>('url');
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [importedData, setImportedData] = useState<ImportedData | null>(null);
  const [error, setError] = useState('');
  const pdfRef = useRef<HTMLInputElement>(null);

  const importFromUrl = async () => {
    const key = getGeminiKey();
    if (!key || key.length < 10) { setError(t('perfil.configure_gemini')); return; }
    if (!url || !url.startsWith('http')) { setError('Informe uma URL válida (http/https).'); return; }
    setError(''); setLoading(true); setImportedData(null);

    try {
      setLoadingStep('Acessando a página via IA (Gemini)...');
      
      const prompt = `Acesse e leia o conteúdo completo desta URL: ${url}
      
Após ler a página, extraia todas as informações do artista e retorne 
APENAS JSON válido em português brasileiro com este schema exato:
${PROFILE_JSON_SCHEMA}`;

      let text = '';
      let usedMethod = 'Gemini Search';
      try {
        text = await callGemini(key, [{ parts: [{ text: prompt }] }], [{ googleSearch: {} }]);
        const testData = extractJson(text);
        if (!testData || Object.keys(testData).length === 0) throw new Error("JSON vazio retornado pelo Gemini");
      } catch (geminiErr) {
        console.log("Gemini native search failed, falling back to Jina AI", geminiErr);
        setLoadingStep('Acessando via Jina AI...');
        usedMethod = 'Jina AI';
        
        const jinaResponse = await fetch(`https://r.jina.ai/${url}`);
        if (!jinaResponse.ok) throw new Error('Não foi possível ler a URL nem pelo Gemini nem pelo Jina AI.');
        const pageText = await jinaResponse.text();
        
        const fallbackPrompt = `Analise o texto abaixo, que foi extraído do site ${url}.
Extraia todas as informações do artista e retorne APENAS JSON válido em português brasileiro com este schema exato:
${PROFILE_JSON_SCHEMA}

CONTEÚDO DA PÁGINA:
${pageText.substring(0, 50000)}
`;
        text = await callGemini(key, [{ parts: [{ text: fallbackPrompt }] }]);
      }

      setLoadingStep(t('perfil.preenchendo_perfil'));
      await new Promise(r => setTimeout(r, 400));
      const data = extractJson(text);
      if (data) {
        setImportedData(data);
        alert(`Página lida via ${usedMethod}`);
      } else {
        setError('A IA não conseguiu encontrar os dados ou gerou um formato inválido.');
      }
    } catch (e: unknown) {
      console.error('Gemini/Fetch error:', e);
      setError((e as Error).message || t('perfil.erro_gemini'));
    }
    setLoading(false); setLoadingStep('');
  };

  const importFromPdf = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const key = getGeminiKey();
    if (!key || key.length < 10) { setError(t('perfil.configure_gemini')); return; }
    setError(''); setLoading(true); setImportedData(null);

    setLoadingStep(t('lendo_curriculo'));
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      const base64 = (reader.result as string).split(',')[1];
      setLoadingStep(t('perfil.identificando_informacoes'));
      try {
        const text = await callGemini(key, [{
          parts: [
            { inline_data: { mime_type: 'application/pdf', data: base64 } },
            { text: `Leia este currículo de artista e extraia todas as informações. Retorne APENAS JSON válido em português brasileiro:\n${PROFILE_JSON_SCHEMA}` }
          ]
        }]);
        setLoadingStep(t('perfil.preenchendo_perfil'));
        await new Promise(r => setTimeout(r, 400));
        const data = extractJson(text);
        if (data) setImportedData(data);
        else setError(t('perfil.erro_pdf'));
      } catch { setError(t('erro_processar_pdf')); }
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
        {/* Tabs */}
        <div className="flex gap-2">
          {(['url', 'pdf'] as const).map(type => (
            <button key={type} onClick={() => { setTab(type); setImportedData(null); setError(''); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-colors ${tab === type ? 'bg-accent text-white' : 'bg-gray-100 text-text-muted hover:text-text-main'}`}>
              {type === 'url' ? <><Link2 size={15}/> {t('perfil.importar_link')}</> : <><FileUp size={15}/> {t('perfil.importar_pdf')}</>}
            </button>
          ))}
        </div>

        {/* URL Panel */}
        {tab === 'url' && (
          <div className="space-y-3">
            <div className="flex gap-3">
              <input type="url" value={url} onChange={e => setUrl(e.target.value)}
                placeholder="https://nanyarruda.com/artista"
                onKeyDown={e => e.key === 'Enter' && importFromUrl()}
                className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:border-accent outline-none bg-bg" />
              <button onClick={importFromUrl} disabled={loading}
                className="px-5 py-2.5 bg-accent text-white font-bold rounded-xl text-sm hover:bg-accent/90 disabled:opacity-60 transition-colors whitespace-nowrap">
                {loading ? <Loader2 size={16} className="animate-spin" /> : t('perfil.importar_link')}
              </button>
            </div>
          </div>
        )}

        {/* PDF Panel */}
        {tab === 'pdf' && (
          <div>
            <input ref={pdfRef} type="file" accept=".pdf" aria-label="Selecionar PDF do currículo" className="hidden" onChange={importFromPdf} />
            <button onClick={() => pdfRef.current?.click()} disabled={loading}
              className="w-full border-2 border-dashed border-accent/30 rounded-2xl py-10 flex flex-col items-center gap-2 hover:bg-accent/5 transition-colors disabled:opacity-60">
              <FileUp size={36} className="text-accent" />
              <span className="font-bold text-sm">{t('arraste_curriculo')}</span>
              <span className="text-xs text-text-muted">{t('pdf_max')}</span>
            </button>
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
            <DiffPreview current={currentData} imported={importedData} onApply={data => { onImport(data); setImportedData(null); }} t={t} />
          </div>
        )}
      </div>
    </section>
  );
}




interface ListItem {
  id: string;
  [key: string]: string;
}

const uid = () => Math.random().toString(36).slice(2);

function AddList({ title, fields, items, onChange, t }: {
  title: string;
  fields: { key: string; label: string; type?: string }[];
  items: ListItem[];
  onChange: (items: ListItem[]) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: (k: any) => string;
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
              <div key={f.key} className={f.key === fields[0].key ? 'col-span-2' : ''}>
                <label htmlFor={`${item.id}-${f.key}`} className="block text-xs text-text-muted mb-1">{f.label}</label>
                <input
                  id={`${item.id}-${f.key}`}
                  aria-label={f.label}
                  type={f.type || 'text'}
                  value={item[f.key] || ''}
                  onChange={e => update(item.id, f.key, e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:border-accent outline-none bg-white"
                />
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

  const [form, setForm] = useState({
    nome: 'Nany Arruda',
    nomeArtistico: 'Nany Arruda',
    nacionalidade: 'Brasil',
    cidade: '',
    nascimento: '',
    website: 'nanyarruda.com',
    bioShort: '',
    bioLong: '',
    tags: '',
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
    supabase.from('artista').select('*').single().then(({ data }) => {
      if (data) {
        setForm(f => ({ ...f, ...data }));
        if (data.foto_url) setPhotoUrl(data.foto_url);
        if (data.instagrams) setInstagrams(data.instagrams);
        if (data.social_links) setSocialLinks(data.social_links);
        if (data.formacao) setFormacao(data.formacao);
        if (data.premios) setPremios(data.premios);
        if (data.residencias) setResidencias(data.residencias);
        if (data.expos_individuais) setExposIndividuais(data.expos_individuais);
        if (data.expos_coletivas) setExposColetivas(data.expos_coletivas);
        if (data.publicacoes) setPublicacoes(data.publicacoes);
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
    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from('perfil').getPublicUrl(path);
      setPhotoUrl(publicUrl);
    }
    setUploading(false);
  };

  const handleGenerateBio = async () => {
    setGeneratingBio(true);
    const key = getGeminiKey();
    if (!key || key.length < 10) {
      alert(t('perfil.configure_gemini'));
      setGeneratingBio(false);
      return;
    }
    try {
      const prompt = `Você é um curador de arte. Gere duas bios para a artista ${form.nome}, de ${form.nacionalidade}, cidade ${form.cidade}. Bio curta (até 120 palavras) e bio longa (3 parágrafos). Retorne JSON: {"short":"...", "long":"..."}`;
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      });
      const json = await res.json();
      const text = json.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        const data = JSON.parse(match[0]);
        setForm(f => ({ ...f, bioShort: data.short || f.bioShort, bioLong: data.long || f.bioLong }));
      }
    } catch { /* silently fail */ }
    setGeneratingBio(false);
  };

  const handleSave = async () => {
    setSaving(true);
    await supabase.from('artista').upsert({
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
    });
    setSaving(false);
  };

  const set = (key: keyof typeof form, value: string) =>
    setForm(f => ({ ...f, [key]: value }));

  const wordCount = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;

  const handleImport = (data: ImportedData) => {
    const strKeys = ['nome', 'nomeArtistico', 'nacionalidade', 'cidade', 'bioShort', 'bioLong', 'website'] as const;
    strKeys.forEach(k => { if (data[k]) setForm(f => ({ ...f, [k]: String(data[k]) })); });
    if (Array.isArray(data.instagrams)) setInstagrams(data.instagrams as string[]);
    const toList = (arr: unknown[]) => arr.map(i => ({ id: uid(), ...(i as object) }));
    if (Array.isArray(data.formacao)) setFormacao(toList(data.formacao));
    if (Array.isArray(data.premios)) setPremios(toList(data.premios));
    if (Array.isArray(data.residencias)) setResidencias(toList(data.residencias));
    if (Array.isArray(data.exposIndividuais)) setExposIndividuais(toList(data.exposIndividuais));
    if (Array.isArray(data.exposColetivas)) setExposColetivas(toList(data.exposColetivas));
    if (Array.isArray(data.publicacoes)) setPublicacoes(toList(data.publicacoes));
  };

  const currentFormAsRecord: Record<string, unknown> = { ...form, instagrams, formacao, premios, residencias, exposIndividuais, exposColetivas, publicacoes };

  return (
    <div className="max-w-[900px] mx-auto pb-28 space-y-8">
      <div>
        <h1 className="text-3xl font-serif mb-1">{t('perfil.title')}</h1>
        <p className="text-text-muted">{t('perfil.subtitle')}</p>
      </div>

      <SmartImport currentData={currentFormAsRecord} onImport={handleImport} t={t} />

      {/* Identity + Digital Presence */}
      <section className="bg-white rounded-2xl shadow-float border border-gray-100 overflow-hidden">
        <div className="px-7 py-5 border-b border-gray-100">
          <h2 className="text-lg font-serif">{t('perfil.identidade')}</h2>
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
                    className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:border-accent outline-none bg-bg" />
                </div>
                <div>
                  <label htmlFor="perfil-nomeArtistico" className="block text-sm font-bold text-text-muted mb-1">{t('perfil.nome_artistico')}</label>
                  <input id="perfil-nomeArtistico" aria-label={t('perfil.nome_artistico')} value={form.nomeArtistico} onChange={e => set('nomeArtistico', e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:border-accent outline-none bg-bg" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="perfil-nacionalidade" className="block text-sm font-bold text-text-muted mb-1">{t('perfil.nacionalidade')}</label>
                    <input id="perfil-nacionalidade" aria-label={t('perfil.nacionalidade')} value={form.nacionalidade} onChange={e => set('nacionalidade', e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:border-accent outline-none bg-bg" />
                  </div>
                  <div>
                    <label htmlFor="perfil-cidade" className="block text-sm font-bold text-text-muted mb-1">{t('perfil.cidade_estado')}</label>
                    <input id="perfil-cidade" aria-label={t('perfil.cidade_estado')} value={form.cidade} onChange={e => set('cidade', e.target.value)}
                      placeholder="Rio de Janeiro, RJ"
                      className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:border-accent outline-none bg-bg" />
                  </div>
                </div>
                <div>
                  <label htmlFor="perfil-nascimento" className="block text-sm font-bold text-text-muted mb-1">{t('perfil.nascimento')}</label>
                  <input id="perfil-nascimento" aria-label={t('perfil.nascimento')} type="date" value={form.nascimento} onChange={e => set('nascimento', e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:border-accent outline-none bg-bg" />
                </div>
              </div>
            </div>

            {/* Right — Digital Presence */}
            <div className="md:w-1/2 space-y-4">
              <div>
                <label htmlFor="perfil-website" className="block text-sm font-bold text-text-muted mb-1">{t('perfil.website')}</label>
                <input id="perfil-website" aria-label={t('perfil.website')} value={form.website} onChange={e => set('website', e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:border-accent outline-none bg-bg" />
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
                      }} className="flex-1 border border-gray-200 rounded-lg px-4 py-2 text-sm focus:border-accent outline-none bg-bg" />
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
                        className="w-28 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-accent outline-none bg-bg" />
                      <input aria-label="URL do link" placeholder="https://..." value={link.url}
                        onChange={e => setSocialLinks(s => s.map(l => l.id === link.id ? {...l, url: e.target.value} : l))}
                        className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-accent outline-none bg-bg" />
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
