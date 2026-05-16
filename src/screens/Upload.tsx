import { useState } from 'react';
import { 
  UploadCloud, 
  Mic, 
  FileText, 
  Link as LinkIcon, 
  CheckCircle2, 
  AlertTriangle,
  Camera,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  X
} from 'lucide-react';

type Step = 1 | 2 | 3 | 4;

export default function Upload() {
  const [step, setStep] = useState<Step>(1);
  const [, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dpiOk, setDpiOk] = useState<boolean | null>(null);
  const [resolution, setResolution] = useState<{w: number, h: number} | null>(null);
  
  // Voice state
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    classificacao: 'Obra Singular',
    emExposicao: false,
    exposicaoManual: '',
    titulo: '',
    ano: new Date().getFullYear().toString(),
    tecnica: '',
    suporte: '',
    dimensaoW: '',
    dimensaoH: '',
    dimensaoUnidade: 'cm',
    status: 'Disponível',
    valor: '',
    materiais: [] as string[],
    localizacao: '',
    notaCuratorial: '',
    tags: '',
    aiCuratorialText: ''
  });

  const [materialInput, setMaterialInput] = useState('');

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

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'pt-BR';
    recognition.continuous = true;
    recognition.interimResults = true;

    if (!recording) {
      setRecording(true);
      recognition.start();
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

  const handleAddMaterial = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && materialInput.trim()) {
      e.preventDefault();
      setFormData({ ...formData, materiais: [...formData.materiais, materialInput.trim()] });
      setMaterialInput('');
    }
  };

  const removeMaterial = (index: number) => {
    const newMats = [...formData.materiais];
    newMats.splice(index, 1);
    setFormData({ ...formData, materiais: newMats });
  };

  const handleGenerateAI = () => {
    // Fake AI generation
    setFormData({ ...formData, aiCuratorialText: "Gerando insight curatorial com NotebookLM..." });
    setTimeout(() => {
      setFormData({ 
        ...formData, 
        aiCuratorialText: `Esta obra, "${formData.titulo || 'Sem Título'}", explora a tensão contínua da artista através da materialidade do(a) ${formData.suporte || 'suporte'} e ${formData.tecnica || 'técnica'}. A paleta e a textura induzem uma leitura introspectiva típica do Abstracionismo Lírico.`
      });
    }, 1500);
  };

  return (
    <div className="max-w-[1000px] mx-auto pb-12">
      <div className="mb-8">
        <h1 className="text-3xl font-serif mb-2">Novo Upload de Obra</h1>
        <p className="text-text-muted">Digitalize seu acervo com IA curatorial embutida.</p>
      </div>

      {/* Progress Steps */}
      <div className="flex gap-4 mb-8">
        {['Entrada de Arquivo', 'Classificação', 'Exposição', 'Ficha Técnica'].map((label, idx) => {
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
        
        {/* STEP 1: Entrada de arquivo */}
        {step === 1 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="border-2 border-dashed border-accent/30 rounded-2xl bg-bg p-10 flex flex-col items-center justify-center relative hover:bg-accent/5 transition-colors group">
              <input 
                type="file" 
                accept="image/jpeg, image/png, image/tiff"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              {!preview ? (
                <>
                  <UploadCloud size={48} className="text-accent mb-4 group-hover:-translate-y-2 transition-transform" />
                  <h3 className="text-lg font-serif mb-1">Arraste a foto da obra ou clique aqui</h3>
                  <p className="text-sm text-text-muted">JPG, PNG, TIFF (Máx. 50MB)</p>
                </>
              ) : (
                <div className="flex flex-col items-center w-full z-10 pointer-events-none">
                  <img src={preview} alt="Preview" className="h-48 object-contain rounded-lg shadow-md mb-4" />
                  {resolution && (
                    <div className="flex items-center gap-4 mt-2">
                      <span className="text-sm font-medium text-text-muted bg-white px-3 py-1 rounded-md shadow-sm">
                        {resolution.w} x {resolution.h} px
                      </span>
                      {dpiOk === true && (
                        <span className="text-sm font-medium text-emerald-600 bg-emerald-50 px-3 py-1 rounded-md shadow-sm flex items-center gap-1">
                          <CheckCircle2 size={16} /> 300 DPI Verificado
                        </span>
                      )}
                      {dpiOk === false && (
                        <span className="text-sm font-medium text-amber-600 bg-amber-50 px-3 py-1 rounded-md shadow-sm flex items-center gap-1">
                          <AlertTriangle size={16} /> Baixa Resolução
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-4">
              <button 
                onClick={handleVoiceDescription}
                className={`flex items-center justify-center gap-2 py-4 rounded-xl border transition-colors ${recording ? 'bg-rose-50 border-rose-200 text-rose-600' : 'bg-surface border-gray-200 hover:border-accent/50'}`}
              >
                <Mic size={20} className={recording ? "animate-pulse" : ""} />
                <span className="font-medium text-sm">{recording ? 'Gravando...' : 'Descrição por Voz'}</span>
              </button>
              <button className="flex items-center justify-center gap-2 py-4 rounded-xl border border-gray-200 bg-surface hover:border-accent/50 transition-colors">
                <FileText size={20} />
                <span className="font-medium text-sm">Subir PDF</span>
              </button>
              <button className="flex items-center justify-center gap-2 py-4 rounded-xl border border-gray-200 bg-surface hover:border-accent/50 transition-colors">
                <LinkIcon size={20} />
                <span className="font-medium text-sm">Link / Instagram</span>
              </button>
            </div>

            {transcript && (
              <div className="bg-bg p-4 rounded-xl border border-gray-100 text-sm italic text-text-muted">
                "{transcript}"
              </div>
            )}
          </div>
        )}

        {/* STEP 2: Classificação */}
        {step === 2 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
            <h2 className="text-2xl font-serif mb-6">Como deseja classificar esta obra?</h2>
            <div className="grid grid-cols-3 gap-4">
              {['Obra Singular', 'Coleção', 'Série'].map(tipo => (
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
            <h2 className="text-2xl font-serif mb-6">Esta obra está ou esteve em exposição?</h2>
            
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
              <span className="font-medium">Sim, adicionar histórico de exposição</span>
            </label>

            {formData.emExposicao && (
              <div className="bg-bg p-6 rounded-xl border border-gray-100 space-y-4">
                <div>
                  <label className="block text-sm font-bold text-text-muted mb-2">Busca Inteligente (IA)</label>
                  <div className="flex gap-2">
                    <input type="text" placeholder="Pesquisar por curador, galeria, edital..." className="flex-1 rounded-lg border-gray-200 px-4 py-2 text-sm outline-none focus:border-accent" />
                    <button className="bg-accent text-white px-4 py-2 rounded-lg text-sm font-medium">Buscar IA</button>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">A busca IA pesquisará referências @rk e bancos de dados.</p>
                </div>
                <div>
                  <label className="block text-sm font-bold text-text-muted mb-2">Registro Manual</label>
                  <input 
                    type="text" 
                    placeholder="Nome da exposição, data e local" 
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
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="grid grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-text-muted mb-1">Título da Obra</label>
                  <input type="text" value={formData.titulo} onChange={e => setFormData({...formData, titulo: e.target.value})} className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:border-accent outline-none bg-bg" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-text-muted mb-1">Ano</label>
                    <input type="text" value={formData.ano} onChange={e => setFormData({...formData, ano: e.target.value})} className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:border-accent outline-none bg-bg" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-text-muted mb-1">Status</label>
                    <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:border-accent outline-none bg-bg">
                      <option>Disponível</option>
                      <option>Vendida</option>
                      <option>Reservada</option>
                      <option>Coleção Privada</option>
                    </select>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-text-muted mb-1">Técnica</label>
                    <select value={formData.tecnica} onChange={e => setFormData({...formData, tecnica: e.target.value})} className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:border-accent outline-none bg-bg">
                      <option value="">Selecione...</option>
                      <option>Óleo sobre tela</option>
                      <option>Acrílica</option>
                      <option>Aquarela</option>
                      <option>Mista</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-text-muted mb-1">Suporte</label>
                    <select value={formData.suporte} onChange={e => setFormData({...formData, suporte: e.target.value})} className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:border-accent outline-none bg-bg">
                      <option value="">Selecione...</option>
                      <option>Tela</option>
                      <option>Papel Algodão</option>
                      <option>Madeira</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-text-muted mb-1">Dimensões</label>
                  <div className="flex gap-2">
                    <input type="text" placeholder="Largura" value={formData.dimensaoW} onChange={e => setFormData({...formData, dimensaoW: e.target.value})} className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:border-accent outline-none bg-bg" />
                    <span className="flex items-center justify-center text-gray-400">x</span>
                    <input type="text" placeholder="Altura" value={formData.dimensaoH} onChange={e => setFormData({...formData, dimensaoH: e.target.value})} className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:border-accent outline-none bg-bg" />
                    <select value={formData.dimensaoUnidade} onChange={e => setFormData({...formData, dimensaoUnidade: e.target.value})} className="border border-gray-200 rounded-lg px-2 py-2 text-sm focus:border-accent outline-none bg-bg">
                      <option>cm</option>
                      <option>in</option>
                      <option>px</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-text-muted mb-1">Valor Estimado (R$)</label>
                  <input type="text" value={formData.valor} onChange={e => setFormData({...formData, valor: e.target.value})} placeholder="0,00" className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:border-accent outline-none bg-bg" />
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-text-muted mb-1">Materiais Utilizados</label>
                  <div className="flex gap-2 mb-2">
                    <input 
                      type="text" 
                      value={materialInput}
                      onChange={e => setMaterialInput(e.target.value)}
                      onKeyDown={handleAddMaterial}
                      placeholder="Ex: Pigmento natural (Enter)" 
                      className="flex-1 border border-gray-200 rounded-lg px-4 py-2 text-sm focus:border-accent outline-none bg-bg" 
                    />
                    <button className="bg-bg border border-gray-200 text-text-main px-3 py-2 rounded-lg text-sm flex items-center gap-2 hover:border-accent transition-colors">
                      <Camera size={16} /> <span className="hidden lg:inline">Leitura Câmera</span>
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.materiais.map((mat, i) => (
                      <span key={i} className="bg-accent/10 text-accent text-xs font-bold px-2.5 py-1 rounded-md flex items-center gap-1">
                        {mat} <X size={12} className="cursor-pointer hover:text-red-500" onClick={() => removeMaterial(i)} />
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-4 flex flex-col">
                <div>
                  <label className="block text-sm font-bold text-text-muted mb-1">Tags / Estilo</label>
                  <input type="text" value={formData.tags} onChange={e => setFormData({...formData, tags: e.target.value})} placeholder="abstrato, geométrico..." className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:border-accent outline-none bg-bg" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-text-muted mb-1">Nota Curatorial (Privada)</label>
                  <textarea 
                    value={formData.notaCuratorial} 
                    onChange={e => setFormData({...formData, notaCuratorial: e.target.value})}
                    className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:border-accent outline-none bg-bg h-24 resize-none" 
                    placeholder="Sua intenção e pensamentos sobre esta obra..."
                  />
                </div>
                
                {/* AI Curatorial Box */}
                <div className="flex-1 border border-accent/20 bg-accent/5 rounded-xl p-5 flex flex-col">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-serif text-accent flex items-center gap-2"><Sparkles size={18} /> Texto Curatorial IA</h3>
                    <button onClick={handleGenerateAI} className="text-xs font-bold bg-accent text-white px-3 py-1.5 rounded-full hover:bg-accent/90 transition-colors">
                      Gerar Texto
                    </button>
                  </div>
                  {formData.aiCuratorialText ? (
                    <p className="text-sm text-text-main italic flex-1 overflow-y-auto">
                      "{formData.aiCuratorialText}"
                    </p>
                  ) : (
                    <div className="flex-1 flex items-center justify-center text-text-muted text-sm text-center">
                      Clique em "Gerar Texto" para a IA analisar sua nota curatorial e os dados da obra.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Footer Navigation */}
      <div className="flex justify-between items-center mt-6">
        <button 
          onClick={() => setStep(step - 1 as Step)}
          disabled={step === 1}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-colors ${step === 1 ? 'opacity-0 cursor-default' : 'bg-surface border border-gray-200 hover:bg-gray-50'}`}
        >
          <ChevronLeft size={20} /> Voltar
        </button>

        {step < 4 ? (
          <button 
            onClick={() => setStep(step + 1 as Step)}
            className="flex items-center gap-2 px-8 py-3 rounded-xl font-bold bg-accent text-white hover:bg-accent/90 hover-float transition-all"
          >
            Avançar <ChevronRight size={20} />
          </button>
        ) : (
          <div className="flex gap-4">
            <button className="flex items-center gap-2 px-6 py-3 rounded-xl font-medium bg-surface border border-gray-200 hover:border-accent transition-colors">
              Nova Foto
            </button>
            <button className="flex items-center gap-2 px-8 py-3 rounded-xl font-bold bg-accent text-white hover:bg-accent/90 hover-float transition-all shadow-float">
              Salvar no Banco
            </button>
          </div>
        )}
      </div>

    </div>
  );
}
