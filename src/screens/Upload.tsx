import { useState, useRef, useEffect } from 'react';
import { ChevronRight, ChevronLeft, Camera, Sparkles, Bot, PenTool } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { saveArtwork, supabase } from '../services/supabase';
import { useLocation, useNavigate } from 'react-router-dom';

function getGroqKey() {
  return import.meta.env.VITE_GROQ_API_KEY || '';
}

async function callGroqJSON(prompt: string): Promise<string> {
  const key = getGroqKey();
  if (!key) throw new Error('Configure VITE_GROQ_API_KEY no .env.local');
  
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' }
    })
  });
  
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error('Groq: ' + (e?.error?.message || res.status));
  }
  
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? '';
}

async function readURLWithJina(url: string): Promise<string> {
  const res = await fetch(`https://r.jina.ai/${encodeURIComponent(url)}`, {
    headers: { 'Accept': 'text/markdown', 'X-Return-Format': 'markdown' }
  });
  if (!res.ok) throw new Error(`Não foi possível acessar a página (HTTP ${res.status}).`);
  return res.text();
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
    async function fetchHierarchies() {
      const { data: cols } = await supabase.from('collections').select('id, collection_name');
      if (cols) setCollections(cols);
      const { data: sers } = await supabase.from('series').select('id, series_title');
      if (sers) setSeriesList(sers);
    }
    fetchHierarchies();
  }, []);

  const [formData, setFormData] = useState({
    classificacao: 'singular', 
    parentCollectionId: '',
    parentSeriesId: '',

    titulo: '',
    tituloInterpretativo: '',
    ano: new Date().getFullYear().toString(),
    descricao: '',
    tecnica: '',
    suporte: '',
    tecnicaFree: '',
    dimensaoW: '',
    dimensaoH: '',
    dimensaoD: '',
    dimensaoUnidade: 'cm',
    status: 'Disponível',
    valor: '',
    materiais: [] as string[],
    localizacao: '',
    proveniencia: [] as {dono: string; ano: string}[],
    creditoColecao: '',
    sentencaResumo: '',
    narrativaCuratorial: '',
    notaIntencao: '',
    sustentavel: false,
    blockchain: false,
    tags: '',
  });

  const [photos, setPhotos] = useState<PhotoSlot[]>(Array.from({length:5},()=>({file:null,url:'',label:'',w:0,h:0})));
  const photoRefs = useRef<(HTMLInputElement|null)[]>([]);

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const typeQuery = searchParams.get('type');
    if (typeQuery === 'singular' || typeQuery === 'serie' || typeQuery === 'colecao') {
      setFormData(prev => ({ ...prev, classificacao: typeQuery }));
      setStep(typeQuery === 'colecao' ? 3 : 2); // Skip category selection
    }
  }, [location.search]);

  const handlePhotoSlot = (i: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    const url = URL.createObjectURL(f);
    const img = new Image();
    img.onload = () => {
      const s = [...photos]; s[i] = {file:f,url,label:photos[i].label,w:img.width,h:img.height};
      setPhotos(s);
    };
    img.src = url;
  };

  const handleAIProcess = async () => {
    if (!aiInput.trim()) { alert('Insira um texto ou URL para análise.'); return; }
    setAiLoading(true);
    try {
      let textToProcess = aiInput;
      if (aiInput.startsWith('http')) {
        setAiPhase('Acessando URL via Jina AI...');
        textToProcess = await readURLWithJina(aiInput);
      }
      
      setAiPhase('Extraindo dados estruturados com Groq...');
      const prompt = `Você é um curador de arte contemporânea. Analise o texto a seguir e extraia os dados para preencher a ficha técnica de uma ${formData.classificacao}.
Retorne SOMENTE um JSON válido com estas chaves (omita se não houver no texto):
{"titulo":"","tituloInterpretativo":"","ano":"","descricao":"","tecnica":"","suporte":"","dimensoes":"","descricaoCurta":"","narrativaCuratorial":"","tags":[]}

Texto:
${textToProcess.slice(0, 12000)}`;

      const rawText = await callGroqJSON(prompt);
      const jsonStr = (rawText.match(/\{[\s\S]*\}/) || ['{}'])[0];
      const data = JSON.parse(jsonStr);

      setFormData(f => ({
        ...f,
        titulo: data.titulo || f.titulo,
        tituloInterpretativo: data.tituloInterpretativo || f.tituloInterpretativo,
        ano: data.ano || f.ano,
        descricao: data.descricao || f.descricao,
        tecnica: data.tecnica || f.tecnica,
        suporte: data.suporte || f.suporte,
        narrativaCuratorial: data.narrativaCuratorial || data.descricaoCurta || f.narrativaCuratorial,
        sentencaResumo: data.descricaoCurta || f.sentencaResumo,
        tags: Array.isArray(data.tags) ? data.tags.join(', ') : (data.tags || f.tags),
      }));

      // Switch back to manual mode to review
      setIaMode(false);
      setAiInput('');
    } catch (e: unknown) {
      alert('Erro na análise da IA: ' + ((e as Error).message || String(e)));
    } finally {
      setAiLoading(false);
      setAiPhase('');
    }
  };

  const handleGenerateNarrative = async () => {
    setFormData(f => ({ ...f, narrativaCuratorial: 'Gerando…' }));
    try {
      const prompt = `Você é um curador de arte contemporânea. Escreva uma narrativa curatorial em português com 20 a 75 palavras.
Título: ${formData.titulo || 'Sem Título'}
Descricao: ${formData.descricao || 'Sem descrição'}
Ano: ${formData.ano}
Técnica: ${[formData.tecnica, formData.tecnicaFree].filter(Boolean).join(', ')} sobre ${formData.suporte}
Retorne APENAS o texto JSON: {"narrativaCuratorial": "texto"}`;
      const text = await callGroqJSON(prompt);
      const jsonStr = (text.match(/\{[\s\S]*\}/) || ['{}'])[0];
      const d = JSON.parse(jsonStr);
      setFormData(f => ({ ...f, narrativaCuratorial: d.narrativaCuratorial?.trim() || text }));
    } catch (e: unknown) {
      setFormData(f => ({ ...f, narrativaCuratorial: 'Erro: ' + ((e as Error).message || String(e)) }));
    }
  };

  const handleSave = async () => {
    if (!formData.titulo.trim()) { alert('Preencha o título.'); return; }
    setSaving(true);
    try {
      if (formData.classificacao === 'colecao') {
        const { error } = await supabase.from('collections').insert({
          collection_name: formData.titulo,
          curatorial_description: formData.narrativaCuratorial,
          tags: formData.tags ? formData.tags.split(',').map(s => s.trim()) : null,
          creation_year: parseInt(formData.ano) || null
        });
        if (error) throw error;
        alert(`✅ Coleção salva com sucesso!`);
        navigate('/obras');
      } else if (formData.classificacao === 'serie') {
        const { error } = await supabase.from('series').insert({
          series_title: formData.titulo,
          parent_collection_id: formData.parentCollectionId || null,
          curatorial_statement: formData.narrativaCuratorial,
          tags: formData.tags ? formData.tags.split(',').map(s => s.trim()) : null
        });
        if (error) throw error;
        alert(`✅ Série salva com sucesso!`);
        navigate('/obras');
      } else {
        const dimFormatted = [formData.dimensaoW, formData.dimensaoH, formData.dimensaoD]
          .filter(Boolean).join(' × ') + (formData.dimensaoUnidade ? ' ' + formData.dimensaoUnidade : '');
        const imageFiles = photos.filter(p => p.file).map(p => p.file as File);
        
        const saved = await saveArtwork({
          artwork_title: formData.titulo,
          collection_reference: formData.parentCollectionId || undefined,
          series_reference: formData.parentSeriesId || undefined,
          creation_year: parseInt(formData.ano) || undefined,
          medium: formData.tecnica || formData.tecnicaFree || undefined,
          support: formData.suporte || undefined,
          dimensions_formatted: dimFormatted || undefined,
          height: parseFloat(formData.dimensaoH) || undefined,
          width: parseFloat(formData.dimensaoW) || undefined,
          depth: parseFloat(formData.dimensaoD) || undefined,
          dimensions_unit: formData.dimensaoUnidade,
          sale_status: ({'Disponível':'available','Vendida':'sold','Reservada':'reserved','Coleção Privada':'private_collection','Não à venda':'not_for_sale'} as Record<string,string>)[formData.status] as any ?? 'available',
          price: parseFloat(formData.valor) || undefined,
          materials: formData.materiais.length ? formData.materiais : undefined,
          physical_location: formData.localizacao || undefined,
          summary_sentence: formData.sentencaResumo || undefined,
          curatorial_narrative: formData.narrativaCuratorial || undefined,
          intent_note: formData.notaIntencao || undefined,
          sustainable_materials: formData.sustentavel,
          tags: formData.tags ? formData.tags.split(',').map(s => s.trim()).filter(Boolean) : undefined,
          classification: 'singular',
        }, imageFiles);
        alert(`✅ Obra ${saved.accession_number} salva com sucesso!`);
        navigate('/obras');
      }
    } catch (err: unknown) {
      alert('Erro ao salvar: ' + (err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleNext = () => {
    if (step === 1 && formData.classificacao === 'colecao') {
      setStep(3); // Coleção não tem vinculação
    } else {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step === 3 && formData.classificacao === 'colecao') {
      setStep(1);
    } else {
      setStep(step - 1);
    }
  };

  return (
    <div className="max-w-[1000px] mx-auto pb-12">
      <div className="mb-8">
        <h1 className="text-3xl font-serif mb-2">{t('upload.title')}</h1>
        <p className="text-text-muted">{t('upload.subtitle')}</p>
      </div>

      {/* Progress Indicator */}
      <div className="flex gap-4 mb-8">
        {[
          { id: 1, label: '1. Categoria' },
          { id: 2, label: '2. Contexto' },
          { id: 3, label: '3. Ficha Técnica' }
        ].map(s => {
          if (s.id === 2 && formData.classificacao === 'colecao') return null; // hide for colecao
          const isActive = step === s.id;
          const isPast = step > s.id;
          return (
            <div key={s.id} className={`flex-1 h-2 rounded-full relative ${isActive ? 'bg-accent' : isPast ? 'bg-accent/40' : 'bg-gray-200'}`}>
              <span className={`absolute -top-6 text-xs font-bold ${isActive ? 'text-accent' : 'text-gray-400'}`}>
                {s.label}
              </span>
            </div>
          );
        })}
      </div>

      <div className="bg-surface rounded-2xl shadow-float border border-gray-100 p-8 min-h-[500px]">
        
        {/* STEP 1: Categoria */}
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
            <h2 className="text-2xl font-serif mb-6">O que você deseja registrar?</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { id: 'singular', label: 'Obra Singular', desc: 'Uma obra individual, com ou sem série/coleção' },
                { id: 'serie', label: 'Série', desc: 'Um conjunto de obras que compartilham o mesmo tema ou técnica' },
                { id: 'colecao', label: 'Coleção', desc: 'Um grupo maior que pode englobar várias séries e obras' }
              ].map(tipo => (
                <button 
                  key={tipo.id}
                  onClick={() => setFormData({...formData, classificacao: tipo.id})}
                  className={`p-6 rounded-2xl border-2 text-left transition-all flex flex-col gap-2 ${formData.classificacao === tipo.id ? 'border-accent bg-accent/5 text-accent' : 'border-gray-100 bg-surface text-text-main hover:border-accent/30'}`}
                >
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
          </div>
        )}

        {/* STEP 2: Vinculação (Contexto) */}
        {step === 2 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
            <h2 className="text-2xl font-serif mb-6">Contexto da Criação</h2>
            <p className="text-sm text-text-muted mb-4">Vincule a uma coleção ou série existente para manter seu portfólio organizado. (Opcional)</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-sm font-bold text-text-main">Coleção</label>
                <select 
                  value={formData.parentCollectionId} 
                  onChange={e => setFormData({...formData, parentCollectionId: e.target.value})}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-accent outline-none bg-bg"
                >
                  <option value="">Nenhuma coleção / Selecione...</option>
                  {collections.map(c => <option key={c.id} value={c.id}>{c.collection_name}</option>)}
                </select>
                <p className="text-xs text-text-muted">A qual coleção macro esta {formData.classificacao === 'serie' ? 'série' : 'obra'} pertence?</p>
              </div>

              {formData.classificacao === 'singular' && (
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-text-main">Série</label>
                  <select 
                    value={formData.parentSeriesId} 
                    onChange={e => setFormData({...formData, parentSeriesId: e.target.value})}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-accent outline-none bg-bg"
                  >
                    <option value="">Nenhuma série / Selecione...</option>
                    {seriesList.map(s => <option key={s.id} value={s.id}>{s.series_title}</option>)}
                  </select>
                  <p className="text-xs text-text-muted">Faz parte de alguma série específica?</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 3: Ficha Técnica */}
        {step === 3 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
            
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <h2 className="text-2xl font-serif">Ficha Técnica</h2>
              <div className="flex bg-gray-100 p-1 rounded-xl">
                <button onClick={() => setIaMode(false)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${!iaMode ? 'bg-white text-accent shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                  <PenTool size={16}/> Manual
                </button>
                <button onClick={() => setIaMode(true)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${iaMode ? 'bg-white text-accent shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                  <Bot size={16}/> IA (Texto Livre)
                </button>
              </div>
            </div>

            {iaMode ? (
              <div className="space-y-4 animate-in fade-in">
                <div className="bg-accent/5 border border-accent/20 rounded-2xl p-6">
                  <h3 className="font-serif text-accent flex items-center gap-2 mb-2"><Sparkles size={18}/> Extração com Inteligência Artificial</h3>
                  <p className="text-sm text-text-muted mb-4">
                    Cole um texto livre descrevendo a {formData.classificacao}, suas intenções, técnicas e medidas, ou cole a URL de um site/portfolio. A IA do Groq estruturará tudo automaticamente para a Ficha Técnica.
                  </p>
                  <textarea 
                    value={aiInput} 
                    onChange={e => setAiInput(e.target.value)} 
                    placeholder="Ex: 'Esta obra chamada Lágrimas Douradas foi feita em 2025 usando acrílica sobre tela, medindo 100x100cm...'"
                    className="w-full h-40 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-accent outline-none bg-bg resize-none mb-4"
                  />
                  <div className="flex justify-end">
                    <button onClick={handleAIProcess} disabled={aiLoading || !aiInput.trim()} className="bg-accent text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-accent/90 disabled:opacity-50 transition-colors flex items-center gap-2 shadow-float hover-float">
                      {aiLoading ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/> : <Sparkles size={16}/>}
                      {aiLoading ? aiPhase || 'Processando...' : 'Analisar e Preencher'}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-10 animate-in fade-in">
                
                {/* FOTOS (Apenas Obra Singular) */}
                {formData.classificacao === 'singular' && (
                  <section>
                    <p className="text-xs font-bold tracking-[0.2em] text-accent uppercase mb-4 flex items-center gap-2"><span className="font-serif text-base">I</span> Fotografias</p>
                    <div className="space-y-3">
                      <div className="relative border-2 border-dashed border-accent/40 rounded-2xl overflow-hidden aspect-video flex items-center justify-center bg-bg hover:bg-accent/5 transition-colors cursor-pointer group" onClick={()=>photoRefs.current[0]?.click()}>
                        <input ref={el=>{photoRefs.current[0]=el}} type="file" accept="image/*" className="hidden" onChange={e=>handlePhotoSlot(0,e)} />
                        {photos[0].url ? (
                          <div className="relative w-full h-full">
                            <img src={photos[0].url} alt="Foto principal" className="w-full h-full object-contain" />
                            <div className="absolute top-2 left-2 flex gap-2">
                              <span className="bg-accent text-white text-xs font-bold px-2 py-1 rounded">CAPA</span>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-2 text-text-muted group-hover:text-accent transition-colors">
                            <Camera size={40}/><span className="text-sm font-medium">Foto principal — clique para selecionar</span>
                          </div>
                        )}
                      </div>
                      <div className="grid grid-cols-4 gap-3">
                        {[1,2,3,4].map(i=>(
                          <div key={i} className="space-y-1">
                            <div className="relative border border-dashed border-gray-300 rounded-xl overflow-hidden bg-bg hover:bg-accent/5 transition-colors cursor-pointer group aspect-[3/4] flex items-center justify-center" onClick={()=>photoRefs.current[i]?.click()}>
                              <input ref={el=>{photoRefs.current[i]=el}} type="file" accept="image/*" className="hidden" onChange={e=>handlePhotoSlot(i,e)} />
                              {photos[i].url ? (
                                <div className="relative w-full h-full"><img src={photos[i].url} alt={`Foto ${i+1}`} className="w-full h-full object-cover" /></div>
                              ) : (
                                <Camera size={20} className="text-gray-300 group-hover:text-accent transition-colors"/>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </section>
                )}

                {/* DADOS BÁSICOS (Tudo) */}
                <section>
                  <p className="text-xs font-bold tracking-[0.2em] text-accent uppercase mb-4 flex items-center gap-2"><span className="font-serif text-base">{formData.classificacao === 'singular' ? 'II' : 'I'}</span> Metadados Essenciais</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-text-muted mb-1">Título {formData.classificacao === 'colecao' ? 'da Coleção' : formData.classificacao === 'serie' ? 'da Série' : 'da Obra'} *</label>
                      <input type="text" value={formData.titulo} onChange={e=>setFormData({...formData,titulo:e.target.value})} className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:border-accent outline-none bg-bg font-serif text-lg" />
                    </div>
                    {formData.classificacao === 'singular' && (
                      <div>
                        <label className="block text-xs font-bold text-text-muted mb-1">Título Interpretativo <span className="font-normal">(1–7 palavras)</span></label>
                        <input type="text" value={formData.tituloInterpretativo} onChange={e=>setFormData({...formData,tituloInterpretativo:e.target.value})} className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:border-accent outline-none bg-bg" />
                      </div>
                    )}
                    <div>
                      <label className="block text-xs font-bold text-text-muted mb-1">Ano</label>
                      <input type="text" value={formData.ano} onChange={e=>setFormData({...formData,ano:e.target.value})} className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:border-accent outline-none bg-bg" />
                    </div>
                  </div>
                </section>

                {/* TEXTO CURATORIAL (Tudo) */}
                <section>
                  <p className="text-xs font-bold tracking-[0.2em] text-accent uppercase mb-4 flex items-center gap-2"><span className="font-serif text-base">{formData.classificacao === 'singular' ? 'III' : 'II'}</span> Texto Curatorial</p>
                  <div className="space-y-4">
                    {formData.classificacao === 'singular' && (
                      <div>
                        <label className="block text-xs font-bold text-text-muted mb-1">Sentença de Resumo <span className="font-normal">(1 frase)</span></label>
                        <input type="text" value={formData.sentencaResumo} onChange={e=>setFormData({...formData,sentencaResumo:e.target.value})} className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:border-accent outline-none bg-bg" />
                      </div>
                    )}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-xs font-bold text-text-muted">
                          Narrativa Curatorial / Statement
                          <span className="ml-2 text-accent">{formData.narrativaCuratorial.split(/\s+/).filter(Boolean).length} palavras</span>
                        </label>
                        <button type="button" onClick={handleGenerateNarrative} className="text-xs font-bold bg-accent text-white px-3 py-1.5 rounded-full hover:bg-accent/90 transition-colors flex items-center gap-1"><Sparkles size={12}/>Gerar IA</button>
                      </div>
                      <textarea value={formData.narrativaCuratorial} onChange={e=>setFormData({...formData,narrativaCuratorial:e.target.value})} rows={4} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-accent outline-none bg-bg resize-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-text-muted mb-1">Tags (separadas por vírgula)</label>
                      <input type="text" value={formData.tags} onChange={e=>setFormData({...formData,tags:e.target.value})} className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:border-accent outline-none bg-bg" />
                    </div>
                  </div>
                </section>

                {/* DETALHES FÍSICOS (Apenas Obra Singular) */}
                {formData.classificacao === 'singular' && (
                  <section>
                    <p className="text-xs font-bold tracking-[0.2em] text-accent uppercase mb-4 flex items-center gap-2"><span className="font-serif text-base">IV</span> Detalhes Físicos</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-text-muted mb-1">Técnica</label>
                        <input type="text" value={formData.tecnica} onChange={e=>setFormData({...formData,tecnica:e.target.value})} className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:border-accent outline-none bg-bg" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-text-muted mb-1">Suporte</label>
                        <input type="text" value={formData.suporte} onChange={e=>setFormData({...formData,suporte:e.target.value})} className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:border-accent outline-none bg-bg" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-text-muted mb-1">Dimensões (H × L × P)</label>
                        <div className="flex gap-1 items-center">
                          <input type="text" placeholder="H" value={formData.dimensaoH} onChange={e=>setFormData({...formData,dimensaoH:e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-accent outline-none bg-bg" />
                          <span className="text-gray-400">×</span>
                          <input type="text" placeholder="L" value={formData.dimensaoW} onChange={e=>setFormData({...formData,dimensaoW:e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-accent outline-none bg-bg" />
                          <span className="text-gray-400">×</span>
                          <input type="text" placeholder="P" value={formData.dimensaoD} onChange={e=>setFormData({...formData,dimensaoD:e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-accent outline-none bg-bg" />
                          <select value={formData.dimensaoUnidade} onChange={e=>setFormData({...formData,dimensaoUnidade:e.target.value})} className="border border-gray-200 rounded-lg px-2 py-2 text-sm focus:border-accent outline-none bg-bg">
                            <option>cm</option><option>in</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-text-muted mb-1">Status de Venda</label>
                        <select value={formData.status} onChange={e=>setFormData({...formData,status:e.target.value})} className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:border-accent outline-none bg-bg">
                          <option>Disponível</option><option>Vendida</option><option>Reservada</option><option>Coleção Privada</option><option>Não à venda</option>
                        </select>
                      </div>
                    </div>
                  </section>
                )}



              </div>
            )}
          </div>
        )}

      </div>

      {/* Footer Navigation */}
      <div className="fixed md:static bottom-0 left-0 right-0 p-4 md:p-0 bg-surface md:bg-transparent border-t border-gray-100 md:border-t-0 shadow-[0_-4px_12px_rgba(0,0,0,0.05)] md:shadow-none z-50 flex justify-between items-center md:mt-6 mt-0">
        <button 
          onClick={handleBack}
          disabled={step === 1}
          className={`flex items-center justify-center gap-2 px-4 md:px-6 py-3 rounded-xl font-medium transition-colors ${step === 1 ? 'opacity-0 cursor-default pointer-events-none' : 'bg-surface border border-gray-200 hover:bg-gray-50'}`}
        >
          <ChevronLeft size={20} /> Voltar
        </button>

        {step < 3 ? (
          <button 
            onClick={handleNext}
            className="flex items-center justify-center gap-2 px-8 py-3 rounded-xl font-bold bg-accent text-white hover:bg-accent/90 hover-float transition-all shadow-float"
          >
            Avançar <ChevronRight size={20} />
          </button>
        ) : (
          <button 
            onClick={handleSave}
            disabled={saving || iaMode}
            className="flex items-center justify-center gap-2 px-8 py-3 rounded-xl font-bold bg-accent text-white hover:bg-accent/90 hover-float transition-all shadow-float disabled:opacity-50 disabled:hover:translate-y-0"
          >
            {saving ? 'Salvando...' : 'Salvar Registro'}
          </button>
        )}
      </div>

    </div>
  );
}
