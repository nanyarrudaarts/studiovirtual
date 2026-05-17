import { useState, useRef } from 'react';
import { UploadCloud, Mic, FileText, Link as LinkIcon, CheckCircle2, AlertTriangle, Camera, Sparkles, ChevronRight, ChevronLeft, X, Plus, QrCode, Leaf, Link2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../services/supabase';

interface PhotoSlot { file: File | null; url: string; label: string; w: number; h: number; }

type Step = 1 | 2 | 3 | 4;

export default function Upload() {
  const { t } = useTranslation();
  const [step, setStep] = useState<Step>(1);
  const [, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dpiOk, setDpiOk] = useState<boolean | null>(null);
  const [resolution, setResolution] = useState<{w: number, h: number} | null>(null);
  const [saving, setSaving] = useState(false);
  
  // Voice state
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    classificacao: 'Obra Singular',
    emExposicao: false,
    exposicaoManual: '',
    titulo: '',
    tituloInterpretativo: '',
    ano: new Date().getFullYear().toString(),
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
    aiCuratorialText: ''
  });
  const [photos, setPhotos] = useState<PhotoSlot[]>(Array.from({length:5},()=>({file:null,url:'',label:'',w:0,h:0})));
  // URL Import
  const [importUrl, setImportUrl] = useState('');
  const [importLoading, setImportLoading] = useState(false);
  const [importPhase, setImportPhase] = useState('');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [importResult, setImportResult] = useState<any>(null);
  const [importImages, setImportImages] = useState<{url:string;selected:boolean}[]>([]);
  const [showImport, setShowImport] = useState(false);
  const photoRefs = useRef<(HTMLInputElement|null)[]>([]);



  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setFile(selected);
      
      const objectUrl = URL.createObjectURL(selected);
      setPreview(objectUrl);
      
      // Fake DPI & Resolution detection
      const img = new Image();
      img.onload = () => {
        setResolution({ w: img.width, h: img.height });
        // Simulate DPI check (e.g. image width > 3000px usually means high res)
        setDpiOk(img.width > 2000);
      };
      img.src = objectUrl;
    }
  };

  const handleVoiceDescription = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert("Seu navegador não suporta a Web Speech API.");
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'pt-BR';
    recognition.continuous = true;
    recognition.interimResults = true;

    if (!recording) {
      setRecording(true);
      recognition.start();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript) {
          setTranscript(prev => prev + ' ' + finalTranscript);
        }
      };
      recognition.onend = () => {
        setRecording(false);
      };
    } else {
      setRecording(false);
      // Usually you'd keep a ref to recognition to stop it, but this is a simplified mock for the UI.
    }
  };


  const handlePhotoSlot = (i: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    const url = URL.createObjectURL(f);
    const img = new Image();
    img.onload = () => {
      const s = [...photos]; s[i] = {file:f,url,label:photos[i].label,w:img.width,h:img.height};
      setPhotos(s);
      if (i===0) { setPreview(url); setDpiOk(img.width>2000); setResolution({w:img.width,h:img.height}); }
    };
    img.src = url;
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        titulo: formData.titulo,
        titulo_interpretativo: formData.tituloInterpretativo,
        ano: formData.ano,
        tecnica: formData.tecnica || formData.tecnicaFree,
        suporte: formData.suporte,
        dimensoes: `${formData.dimensaoW}x${formData.dimensaoH}${formData.dimensaoD ? 'x'+formData.dimensaoD : ''} ${formData.dimensaoUnidade}`,
        status: formData.status,
        valor: formData.valor,
        materiais: formData.materiais,
        localizacao: formData.localizacao,
        proveniencia: formData.proveniencia,
        credito_colecao: formData.creditoColecao,
        sentenca_resumo: formData.sentencaResumo,
        narrativa_curatorial: formData.narrativaCuratorial,
        nota_intencao: formData.notaIntencao,
        sustentavel: formData.sustentavel,
        blockchain: formData.blockchain,
        tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
        ai_curatorial_text: formData.aiCuratorialText,
        photo_metadata: photos.map(p => ({ label: p.label, w: p.w, h: p.h }))
      };

      const { error } = await supabase.from('obras').insert(payload);
      if (error) {
        console.error('Error saving:', error);
        alert(t('upload.erro_salvar', 'Erro ao salvar: ') + error.message);
      } else {
        alert(t('upload.salvo_com_sucesso', 'Obra salva com sucesso!'));
      }
    } catch (err: unknown) {
      alert('Erro inesperado: ' + (err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleImportUrl = async () => {
    const key = localStorage.getItem('gemini_api_key')||'';
    if (!key||key.length<10) { alert('Configure sua chave Gemini em Configurações.'); return; }
    setImportLoading(true);
    for (const p of ['Acessando página...','Extraindo informações...','Identificando fotos...']) {
      setImportPhase(p); await new Promise(r=>setTimeout(r,800));
    }
    try {
      const prompt = `Acesse e leia o conteúdo desta URL: ${importUrl}\nExtraia informações sobre a obra de arte e retorne APENAS JSON:\n{"titulo":"","tituloInterpretativo":"","ano":"","tecnica":"","suporte":"","dimensoes":"","descricaoCurta":"","narrativaCuratorial":"","serie":"","tags":[],"imagens":[]}`;
      
      let text = '';
      let usedMethod = 'Gemini Search';
      
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              tools: [{ googleSearch: {} }]
            })
          }
        );
        if (!res.ok) throw new Error("Gemini response not ok");
        const json = await res.json();
        text = json.candidates?.[0]?.content?.parts?.[0]?.text || '';
        if (!text || text.trim() === '') throw new Error("Empty text");
      } catch (geminiErr) {
        console.log("Gemini native search failed, falling back to Jina AI", geminiErr);
        usedMethod = 'Jina AI';
        
        const jinaResponse = await fetch(`https://r.jina.ai/${importUrl}`);
        if (!jinaResponse.ok) throw new Error('Não foi possível ler a URL nem pelo Gemini nem pelo Jina AI.');
        const pageText = await jinaResponse.text();
        
        const fallbackPrompt = `Analise o texto abaixo, extraído da URL: ${importUrl}\nExtraia informações sobre a obra de arte e retorne APENAS JSON:\n{"titulo":"","tituloInterpretativo":"","ano":"","tecnica":"","suporte":"","dimensoes":"","descricaoCurta":"","narrativaCuratorial":"","serie":"","tags":[],"imagens":[]}\n\nTEXTO DA PÁGINA:\n${pageText.substring(0, 50000)}`;
        
        const fallbackRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: fallbackPrompt }] }] })
          }
        );
        const fallbackJson = await fallbackRes.json();
        text = fallbackJson.candidates?.[0]?.content?.parts?.[0]?.text || '';
      }

      const match = text.match(/\{[\s\S]*\}/);
      const data = JSON.parse(match ? match[0] : '{}');
      setImportResult(data);
      if (data.titulo) setFormData(f=>({...f,titulo:data.titulo||f.titulo,tituloInterpretativo:data.tituloInterpretativo||'',ano:data.ano||f.ano,tecnica:data.tecnica||f.tecnica,suporte:data.suporte||f.suporte,narrativaCuratorial:data.narrativaCuratorial||'',sentencaResumo:data.descricaoCurta||'',tags:Array.isArray(data.tags)?data.tags.join(', '):f.tags}));
      if (Array.isArray(data.imagens)) setImportImages(data.imagens.map((u:string)=>({url:u,selected:true})));
      alert(`Obra lida via ${usedMethod}`);
    } catch { alert('Erro ao analisar a URL.'); }
    setImportLoading(false);
  };

  const handleGenerateNarrative = async () => {
    const key = localStorage.getItem('gemini_api_key')||'';
    if (!key||key.length<10) return;
    const prompt = `Curador de arte: escreva narrativa curatorial de 20-75 palavras em português.\nTítulo: ${formData.titulo||'Sem Título'}\nAno: ${formData.ano}\nTécnica: ${formData.tecnica} ${formData.tecnicaFree} sobre ${formData.suporte}\nRetorne APENAS o texto.`;
    setFormData(f=>({...f,narrativaCuratorial:'Gerando…'}));
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({contents:[{parts:[{text:prompt}]}]})});
      const json = await res.json();
      setFormData(f=>({...f,narrativaCuratorial:json.candidates?.[0]?.content?.parts?.[0]?.text?.trim()||''}));
    } catch { setFormData(f=>({...f,narrativaCuratorial:'Erro. Tente novamente.'})); }
  };

  return (
    <div className="max-w-[1000px] mx-auto pb-12">
      <div className="mb-8">
        <h1 className="text-3xl font-serif mb-2">{t('upload.title')}</h1>
        <p className="text-text-muted">{t('upload.subtitle')}</p>
      </div>

      {/* Progress Steps */}
      <div className="flex gap-4 mb-8">
        {[t('upload.entrada_arquivo'), t('upload.passo_class'), t('upload.passo_exp'), t('upload.passo_ficha')].map((label, idx) => {
          const s = (idx + 1) as Step;
          const isActive = step === s;
          const isPast = step > s;
          return (
            <div key={s} className={`flex-1 h-2 rounded-full relative ${isActive ? 'bg-accent' : isPast ? 'bg-accent/40' : 'bg-gray-200'}`}>
              <span className={`absolute -top-6 text-xs font-bold ${isActive ? 'text-accent' : 'text-gray-400'}`}>
                {label}
              </span>
            </div>
          );
        })}
      </div>

      <div className="bg-surface rounded-2xl shadow-float border border-gray-100 p-8 min-h-[500px]">
        
        {/* STEP 1 */}
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="border-2 border-dashed border-accent/30 rounded-2xl bg-bg p-6 md:p-10 flex flex-col items-center justify-center relative hover:bg-accent/5 transition-colors group min-h-[200px]">
              <input aria-label="Selecionar imagem da obra" type="file" accept="image/jpeg,image/png,image/tiff" onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
              {!preview ? (<>
                <UploadCloud size={48} className="text-accent mb-4 group-hover:-translate-y-2 transition-transform" />
                <h3 className="text-lg font-serif mb-1">{t('upload.arraste')}</h3>
                <p className="text-sm text-text-muted">{t('upload.formatos')}</p>
              </>) : (
                <div className="flex flex-col items-center w-full z-10 pointer-events-none">
                  <img src={preview} alt="Preview" className="h-48 object-contain rounded-lg shadow-md mb-4" />
                  {resolution && (
                    <div className="flex items-center gap-4 mt-2">
                      <span className="text-sm font-medium text-text-muted bg-white px-3 py-1 rounded-md shadow-sm">{resolution.w} x {resolution.h} px</span>
                      {dpiOk === true && <span className="text-sm font-medium text-emerald-600 bg-emerald-50 px-3 py-1 rounded-md shadow-sm flex items-center gap-1"><CheckCircle2 size={16} />{t('upload.dpi_ok')}</span>}
                      {dpiOk === false && <span className="text-sm font-medium text-amber-600 bg-amber-50 px-3 py-1 rounded-md shadow-sm flex items-center gap-1"><AlertTriangle size={16} />{t('upload.dpi_baixo')}</span>}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button onClick={handleVoiceDescription} className={`flex items-center justify-center gap-2 py-4 rounded-xl border transition-colors ${recording ? 'bg-rose-50 border-rose-200 text-rose-600' : 'bg-surface border-gray-200 hover:border-accent/50'}`}>
                <Mic size={20} className={recording ? 'animate-pulse' : ''} />
                <span className="font-medium text-sm">{recording ? t('upload.gravando') : t('upload.descricao_voz')}</span>
              </button>
              <button className="flex items-center justify-center gap-2 py-4 rounded-xl border border-gray-200 bg-surface hover:border-accent/50 transition-colors">
                <FileText size={20} /><span className="font-medium text-sm">{t('upload.subir_pdf')}</span>
              </button>
              <button onClick={() => setShowImport(v=>!v)} className="flex items-center justify-center gap-2 py-4 rounded-xl border border-gray-200 bg-surface hover:border-accent/50 transition-colors">
                <Link2 size={20} /><span className="font-medium text-sm">Importar de link</span>
              </button>
            </div>

            {showImport && (
              <div className="border border-accent/30 rounded-2xl bg-accent/5 p-6 space-y-4">
                <h3 className="font-serif text-accent flex items-center gap-2"><LinkIcon size={18}/>Importar de URL</h3>
                <div className="flex gap-2">
                  <input aria-label="URL da obra" type="url" placeholder="https://www.nanyarruda.com/golden-s-tears" value={importUrl} onChange={e=>setImportUrl(e.target.value)} className="flex-1 border border-gray-200 rounded-lg px-4 py-2 text-sm focus:border-accent outline-none bg-bg" />
                  <button onClick={handleImportUrl} disabled={importLoading||!importUrl} className="bg-accent text-white px-5 py-2 rounded-lg text-sm font-bold hover:bg-accent/90 disabled:opacity-50 transition-colors">Analisar página</button>
                </div>
                {importLoading && <p className="text-sm text-accent italic flex items-center gap-2"><span className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin inline-block"/>{importPhase}</p>}
                {importResult && !importLoading && (
                  <div className="space-y-3">
                    <p className="text-xs font-bold text-text-muted uppercase tracking-widest">Dados extraídos — edite antes de confirmar</p>
                    {importImages.length > 0 && (
                      <div>
                        <p className="text-xs font-bold text-text-muted mb-2">Imagens encontradas</p>
                        <div className="flex flex-wrap gap-2">
                          {importImages.map((img,i)=>(
                            <label key={i} className={`cursor-pointer rounded-lg overflow-hidden border-2 transition-colors ${img.selected?'border-accent':'border-gray-200'}`}>
                              <input type="checkbox" className="sr-only" checked={img.selected} onChange={()=>setImportImages(s=>s.map((x,j)=>j===i?{...x,selected:!x.selected}:x))} />
                              <img src={img.url} alt={`Imagem ${i+1}`} className="w-20 h-20 object-cover" onError={e=>{(e.target as HTMLImageElement).style.display='none'}} />
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                    <button onClick={()=>{setShowImport(false);setStep(4);}} className="bg-accent text-white px-6 py-2 rounded-lg text-sm font-bold hover:bg-accent/90 transition-colors">Confirmar e continuar →</button>
                  </div>
                )}
              </div>
            )}
            {transcript && <div className="bg-bg p-4 rounded-xl border border-gray-100 text-sm italic text-text-muted">"{transcript}"</div>}
          </div>
        )}


        {/* STEP 2: Classificação */}
        {step === 2 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
            <h2 className="text-2xl font-serif mb-6">{t('upload.classificar')}</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[t('upload.obra_singular'), t('upload.colecao'), t('upload.serie')].map(tipo => (
                <button 
                  key={tipo}
                  onClick={() => setFormData({...formData, classificacao: tipo})}
                  className={`py-8 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-3 ${formData.classificacao === tipo ? 'border-accent bg-accent/5 text-accent' : 'border-gray-100 bg-surface text-text-main hover:border-accent/30'}`}
                >
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${formData.classificacao === tipo ? 'border-accent' : 'border-gray-300'}`}>
                    {formData.classificacao === tipo && <div className="w-2 h-2 bg-accent rounded-full" />}
                  </div>
                  <span className="font-serif text-lg">{tipo}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* STEP 3: Exposição */}
        {step === 3 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
            <h2 className="text-2xl font-serif mb-6">{t('upload.exposta')}</h2>
            
            <label className="flex items-center gap-3 cursor-pointer">
              <div className="relative">
                <input 
                  type="checkbox" 
                  className="sr-only" 
                  checked={formData.emExposicao}
                  onChange={(e) => setFormData({...formData, emExposicao: e.target.checked})}
                />
                <div className={`block w-14 h-8 rounded-full transition-colors ${formData.emExposicao ? 'bg-accent' : 'bg-gray-300'}`}></div>
                <div className={`absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${formData.emExposicao ? 'translate-x-6' : ''}`}></div>
              </div>
              <span className="font-medium">{t('upload.sim_hist_exp')}</span>
            </label>

            {formData.emExposicao && (
              <div className="bg-bg p-6 rounded-xl border border-gray-100 space-y-4">
                <div>
                  <label className="block text-sm font-bold text-text-muted mb-2">{t('upload.busca_ia')}</label>
                  <div className="flex gap-2">
                    <input type="text" placeholder={t('upload.pesq_curador')} className="flex-1 rounded-lg border-gray-200 px-4 py-2 text-sm outline-none focus:border-accent" />
                    <button className="bg-accent text-white px-4 py-2 rounded-lg text-sm font-medium">{t('upload.btn_buscar_ia')}</button>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">{t('upload.busca_ia_desc')}</p>
                </div>
                <div>
                  <label className="block text-sm font-bold text-text-muted mb-2">{t('upload.reg_manual')}</label>
                  <input 
                    type="text" 
                    placeholder={t('upload.nome_exp')} 
                    value={formData.exposicaoManual}
                    onChange={(e) => setFormData({...formData, exposicaoManual: e.target.value})}
                    className="w-full rounded-lg border-gray-200 border px-4 py-2 text-sm outline-none focus:border-accent" 
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 4: Ficha Técnica */}
        {step === 4 && (
          <div className="space-y-10 animate-in fade-in slide-in-from-right-4 duration-500">

            {/* I — METADADOS */}
            <section>
              <p className="text-xs font-bold tracking-[0.2em] text-accent uppercase mb-4 flex items-center gap-2"><span className="font-serif text-base">I</span> Metadados Essenciais</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="up-artista" className="block text-xs font-bold text-text-muted mb-1">Nome do Artista</label>
                  <input id="up-artista" aria-label="Nome do artista" type="text" value="Nany Arruda" readOnly className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm outline-none bg-gray-50 text-text-muted cursor-default" />
                </div>
                <div>
                  <label htmlFor="up-titulo" className="block text-xs font-bold text-text-muted mb-1">Título da Obra *</label>
                  <input id="up-titulo" aria-label="Título da obra" type="text" value={formData.titulo} onChange={e=>setFormData({...formData,titulo:e.target.value})} className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:border-accent outline-none bg-bg" />
                </div>
                <div>
                  <label htmlFor="up-tint" className="block text-xs font-bold text-text-muted mb-1">Título Interpretativo <span className="font-normal">(1–7 palavras)</span></label>
                  <input id="up-tint" aria-label="Título interpretativo" type="text" value={formData.tituloInterpretativo} onChange={e=>setFormData({...formData,tituloInterpretativo:e.target.value})} className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:border-accent outline-none bg-bg" />
                </div>
                <div>
                  <label htmlFor="up-ano" className="block text-xs font-bold text-text-muted mb-1">Ano de Criação</label>
                  <input id="up-ano" aria-label="Ano de criação" type="text" value={formData.ano} onChange={e=>setFormData({...formData,ano:e.target.value})} className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:border-accent outline-none bg-bg" />
                </div>
                <div>
                  <label htmlFor="up-tecnica" className="block text-xs font-bold text-text-muted mb-1">Técnica</label>
                  <select id="up-tecnica" aria-label="Técnica" value={formData.tecnica} onChange={e=>setFormData({...formData,tecnica:e.target.value})} className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:border-accent outline-none bg-bg">
                    <option value="">Selecione...</option>
                    <option>{t('upload.tec_oleo')}</option><option>{t('upload.tec_acrilica')}</option>
                    <option>{t('upload.tec_aquarela')}</option><option>{t('upload.tec_mista')}</option>
                    <option>Técnica Digital</option><option>Bordado</option><option>Colagem</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="up-suporte" className="block text-xs font-bold text-text-muted mb-1">Suporte</label>
                  <select id="up-suporte" aria-label="Suporte" value={formData.suporte} onChange={e=>setFormData({...formData,suporte:e.target.value})} className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:border-accent outline-none bg-bg">
                    <option value="">Selecione...</option>
                    <option>{t('upload.sup_tela')}</option><option>{t('upload.sup_papel_alg')}</option>
                    <option>{t('upload.sup_madeira')}</option><option>Papel algodão</option><option>Papel kraft</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label htmlFor="up-tecfree" className="block text-xs font-bold text-text-muted mb-1">Materiais adicionais / detalhes técnicos</label>
                  <input id="up-tecfree" aria-label="Materiais adicionais" type="text" placeholder="ex: pigmento mineral, verniz, encáustica..." value={formData.tecnicaFree} onChange={e=>setFormData({...formData,tecnicaFree:e.target.value})} className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:border-accent outline-none bg-bg" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-text-muted mb-1">Dimensões (H × L × P)</label>
                  <div className="flex gap-1 items-center">
                    <input aria-label="Altura" type="text" placeholder="H" value={formData.dimensaoH} onChange={e=>setFormData({...formData,dimensaoH:e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-accent outline-none bg-bg" />
                    <span className="text-gray-400 shrink-0">×</span>
                    <input aria-label="Largura" type="text" placeholder="L" value={formData.dimensaoW} onChange={e=>setFormData({...formData,dimensaoW:e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-accent outline-none bg-bg" />
                    <span className="text-gray-400 shrink-0">×</span>
                    <input aria-label="Profundidade" type="text" placeholder="P" value={formData.dimensaoD} onChange={e=>setFormData({...formData,dimensaoD:e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-accent outline-none bg-bg" />
                    <select aria-label="Unidade" value={formData.dimensaoUnidade} onChange={e=>setFormData({...formData,dimensaoUnidade:e.target.value})} className="border border-gray-200 rounded-lg px-2 py-2 text-sm focus:border-accent outline-none bg-bg shrink-0">
                      <option>cm</option><option>in</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label htmlFor="up-status" className="block text-xs font-bold text-text-muted mb-1">Status</label>
                  <select id="up-status" aria-label="Status" value={formData.status} onChange={e=>setFormData({...formData,status:e.target.value})} className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:border-accent outline-none bg-bg">
                    <option>Disponível</option><option>Vendida</option><option>Reservada</option><option>Coleção Privada</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="up-valor" className="block text-xs font-bold text-text-muted mb-1">Valor Estimado R$ <span className="font-normal text-text-muted">(privado)</span></label>
                  <input id="up-valor" aria-label="Valor estimado" type="text" value={formData.valor} onChange={e=>setFormData({...formData,valor:e.target.value})} placeholder="0,00" className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:border-accent outline-none bg-bg" />
                </div>
                <div>
                  <label htmlFor="up-local" className="block text-xs font-bold text-text-muted mb-1">Localização Física</label>
                  <input id="up-local" aria-label="Localização física" type="text" value={formData.localizacao} onChange={e=>setFormData({...formData,localizacao:e.target.value})} placeholder="Ateliê / Galeria / Residência..." className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:border-accent outline-none bg-bg" />
                </div>
                <div>
                  <label htmlFor="up-credito" className="block text-xs font-bold text-text-muted mb-1">Crédito de Coleção</label>
                  <input id="up-credito" aria-label="Crédito de coleção" type="text" value={formData.creditoColecao} onChange={e=>setFormData({...formData,creditoColecao:e.target.value})} placeholder="Coleção particular / Museu X..." className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:border-accent outline-none bg-bg" />
                </div>
                <div className="md:col-span-2">
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-bold text-text-muted">Proveniência / Histórico de Propriedade</label>
                    <button type="button" onClick={()=>setFormData(f=>({...f,proveniencia:[...f.proveniencia,{dono:'',ano:''}]}))} className="text-accent text-xs font-bold flex items-center gap-1 hover:underline"><Plus size={12}/>Adicionar</button>
                  </div>
                  <div className="space-y-2">
                    {formData.proveniencia.map((p,i)=>(
                      <div key={i} className="flex gap-2">
                        <input aria-label="Proprietário" placeholder="Nome / Galeria" value={p.dono} onChange={e=>{const v=[...formData.proveniencia];v[i]={...v[i],dono:e.target.value};setFormData({...formData,proveniencia:v});}} className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-accent outline-none bg-bg" />
                        <input aria-label="Ano da aquisição" placeholder="Ano" value={p.ano} onChange={e=>{const v=[...formData.proveniencia];v[i]={...v[i],ano:e.target.value};setFormData({...formData,proveniencia:v});}} className="w-24 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-accent outline-none bg-bg" />
                        <button type="button" aria-label="Remover proveniência" onClick={()=>setFormData(f=>({...f,proveniencia:f.proveniencia.filter((_,j)=>j!==i)}))} className="text-gray-400 hover:text-red-500 px-2"><X size={16}/></button>
                      </div>
                    ))}
                    {formData.proveniencia.length===0 && <p className="text-xs text-text-muted italic">Nenhum registro. Clique em Adicionar para incluir histórico de propriedade.</p>}
                  </div>
                </div>
              </div>
            </section>

            {/* II — CURATORIAL */}
            <section>
              <p className="text-xs font-bold tracking-[0.2em] text-accent uppercase mb-4 flex items-center gap-2"><span className="font-serif text-base">II</span> Texto Curatorial</p>
              <div className="space-y-4">
                <div>
                  <label htmlFor="up-sentenca" className="block text-xs font-bold text-text-muted mb-1">Sentença de Resumo <span className="font-normal">(1 frase)</span></label>
                  <input id="up-sentenca" aria-label="Sentença de resumo" type="text" value={formData.sentencaResumo} onChange={e=>setFormData({...formData,sentencaResumo:e.target.value})} placeholder="Uma frase que sintetiza a obra..." className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:border-accent outline-none bg-bg" />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label htmlFor="up-narrativa" className="block text-xs font-bold text-text-muted">
                      Narrativa Curatorial <span className="font-normal">(20–75 palavras)</span>
                      <span className="ml-2 text-accent">{formData.narrativaCuratorial.split(/\s+/).filter(Boolean).length} palavras</span>
                    </label>
                    <button type="button" onClick={handleGenerateNarrative} className="text-xs font-bold bg-accent text-white px-3 py-1.5 rounded-full hover:bg-accent/90 transition-colors flex items-center gap-1"><Sparkles size={12}/>Gerar com IA</button>
                  </div>
                  <textarea id="up-narrativa" aria-label="Narrativa curatorial" value={formData.narrativaCuratorial} onChange={e=>setFormData({...formData,narrativaCuratorial:e.target.value})} rows={4} className="w-full border-2 border-accent/30 rounded-xl px-4 py-3 text-sm focus:border-accent outline-none bg-accent/5 italic resize-none font-serif" placeholder="Narrativa curatorial da obra..." />
                </div>
                <div>
                  <label htmlFor="up-intencao" className="block text-xs font-bold text-text-muted mb-1">O que você quis dizer — uso interno <span className="font-normal italic">(nunca exportado)</span></label>
                  <textarea id="up-intencao" aria-label="Nota de intenção interna" value={formData.notaIntencao} onChange={e=>setFormData({...formData,notaIntencao:e.target.value})} rows={3} className="w-full border border-dashed border-gray-300 rounded-xl px-4 py-3 text-sm focus:border-accent outline-none bg-bg resize-none" placeholder="Notas pessoais sobre a intenção da obra..." />
                </div>
              </div>
            </section>

            {/* III — INOVAÇÕES */}
            <section>
              <p className="text-xs font-bold tracking-[0.2em] text-accent uppercase mb-4 flex items-center gap-2"><span className="font-serif text-base">III</span> Inovações 2025/2026</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="border border-gray-200 rounded-xl p-4 flex flex-col gap-2 bg-bg">
                  <div className="flex items-center gap-2 text-sm font-bold"><QrCode size={18} className="text-accent"/>QR Code</div>
                  <p className="text-xs text-text-muted">Gerado automaticamente ao salvar, linkando a página pública da obra.</p>
                  <div className="w-16 h-16 bg-gray-100 rounded flex items-center justify-center mt-1"><QrCode size={32} className="text-gray-300"/></div>
                </div>
                <div className="border border-gray-200 rounded-xl p-4 flex flex-col gap-3 bg-bg">
                  <div className="flex items-center gap-2 text-sm font-bold"><span className="text-accent">⛓</span>Blockchain</div>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <div className="relative shrink-0">
                      <input type="checkbox" className="sr-only" checked={formData.blockchain} onChange={e=>setFormData({...formData,blockchain:e.target.checked})} />
                      <div className={`w-10 h-6 rounded-full transition-colors ${formData.blockchain?'bg-accent':'bg-gray-300'}`}/>
                      <div className={`absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${formData.blockchain?'translate-x-4':''}`}/>
                    </div>
                    <span className="text-xs">Registrar proveniência</span>
                  </label>
                  <p className="text-xs text-text-muted italic">Em breve — integração com registro descentralizado.</p>
                </div>
                <div className="border border-gray-200 rounded-xl p-4 flex flex-col gap-3 bg-bg">
                  <div className="flex items-center gap-2 text-sm font-bold"><Leaf size={18} className="text-emerald-500"/>Sustentabilidade</div>
                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <input type="checkbox" id="up-sustentavel" checked={formData.sustentavel} onChange={e=>setFormData({...formData,sustentavel:e.target.checked})} className="w-4 h-4 accent-accent rounded" />
                    <span>Materiais sustentáveis / reaproveitados</span>
                  </label>
                </div>
              </div>
            </section>

            {/* IV — FOTOS */}
            <section>
              <p className="text-xs font-bold tracking-[0.2em] text-accent uppercase mb-4 flex items-center gap-2"><span className="font-serif text-base">IV</span> Fotos da Obra <span className="font-normal text-text-muted normal-case">(até 5 · primeira = capa)</span></p>
              <div className="space-y-3">
                {/* Main photo */}
                <div className="relative border-2 border-dashed border-accent/40 rounded-2xl overflow-hidden aspect-video flex items-center justify-center bg-bg hover:bg-accent/5 transition-colors cursor-pointer group" onClick={()=>photoRefs.current[0]?.click()}>
                  <input ref={el=>{photoRefs.current[0]=el}} type="file" accept="image/*" aria-label="Foto principal da obra" className="hidden" onChange={e=>handlePhotoSlot(0,e)} />
                  {photos[0].url ? (
                    <div className="relative w-full h-full">
                      <img src={photos[0].url} alt="Foto principal" className="w-full h-full object-contain" />
                      <div className="absolute top-2 left-2 flex gap-2">
                        <span className="bg-accent text-white text-xs font-bold px-2 py-1 rounded">CAPA</span>
                        {photos[0].w>0 && <span className={`text-xs font-bold px-2 py-1 rounded ${photos[0].w>2000?'bg-emerald-100 text-emerald-700':'bg-amber-100 text-amber-700'}`}>{photos[0].w}×{photos[0].h}</span>}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-text-muted group-hover:text-accent transition-colors">
                      <Camera size={40}/><span className="text-sm font-medium">Foto principal — clique para selecionar</span>
                    </div>
                  )}
                </div>
                {/* Secondary 4 */}
                <div className="grid grid-cols-4 gap-3">
                  {[1,2,3,4].map(i=>(
                    <div key={i} className="space-y-1">
                      <div className="relative border border-dashed border-gray-300 rounded-xl overflow-hidden bg-bg hover:bg-accent/5 transition-colors cursor-pointer group aspect-[3/4] flex items-center justify-center" onClick={()=>photoRefs.current[i]?.click()}>
                        <input ref={el=>{photoRefs.current[i]=el}} type="file" accept="image/*" aria-label={`Foto secundária ${i}`} className="hidden" onChange={e=>handlePhotoSlot(i,e)} />
                        {photos[i].url ? (
                          <div className="relative w-full h-full">
                            <img src={photos[i].url} alt={`Foto ${i+1}`} className="w-full h-full object-cover" />
                            {photos[i].w>0 && <span className={`absolute bottom-1 left-1 text-xs font-bold px-1.5 py-0.5 rounded ${photos[i].w>2000?'bg-emerald-100 text-emerald-700':'bg-amber-100 text-amber-700'}`}>{photos[i].w>2000?'HD':'LD'}</span>}
                          </div>
                        ) : (
                          <Camera size={20} className="text-gray-300 group-hover:text-accent transition-colors"/>
                        )}
                      </div>
                      <input aria-label={`Legenda da foto ${i+1}`} type="text" placeholder="Vista frontal..." value={photos[i].label} onChange={e=>{const s=[...photos];s[i]={...s[i],label:e.target.value};setPhotos(s);}} className="w-full border border-gray-200 rounded px-2 py-1 text-xs focus:border-accent outline-none bg-bg" />
                    </div>
                  ))}
                </div>
              </div>
            </section>

          </div>
        )}

      </div>



      {/* Footer Navigation */}
      <div className="fixed md:static bottom-0 left-0 right-0 p-4 md:p-0 bg-surface md:bg-transparent border-t border-gray-100 md:border-t-0 shadow-[0_-4px_12px_rgba(0,0,0,0.05)] md:shadow-none z-50 flex justify-between items-center md:mt-6 mt-0">
        <button 
          onClick={() => setStep(step - 1 as Step)}
          disabled={step === 1}
          className={`flex items-center justify-center md:justify-start gap-2 px-4 md:px-6 py-3 rounded-xl font-medium transition-colors ${step === 1 ? 'opacity-0 cursor-default' : 'bg-surface border border-gray-200 hover:bg-gray-50'}`}
        >
          <ChevronLeft size={20} /> <span className="hidden md:inline">{t('upload.btn_voltar')}</span>
        </button>

        {step < 4 ? (
          <button 
            onClick={() => setStep(step + 1 as Step)}
            className="flex flex-1 md:flex-none items-center justify-center md:justify-start gap-2 px-8 py-3 ml-4 md:ml-0 rounded-xl font-bold bg-accent text-white hover:bg-accent/90 hover-float transition-all"
          >
            {t('upload.btn_avancar')} <ChevronRight size={20} />
          </button>
        ) : (
          <div className="flex flex-1 md:flex-none gap-2 md:gap-4 ml-4 md:ml-0">
            <button className="flex items-center justify-center gap-2 px-4 md:px-6 py-3 rounded-xl font-medium bg-surface border border-gray-200 hover:border-accent transition-colors">
              <span className="hidden md:inline">{t('upload.nova_foto')}</span>
              <span className="md:hidden">Nova</span>
            </button>
            <button 
              onClick={handleSave}
              disabled={saving}
              className="flex flex-1 md:flex-none items-center justify-center gap-2 px-4 md:px-8 py-3 rounded-xl font-bold bg-accent text-white hover:bg-accent/90 hover-float transition-all shadow-float disabled:opacity-50"
            >
              {saving ? t('upload.salvando', 'Salvando...') : t('upload.salvar')}
            </button>
          </div>
        )}
      </div>

    </div>
  );
}
