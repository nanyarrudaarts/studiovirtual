import { useState, useRef, useEffect } from 'react';
import { ChevronRight, ChevronLeft, Camera, Sparkles, Bot, PenTool, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { saveArtwork, createCollection, createSerie, supabase } from '../services/supabase';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import type { Artwork } from '../types';
import { callAI } from '../services/ai';



interface PhotoSlot { file: File | null; url: string; label: string; w: number; h: number; }

export default function Upload() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('id');
  
  const [step, setStep] = useState<number>(1);
  const [iaMode, setIaMode] = useState(false);
  const [aiInput, setAiInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiPhase, setAiPhase] = useState('');
  const [saving, setSaving] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(false);
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
    protocoloAtivacao: '', perfilPerformer: '', duracao: '', elementosInegociveis: '',
    possuiTermo: false, possuiCOA: false, possuiCessao: false,
    // Novos campos para Série (Estrutura Curatorial)
    subtitle: '', statusSerie: 'Em andamento',
    resumoConceitual: '', logicaUnidade: '', temas: '', referencias: '', palavrasChave: '',
    anoInicial: '', anoFinal: '', periodoProducao: '', locaisCriacao: '',
    tecnicas: '', materiais: '', suportes: '', linguagens: '',
    codigoInterno: '', tagsCuratoriais: '',
    direitosAutorais: '', certificados: '', documentosAnexos: '', historicoExpositivo: '',
    // Recursos interdisciplinares, blockchain e certificados
    recursosHibridos: '',
    suporteDigital: '',
    hashBlockchain: '',
    redeBlockchain: 'Ethereum',
    registroCertificado: '',
  });

  const [photos, setPhotos] = useState<PhotoSlot[]>(Array.from({length:5},()=>({file:null,url:'',label:'',w:0,h:0})));
  const photoRefs = useRef<(HTMLInputElement|null)[]>([]);

  useEffect(() => {
    const p = new URLSearchParams(location.search).get('type');
    if (p === 'singular' || p === 'serie' || p === 'colecao') setFormData(prev => ({ ...prev, classificacao: p }));
  }, [location.search]);

  useEffect(() => {
    if (editId) {
      (async () => {
        setLoadingEdit(true);
        try {
          const { data, error } = await supabase
            .from('artworks')
            .select('*')
            .eq('artwork_id', editId)
            .single();
          if (error) throw error;
          if (data) {
            const artwork = data as Artwork;
            let extraData: Record<string, any> = {};
            if (artwork.intent_note) {
              try { extraData = JSON.parse(artwork.intent_note); } catch (e) {}
            }
            
            setFormData(prev => ({
              ...prev,
              classificacao: artwork.classification || 'singular',
              parentCollectionId: artwork.collection_reference || '',
              parentSeriesId: artwork.series_reference || '',
              isNewHierarchy: false,
              titulo: artwork.artwork_title || '',
              tipoObjeto: 'Pintura',
              autoria: artwork.artist_name || 'Nany Arruda',
              ano: artwork.creation_year?.toString() || artwork.creation_date || '',
              tecnica: artwork.medium || '',
              suporte: artwork.support || '',
              dimensaoW: artwork.width?.toString() || '',
              dimensaoH: artwork.height?.toString() || '',
              dimensaoD: artwork.depth?.toString() || '',
              dimensaoUnidade: artwork.dimensions_unit || 'cm',
              inscricoes: '',
              sentencaResumo: artwork.summary_sentence || '',
              narrativaCuratorial: artwork.curatorial_narrative || '',
              numeroRegistro: artwork.inventory_number || '',
              formaAquisicao: '',
              procedencia: '',
              estadoConservacao: 'Excelente',
              valor: artwork.price?.toString() || '',
              seguro: '',
              localizacao: artwork.physical_location || '',
              numeroEdicao: artwork.edition_number || '',
              variacaoSerie: '',
              quantidadePrevista: '',
              estruturaEdicao: '',
              periodoColecao: '',
              artistasEnvolvidos: '',
              criterioInclusao: '',
              instituicaoAssociada: '',
              status: ({'available':'Disponível','sold':'Vendida','reserved':'Reservada','private_collection':'Coleção Privada','not_for_sale':'Não à venda'} as Record<string,string>)[artwork.sale_status] ?? 'Disponível',
              protocoloAtivacao: extraData.protocoloAtivacao || '',
              perfilPerformer: extraData.perfilPerformer || '',
              duracao: extraData.duracao || '',
              elementosInegociveis: extraData.elementosInegociveis || '',
              possuiTermo: extraData.possuiTermo || false,
              possuiCOA: extraData.possuiCOA || false,
              possuiCessao: extraData.possuiCessao || false,
              recursosHibridos: extraData.recursosHibridos || '',
              suporteDigital: extraData.suporteDigital || '',
              hashBlockchain: extraData.hashBlockchain || '',
              redeBlockchain: extraData.redeBlockchain || 'Ethereum',
              registroCertificado: extraData.registroCertificado || '',
            }));
            
            if (artwork.artwork_images && artwork.artwork_images.length > 0) {
              const newPhotos = [...photos];
              artwork.artwork_images.forEach((url, i) => {
                if (i < 5) newPhotos[i] = { file: null, url, label: '', w: 0, h: 0 };
              });
              setPhotos(newPhotos);
            }
          }
        } catch (e) {
          alert('Erro ao carregar obra: ' + (e as Error).message);
        } finally {
          setLoadingEdit(false);
        }
      })();
    }
  }, [editId]);

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
      setAiPhase('Extraindo dados com IA...');
      const activeProvider = localStorage.getItem('ai_provider') || 'groq';
      const raw = await callAI(`Curador de arte. Extraia JSON: {"titulo":"","ano":"","tecnica":"","suporte":"","sentencaResumo":"","narrativaCuratorial":"","autoria":"","tipoObjeto":"","recursosHibridos":"","suporteDigital":"","registroCertificado":""}\nTexto:\n${aiInput.slice(0,12000)}`, activeProvider);
      const d = JSON.parse((raw.match(/\{[\s\S]*\}/) || ['{}'])[0]);
      setFormData(f => ({
        ...f,
        titulo: d.titulo||f.titulo,
        ano: d.ano||f.ano,
        tecnica: d.tecnica||f.tecnica,
        suporte: d.suporte||f.suporte,
        narrativaCuratorial: d.narrativaCuratorial||f.narrativaCuratorial,
        sentencaResumo: d.sentencaResumo||f.sentencaResumo,
        autoria: d.autoria||f.autoria,
        recursosHibridos: d.recursosHibridos||f.recursosHibridos,
        suporteDigital: d.suporteDigital||f.suporteDigital,
        registroCertificado: d.registroCertificado||f.registroCertificado,
      }));
      setIaMode(false); setAiInput('');
    } catch (e: unknown) { alert('Erro IA: ' + ((e as Error).message)); }
    finally { setAiLoading(false); setAiPhase(''); }
  };

  const handleSave = async () => {
    if (!formData.titulo.trim()) { alert('Preencha o título/nome.'); return; }
    setSaving(true);
    try {
      // Criar Nova Coleção (sem obra)
      if (formData.classificacao === 'colecao' && formData.isNewHierarchy) {
        await createCollection({
          collection_name: formData.titulo,
          collection_description: formData.narrativaCuratorial || undefined,
          artistic_theme: formData.criterioInclusao || undefined,
          start_date: formData.ano || undefined,
        });
        alert('✅ Coleção criada com sucesso!'); navigate('/obras'); return;
      }
      // Criar Nova Série (sem obra)
      if (formData.classificacao === 'serie' && formData.isNewHierarchy) {
        await createSerie({
          series_title: formData.titulo,
          conceptual_statement: formData.narrativaCuratorial || undefined,
          print_run_total: parseInt(formData.quantidadePrevista) || undefined,
          edition_type: (formData.estruturaEdicao as any) || undefined,
        });
        alert('✅ Série criada com sucesso!'); navigate('/obras'); return;
      }
      // Salvar Obra (singular ou vinculada)
      const dimF = [formData.dimensaoW, formData.dimensaoH, formData.dimensaoD].filter(Boolean).join(' × ') + (formData.dimensaoUnidade ? ' ' + formData.dimensaoUnidade : '');
      const imgs = photos.filter(p => p.file).map(p => p.file as File);
      const extraData = {
        protocoloAtivacao: formData.protocoloAtivacao,
        perfilPerformer: formData.perfilPerformer,
        duracao: formData.duracao,
        elementosInegociveis: formData.elementosInegociveis,
        possuiTermo: formData.possuiTermo,
        possuiCOA: formData.possuiCOA,
        possuiCessao: formData.possuiCessao,
        recursosHibridos: formData.recursosHibridos,
        suporteDigital: formData.suporteDigital,
        hashBlockchain: formData.hashBlockchain,
        redeBlockchain: formData.redeBlockchain,
        registroCertificado: formData.registroCertificado,
      };

      await saveArtwork({
        artwork_id: editId || undefined,
        artwork_title: formData.titulo,
        artist_name: formData.autoria || undefined,
        collection_reference: formData.parentCollectionId || undefined,
        series_reference: formData.parentSeriesId || undefined,
        creation_year: parseInt(formData.ano) || undefined,
        medium: formData.tecnica || undefined,
        support: formData.suporte || undefined,
        dimensions_formatted: dimF || undefined,
        height: parseFloat(formData.dimensaoH) || undefined,
        width: parseFloat(formData.dimensaoW) || undefined,
        depth: parseFloat(formData.dimensaoD) || undefined,
        dimensions_unit: formData.dimensaoUnidade,
        sale_status: ({'Disponível':'available','Vendida':'sold','Reservada':'reserved','Coleção Privada':'private_collection','Não à venda':'not_for_sale'} as Record<string,string>)[formData.status] as any ?? 'available',
        price: parseFloat(formData.valor) || undefined,
        physical_location: formData.localizacao || undefined,
        summary_sentence: formData.sentencaResumo || undefined,
        curatorial_narrative: formData.narrativaCuratorial || undefined,
        inventory_number: formData.numeroRegistro || undefined,
        edition_number: formData.numeroEdicao || undefined,
        classification: 'singular',
        intent_note: JSON.stringify(extraData),
      }, imgs);
      alert('✅ Obra salva com sucesso!'); navigate('/obras');
    } catch (err: unknown) { alert('Erro ao salvar: ' + (err as Error).message); }
    finally { setSaving(false); }
  };

  // Obra singular: step 1 (fotos) -> step 3 (ficha)
  // Serie/Colecao: step 1 (fotos) -> step 2 (vinculação) -> step 3 (ficha)
  const handleNext = () => {
    if (step === 1 && formData.classificacao === 'singular') { setStep(3); return; }
    setStep(step + 1);
  };
  const handleBack = () => {
    if (step === 3 && formData.classificacao === 'singular') { setStep(1); return; }
    if (step === 3 && formData.isNewHierarchy) { setStep(2); return; }
    setStep(step - 1);
  };

  const inp = (label: string, field: string, opts?: {span2?: boolean; rows?: number; font?: string}) => {
    const id = `inp-${field}`;
    return (
      <div className={opts?.span2 ? 'md:col-span-2' : ''}>
        <label htmlFor={id} className="block text-xs font-bold text-text-muted mb-1">{label}</label>
        {opts?.rows ? (
          <textarea id={id} value={(formData as any)[field]} onChange={e => setFormData({...formData, [field]: e.target.value})} rows={opts.rows} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-accent outline-none bg-bg resize-none" />
        ) : (
          <input id={id} type="text" value={(formData as any)[field]} onChange={e => setFormData({...formData, [field]: e.target.value})} className={`w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:border-accent outline-none bg-bg ${opts?.font || ''}`} />
        )}
      </div>
    );
  };

  const dimInput = () => (
    <div>
      <label className="block text-xs font-bold text-text-muted mb-1">Dimensões (H × L × P)</label>
      <div className="flex gap-1 items-center">
        <input type="text" placeholder="H" aria-label="Altura" value={formData.dimensaoH} onChange={e=>setFormData({...formData,dimensaoH:e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-accent outline-none bg-bg" />
        <span className="text-gray-400">×</span>
        <input type="text" placeholder="L" aria-label="Largura" value={formData.dimensaoW} onChange={e=>setFormData({...formData,dimensaoW:e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-accent outline-none bg-bg" />
        <span className="text-gray-400">×</span>
        <input type="text" placeholder="P" aria-label="Profundidade" value={formData.dimensaoD} onChange={e=>setFormData({...formData,dimensaoD:e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-accent outline-none bg-bg" />
        <select aria-label="Unidade de medida" value={formData.dimensaoUnidade} onChange={e=>setFormData({...formData,dimensaoUnidade:e.target.value})} className="border border-gray-200 rounded-lg px-2 py-2 text-sm focus:border-accent outline-none bg-bg"><option>cm</option><option>in</option></select>
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
      {loadingEdit ? (
        <div className="flex items-center justify-center min-h-[500px]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent"></div>
        </div>
      ) : (
        <>
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

        {/* STEP 1: Classificação */}
        {step === 1 && (
          <div className="space-y-10 animate-in fade-in slide-in-from-right-4 duration-500">
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
                <label htmlFor="parent-selector" className="block text-sm font-bold text-text-main mb-2">Selecione</label>
                {formData.classificacao === 'serie' ? (
                  <select id="parent-selector" value={formData.parentSeriesId} onChange={e => setFormData({...formData, parentSeriesId: e.target.value})} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-accent outline-none bg-white">
                    <option value="">Selecione uma série...</option>
                    {seriesList.map(s => <option key={s.id} value={s.id}>{s.series_title}</option>)}
                  </select>
                ) : (
                  <select id="parent-selector" value={formData.parentCollectionId} onChange={e => setFormData({...formData, parentCollectionId: e.target.value})} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-accent outline-none bg-white">
                    <option value="">Selecione uma coleção...</option>
                    {collections.map(c => <option key={c.id} value={c.id}>{c.collection_name}</option>)}
                  </select>
                )}
              </div>
            )}
          </div>
        )}

        {/* STEP 3: Ficha Técnica */}
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

            {/* Imagem Principal — Só aparece se for obra (singular ou vinculada existente) */}
            {(formData.classificacao === 'singular' || !formData.isNewHierarchy) && (
              <section className="mb-8 bg-gray-50 p-6 rounded-2xl border border-gray-100">
                <h3 className="text-lg font-serif mb-4">Imagem Principal</h3>
                <div className="space-y-3">
                  <div className="relative border-2 border-dashed border-accent/40 rounded-2xl overflow-hidden aspect-video flex items-center justify-center bg-white hover:bg-accent/5 transition-colors cursor-pointer group" onClick={()=>photoRefs.current[0]?.click()}>
                    <input ref={el=>{photoRefs.current[0]=el}} type="file" accept="image/*" className="hidden" aria-label="Upload imagem principal" onChange={e=>handlePhotoSlot(0,e)} />
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
                      <div key={i} className="relative border border-dashed border-gray-300 rounded-xl overflow-hidden bg-white hover:bg-accent/5 transition-colors cursor-pointer group aspect-[3/4] flex items-center justify-center" onClick={()=>photoRefs.current[i]?.click()}>
                        <input ref={el=>{photoRefs.current[i]=el}} type="file" accept="image/*" className="hidden" aria-label={`Upload imagem ${i+1}`} onChange={e=>handlePhotoSlot(i,e)} />
                        {photos[i].url ? <img src={photos[i].url} alt={`Foto ${i+1}`} className="w-full h-full object-cover" /> : <Camera size={20} className="text-gray-300 group-hover:text-accent transition-colors"/>}
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}

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
                    {sec('I', 'Dados de Identificação Básica', <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{inp('Tipo de Objeto','tipoObjeto')}{inp('Título *','titulo',{font:'font-serif text-lg'})}{inp('Autoria','autoria')}{inp('Data / Período','ano')}{inp('Materiais e Técnicas','tecnica')}{inp('Suporte','suporte')}{dimInput()}{inp('Inscrições e Marcas','inscricoes')}{inp('Descrição Curta','sentencaResumo',{span2:true})}</div>)}
                    {sec('II', 'Dados Técnicos para Acervo e Gestão (Dossiê)', <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{inp('Número de Registro (Tombo)','numeroRegistro')}{inp('Forma de Aquisição','formaAquisicao')}{inp('Procedência e Histórico','procedencia',{span2:true, rows:2})}{inp('Estado de Conservação','estadoConservacao')}{inp('Localização Física','localizacao')}{inp('Valor','valor')}{inp('Valor do Seguro','seguro')}</div>)}
                    
                    {/* Ficha para Performances */}
                    {sec('III', 'Ficha Curatorial para Performances (Modelos 2025/2026)', <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{inp('Protocolo de Ativação (Roteiro)','protocoloAtivacao',{span2:true, rows:3})}{inp('Perfil do Performer','perfilPerformer')}{inp('Duração','duracao')}{inp('Elementos Inegociáveis','elementosInegociveis',{span2:true, rows:2})}</div>)}
                    
                    {/* Documentação Jurídica */}
                    {sec('IV', 'Documentação Jurídica Associada', <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="flex items-center gap-2">
                        <input id="possuiTermo" type="checkbox" checked={formData.possuiTermo} onChange={e=>setFormData({...formData, possuiTermo: e.target.checked})} className="rounded text-accent focus:ring-accent" />
                        <label htmlFor="possuiTermo" className="text-sm font-medium">Termo de Doação/Compra assinado</label>
                      </div>
                      <div className="flex items-center gap-2">
                        <input id="possuiCOA" type="checkbox" checked={formData.possuiCOA} onChange={e=>setFormData({...formData, possuiCOA: e.target.checked})} className="rounded text-accent focus:ring-accent" />
                        <label htmlFor="possuiCOA" className="text-sm font-medium">Certificado de Autenticidade (COA)</label>
                      </div>
                      <div className="flex items-center gap-2">
                        <input id="possuiCessao" type="checkbox" checked={formData.possuiCessao} onChange={e=>setFormData({...formData, possuiCessao: e.target.checked})} className="rounded text-accent focus:ring-accent" />
                        <label htmlFor="possuiCessao" className="text-sm font-medium">Cessão de Direitos de Imagem/Voz</label>
                      </div>
                    </div>)}

                    {/* Recursos Interdisciplinares e Blockchain */}
                    {sec('V', 'Recursos Interdisciplinares & Autenticação Digital (Blockchain)', <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {inp('Recursos Híbridos / Multimídia (ex: Instalação sonora)', 'recursosHibridos')}
                      {inp('Suporte Digital / Mídia (ex: NFT, Custom Software)', 'suporteDigital')}
                      {inp('Registro / Hash do Smart Contract (Blockchain)', 'hashBlockchain')}
                      <div className="flex flex-col gap-1">
                        <label htmlFor="inp-redeBlockchain" className="block text-xs font-bold text-text-muted mb-1">Rede Blockchain</label>
                        <select id="inp-redeBlockchain" value={formData.redeBlockchain} onChange={e=>setFormData({...formData, redeBlockchain: e.target.value})} className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:border-accent outline-none bg-bg">
                          <option value="Ethereum">Ethereum</option>
                          <option value="Tezos">Tezos</option>
                          <option value="Solana">Solana</option>
                          <option value="Polygon">Polygon</option>
                          <option value="Outra / L2">Outra / L2</option>
                        </select>
                      </div>
                      {inp('Código do Certificado (COA ID)', 'registroCertificado', {span2: true})}
                    </div>)}

                    {/* Wall Label Preview Section */}
                    <section className="border-t border-gray-100 pt-8 mt-8">
                      <p className="text-xs font-bold tracking-[0.2em] text-accent uppercase mb-4">Etiqueta de Parede (Museum Standard Label)</p>
                      <div className="p-6 bg-gray-50 border border-gray-200 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                        <div className="space-y-2 max-w-md font-serif text-text-main bg-white p-6 rounded-xl border border-gray-200 shadow-sm relative group overflow-hidden">
                          <div className="absolute top-0 right-0 bg-accent/10 text-accent text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-bl">
                            WALL LABEL PREVIEW
                          </div>
                          <p className="font-bold text-base">{formData.autoria || 'Nany Arruda'}</p>
                          <p className="text-sm italic font-medium">
                            {formData.titulo || 'Sem Título'}
                            <span className="not-italic font-normal">{formData.ano ? `, ${formData.ano}` : ''}</span>
                          </p>
                          <p className="text-xs font-sans text-text-muted">
                            {formData.tecnica || 'Técnica Mista'}
                            {formData.suporte ? ` sobre ${formData.suporte}` : ''}
                          </p>
                          {[formData.dimensaoH, formData.dimensaoW, formData.dimensaoD].filter(Boolean).length > 0 && (
                            <p className="text-xs font-sans text-text-muted">
                              {[formData.dimensaoH, formData.dimensaoW, formData.dimensaoD].filter(Boolean).join(' × ')} {formData.dimensaoUnidade || 'cm'}
                            </p>
                          )}
                          {formData.numeroRegistro && (
                            <p className="text-[10px] font-sans text-text-muted mt-2 bg-gray-100 px-1.5 py-0.5 rounded inline-block">
                              Inv. Reg: {formData.numeroRegistro}
                            </p>
                          )}
                          {formData.hashBlockchain && (
                            <p className="text-[10px] font-sans text-accent mt-2 bg-accent/5 px-1.5 py-0.5 rounded inline-block ml-2">
                              ⛓️ {formData.redeBlockchain}: {formData.hashBlockchain.slice(0, 8)}...
                            </p>
                          )}
                        </div>
                        <div className="max-w-xs space-y-2 text-sm text-text-muted">
                          <p className="font-bold text-text-main">Ficha Curatorial Dinâmica</p>
                          <p>Esta etiqueta é gerada em tempo real seguindo o padrão internacional de identificação de acervo (Object ID).</p>
                          <p>Ela reflete exatamente as informações que serão geradas no Dossiê PDF da obra.</p>
                        </div>
                      </div>
                    </section>
                  </div>
                )}

                {/* SÉRIE — Nova Série */}
                {formData.classificacao === 'serie' && formData.isNewHierarchy && (
                  <div className="space-y-8">
                    {sec('I', 'Identificação Principal', 
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1 md:col-span-2">
                          <label htmlFor="series-parent-collection" className="text-sm font-medium">Nome da Coleção ou Fundo</label>
                          <select 
                            id="series-parent-collection"
                            value={formData.parentCollectionId} 
                            onChange={e => setFormData({...formData, parentCollectionId: e.target.value})}
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-accent focus:border-transparent outline-none transition-all text-sm"
                          >
                            <option value="">Ainda não pertence a nenhuma coleção</option>
                            {collections.map(c => (
                              <option key={c.id} value={c.id}>{c.collection_name}</option>
                            ))}
                          </select>
                        </div>
                        {inp('Título da Série *','titulo',{font:'font-serif text-lg'})}
                        {inp('Subtítulo','subtitle')}
                        {inp('Artista/Autoria *','autoria')}
                        <div className="flex flex-col gap-1">
                          <label htmlFor="statusSerie" className="text-sm font-medium">Status</label>
                          <select id="statusSerie" value={formData.statusSerie} onChange={e=>setFormData({...formData, statusSerie: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-accent focus:border-transparent outline-none transition-all text-sm">
                            <option value="Em andamento">Em andamento</option>
                            <option value="Finalizada">Finalizada</option>
                            <option value="Arquivada">Arquivada</option>
                          </select>
                        </div>
                      </div>
                    )}
                    
                    {sec('II', 'Contexto Conceitual',
                      <div className="grid grid-cols-1 gap-4">
                        {inp('Resumo Conceitual / Poética *','resumoConceitual',{rows:3})}
                        {inp('Lógica de Unidade *','logicaUnidade',{rows:3})}
                        {inp('Temas principais','temas')}
                        {inp('Referências','referencias',{rows:2})}
                        {inp('Palavras-chave','palavrasChave')}
                      </div>
                    )}

                    {sec('III', 'Temporalidade',
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {inp('Ano inicial *','anoInicial')}
                        {inp('Ano final','anoFinal')}
                        {inp('Período de produção','periodoProducao')}
                        {inp('Locais de criação','locaisCriacao')}
                      </div>
                    )}

                    {sec('IV', 'Estrutura Técnica',
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {inp('Técnicas utilizadas','tecnicas')}
                        {inp('Materiais','materiais')}
                        {inp('Suportes','suportes')}
                        {inp('Linguagens artísticas','linguagens')}
                      </div>
                    )}

                    {sec('V', 'Organização Interna',
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {inp('Código interno','codigoInterno')}
                        {inp('Tags curatoriais','tagsCuratoriais')}
                      </div>
                    )}

                    {sec('VI', 'Direitos e Documentação',
                      <div className="grid grid-cols-1 gap-4">
                        {inp('Direitos autorais','direitosAutorais')}
                        {inp('Certificados','certificados')}
                        {inp('Histórico expositivo','historicoExpositivo',{rows:3})}
                      </div>
                    )}

                    {sec('VII', 'Estrutura Relacional',
                      <div className="p-4 bg-gray-50 border border-gray-100 rounded-xl text-sm text-gray-500">
                        Obras vinculadas serão listadas aqui. (Funcionalidade em desenvolvimento)
                      </div>
                    )}
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
        </>
      )}
    </div>
  );
}
