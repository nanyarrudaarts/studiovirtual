import { useState, useRef, useEffect } from 'react';
import { ChevronRight, ChevronLeft, Camera, Plus, FileDown } from 'lucide-react';
import { saveArtwork, createCollection, createSerie, supabase } from '../services/supabase';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { Artwork } from '../types';
import { callAIChat, callAI } from '../services/ai';
import { TagInput } from '../components/common/TagInput';
import { downloadCertificate } from '../lib/generateCertificate';
import type { CertificateData } from '../components/common/CertificatePDF';
import { formatCOAID, translateTitle } from '../components/common/CertificatePDF';

// ── Controlled vocabularies ───────────────────────────────────────────────────
const MATERIALS_VOCAB = [
  'Acrylic', 'Oil', 'Watercolor', 'Gouache', 'Tempera', 'Ink', 'Pigment',
  'Charcoal', 'Graphite', 'Pastel', 'Chalk', 'Gold Leaf', 'Silver Leaf', 'Varnish',
  'Resin', 'Wax', 'Encaustic', 'Fresco', 'Spray Paint', 'Mixed Media',
];
const SUPPORTS_VOCAB = [
  'Canvas', 'Cotton Canvas', 'Linen', 'Paper', 'Archival Paper', 'Cardboard',
  'Wood Panel', 'Copper Plate', 'Stone', 'Found Object', 'Aluminium',
  'Glass', 'Fabric', 'Digital', 'Paper 300g', 'Silk', 'Plexiglass',
];



interface PhotoSlot { file: File | null; url: string; label: string; w: number; h: number; }

