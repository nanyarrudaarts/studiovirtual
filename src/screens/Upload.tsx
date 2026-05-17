import { useState, useRef, useEffect } from 'react';
import { ChevronRight, ChevronLeft, Camera, Sparkles, Bot, PenTool, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { saveArtwork, supabase } from '../services/supabase';
import { useLocation, useNavigate } from 'react-router-dom';

function getGroqKey() { return import.meta.env.VITE_GROQ_API_KEY || ''; }

async function callGroqJSON(prompt: string): Promise<string> {
  const key = getGroqKey();
  if (!key) throw new Error('Configure VITE_GROQ_API_KEY no .env.local');
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
    body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages: [{ role: 'user', content: prompt }], response_format: { type: 'json_object' } })
  });
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error('Groq: ' + (e?.error?.message || res.status)); }
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? '';
}

interface PhotoSlot { file: File | null; url: string; label: string; w: number; h: number; }

export default function Upload() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const [step, setStep] = useState<number>(1);
  const [iaMode, setIaMode] = useState(false);
  const [aiInput, setAiInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiPhase, setAiPhase] = useState('');
  const [saving, setSaving] = useState(false);
  const [collections, setCollections] = useState<{id: string, collection_name: string}[]>([]);
  const [seriesList, setSeriesList] = useState<{id: string, series_title: string}[]>([]);

  useEffect(() => {
    (async () => {
      const { data: cols } = await supabase.from('collections').select('id, collection_name');
      if (cols) setCollections(cols);
      const { data: sers } = await supabase.from('series').select('id, series_title');
      if (sers) setSeriesList(sers);
    })();
  }, []);

  const [formData, setFormData] = useState({
    classificacao: 'singular',
    parentCollectionId: '', parentSeriesId: '', isNewHierarchy: false,
    titulo: '', tipoObjeto: 'Pintura', autoria: '',
    ano: new Date().getFullYear().toString(),
    tecnica: '', suporte: '',
    dimensaoW: '', dimensaoH: '', dimensaoD: '', dimensaoUnidade: 'cm',
    inscricoes: '', sentencaResumo: '', narrativaCuratorial: '',
    numeroRegistro: '', formaAquisicao: '', procedencia: '',
    estadoConservacao: 'Excelente', valor: '', seguro: '', localizacao: '',
    numeroEdicao: '', variacaoSerie: '',
    quantidadePrevista: '', estruturaEdicao: '',
    periodoColecao: '', artistasEnvolvidos: '', criterioInclusao: '', instituicaoAssociada: '',
    status: 'Disponível',
  });

  const [photos, setPhotos] = useState<PhotoSlot[]>(Array.from({length:5},()=>({file:null,url:'',label:'',w:0,h:0})));
  const photoRefs = useRef<(HTMLInputElement|null)[]>([]);

  useEffect(() => {
    const p = new URLSearchParams(location.search).get('type');
    if (p === 'singular' || p === 'serie' || p === 'colecao') setFormData(prev => ({ ...prev, classificacao: p }));
  }, [location.search]);

  const handlePhotoSlot = (i: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    const url = URL.createObjectURL(f);
    const img = new Image();
    img.onload = () => { const s = [...photos]; s[i] = {file:f,url,label:'',w:img.width,h:img.height}; setPhotos(s); };
    img.src = url;
  };

  const handleAIProcess = async () => {
    if (!aiInput.trim()) return;
    setAiLoading(true);
    try {
      setAiPhase('Extraindo dados com Groq...');
      const raw = await callGroqJSON(`Curador de arte. Extraia JSON: {"titulo":"","ano":"","tecnica":"","suporte":"","sentencaResumo":"","narrativaCuratorial":"","autoria":"","tipoObjeto":""}\nTexto:\n${aiInput.slice(0,12000)}`);
      const d = JSON.parse((raw.match(/\{[\s\S]*\}/) || ['{}'])[0]);
      setFormData(f => ({ ...f, titulo: d.titulo||f.titulo, ano: d.ano||f.ano, tecnica: d.tecnica||f.tecnica, suporte: d.suporte||f.suporte, narrativaCuratorial: d.narrativaCuratorial||f.narrativaCuratorial, sentencaResumo: d.sentencaResumo||f.sentencaResumo, autoria: d.autoria||f.autoria }));
      setIaMode(false); setAiInput('');
    } catch (e: unknown) { alert('Erro IA: ' + ((e as Error).message)); }
    finally { setAiLoading(false); setAiPhase(''); }
  };

  const handleSave = async () => {
    if (!formData.titulo.trim()) { alert('Preencha o título.'); return; }
    setSaving(true);
    try {
      if (formData.classificacao === 'colecao' && formData.isNewHierarchy) {
        const { error } = await supabase.from('collections').insert({ collection_name: formData.titulo, curatorial_description: formData.narrativaCuratorial, artistic_theme: formData.criterioInclusao, creation_year: parseInt(formData.ano) || null });
        if (error) throw error;
        alert('✅ Coleção salva!'); navigate('/obras'); return;
      }
      if (formData.classificacao === 'serie' && formData.isNewHierarchy) {
        const { error } = await supabase.from('series').insert({ series_title: formData.titulo, curatorial_statement: formData.narrativaCuratorial, print_run_total: parseInt(formData.quantidadePrevista) || null });
        if (error) throw error;
        alert('✅ Série salva!'); navigate('/obras'); return;
      }
      const dimF = [formData.dimensaoW, formData.dimensaoH, formData.dimensaoD].filter(Boolean).join(' × ') + (formData.dimensaoUnidade ? ' ' + formData.dimensaoUnidade : '');
      const imgs = photos.filter(p => p.file).map(p => p.file as File);
      await saveArtwork({
        artwork_title: formData.titulo, artist_name: formData.autoria || undefined,
        collection_reference: formData.classificacao === 'colecao' ? formData.parentCollectionId || undefined : undefined,
        series_reference: formData.classificacao === 'serie' ? formData.parentSeriesId || undefined : undefined,
        creation_year: parseInt(formData.ano) || undefined, medium: formData.tecnica || undefined,
        support: formData.suporte || undefined, dimensions_formatted: dimF || undefined,
        height: parseFloat(formData.dimensaoH) || undefined, width: parseFloat(formData.dimensaoW) || undefined,
        depth: parseFloat(formData.dimensaoD) || undefined, dimensions_unit: formData.dimensaoUnidade,
        sale_status: ({'Disponível':'available','Vendida':'sold','Reservada':'reserved','Coleção Privada':'private_collection','Não à venda':'not_for_sale'} as Record<string,string>)[formData.status] as any ?? 'available',
        price: parseFloat(formData.valor) || undefined, physical_location: formData.localizacao || undefined,
        summary_sentence: formData.sentencaResumo || undefined, curatorial_narrative: formData.narrativaCuratorial || undefined,
        inventory_number: formData.numeroRegistro || undefined, edition_number: formData.numeroEdicao || undefined,
        classification: 'singular',
      }, imgs);
      alert('✅ Obra salva!'); navigate('/obras');
    } catch (err: unknown) { alert('Erro: ' + (err as Error).message); }
    finally { setSaving(false); }
  };

  const handleNext = () => { step === 1 && formData.classificacao === 'singular' ? setStep(3) : setStep(step + 1); };
  const handleBack = () => { step === 3 && formData.classificacao === 'singular' ? setStep(1) : setStep(step - 1); };

  const inp = (label: string, field: string, opts?: {span2?: boolean; rows?: number; font?: string}) => (
    <div className={opts?.span2 ? 'md:col-span-2' : ''}>
      <label className="block text-xs font-bold text-text-muted mb-1">{label}</label>
      {opts?.rows ? (
        <textarea value={(formData as any)[field]} onChange={e => setFormData({...formData, [field]: e.target.value})} rows={opts.rows} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-accent outline-none bg-bg resize-none" />
      ) : (
        <input type="text" value={(formData as any)[field]} onChange={e => setFormData({...formData, [field]: e.target.value})} className={`w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:border-accent outline-none bg-bg ${opts?.font || ''}`} />
      )}
    </div>
  );

  const dimInput = () => (
    <div>
      <label className="block text-xs font-bold text-text-muted mb-1">Dimensões (H × L × P)</label>
      <div className="flex gap-1 items-center">
        <input type="text" placeholder="H" value={formData.dimensaoH} onChange={e=>setFormData({...formData,dimensaoH:e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-accent outline-none bg-bg" />
        <span className="text-gray-400">×</span>
        <input type="text" placeholder="L" value={formData.dimensaoW} onChange={e=>setFormData({...formData,dimensaoW:e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-accent outline-none bg-bg" />
        <span className="text-gray-400">×</span>
        <input type="text" placeholder="P" value={formData.dimensaoD} onChange={e=>setFormData({...formData,dimensaoD:e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-accent outline-none bg-bg" />
        <select value={formData.dimensaoUnidade} onChange={e=>setFormData({...formData,dimensaoUnidade:e.target.value})} className="border border-gray-200 rounded-lg px-2 py-2 text-sm focus:border-accent outline-none bg-bg"><option>cm</option><option>in</option></select>
      </div>
    </div>
  );

  const sec = (num: string, title: string, children: React.ReactNode) => (
    <section>
      <p className="text-xs font-bold tracking-[0.2em] text-accent uppercase mb-4 flex items-center gap-2"><span className="font-serif text-base">{num}</span> {title}</p>
      {children}
    </section>
  );

  return (
    <div className="max-w-[1000px] mx-auto pb-12">
      <div className="mb-8">
        <h1 className="text-3xl font-serif mb-2">{t('upload.title')}</h1>
        <p className="text-text-muted">{t('upload.subtitle')}</p>
      </div>

      <div className="flex gap-4 mb-8">
        {[{ id: 1, label: '1. Imagem & Tipo' }, { id: 2, label: '2. Vinculação' }, { id: 3, label: '3. Ficha Técnica' }].map(s => {
          if (s.id === 2 && formData.classificacao === 'singular') return null;
          const isActive = step === s.id; const isPast = step > s.id;
          return (<div key={s.id} className={`flex-1 h-2 rounded-full relative ${isActive ? 'bg-accent' : isPast ? 'bg-accent/40' : 'bg-gray-200'}`}>
            <span className={`absolute -top-6 text-xs font-bold whitespace-nowrap ${isActive ? 'text-accent' : 'text-gray-400'}`}>{s.label}</span>
          </div>);
        })}
      </div>

      <div className="bg-surface rounded-2xl shadow-float border border-gray-100 p-8 min-h-[500px]">

        {/* STEP 1: Imagem + Classificação */}
        {step === 1 && (
          <div className="space-y-10 animate-in fade-in slide-in-from-right-4 duration-500">
            <section>
              <h2 className="text-2xl font-serif mb-6">Imagem Principal</h2>
              <div className="space-y-3">
                <div className="relative border-2 border-dashed border-accent/40 rounded-2xl overflow-hidden aspect-video flex items-center justify-center bg-bg hover:bg-accent/5 transition-colors cursor-pointer group" onClick={()=>photoRefs.current[0]?.click()}>
                  <input ref={el=>{photoRefs.current[0]=el}} type="file" accept="image/*" className="hidden" onChange={e=>handlePhotoSlot(0,e)} />
                  {photos[0].url ? (
                    <div className="relative w-full h-full">
                      <img src={photos[0].url} alt="Foto principal" className="w-full h-full object-contain" />
                      <span className="absolute top-2 left-2 bg-accent text-white text-xs font-bold px-2 py-1 rounded">CAPA</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-text-muted group-hover:text-accent transition-colors">
                      <Camera size={40}/><span className="text-sm font-medium">Foto principal — clique para selecionar</span>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-4 gap-3">
                  {[1,2,3,4].map(i=>(
                    <div key={i} className="relative border border-dashed border-gray-300 rounded-xl overflow-hidden bg-bg hover:bg-accent/5 transition-colors cursor-pointer group aspect-[3/4] flex items-center justify-center" onClick={()=>photoRefs.current[i]?.click()}>
                      <input ref={el=>{photoRefs.current[i]=el}} type="file" accept="image/*" className="hidden" onChange={e=>handlePhotoSlot(i,e)} />
                      {photos[i].url ? <img src={photos[i].url} alt={`Foto ${i+1}`} className="w-full h-full object-cover" /> : <Camera size={20} className="text-gray-300 group-hover:text-accent transition-colors"/>}
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-serif mb-6">O que você deseja registrar?</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { id: 'singular', label: 'Obra Singular', desc: 'Obra única — abre ficha técnica completa' },
                  { id: 'serie', label: 'Série', desc: 'Criar ou adicionar obra a uma série' },
                  { id: 'colecao', label: 'Coleção', desc: 'Criar ou adicionar obra a uma coleção' }
                ].map(tipo => (
                  <button key={tipo.id} onClick={() => setFormData({...formData, classificacao: tipo.id})}
                    className={`p-6 rounded-2xl border-2 text-left transition-all flex flex-col gap-2 ${formData.classificacao === tipo.id ? 'border-accent bg-accent/5 text-accent' : 'border-gray-100 bg-surface text-text-main hover:border-accent/30'}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${formData.classificacao === tipo.id ? 'border-accent' : 'border-gray-300'}`}>
                        {formData.classificacao === tipo.id && <div className="w-2 h-2 bg-accent rounded-full" />}
                      </div>
                      <span className="font-serif text-lg">{tipo.label}</span>
                    </div>
                    <p className={`text-sm ml-7 ${formData.classificacao === tipo.id ? 'text-accent/80' : 'text-text-muted'}`}>{tipo.desc}</p>
                  </button>
                ))}
              </div>
            </section>
          </div>
        )}

        {/* STEP 2: Vinculação — Serie ou Colecao */}
        {step === 2 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
            <h2 className="text-2xl font-serif mb-6">{formData.classificacao === 'serie' ? 'Contexto da Série' : 'Contexto da Coleção'}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button onClick={() => setFormData({...formData, isNewHierarchy: false})}
                className={`p-6 rounded-2xl border-2 text-left transition-all ${!formData.isNewHierarchy ? 'border-accent bg-accent/5' : 'border-gray-100 hover:border-accent/30'}`}>
                <h3 className="font-bold mb-2">Escolher Existente</h3>
                <p className="text-sm text-text-muted">Adicionar obra a um(a) {formData.classificacao === 'serie' ? 'série' : 'coleção'} já cadastrado(a).</p>
              </button>
              <button onClick={() => setFormData({...formData, isNewHierarchy: true})}
                className={`p-6 rounded-2xl border-2 text-left transition-all ${formData.isNewHierarchy ? 'border-accent bg-accent/5' : 'border-gray-100 hover:border-accent/30'}`}>
                <div className="flex items-center gap-2 mb-2"><Plus size={18} className="text-accent"/><h3 className="font-bold">Criar Nova {formData.classificacao === 'serie' ? 'Série' : 'Coleção'}</h3></div>
                <p className="text-sm text-text-muted">Preencher ficha curatorial do agrupamento.</p>
              </button>
            </div>

            {!formData.isNewHierarchy && (
              <div className="mt-6 bg-gray-50 p-6 rounded-xl border border-gray-100">
                <label className="block text-sm font-bold text-text-main mb-2">Selecione</label>
                {formData.classificacao === 'serie' ? (
                  <select value={formData.parentSeriesId} onChange={e => setFormData({...formData, parentSeriesId: e.target.value})} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-accent outline-none bg-white">
                    <option value="">Selecione uma série...</option>
                    {seriesList.map(s => <option key={s.id} value={s.id}>{s.series_title}</option>)}
                  </select>
                ) : (
                  <select value={formData.parentCollectionId} onChange={e => setFormData({...formData, parentCollectionId: e.target.value})} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-accent outline-none bg-white">
                    <option value="">Selecione uma coleção...</option>
                    {collections.map(c => <option key={c.id} value={c.id}>{c.collection_name}</option>)}
                  </select>
                )}
              </div>
            )}
          </div>
        )}

        {/* STEP 3: Ficha Técnica */}
        {step === 3 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <h2 className="text-2xl font-serif">Ficha Técnica</h2>
              <div className="flex bg-gray-100 p-1 rounded-xl">
                <button onClick={() => setIaMode(false)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${!iaMode ? 'bg-white text-accent shadow-sm' : 'text-gray-500'}`}><PenTool size={16}/> Manual</button>
                <button onClick={() => setIaMode(true)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${iaMode ? 'bg-white text-accent shadow-sm' : 'text-gray-500'}`}><Bot size={16}/> IA</button>
              </div>
            </div>

            {iaMode ? (
              <div className="bg-accent/5 border border-accent/20 rounded-2xl p-6">
                <h3 className="font-serif text-accent flex items-center gap-2 mb-2"><Sparkles size={18}/> Preenchimento com IA</h3>
                <p className="text-sm text-text-muted mb-4">Cole informações livres e a IA preencherá a ficha para revisão.</p>
                <textarea value={aiInput} onChange={e => setAiInput(e.target.value)} placeholder="Cole o texto descritivo aqui..." className="w-full h-40 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-accent outline-none bg-bg resize-none mb-4" />
                <div className="flex justify-end">
                  <button onClick={handleAIProcess} disabled={aiLoading || !aiInput.trim()} className="bg-accent text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-accent/90 disabled:opacity-50 transition-colors flex items-center gap-2 shadow-float hover-float">
                    {aiLoading ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/> : <Sparkles size={16}/>}
                    {aiLoading ? aiPhase || 'Processando...' : 'Analisar e Preencher'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="animate-in fade-in">
                {/* OBRA SINGULAR — Ficha Completa */}
                {formData.classificacao === 'singular' && (
                  <div className="space-y-8">
                    {sec('I', 'Dados de Identificação', <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{inp('Tipo de Objeto','tipoObjeto')}{inp('Título *','titulo',{font:'font-serif text-lg'})}{inp('Autoria','autoria')}{inp('Data / Período','ano')}</div>)}
                    {sec('II', 'Detalhes Físicos', <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{inp('Técnica','tecnica')}{inp('Suporte','suporte')}{dimInput()}{inp('Inscrições e Marcas','inscricoes')}</div>)}
                    {sec('III', 'Curadoria', <div className="space-y-4">{inp('Descrição Curta','sentencaResumo',{span2:true})}{inp('Dossiê / Texto Curatorial','narrativaCuratorial',{span2:true, rows:4})}</div>)}
                    {sec('IV', 'Dados de Acervo', <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{inp('Nº Registro (Tombo)','numeroRegistro')}{inp('Forma de Aquisição','formaAquisicao')}{inp('Procedência e Histórico','procedencia',{span2:true, rows:2})}{inp('Estado de Conservação','estadoConservacao')}{inp('Localização Física','localizacao')}{inp('Valor','valor')}{inp('Valor do Seguro','seguro')}</div>)}
                  </div>
                )}

                {/* SÉRIE — Nova Série */}
                {formData.classificacao === 'serie' && formData.isNewHierarchy && (
                  <div className="space-y-8">
                    {sec('I', 'Ficha de Série', <div className="grid grid-cols-1 gap-4">{inp('Nome da Série *','titulo',{font:'font-serif text-lg'})}{inp('Conceito / Lógica da Série','narrativaCuratorial',{rows:4})}<div className="grid grid-cols-2 gap-4">{inp('Nº Total de Obras Previsto','quantidadePrevista')}{inp('Estrutura de Edição','estruturaEdicao')}</div></div>)}
                  </div>
                )}

                {/* SÉRIE — Obra dentro de série existente */}
                {formData.classificacao === 'serie' && !formData.isNewHierarchy && (
                  <div className="space-y-8">
                    <div className="bg-accent/5 border border-accent/20 rounded-xl p-4 mb-2"><p className="text-sm font-medium text-accent">Obra vinculada a uma Série existente. Campos herdados automaticamente.</p></div>
                    {sec('I', 'Dados da Obra', <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{inp('Título da Obra *','titulo',{span2:true, font:'font-serif text-lg'})}{inp('Nº de Edição (ex: 1/10)','numeroEdicao')}{inp('Variação dentro da Série','variacaoSerie')}{inp('Técnica','tecnica')}{dimInput()}</div>)}
                    {sec('II', 'Detalhes', <div className="space-y-4">{inp('Descrição da Variação','narrativaCuratorial',{rows:3})}</div>)}
                  </div>
                )}

                {/* COLEÇÃO — Nova Coleção */}
                {formData.classificacao === 'colecao' && formData.isNewHierarchy && (
                  <div className="space-y-8">
                    {sec('I', 'Ficha Curatorial da Coleção', <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{inp('Nome da Coleção *','titulo',{span2:true, font:'font-serif text-lg'})}{inp('Tema Curatorial','narrativaCuratorial',{span2:true, rows:3})}{inp('Período da Coleção','ano')}{inp('Artistas Envolvidos','artistasEnvolvidos')}{inp('Critério de Inclusão','criterioInclusao',{span2:true})}{inp('Instituição / Galeria','instituicaoAssociada',{span2:true})}</div>)}
                  </div>
                )}

                {/* COLEÇÃO — Obra dentro de coleção existente */}
                {formData.classificacao === 'colecao' && !formData.isNewHierarchy && (
                  <div className="space-y-8">
                    <div className="bg-accent/5 border border-accent/20 rounded-xl p-4 mb-2"><p className="text-sm font-medium text-accent">Obra vinculada a uma Coleção existente.</p></div>
                    {sec('I', 'Dados da Obra', <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{inp('Título da Obra *','titulo',{span2:true, font:'font-serif text-lg'})}{inp('Técnica','tecnica')}{inp('Suporte','suporte')}{dimInput()}{inp('Autoria','autoria')}</div>)}
                    {sec('II', 'Curadoria', <div className="space-y-4">{inp('Descrição','narrativaCuratorial',{rows:3})}</div>)}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

      </div>

      {/* Footer */}
      <div className="fixed md:static bottom-0 left-0 right-0 p-4 md:p-0 bg-surface md:bg-transparent border-t border-gray-100 md:border-t-0 shadow-[0_-4px_12px_rgba(0,0,0,0.05)] md:shadow-none z-50 flex justify-between items-center md:mt-6 mt-0">
        <button onClick={handleBack} disabled={step === 1} className={`flex items-center gap-2 px-4 md:px-6 py-3 rounded-xl font-medium transition-colors ${step === 1 ? 'opacity-0 pointer-events-none' : 'bg-surface border border-gray-200 hover:bg-gray-50'}`}>
          <ChevronLeft size={20} /> Voltar
        </button>
        {step < 3 ? (
          <button onClick={handleNext} className="flex items-center gap-2 px-8 py-3 rounded-xl font-bold bg-accent text-white hover:bg-accent/90 hover-float transition-all shadow-float">
            Avançar <ChevronRight size={20} />
          </button>
        ) : (
          <button onClick={handleSave} disabled={saving || iaMode} className="flex items-center gap-2 px-8 py-3 rounded-xl font-bold bg-accent text-white hover:bg-accent/90 hover-float transition-all shadow-float disabled:opacity-50">
            {saving ? 'Salvando...' : 'Salvar Registro'}
          </button>
        )}
      </div>
    </div>
  );
}