export default function Upload() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('id');
  
  const [step, setStep] = useState<number>(() => {
    const p = new URLSearchParams(window.location.search).get('type');
    return (p === 'serie' || p === 'colecao') ? 2 : 1;
  });
  const [aiLoading, setAiLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [isGeneratingCOAPDF, setIsGeneratingCOAPDF] = useState(false);
  
  const [messages, setMessages] = useState<{role: 'system'|'user'|'assistant', content: string}[]>([
    { role: 'assistant', content: 'Vamos registrar sua criação ✨\nMe conta sobre ela do jeito que você quiser.' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isChatting, setIsChatting] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  const [collections, setCollections] = useState<{collection_id: string, collection_name: string}[]>([]);
  const [seriesList, setSeriesList] = useState<{series_id: string, series_title: string}[]>([]);

  useEffect(() => {
    (async () => {
      const { data: cols } = await supabase.from('collections').select('collection_id, collection_name');
      if (cols) setCollections(cols);
      const { data: sers } = await supabase.from('series').select('series_id, series_title');
      if (sers) setSeriesList(sers);
    })();
  }, []);

  const [formData, setFormData] = useState(() => {
    const p = new URLSearchParams(window.location.search).get('type');
    const classification = (p === 'singular' || p === 'serie' || p === 'colecao') ? p : 'singular';
    return {
      classificacao: classification,
      parentCollectionId: '', parentSeriesId: '', isNewHierarchy: (p === 'serie' || p === 'colecao'),
      titulo: '', tipoObjeto: 'Painting', autoria: 'Nany Arruda',
      ano: new Date().getFullYear().toString(),
      tecnica: '', suporte: '',
      dimensaoW: '', dimensaoH: '', dimensaoD: '', dimensaoUnidade: 'cm',
      inscricoes: '', sentencaResumo: '', narrativaCuratorial: '',
      numeroRegistro: '', formaAquisicao: '', procedencia: '',
      estadoConservacao: 'Excellent', valor: '', seguro: '', localizacao: '',
      numeroEdicao: '', variacaoSerie: '',
      quantidadePrevista: '', estruturaEdicao: '',
      periodoColecao: '', artistasEnvolvidos: '', criterioInclusao: '', instituicaoAssociada: '',
      status: 'Disponível',
      protocoloAtivacao: '', perfilPerformer: '', duracao: '', elementosInegociveis: '',
      possuiTermo: false, possuiCOA: false, possuiCessao: false,
      subtitle: '', statusSerie: 'Em andamento',
      resumoConceitual: '', logicaUnidade: '', temas: '', referencias: '', palavrasChave: '',
      anoInicial: '', anoInicial2: '', anoFinal: '', periodoProducao: '', locaisCriacao: '',
      tecnicas: '', materiais: '', suportes: '', linguagens: '',
      codigoInterno: '', tagsCuratoriais: '',
      direitosAutorais: '', certificados: '', documentosAnexos: '', historicoExpositivo: '',
      recursosHibridos: '',
      suporteDigital: '',
      hashBlockchain: '',
      redeBlockchain: 'Ethereum',
      registroCertificado: '',
      numeroSerie: '',
      regrasEdicao: '',
      sinestesiaSonora: '',
      historicoSerie: '',
      circulacaoSerie: '',
      valorSerie: '',
    };
  });

  const SYSTEM_PROMPT = `Você é um assistente curatorial inteligente especializado em catalogação artística contemporânea.
Seu papel NÃO é exibir formulários técnicos tradicionais no início. Em vez disso, conduza uma conversa natural, criativa e fluida.

O usuário está catalogando: ${formData.classificacao === 'serie' ? 'UMA SÉRIE (conjunto de obras)' : formData.classificacao === 'colecao' ? 'UMA COLEÇÃO' : 'UMA OBRA SINGULAR'}.
${formData.classificacao === 'serie' ? 'Foque em perguntas sobre a narrativa que une as peças, o resumo conceitual, o período de produção da série e a técnica predominante do conjunto.' : ''}

OBJETIVO PRINCIPAL:
- Coletar informações de forma orgânica e interpretar linguagem livre.
- Inferir informações técnicas quando possível.
- Detectar lacunas e fazer perguntas adaptativas.
- Gerar uma ficha estruturada apenas no final.

ESTILO DE INTERAÇÃO:
- Fale de forma humana e acolhedora, usando linguagem simples.
- Faça apenas 1 ou poucas perguntas por interação.

ESTRUTURA FINAL INTERNA:
APENAS quando houver informações suficientes, gere internamente o seguinte JSON NO FINAL DA SUA MENSAGEM, DENTRO DE UMA TAG \`\`\`json
{
  "title": "",
  "type": "${formData.classificacao}",
  "year": "",
  "theme": "",
  "medium": "",
  "dimensions": "",
  "curatorial_notes": ""
}
\`\`\`
Antes do JSON, gere um pequeno resumo curatorial avisando que a ficha foi montada.`;

  const [photos, setPhotos] = useState<PhotoSlot[]>(Array.from({length:5},()=>({file:null,url:'',label:'',w:0,h:0})));
  const photoRefs = useRef<(HTMLInputElement|null)[]>([]);

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
              interface ExtraData {
              tipoObjeto?: string;
              formaAquisicao?: string;
              procedencia?: string;
              seguro?: string;
              protocoloAtivacao?: string;
              perfilPerformer?: string;
              duracao?: string;
              elementosInegociveis?: string;
              possuiTermo?: boolean;
              possuiCOA?: boolean;
              possuiCessao?: boolean;
              recursosHibridos?: string;
              suporteDigital?: string;
              hashBlockchain?: string;
              redeBlockchain?: string;
              registroCertificado?: string;
            }
            let extraData: ExtraData = {};
            if (artwork.intent_note) {
              try { extraData = JSON.parse(artwork.intent_note) as ExtraData; } catch { extraData = {}; }
            }
            
            setFormData(prev => ({
              ...prev,
              classificacao: 'singular',
              parentCollectionId: artwork.collection_reference || '',
              parentSeriesId: artwork.series_reference || '',
              isNewHierarchy: false,

              // Identificação
              titulo: artwork.artwork_title || '',
              tipoObjeto: artwork.medium || 'Pintura',
              autoria: artwork.artist_name || 'Nany Arruda',
              ano: artwork.creation_year?.toString() || artwork.creation_date || '',

              // Técnica
              tecnica: artwork.artistic_technique || artwork.medium || '',
              suporte: artwork.materials && artwork.materials.length > 0 ? artwork.materials.join(', ') : (artwork.support || ''),

              // Dimensões
              dimensaoW: artwork.width?.toString() || '',
              dimensaoH: artwork.height?.toString() || '',
              dimensaoD: artwork.depth?.toString() || '',
              dimensaoUnidade: artwork.dimensions_unit || 'cm',

              // Textos curatoriais
              sentencaResumo: artwork.summary_sentence || '',
              narrativaCuratorial: artwork.curatorial_narrative || '',
              inscricoes: artwork.epigraph || '',

              // Registro
              numeroRegistro: artwork.inventory_number || '',
              estadoConservacao: (() => {
                const map: Record<string, string> = {
                  excellent: 'Excellent', good: 'Good', fair: 'Fair',
                  poor: 'Poor', in_restoration: 'Poor',
                };
                return map[artwork.condition_state || ''] || 'Excellent';
              })(),
              localizacao: artwork.physical_location || '',
              numeroEdicao: artwork.edition_number || '',

              // Comercial
              valor: artwork.price?.toString() || '',
              status: ({'available':'Disponível','sold':'Vendida','reserved':'Reservada','private_collection':'Coleção Privada','not_for_sale':'Não à venda'} as Record<string,string>)[artwork.sale_status] ?? 'Disponível',

              // Direitos
              direitosAutorais: artwork.copyright_holder || '',
              possuiCOA: artwork.certificate_of_authenticity || false,

              // Campos extras do JSON intent_note

              formaAquisicao: extraData.formaAquisicao || '',
              procedencia: extraData.procedencia || '',
              seguro: extraData.seguro || '',
              protocoloAtivacao: extraData.protocoloAtivacao || '',
              perfilPerformer: extraData.perfilPerformer || '',
              duracao: extraData.duracao || '',
              elementosInegociveis: extraData.elementosInegociveis || '',
              possuiTermo: extraData.possuiTermo || false,
              possuiCessao: extraData.possuiCessao || false,
              recursosHibridos: extraData.recursosHibridos || '',
              suporteDigital: extraData.suporteDigital || '',
              hashBlockchain: extraData.hashBlockchain || '',
              redeBlockchain: extraData.redeBlockchain || 'Ethereum',
              registroCertificado: extraData.registroCertificado || '',
            }));
            
            // Carregar imagens: capa no slot 0, demais no 1-4
            const newPhotos = Array.from({ length: 5 }, () => ({
              file: null, url: '', label: '', w: 0, h: 0
            }));
            if (artwork.cover_image) {
              newPhotos[0] = { file: null, url: artwork.cover_image, label: '', w: 0, h: 0 };
            }
            const extras = (artwork.artwork_images ?? []).filter(u => u !== artwork.cover_image);
            extras.slice(0, 4).forEach((url, i) => {
              newPhotos[i + 1] = { file: null, url, label: '', w: 0, h: 0 };
            });
            setPhotos(newPhotos);
            
            // Pular os passos de criação/vinculação ao editar
            setStep(3);
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

  const handleChatSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!chatInput.trim()) return;
    const newMsgs = [...messages, { role: 'user' as const, content: chatInput }];
    setMessages(newMsgs);
    setChatInput('');
    setAiLoading(true);
    try {
      const aiContext = [
        { role: 'system' as const, content: SYSTEM_PROMPT },
        ...newMsgs
      ];
      const responseText = await callAIChat(aiContext);
      const updatedMsgs = [...newMsgs, { role: 'assistant' as const, content: responseText }];
      setMessages(updatedMsgs);

      // Extract JSON if present
      const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch) {
        try {
          const d = JSON.parse(jsonMatch[1]);
          setFormData(f => ({
            ...f,
            titulo: d.title || f.titulo,
            classificacao: d.type === 'serie' || d.type === 'colecao' ? d.type : 'singular',
            ano: d.year || f.ano,
            tecnica: d.medium || f.tecnica,
            narrativaCuratorial: d.curatorial_notes || d.theme || f.narrativaCuratorial,
            dimensaoW: d.dimensions ? d.dimensions.split('x')[0] || '' : f.dimensaoW,
          }));
        } catch(err) {
          console.error("Failed to parse JSON from AI", err);
        }
      }
    } catch (e: unknown) {
      alert('Erro IA: ' + ((e as Error).message));
    } finally {
      setAiLoading(false);
    }
  };

  const generateCoaId = async () => {
    // ── 1. Validate minimum required fields ───────────────────────────────────
    const missing: string[] = [];
    if (!formData.titulo.trim())   missing.push('Título');
    if (!formData.tecnica?.trim()) missing.push('Técnica');
    if (!formData.dimensaoH && !formData.dimensaoW) missing.push('Dimensões (H ou L)');
    if (missing.length > 0) {
      alert(`Preencha os campos obrigatórios antes de gerar o COA ID:\n• ${missing.join('\n• ')}`);
      return;
    }

    // ── 2. AP ethical limit check (>15% of print run) ────────────────────────
    if (formData.numeroEdicao) {
      const apMatch  = formData.numeroEdicao.match(/AP\s*(\d+)\/(\d+)/i);
      const edMatch  = formData.numeroEdicao.match(/^(\d+)\/(\d+)$/);
      if (apMatch && edMatch) {
        const totalAPs      = parseInt(apMatch[2], 10);
        const totalEdition  = parseInt(edMatch[2], 10);
        if (totalEdition > 0 && totalAPs / totalEdition > 0.15) {
          const ok = window.confirm(
            `⚠️ Alerta Museológico\n\n${totalAPs} provas de artista (AP) representam mais de 15% da tiragem (${totalEdition} unidades).\n\nO limite ético recomendado é de 10–15%. Deseja continuar mesmo assim?`
          );
          if (!ok) return;
        }
      }
    }

    try {
      // ── 3. Fetch all existing COA IDs to find max sequential ID ──────────────
      const { data, error } = await supabase.from('artworks').select('intent_note');
      if (error) throw error;

      let maxId = 999;
      const existingCoas = new Set<string>();

      data?.forEach(row => {
        if (row.intent_note) {
          try {
            const parsed = JSON.parse(row.intent_note);
            if (parsed.registroCertificado) {
              const coa = parsed.registroCertificado as string;
              existingCoas.add(coa);
              const match = coa.match(/^NA-[^-]+-(\\d{4})/);
              if (match?.[1]) {
                const id = parseInt(match[1], 10);
                if (id > maxId) maxId = id;
              }
            }
          } catch { /* ignore */ }
        }
      });

      const nextId = maxId + 1; // 4-digit, starts at 1000

      // ── 4. Middle segment: always use artwork year for strict museum format NA-[YEAR]-[ID] ──
      const iniciais = 'NA';
      const matchAno = formData.ano?.match(/\d{4}/);
      const year = matchAno ? matchAno[0] : new Date().getFullYear().toString();

      // ── 5. Edition suffix — preserves fractions exactly ──────────────────
      // "01/10"   → -01/10
      // "AP 01/05" → -AP01/05
      let edicaoStr = '';
      if (formData.numeroEdicao) {
        const num = formData.numeroEdicao.trim().toUpperCase().replace(/AP\s+/g, 'AP');
        edicaoStr = `-${num}`;
      } else if (formData.status === 'AP') {
        edicaoStr = `-AP`;
      }

      // ── 6. Build final COA string ─────────────────────────────────────────
      // NA-[YEAR]-[4-digit ID]-[Edition?]
      const newCoa = `${iniciais}-${year}-${nextId}${edicaoStr}`;

      // ── 7. Uniqueness validation ──────────────────────────────────────────
      if (existingCoas.has(newCoa)) {
        alert(`⚠️ O COA ID "${newCoa}" já existe no acervo.\nO próximo ID disponível será gerado automaticamente na próxima tentativa.`);
        return;
      }

      setFormData(prev => ({ ...prev, registroCertificado: newCoa }));
    } catch (e: unknown) {
      alert('Erro ao gerar COA ID: ' + (e as Error).message);
    }
  };

  const handleGenerateCOAPDF = async () => {
    if (!formData.registroCertificado) {
      alert('Gere o COA ID primeiro antes de baixar o certificado.');
      return;
    }
    setIsGeneratingCOAPDF(true);
    try {
      const dimStr = [formData.dimensaoH, formData.dimensaoW, formData.dimensaoD]
        .filter(Boolean)
        .join(' × ') + (formData.dimensaoUnidade ? ' ' + formData.dimensaoUnidade : '');

      const seriesTitle = seriesList.find(s => s.series_id === formData.parentSeriesId)?.series_title || '—';

      const data: CertificateData = {
        title: formData.titulo || 'Sem Título',
        artist: formData.autoria || 'Nany Arruda',
        year: formData.ano || String(new Date().getFullYear()),
        medium: formData.tecnica || '',
        dimensions: dimStr || 'N/A',
        status: 'Original',
        coaId: formData.registroCertificado,
        edition: formData.numeroEdicao || 'Unique',
        seriesTitle,
        description: formData.sentencaResumo || '',
        artworkImage: photos[0]?.url || '',
        sealImage: `${window.location.origin}/stamp.png`,
        issueDate: new Date(),
        support: formData.suporte || undefined,
        curatorialNarrative: formData.narrativaCuratorial || undefined,
        editionNumber: formData.numeroEdicao || undefined,
        creationYear: parseInt(formData.ano) || undefined,
      };

      const formattedCoaId = formatCOAID(formData.registroCertificado);
      const translatedTitle = translateTitle(formData.titulo || 'obra');
      const fileName = `COA_${formattedCoaId}_${translatedTitle.replace(/\s+/g, '_')}.pdf`;
      await downloadCertificate(data, fileName);
    } catch (error) {
      alert('Erro ao gerar o certificado PDF: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsGeneratingCOAPDF(false);
    }
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
        const extraSerieData = {
          autoria: formData.autoria,
          numeroSerie: formData.numeroSerie,
          periodoProducao: formData.periodoProducao,
          tecnicas: formData.tecnicas,
          regrasEdicao: formData.regrasEdicao,
          locaisCriacao: formData.locaisCriacao,
          suportes: formData.suportes,
          sinestesiaSonora: formData.sinestesiaSonora,
          resumoConceitual: formData.resumoConceitual,
          statusSerie: formData.statusSerie,
          estadoConservacao: formData.estadoConservacao,
          historicoSerie: formData.historicoSerie,
          circulacaoSerie: formData.circulacaoSerie,
          valor: formData.valor,
          valorSerie: formData.valorSerie,
          localizacao: formData.localizacao
        };

        await createSerie({
          series_title: formData.titulo,
          conceptual_statement: formData.narrativaCuratorial || undefined,
          print_run_total: parseInt(formData.quantidadePrevista) || undefined,
          edition_type: (formData.estruturaEdicao as 'unique' | 'limited' | 'open' | 'artist_proof') || undefined,
          group_label: formData.logicaUnidade || undefined,
          parent_collection_id: formData.parentCollectionId || undefined,
          narrative_description: JSON.stringify(extraSerieData)
        });
        alert('✅ Série criada com sucesso!'); navigate('/obras'); return;
      }
      // Salvar Obra (singular ou vinculada)
      const dimF = [formData.dimensaoW, formData.dimensaoH, formData.dimensaoD].filter(Boolean).join(' × ') + (formData.dimensaoUnidade ? ' ' + formData.dimensaoUnidade : '');
      const imgs = photos.filter(p => p.file).map(p => p.file as File);
      const extraData = {
        tipoObjeto: formData.tipoObjeto,
        numeroRegistro: formData.numeroRegistro,
        formaAquisicao: formData.formaAquisicao,
        procedencia: formData.procedencia,
        estadoConservacao: formData.estadoConservacao,
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
        numeroEdicao: formData.numeroEdicao,
        variacaoSerie: formData.variacaoSerie,
        seguro: formData.seguro,
        localizacao: formData.localizacao,
      };

      await saveArtwork({
        artwork_id: editId || undefined,
        artwork_title: formData.titulo,
        artist_name: formData.autoria || undefined,
        collection_reference: formData.parentCollectionId || undefined,
        series_reference: formData.parentSeriesId || undefined,
        creation_year: parseInt(formData.ano) || undefined,
        medium: formData.tecnica || undefined,
        materials: formData.suporte ? formData.suporte.split(',').map(s => s.trim()).filter(Boolean) : undefined,
        dimensions_formatted: dimF || undefined,
        height: parseFloat(formData.dimensaoH) || undefined,
        width: parseFloat(formData.dimensaoW) || undefined,
        depth: parseFloat(formData.dimensaoD) || undefined,
        dimensions_unit: formData.dimensaoUnidade,
        sale_status: ({'Disponível':'available','Vendida':'sold','Reservada':'reserved','Coleção Privada':'private_collection','Não à venda':'not_for_sale'} as Record<string, 'available' | 'sold' | 'reserved' | 'private_collection' | 'not_for_sale'>)[formData.status] ?? 'available',
        price: parseFloat(formData.valor) || undefined,
        physical_location: formData.localizacao || undefined,
        summary_sentence: formData.sentencaResumo || undefined,
        curatorial_narrative: formData.narrativaCuratorial || undefined,
        inventory_number: formData.numeroRegistro || undefined,
        edition_number: formData.numeroEdicao || undefined,
        epigraph: formData.inscricoes || undefined,
        condition_state: ({'Excellent':'excellent','Good':'good','Fair':'fair','Poor':'poor'} as Record<string, 'excellent' | 'good' | 'fair' | 'poor' | 'in_restoration'>)[formData.estadoConservacao] ?? 'excellent',
        copyright_holder: formData.direitosAutorais || undefined,
        certificate_of_authenticity: formData.possuiCOA,
        classification: (formData.classificacao === 'singular' && formData.parentSeriesId) ? 'series' : (formData.classificacao === 'serie' ? 'series' : (formData.classificacao === 'colecao' ? 'collection' : 'singular')),
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

  const [openTooltip, setOpenTooltip] = useState<string | null>(null);
  const [suggestingField, setSuggestingField] = useState<string | null>(null);

  const handleSuggestField = async (field: string, label: string, info: string) => {
    try {
      setSuggestingField(field);
      const isSeries = formData.classificacao === 'serie' && formData.isNewHierarchy;
      const prompt = `Você é um curador de arte profissional ajudando um artista a preencher a ficha técnica institucional de sua ${isSeries ? 'série (conjunto de obras)' : 'obra'}.
A ${isSeries ? 'série' : 'obra'} tem os seguintes dados parciais preenchidos: ${JSON.stringify(formData)}
Sua tarefa é sugerir um preenchimento para o campo: "${label}".
A instrução para este campo é: "${info}".
Retorne APENAS o texto sugerido para ser inserido diretamente no campo, sem aspas, sem introdução e sem explicações extras, sendo direto e técnico.`;
      const suggestion = await callAI(prompt);
      setFormData(prev => ({ ...prev, [field]: suggestion.trim().replace(/^["']|["']$/g, '') }));
    } catch (err: unknown) {
      alert('Erro ao gerar sugestão: ' + (err as Error).message);
    } finally {
      setSuggestingField(null);
    }
  };

  const inp = (label: string, field: string, opts?: {span2?: boolean; rows?: number; font?: string; info?: string; readOnly?: boolean}) => {
    const id = `inp-${field}`;
    return (
      <div className={opts?.span2 ? 'md:col-span-2' : ''}>
        <label htmlFor={id} className="flex items-center gap-1 text-xs font-bold text-text-muted mb-1">
          {label}
          {opts?.info && (
            <span className="relative inline-flex">
              <button
                type="button"
                aria-label={`Info sobre ${label}`}
                onClick={() => setOpenTooltip(openTooltip === id ? null : id)}
                className="text-accent/60 hover:text-accent transition-colors leading-none"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
              </button>
              {openTooltip === id && (
                <div className="absolute z-50 left-0 top-5 w-72 bg-gray-900 text-white text-xs rounded-xl p-3 shadow-xl leading-relaxed border border-gray-700">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-gray-300 font-normal">{opts.info}</span>
                    <button type="button" onClick={() => setOpenTooltip(null)} className="ml-2 text-gray-400 hover:text-white shrink-0">✕</button>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => handleSuggestField(field, label, opts.info!)}
                    disabled={suggestingField === field}
                    className="mt-2 w-full flex items-center justify-center gap-1.5 bg-accent/10 hover:bg-accent/20 text-accent font-bold py-2 rounded-lg transition-colors border border-accent/20 disabled:opacity-50 disabled:cursor-wait"
                  >
                    {suggestingField === field ? (
                      <span className="animate-pulse flex items-center gap-1">⏳ Analisando...</span>
                    ) : (
                      <>✨ Sugerir com IA</>
                    )}
                  </button>
                </div>
              )}
            </span>
          )}
        </label>
        {opts?.rows ? (
          <textarea id={id} value={(formData as Record<string, string | boolean>)[field] as string} onChange={e => setFormData({...formData, [field]: e.target.value})} rows={opts.rows} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-accent outline-none bg-bg resize-none" />
        ) : (
          <input id={id} type="text" readOnly={opts?.readOnly} value={(formData as Record<string, string | boolean>)[field] as string} onChange={e => !opts?.readOnly && setFormData({...formData, [field]: e.target.value})} className={`w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:border-accent outline-none bg-bg ${opts?.readOnly ? 'opacity-70 bg-gray-50 cursor-not-allowed font-medium' : ''} ${opts?.font || ''}`} />
        )}
      </div>
    );
  };

  const dimInput = () => (
    <div>
      <label className="flex items-center gap-1 text-xs font-bold text-text-muted mb-1">
        Dimensões (H × L × P)
        <span className="relative inline-flex">
          <button type="button" onClick={() => setOpenTooltip(openTooltip === 'dim' ? null : 'dim')} className="text-accent/60 hover:text-accent transition-colors leading-none" aria-label="Info sobre Dimensões">
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
          </button>
          {openTooltip === 'dim' && (
            <div className="absolute z-50 left-0 top-5 w-72 bg-gray-900 text-white text-xs rounded-xl p-3 shadow-xl leading-relaxed border border-gray-700">
              <div className="flex justify-between items-start">
                <span className="text-gray-300 font-normal">Medidas exatas de Altura, Largura e Profundidade em centímetros. Para obras flexíveis, utilize "dimensões variáveis".</span>
                <button type="button" onClick={() => setOpenTooltip(null)} className="ml-2 text-gray-400 hover:text-white shrink-0">✕</button>
              </div>
            </div>
          )}
        </span>
      </label>
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

  const renderChatUI = (onSkip: () => void, onReview: () => void) => (
    <div className="flex flex-col h-[500px] animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="flex-1 overflow-y-auto pr-4 space-y-4 mb-4">
        {messages.filter(m => m.role !== 'system').map((msg, i) => {
          const contentToDisplay = msg.content.replace(/```json\n[\s\S]*?\n```/, '').trim();
          if (!contentToDisplay) return null;
          return (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl px-5 py-3 ${msg.role === 'user' ? 'bg-accent text-white rounded-br-none' : 'bg-gray-100 text-text-main rounded-bl-none'}`}>
                <p className="whitespace-pre-wrap text-sm">{contentToDisplay}</p>
              </div>
            </div>
          );
        })}
        {aiLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-2xl px-5 py-3 rounded-bl-none flex items-center gap-2">
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"/>
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce animation-delay-200"/>
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce animation-delay-400"/>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>
      
      <div className="flex flex-col gap-4 border-t border-gray-100 pt-4">
        <div className="flex gap-3 overflow-x-auto pb-2">
          <div className="shrink-0 w-20 h-20 border-2 border-dashed border-accent/40 rounded-xl overflow-hidden flex items-center justify-center bg-white hover:bg-accent/5 cursor-pointer" onClick={()=>photoRefs.current[0]?.click()}>
            <input ref={el=>{photoRefs.current[0]=el}} type="file" accept="image/*" className="hidden" onChange={e=>handlePhotoSlot(0,e)} title="Foto de capa" aria-label="Foto de capa" placeholder="Foto de capa" />
            {photos[0].url ? <img src={photos[0].url} alt="Foto de capa" title="Foto de capa" className="w-full h-full object-cover"/> : <Camera size={24} className="text-accent/50"/>}
          </div>
          {[1,2,3,4].map(i => photos[i-1].url ? (
            <div key={i} className="shrink-0 w-20 h-20 border-2 border-dashed border-gray-200 rounded-xl overflow-hidden flex items-center justify-center bg-white hover:bg-gray-50 cursor-pointer" onClick={()=>photoRefs.current[i]?.click()}>
              <input ref={el=>{photoRefs.current[i]=el}} type="file" accept="image/*" className="hidden" onChange={e=>handlePhotoSlot(i,e)} title={`Foto adicional ${i}`} aria-label={`Foto adicional ${i}`} placeholder={`Foto adicional ${i}`} />
              {photos[i].url ? <img src={photos[i].url} alt={`Foto adicional ${i}`} title={`Foto adicional ${i}`} className="w-full h-full object-cover"/> : <Plus size={24} className="text-gray-300"/>}
            </div>
          ) : null)}
        </div>

        <form onSubmit={handleChatSubmit} className="flex gap-2">
          <input 
            type="text" 
            value={chatInput} 
            onChange={e => setChatInput(e.target.value)}
            placeholder="Descreva a obra, inspirações, materiais..." 
            className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-accent outline-none bg-bg"
            disabled={aiLoading}
          />
          <button type="submit" disabled={aiLoading || !chatInput.trim()} className="bg-accent text-white px-6 py-3 rounded-xl font-bold hover:bg-accent/90 disabled:opacity-50">
            Enviar
          </button>
        </form>
        
        {messages.some(m => m.content.includes('```json')) && (
          <div className="flex justify-center mt-2">
            <button onClick={onReview} className="text-sm font-bold text-accent hover:underline flex items-center gap-1">
              Revisar Ficha Técnica Gerada <ChevronRight size={16}/>
            </button>
          </div>
        )}
        
        <div className="flex justify-center mt-2">
            <button type="button" onClick={onSkip} className="text-xs text-gray-400 hover:text-accent transition-colors">
              Pular conversa e ir para formulário manual
            </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-bg text-text-main pb-24 md:pb-12 pt-20">
      {loadingEdit ? (
        <div className="flex items-center justify-center min-h-[500px]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent"></div>
        </div>
      ) : (
        <>
      <div className="max-w-4xl mx-auto px-6">
        
          <div className="mb-8">
            <h1 className="text-3xl font-serif mb-2">
              {editId 
                ? 'Editar Ficha Técnica'
                : formData.classificacao === 'serie' ? 'Nova Série' : 
                  formData.classificacao === 'colecao' ? 'Nova Coleção' : 
                  'Nova Obra'}
            </h1>
            <p className="text-text-muted">
              {formData.classificacao === 'serie' ? 'Siga os passos para catalogar e estruturar sua série' : 
               formData.classificacao === 'colecao' ? 'Siga os passos para criar um novo acervo ou fundo' : 
               'Siga os passos para catalogar e analisar sua obra'}
            </p>
          </div>

      <div className="flex gap-4 mb-8">
        {[
          { id: 1, label: formData.classificacao === 'singular' ? '1. Imagem & Tipo' : '1. Registro' }, 
          { id: 2, label: formData.classificacao === 'singular' ? '2. Vinculação' : (formData.isNewHierarchy ? '1. Chat por IA' : '1. Vinculação') }, 
          { id: 3, label: formData.classificacao === 'singular' ? '2. Ficha Técnica' : '2. Ficha Técnica' }
        ].map(s => {
          if (s.id === 2 && formData.classificacao === 'singular') return null;
          if (s.id === 1 && formData.classificacao !== 'singular') return null;
          const isActive = step === s.id; const isPast = step > s.id;
          return (<div key={s.id} className={`flex-1 h-2 rounded-full relative ${isActive ? 'bg-accent' : isPast ? 'bg-accent/40' : 'bg-gray-200'}`}>
            <span className={`absolute -top-6 text-xs font-bold whitespace-nowrap ${isActive ? 'text-accent' : 'text-gray-400'}`}>{s.label}</span>
          </div>);
        })}
      </div>

      <div className="bg-surface rounded-2xl shadow-float border border-gray-100 p-8 min-h-[500px]">

        {/* STEP 1: Chat Curatorial / Classificação (Only for Singular or if they haven't passed type) */}
        {step === 1 && isChatting ? (
          renderChatUI(
            () => setIsChatting(false),
            () => {
              setIsChatting(false);
              if (formData.classificacao === 'singular') setStep(3);
              else setStep(2);
            }
          )
        ) : step === 1 && !isChatting && (
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
              
              {formData.classificacao === 'singular' && (
                <div className="mt-10 p-6 rounded-2xl border-2 border-accent/20 bg-accent/5 flex flex-col md:flex-row items-center justify-between gap-6">
                  <div>
                    <h3 className="text-lg font-bold text-accent mb-2">Modo Assistente (Recomendado)</h3>
                    <p className="text-sm text-text-muted">Converse com a IA para extrair automaticamente a ficha técnica, curadoria e dimensões de forma fluida.</p>
                  </div>
                  <button onClick={() => setIsChatting(true)} className="shrink-0 bg-accent text-white px-6 py-3 rounded-xl font-bold hover:bg-accent/90 shadow-float">
                    Preencher com IA
                  </button>
                </div>
              )}
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
            
            {formData.isNewHierarchy && isChatting && (
               <div className="mt-8 border-t border-gray-100 pt-8">
                 <h3 className="text-xl font-serif mb-2">Vamos registrar sua criação ✨</h3>
                 <p className="text-text-muted mb-4">Me conta sobre ela do jeito que você quiser.</p>
                 {renderChatUI(
                    () => { setIsChatting(false); setStep(3); },
                    () => { setIsChatting(false); setStep(3); }
                 )}
               </div>
            )}


            {!formData.isNewHierarchy && (
              <div className="mt-6 bg-gray-50 p-6 rounded-xl border border-gray-100">
                <label htmlFor="parent-selector" className="block text-sm font-bold text-text-main mb-2">Selecione</label>
                {formData.classificacao === 'serie' ? (
                  <select id="parent-selector" value={formData.parentSeriesId} onChange={e => setFormData({...formData, parentSeriesId: e.target.value})} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-accent outline-none bg-white">
                    <option value="">Selecione uma série...</option>
                    {seriesList.map(s => <option key={s.series_id} value={s.series_id}>{s.series_title}</option>)}
                  </select>
                ) : (
                  <select id="parent-selector" value={formData.parentCollectionId} onChange={e => setFormData({...formData, parentCollectionId: e.target.value})} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-accent outline-none bg-white">
                    <option value="">Selecione uma coleção...</option>
                    {collections.map(c => <option key={c.collection_id} value={c.collection_id}>{c.collection_name}</option>)}
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

            {/* AI Mode old section removed since we use conversational UI now */}
            
            <div className="animate-in fade-in">
                {/* OBRA SINGULAR — Ficha Completa */}
                {formData.classificacao === 'singular' && (
                  <div className="space-y-8">
                    {sec('I', 'Dados de Identificação Básica', <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="inp-tipoObjeto" className="flex items-center gap-1 text-xs font-bold text-text-muted mb-1">Tipo de Objeto</label>
                        <select id="inp-tipoObjeto" value={formData.tipoObjeto} onChange={e => setFormData({...formData, tipoObjeto: e.target.value})} className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:border-accent outline-none bg-bg">
                          <option value="Painting">Pintura (Painting)</option>
                          <option value="Drawing">Desenho (Drawing)</option>
                          <option value="Sculpture">Escultura (Sculpture)</option>
                          <option value="Photography">Fotografia (Photography)</option>
                          <option value="Installation">Instalação (Installation)</option>
                          <option value="Digital Art">Arte Digital (Digital Art)</option>
                          <option value="Mixed Media">Técnica Mista (Mixed Media)</option>
                          <option value="Performance">Performance</option>
                          <option value="Print">Gravura/Impressão (Print)</option>
                          <option value="Textile">Têxtil (Textile)</option>
                          <option value="Other">Outro (Other)</option>
                        </select>
                      </div>
                      {inp('Título *','titulo',{font:'font-serif text-lg',info:'O nome oficial atribuído pelo artista. Em performances, pode incluir variações conforme a edição.'})}
                      <div className="flex flex-col gap-1 md:col-span-2">
                        <label htmlFor="series-selector-singular" className="text-sm font-bold text-text-muted mb-1 flex items-center gap-1">
                          Título da Série / Vínculo
                          <span className="relative inline-flex">
                            <button type="button" onClick={() => setOpenTooltip(openTooltip === 'serie-singular' ? null : 'serie-singular')} className="text-accent/60 hover:text-accent transition-colors leading-none"><svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg></button>
                            {openTooltip === 'serie-singular' && (
                              <div className="absolute z-50 left-0 top-5 w-72 bg-gray-900 text-white text-xs rounded-xl p-3 shadow-xl leading-relaxed border border-gray-700">
                                <div className="flex justify-between items-start mb-2">
                                  <span className="text-gray-300 font-normal">Termo controlado. Ao selecionar uma série, esta obra será recuperada automaticamente junto ao seu conjunto, facilitando a gestão curatorial do acervo.</span>
                                  <button type="button" onClick={() => setOpenTooltip(null)} className="ml-2 text-gray-400 hover:text-white shrink-0">✕</button>
                                </div>
                              </div>
                            )}
                          </span>
                        </label>
                        <select 
                          id="series-selector-singular"
                          value={formData.parentSeriesId || ''} 
                          onChange={e => setFormData({...formData, parentSeriesId: e.target.value})}
                          className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:border-accent outline-none bg-bg"
                        >
                          <option value="">Não pertence a nenhuma série (Obra Independente)</option>
                          {seriesList.map(s => (
                            <option key={s.series_id} value={s.series_id}>{s.series_title}</option>
                          ))}
                        </select>
                      </div>
                      {inp('Autoria','autoria',{readOnly:true, info:'Nome completo do criador ou coletivo. Pode incluir o nome artístico ou o estúdio (agente).'})}
                      {inp('Data / Período','ano',{info:'Ano ou intervalo de criação. Para performances, marca a data da primeira exibição pública.'})}
                      <TagInput
                        id="inp-tecnica"
                        label="Materiais e Técnicas / Medium"
                        value={formData.tecnica}
                        onChange={val => setFormData({...formData, tecnica: val})}
                        suggestions={MATERIALS_VOCAB}
                        placeholder="Ex: Acrylic, Gold Leaf, Ink..."
                      />
                      <TagInput
                        id="inp-suporte"
                        label="Suporte / Support"
                        value={formData.suporte}
                        onChange={val => setFormData({...formData, suporte: val})}
                        suggestions={SUPPORTS_VOCAB}
                        placeholder="Ex: Cotton Canvas, Paper 300g..."
                      />
                      {dimInput()}
                      {inp('Inscrições e Marcas','inscricoes',{info:'Registro de assinaturas, dedicatórias, selos ou numerações presentes no objeto e sua localização exata.'})}
                      {inp('Descrição Curta','sentencaResumo',{span2:true,info:'Resumo do conteúdo visual (cores, formas, motivos) que permite identificar a peça mesmo na ausência de uma fotografia.'})}
                      {inp('Narrativa Curatorial','narrativaCuratorial',{span2:true,rows:4,info:'Texto interpretativo que contextualiza a obra no conjunto da produção artística. Pode ser adaptado para diferentes públicos e situações de exibição.'})}
                    </div>)}
                    {sec('II', 'Dados Técnicos para Acervo e Gestão (Dossiê)', <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {inp('Número de Registro (Tombo)','numeroRegistro',{info:'Código único e exclusivo que vincula o objeto físico ao seu registro documental. Nunca deve ser reutilizado.'})}
                      <div>
                        <label htmlFor="inp-formaAquisicao" className="flex items-center gap-1 text-xs font-bold text-text-muted mb-1">Forma de Aquisição</label>
                        <select id="inp-formaAquisicao" value={formData.formaAquisicao} onChange={e => setFormData({...formData, formaAquisicao: e.target.value})} className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:border-accent outline-none bg-bg">
                          <option value="">Selecione...</option>
                          <option value="Donation">Doação (Donation)</option>
                          <option value="Purchase">Compra (Purchase)</option>
                          <option value="Commission">Encomenda (Commission)</option>
                          <option value="Consignment">Consignação (Consignment)</option>
                          <option value="Exchange">Permuta (Exchange)</option>
                          <option value="Gift">Presente (Gift)</option>
                          <option value="Transfer">Transferência (Transfer)</option>
                        </select>
                      </div>
                      {inp('Procedência e Histórico','procedencia',{span2:true,rows:2,info:'Registro cronológico de antigos proprietários e da trajetória da obra até a sua institucionalização.'})}
                      <div>
                        <label htmlFor="inp-estadoConservacao" className="flex items-center gap-1 text-xs font-bold text-text-muted mb-1">Estado de Conservação</label>
                        <select id="inp-estadoConservacao" value={formData.estadoConservacao} onChange={e => setFormData({...formData, estadoConservacao: e.target.value})} className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:border-accent outline-none bg-bg">
                          <option value="Excellent">Excelente (Excellent)</option>
                          <option value="Good">Bom (Good)</option>
                          <option value="Fair">Regular (Fair)</option>
                          <option value="Poor">Precário (Poor)</option>
                        </select>
                      </div>
                      {inp('Localização Física','localizacao',{info:'Indicação precisa de onde a obra está guardada ou exposta. Ex: Sala X, Gaveta Y.'})}
                      {inp('Valor','valor',{info:'Valor financeiro de mercado ou de aquisição, usado para balizar transações e avaliações patrimoniais.'})}
                      {inp('Valor do Seguro','seguro',{info:'Base para apólices. Em performances, pode incluir custos de logística, saúde e passagens das intérpretes.'})}
                      {inp('Número de Edição','numeroEdicao',{info:'Ex: 1/10, 2/10. Indica a posição desta obra dentro de uma tiragem limitada.'})}
                      <div className="flex flex-col gap-1">
                        <label htmlFor="inp-status-venda" className="text-xs font-bold text-text-muted mb-1">Status de Venda</label>
                        <select id="inp-status-venda" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:border-accent outline-none bg-bg">
                          <option value="Disponível">Disponível</option>
                          <option value="Vendida">Vendida</option>
                          <option value="Reservada">Reservada</option>
                          <option value="Coleção Privada">Coleção Privada</option>
                          <option value="Não à venda">Não à venda</option>
                        </select>
                      </div>
                      {inp('Detentor dos Direitos Autorais','direitosAutorais',{info:'Nome ou entidade que detém os direitos de reprodução e exibição da obra.'})}
                    </div>)}
                    
                    {/* Ficha para Performances */}
                    {sec('III', 'Ficha Curatorial para Performances (Modelos 2025/2026)', <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {inp('Protocolo de Ativação (Roteiro)','protocoloAtivacao',{span2:true,rows:3,info:'Conjunto de instruções detalhadas que definem como a performance deve ser executada para manter sua integridade artística.'})}
                      {inp('Perfil do Performer','perfilPerformer',{info:'Requisitos de habilidades (ex: dança, música) ou perfis demográficos específicos exigidos pela artista para os executantes.'})}
                      <div>
                        <label htmlFor="inp-duracao" className="flex items-center gap-1 text-xs font-bold text-text-muted mb-1">Duração</label>
                        <select id="inp-duracao" value={formData.duracao} onChange={e => setFormData({...formData, duracao: e.target.value})} className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:border-accent outline-none bg-bg">
                          <option value="">Selecione...</option>
                          <option value="Short (up to 30 min)">Curta — até 30 min</option>
                          <option value="Medium (30–90 min)">Média — 30 a 90 min</option>
                          <option value="Long Duration (over 2 hours)">Longa — mais de 2h</option>
                          <option value="Variable Duration">Duração Variável</option>
                        </select>
                      </div>
                      {inp('Elementos Inegociáveis','elementosInegociveis',{span2:true,rows:2,info:'Parâmetros fixos que não podem ser alterados. Ex: iluminação específica, silêncio absoluto. Garantem a integridade poética da obra.'})}
                    </div>)}
                    
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
                      {inp('Recursos Híbridos / Multimídia (ex: Instalação sonora)', 'recursosHibridos', {info:'Detalhamento de componentes extras, como instalações sonoras ou vídeos que acompanham a obra física.'})}
                      {inp('Suporte Digital / Mídia (ex: NFT, Custom Software)', 'suporteDigital', {info:'Especificação técnica do formato de arquivos ou software. Ex: NFT, MP4, custom software.'})}
                      {inp('Registro / Hash do Smart Contract (Blockchain)', 'hashBlockchain', {info:'O identificador digital único e imutável gravado na blockchain, que serve como prova definitiva de autenticidade e proveniência.'})}
                      <div className="flex flex-col gap-1">
                        <label htmlFor="inp-redeBlockchain" className="flex items-center gap-1 text-xs font-bold text-text-muted mb-1">
                          Rede Blockchain
                          <span className="relative inline-flex">
                            <button type="button" onClick={() => setOpenTooltip(openTooltip === 'rede' ? null : 'rede')} className="text-accent/60 hover:text-accent transition-colors leading-none" aria-label="Info sobre Rede Blockchain">
                              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                            </button>
                            {openTooltip === 'rede' && (
                              <div className="absolute z-50 left-0 top-5 w-64 bg-gray-900 text-white text-xs rounded-xl px-3 py-2 shadow-xl leading-relaxed">
                                A rede descentralizada utilizada para o registro da obra. Ex: Ethereum, Tezos, Solana.
                                <button type="button" onClick={() => setOpenTooltip(null)} className="ml-2 text-gray-400 hover:text-white">✕</button>
                              </div>
                            )}
                          </span>
                        </label>
                        <select id="inp-redeBlockchain" value={formData.redeBlockchain} onChange={e=>setFormData({...formData, redeBlockchain: e.target.value})} className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:border-accent outline-none bg-bg">
                          <option value="Ethereum">Ethereum</option>
                          <option value="Polygon">Polygon</option>
                          <option value="Tezos">Tezos</option>
                          <option value="Solana">Solana</option>
                          <option value="Base">Base</option>
                          <option value="Other">Outra (Other)</option>
                        </select>
                      </div>
                      <div className="flex flex-col gap-1 md:col-span-2">
                        <label className="text-sm font-bold text-text-muted mb-1 flex items-center justify-between">
                          <span className="flex items-center gap-1">
                            Código do Certificado (COA ID) / Unique ID -
                            <span className="relative inline-flex">
                              <button type="button" onClick={() => setOpenTooltip(openTooltip === 'coaId' ? null : 'coaId')} className="text-accent/60 hover:text-accent transition-colors leading-none"><svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg></button>
                              {openTooltip === 'coaId' && (
                                <div className="absolute z-50 left-0 top-5 w-64 bg-gray-900 text-white text-xs rounded-xl px-3 py-2 shadow-xl leading-relaxed">
                                  Número de série único gerado automaticamente pelo sistema, usado para vincular a obra física ao arquivo digital e blockchain.
                                  <button type="button" onClick={() => setOpenTooltip(null)} className="ml-2 text-gray-400 hover:text-white">✕</button>
                                </div>
                              )}
                            </span>
                          </span>
                        </label>
                        <div className="flex gap-2">
                          <input 
                            id="inp-registroCertificado"
                            type="text" 
                            readOnly
                            value={formData.registroCertificado} 
                            onChange={e => setFormData({...formData, registroCertificado: e.target.value})} 
                            className="flex-1 border border-gray-200 rounded-lg px-4 py-2 text-sm focus:border-accent outline-none bg-gray-50 text-gray-500 font-mono" 
                            placeholder="Clique em Gerar para criar ID único"
                          />
                          <button 
                            type="button" 
                            onClick={generateCoaId}
                            className="px-4 py-2 bg-accent/10 text-accent font-bold rounded-lg hover:bg-accent/20 transition-colors text-sm whitespace-nowrap border border-accent/20"
                          >
                            Gerar COA
                          </button>
                          {formData.registroCertificado && (
                            <button
                              type="button"
                              onClick={handleGenerateCOAPDF}
                              disabled={isGeneratingCOAPDF}
                              className="flex items-center gap-1.5 px-4 py-2 bg-accent text-white font-bold rounded-lg hover:bg-accent/90 transition-colors text-sm whitespace-nowrap shadow-sm disabled:opacity-60 disabled:cursor-wait"
                              title="Baixar Certificado de Autenticidade em PDF"
                            >
                              {isGeneratingCOAPDF ? (
                                <span className="animate-spin inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full" />
                              ) : (
                                <FileDown size={16} />
                              )}
                              {isGeneratingCOAPDF ? 'Gerando...' : 'Baixar COA'}
                            </button>
                          )}
                        </div>
                      </div>
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
                    {sec('I', 'Identificação da Série', 
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1 md:col-span-2">
                          <label htmlFor="series-parent-collection" className="text-sm font-bold text-text-muted mb-1 flex items-center gap-1">
                            Nome da Coleção ou Fundo
                            <span className="relative inline-flex">
                              <button type="button" onClick={() => setOpenTooltip(openTooltip === 'serie-fundo' ? null : 'serie-fundo')} className="text-accent/60 hover:text-accent transition-colors leading-none"><svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg></button>
                              {openTooltip === 'serie-fundo' && (
                                <div className="absolute z-50 left-0 top-5 w-72 bg-gray-900 text-white text-xs rounded-xl p-3 shadow-xl leading-relaxed border border-gray-700">
                                  <div className="flex justify-between items-start mb-2">
                                    <span className="text-gray-300 font-normal">Situa a série dentro de um "fundo" ou coleção geral.</span>
                                    <button type="button" onClick={() => setOpenTooltip(null)} className="ml-2 text-gray-400 hover:text-white shrink-0">✕</button>
                                  </div>
                                </div>
                              )}
                            </span>
                          </label>
                          <select 
                            id="series-parent-collection"
                            value={formData.parentCollectionId} 
                            onChange={e => setFormData({...formData, parentCollectionId: e.target.value})}
                            className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:border-accent outline-none bg-bg"
                          >
                            <option value="">Ainda não pertence a nenhuma coleção</option>
                            {collections.map(c => (
                              <option key={c.collection_id} value={c.collection_id}>{c.collection_name}</option>
                            ))}
                          </select>
                        </div>
                        {inp('Título da Série *','titulo',{font:'font-serif text-lg', info:'O nome atribuído ao conjunto temático ou conceitual.'})}
                        {inp('Artista','autoria',{readOnly:true, info:'Seu nome profissional (Nany Arruda).'})}
                        {inp('Número de Identificação da Série','numeroSerie',{info:'Código de controle que indica a posição da série na coleção (ex: Série 01).'})}
                        {inp('Quantidade de Itens','quantidadePrevista',{info:'Número total de obras que compõem a série até o momento.'})}
                        {inp('Datas-Limite','periodoProducao',{info:'O ano de início e o ano de conclusão (ou "em curso") da produção dessa série específica.'})}
                      </div>
                    )}

                    {sec('II', 'Especificações Técnicas do Conjunto',
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {inp('Técnica/Materiais Predominantes','tecnicas',{span2:true, rows:2, info:'Descrição dos meios físicos comuns à série (ex: "Aquarela e acrílica sobre papel" ou "Mídia mista com água do mar").'})}
                        {inp('Regras de Edição/Numeração','regrasEdicao',{info:'Se a série for de múltiplos (gravuras/fotografias), registre o formato da tiragem (ex: "Edições de 1 a 10 + 2 PA").'})}
                        {inp('Local de Produção','locaisCriacao',{info:'Indicação geográfica onde a série foi desenvolvida (importante para marcar sua trajetória Brasil/EUA/Portugal).'})}
                        {inp('Suporte','suportes',{info:'O tipo de superfície padrão utilizada nas obras do conjunto.'})}
                      </div>
                    )}

                    {sec('III', 'Conteúdo Curatorial (Interpretativo)',
                      <div className="grid grid-cols-1 gap-4">
                        {inp('Lógica de Unidade (Grande Ideia)','logicaUnidade',{rows:3, info:'Um texto curto (20 a 75 palavras) que introduz o subtema ou o conceito que conecta todas as peças. É o que as fontes chamam de "Group Label" (Legenda de Grupo).'})}
                        {inp('Sinestesia Sonora Coletiva','sinestesiaSonora',{rows:2, info:'Caso a série inteira seja baseada em um álbum ou gênero musical específico, este metadado deve ser destacado aqui.'})}
                        {inp('Resumo Conceitual','resumoConceitual',{rows:3, info:'Apresentação das intenções espirituais e teóricas que fundamentam o conjunto.'})}
                      </div>
                    )}

                    {sec('IV', 'Gestão e Circulação da Série',
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1">
                          <label htmlFor="statusSerie" className="text-sm font-bold text-text-muted mb-1 flex items-center gap-1">Status da Série</label>
                          <select id="statusSerie" value={formData.statusSerie} onChange={e=>setFormData({...formData, statusSerie: e.target.value})} className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:border-accent outline-none bg-bg">
                            <option value="Em andamento">Em andamento</option>
                            <option value="Finalizada">Finalizada</option>
                            <option value="Arquivada">Arquivada</option>
                          </select>
                        </div>
                        {inp('Estado de Conservação Geral','estadoConservacao',{info:'Diagnóstico da condição física média das obras da série.'})}
                        {inp('Histórico da Série (Proveniência)','historicoSerie',{span2:true, rows:3, info:'Registro da trajetória do conjunto, incluindo prêmios recebidos pela série ou aquisições de grandes blocos da série por colecionadores.'})}
                        {inp('Circulação','circulacaoSerie',{span2:true, rows:2, info:'Lista de exposições (individuais ou coletivas) onde a série foi apresentada como um conjunto.'})}
                      </div>
                    )}
                  </div>
                )}

                {/* SÉRIE — Obra dentro de série existente */}
                {formData.classificacao === 'serie' && !formData.isNewHierarchy && (
                  <div className="space-y-8">
                    <div className="bg-accent/5 border border-accent/20 rounded-xl p-4 mb-2"><p className="text-sm font-medium text-accent">Obra vinculada a uma Série existente. Campos herdados automaticamente.</p></div>
                    {sec('I', 'Dados da Obra', <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1 md:col-span-2">
                        <label htmlFor="series-selector-linked" className="text-sm font-bold text-text-muted mb-1 flex items-center gap-1">Título da Série (Termo Controlado)</label>
                        <select 
                          id="series-selector-linked"
                          value={formData.parentSeriesId || ''} 
                          onChange={e => setFormData({...formData, parentSeriesId: e.target.value})}
                          className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:border-accent outline-none bg-accent/5 font-medium"
                        >
                          <option value="">Selecione uma série...</option>
                          {seriesList.map(s => (
                            <option key={s.series_id} value={s.series_id}>{s.series_title}</option>
                          ))}
                        </select>
                      </div>
                      {inp('Título da Obra *','titulo',{span2:true, font:'font-serif text-lg', info:'O título específico desta peça dentro da série.'})}
                      {inp('Nº de Edição (ex: 1/10)','numeroEdicao', {info:'Para obras de múltiplos ou edições em gravura/fotografia.'})}
                      {inp('Variação dentro da Série','variacaoSerie', {info:'O que difere esta obra das outras do mesmo conjunto (ex: variação de cor, material ou momento).'})}
                      {inp('Técnica','tecnica', {info:'Técnica específica desta obra (pode divergir levemente da técnica geral da série).'})}
                      {dimInput()}
                    </div>)}
                    {sec('II', 'Detalhes', <div className="space-y-4">{inp('Descrição da Variação (Curadoria)','narrativaCuratorial',{rows:3, info:'Texto descritivo ou curatorial específico desta peça, explicando sua função ou posição dentro da narrativa da série.'})}</div>)}
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
                    {sec('I', 'Dados da Obra', <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{inp('Título da Obra *','titulo',{span2:true, font:'font-serif text-lg'})}{inp('Técnica','tecnica')}{inp('Suporte','suporte')}{dimInput()}{inp('Autoria','autoria',{readOnly:true})}</div>)}
                    {sec('II', 'Curadoria', <div className="space-y-4">{inp('Descrição','narrativaCuratorial',{rows:3})}</div>)}
                  </div>
                )}
              </div>
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
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-8 py-3 rounded-xl font-bold bg-accent text-white hover:bg-accent/90 hover-float transition-all shadow-float disabled:opacity-50">
            {saving ? 'Salvando...' : 'Salvar Registro'}
          </button>
        )}
      </div>

      </div>
      </>
      )}
    </div>
  );
}
