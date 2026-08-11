import React, { useState, useEffect } from 'react';
import { ChevronRight, ChevronLeft, Plus } from 'lucide-react';
import { saveArtwork, createCollection, createSerie, supabase } from '../services/supabase';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { Artwork } from '../types';
import { callAIChat, callAI } from '../services/ai';
import { downloadCertificate } from '../lib/generateCertificate';
import type { CertificateData } from '../components/common/CertificatePDF';
import { formatCOAID, translateTitle } from '../lib/pdfHelpers';
import { PhotoSlots } from '../components/upload/PhotoSlots';
import { ChatPanel } from '../components/upload/ChatPanel';
import { ArtworkForm } from '../components/upload/ArtworkForm';

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

  const [messages, setMessages] = useState<{ role: 'system' | 'user' | 'assistant'; content: string }[]>([
    { role: 'assistant', content: 'Vamos registrar sua criação ✨\nMe conta sobre ela do jeito que você quiser.' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isChatting, setIsChatting] = useState(false);

  const [collections, setCollections] = useState<{ collection_id: string; collection_name: string }[]>([]);
  const [seriesList, setSeriesList] = useState<{ series_id: string; series_title: string }[]>([]);

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

  const [photos, setPhotos] = useState<PhotoSlot[]>(Array.from({ length: 5 }, () => ({ file: null, url: '', label: '', w: 0, h: 0 })));

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

            setFormData((prev) => ({
              ...prev,
              classificacao: 'singular',
              parentCollectionId: artwork.collection_reference || '',
              parentSeriesId: artwork.series_reference || '',
              isNewHierarchy: false,
              titulo: artwork.artwork_title || '',
              tipoObjeto: artwork.medium || 'Pintura',
              autoria: artwork.artist_name || 'Nany Arruda',
              ano: artwork.creation_year?.toString() || artwork.creation_date || '',
              tecnica: artwork.artistic_technique || artwork.medium || '',
              suporte: artwork.materials && artwork.materials.length > 0 ? artwork.materials.join(', ') : (artwork.support || ''),
              dimensaoW: artwork.width?.toString() || '',
              dimensaoH: artwork.height?.toString() || '',
              dimensaoD: artwork.depth?.toString() || '',
              dimensaoUnidade: artwork.dimensions_unit || 'cm',
              sentencaResumo: artwork.summary_sentence || '',
              narrativaCuratorial: artwork.curatorial_narrative || '',
              inscricoes: artwork.epigraph || '',
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
              valor: artwork.price?.toString() || '',
              status: ({ 'available': 'Disponível', 'sold': 'Vendida', 'reserved': 'Reservada', 'private_collection': 'Coleção Privada', 'not_for_sale': 'Não à venda' } as Record<string, string>)[artwork.sale_status] ?? 'Disponível',
              direitosAutorais: artwork.copyright_holder || '',
              possuiCOA: artwork.certificate_of_authenticity || false,
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

            const newPhotos = Array.from({ length: 5 }, () => ({
              file: null, url: '', label: '', w: 0, h: 0
            }));
            if (artwork.cover_image) {
              newPhotos[0] = { file: null, url: artwork.cover_image, label: '', w: 0, h: 0 };
            }
            const extras = (artwork.artwork_images ?? []).filter((u) => u !== artwork.cover_image);
            extras.slice(0, 4).forEach((url, i) => {
              newPhotos[i + 1] = { file: null, url, label: '', w: 0, h: 0 };
            });
            setPhotos(newPhotos);
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
    img.onload = () => { const s = [...photos]; s[i] = { file: f, url, label: '', w: img.width, h: img.height }; setPhotos(s); };
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

      const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch) {
        try {
          const d = JSON.parse(jsonMatch[1]);
          setFormData((f) => ({
            ...f,
            titulo: d.title || f.titulo,
            classificacao: d.type === 'serie' || d.type === 'colecao' ? d.type : 'singular',
            ano: d.year || f.ano,
            tecnica: d.medium || f.tecnica,
            narrativaCuratorial: d.curatorial_notes || d.theme || f.narrativaCuratorial,
            dimensaoW: d.dimensions ? d.dimensions.split('x')[0] || '' : f.dimensaoW,
          }));
        } catch (err) {
          console.error('Failed to parse JSON from AI', err);
        }
      }
    } catch (e: unknown) {
      alert('Erro IA: ' + ((e as Error).message));
    } finally {
      setAiLoading(false);
    }
  };

  const generateCoaId = async () => {
    const missing: string[] = [];
    if (!formData.titulo.trim()) missing.push('Título');
    if (!formData.tecnica?.trim()) missing.push('Técnica');
    if (!formData.dimensaoH && !formData.dimensaoW) missing.push('Dimensões (H ou L)');
    if (missing.length > 0) {
      alert(`Preencha os campos obrigatórios antes de gerar o COA ID:\n• ${missing.join('\n• ')}`);
      return;
    }

    try {
      const { data, error } = await supabase.from('artworks').select('intent_note');
      if (error) throw error;

      let maxId = 999;
      const existingCoas = new Set<string>();

      data?.forEach((row) => {
        if (row.intent_note) {
          try {
            const parsed = JSON.parse(row.intent_note);
            if (parsed.registroCertificado) {
              const coa = parsed.registroCertificado as string;
              existingCoas.add(coa);
              const match = coa.match(/^NA-[^-]+-(\d{4})/);
              if (match?.[1]) {
                const id = parseInt(match[1], 10);
                if (id > maxId) maxId = id;
              }
            }
          } catch { /* ignore */ }
        }
      });

      const nextId = maxId + 1;
      const iniciais = 'NA';
      const matchAno = formData.ano?.match(/\d{4}/);
      const year = matchAno ? matchAno[0] : new Date().getFullYear().toString();

      let edicaoStr = '';
      if (formData.numeroEdicao) {
        const num = formData.numeroEdicao.trim().toUpperCase().replace(/AP\s+/g, 'AP');
        edicaoStr = `-${num}`;
      } else if (formData.status === 'AP') {
        edicaoStr = `-AP`;
      }

      const newCoa = `${iniciais}-${year}-${nextId}${edicaoStr}`;

      if (existingCoas.has(newCoa)) {
        alert(`⚠️ O COA ID "${newCoa}" já existe no acervo.\nO próximo ID disponível será gerado automaticamente na próxima tentativa.`);
        return;
      }

      setFormData((prev) => ({ ...prev, registroCertificado: newCoa }));
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

      const seriesTitle = seriesList.find((s) => s.series_id === formData.parentSeriesId)?.series_title || '—';

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
      if (formData.classificacao === 'colecao' && formData.isNewHierarchy) {
        await createCollection({
          collection_name: formData.titulo,
          collection_description: formData.narrativaCuratorial || undefined,
          artistic_theme: formData.criterioInclusao || undefined,
          start_date: formData.ano || undefined,
        });
        alert('✅ Coleção criada com sucesso!'); navigate('/obras'); return;
      }
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

      const dimF = [formData.dimensaoW, formData.dimensaoH, formData.dimensaoD].filter(Boolean).join(' × ') + (formData.dimensaoUnidade ? ' ' + formData.dimensaoUnidade : '');
      const imgs = photos.filter((p) => p.file).map((p) => p.file as File);
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
        materials: formData.suporte ? formData.suporte.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
        dimensions_formatted: dimF || undefined,
        height: parseFloat(formData.dimensaoH) || undefined,
        width: parseFloat(formData.dimensaoW) || undefined,
        depth: parseFloat(formData.dimensaoD) || undefined,
        dimensions_unit: formData.dimensaoUnidade,
        sale_status: ({ 'Disponível': 'available', 'Vendida': 'sold', 'Reservada': 'reserved', 'Coleção Privada': 'private_collection', 'Não à venda': 'not_for_sale' } as Record<string, 'available' | 'sold' | 'reserved' | 'private_collection' | 'not_for_sale'>)[formData.status] ?? 'available',
        price: parseFloat(formData.valor) || undefined,
        physical_location: formData.localizacao || undefined,
        summary_sentence: formData.sentencaResumo || undefined,
        curatorial_narrative: formData.narrativaCuratorial || undefined,
        inventory_number: formData.numeroRegistro || undefined,
        edition_number: formData.numeroEdicao || undefined,
        epigraph: formData.inscricoes || undefined,
        condition_state: ({ 'Excellent': 'excellent', 'Good': 'good', 'Fair': 'fair', 'Poor': 'poor' } as Record<string, 'excellent' | 'good' | 'fair' | 'poor' | 'in_restoration'>)[formData.estadoConservacao] ?? 'excellent',
        copyright_holder: formData.direitosAutorais || undefined,
        certificate_of_authenticity: formData.possuiCOA,
        classification: (formData.classificacao === 'singular' && formData.parentSeriesId) ? 'series' : (formData.classificacao === 'serie' ? 'series' : (formData.classificacao === 'colecao' ? 'collection' : 'singular')),
        intent_note: JSON.stringify(extraData),
      }, imgs);
      alert('✅ Obra salva com sucesso!'); navigate('/obras');
    } catch (err: unknown) { alert('Erro ao salvar: ' + (err as Error).message); }
    finally { setSaving(false); }
  };

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
      setFormData((prev) => ({ ...prev, [field]: suggestion.trim().replace(/^["']|["']$/g, '') }));
    } catch (err: unknown) {
      alert('Erro ao gerar sugestão: ' + (err as Error).message);
    } finally {
      setSuggestingField(null);
    }
  };

  return (
    <div className="min-h-screen bg-bg text-text-main pb-24 md:pb-12 pt-20">
      {loadingEdit ? (
        <div className="flex items-center justify-center min-h-[500px]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent"></div>
        </div>
      ) : (
        <div className="max-w-4xl mx-auto px-6">
          <div className="mb-8">
            <h1 className="text-3xl font-serif mb-2 text-gold font-bold">
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
            ].map((s) => {
              if (s.id === 2 && formData.classificacao === 'singular') return null;
              if (s.id === 1 && formData.classificacao !== 'singular') return null;
              const isActive = step === s.id; const isPast = step > s.id;
              return (
                <div key={s.id} className={`flex-1 h-2 rounded-full relative ${isActive ? 'bg-gold' : isPast ? 'bg-gold/45' : 'bg-border'}`}>
                  <span className={`absolute -top-6 text-xs font-bold whitespace-nowrap ${isActive ? 'text-gold' : 'text-text-muted'}`}>{s.label}</span>
                </div>
              );
            })}
          </div>

          <div className="glass-slab rounded-2xl p-8 min-h-[500px]">
            {step === 1 && isChatting ? (
              <ChatPanel
                messages={messages}
                aiLoading={aiLoading}
                chatInput={chatInput}
                setChatInput={setChatInput}
                handleChatSubmit={handleChatSubmit}
                photos={photos}
                handlePhotoSlot={handlePhotoSlot}
                onSkip={() => setIsChatting(false)}
                onReview={() => {
                  setIsChatting(false);
                  if (formData.classificacao === 'singular') setStep(3);
                  else setStep(2);
                }}
              />
            ) : step === 1 && !isChatting && (
              <div className="space-y-10 animate-in fade-in slide-in-from-right-4 duration-500">
                <section>
                  <h2 className="text-2xl font-serif mb-6 text-text-main">O que você deseja registrar?</h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                      { id: 'singular', label: 'Obra Singular', desc: 'Obra única — abre ficha técnica completa' },
                      { id: 'serie', label: 'Série', desc: 'Criar ou adicionar obra a uma série' },
                      { id: 'colecao', label: 'Coleção', desc: 'Criar ou adicionar obra a uma coleção' }
                    ].map((tipo) => (
                      <button
                        key={tipo.id}
                        onClick={() => setFormData({ ...formData, classificacao: tipo.id })}
                        className={`p-6 rounded-2xl border text-left transition-all flex flex-col gap-2 ${
                          formData.classificacao === tipo.id ? 'border-gold bg-gold/10 text-gold shadow-gold-glow-sm' : 'border-border bg-surface text-text-main hover:border-gold/30 hover:bg-surface-raised'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${formData.classificacao === tipo.id ? 'border-gold' : 'border-border'}`}>
                            {formData.classificacao === tipo.id && <div className="w-2 h-2 bg-gold rounded-full" />}
                          </div>
                          <span className="font-serif text-lg">{tipo.label}</span>
                        </div>
                        <p className={`text-sm ml-7 ${formData.classificacao === tipo.id ? 'text-gold-light' : 'text-text-muted'}`}>{tipo.desc}</p>
                      </button>
                    ))}
                  </div>

                  {formData.classificacao === 'singular' && (
                    <div className="mt-10 p-6 rounded-2xl border border-gold-dim bg-gold/5 flex flex-col md:flex-row items-center justify-between gap-6">
                      <div>
                        <h3 className="text-lg font-bold text-gold mb-2">Modo Assistente (Recomendado)</h3>
                        <p className="text-sm text-text-muted">Converse com a IA para extrair automaticamente a ficha técnica, curadoria e dimensões de forma fluida.</p>
                      </div>
                      <button onClick={() => setIsChatting(true)} className="shrink-0 bg-gold text-bg px-6 py-3 rounded-xl font-bold hover:bg-gold-light shadow-gold-glow-sm transition-all">
                        Preencher com IA
                      </button>
                    </div>
                  )}
                </section>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                <h2 className="text-2xl font-serif mb-6 text-text-main">{formData.classificacao === 'serie' ? 'Contexto da Série' : 'Contexto da Coleção'}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button
                    onClick={() => setFormData({ ...formData, isNewHierarchy: false })}
                    className={`p-6 rounded-2xl border text-left transition-all ${!formData.isNewHierarchy ? 'border-gold bg-gold/10 text-gold shadow-gold-glow-sm' : 'border-border bg-surface text-text-main hover:border-gold/30 hover:bg-surface-raised'}`}
                  >
                    <h3 className="font-bold mb-2">Escolher Existente</h3>
                    <p className="text-sm text-text-muted">Adicionar obra a um(a) {formData.classificacao === 'serie' ? 'série' : 'coleção'} já cadastrado(a).</p>
                  </button>
                  <button
                    onClick={() => setFormData({ ...formData, isNewHierarchy: true })}
                    className={`p-6 rounded-2xl border text-left transition-all ${formData.isNewHierarchy ? 'border-gold bg-gold/10 text-gold shadow-gold-glow-sm' : 'border-border bg-surface text-text-main hover:border-gold/30 hover:bg-surface-raised'}`}
                  >
                    <div className="flex items-center gap-2 mb-2"><Plus size={18} className="text-gold" /><h3 className="font-bold">Criar Nova {formData.classificacao === 'serie' ? 'Série' : 'Coleção'}</h3></div>
                    <p className="text-sm text-text-muted">Preencher ficha curatorial do agrupamento.</p>
                  </button>
                </div>

                {!formData.isNewHierarchy && (
                  <div className="mt-6 bg-surface-raised border border-border p-6 rounded-xl">
                    <label htmlFor="parent-selector" className="block text-sm font-bold text-text-main mb-2">Selecione</label>
                    {formData.classificacao === 'serie' ? (
                      <select id="parent-selector" value={formData.parentSeriesId} onChange={(e) => setFormData({ ...formData, parentSeriesId: e.target.value })} className="w-full border border-border rounded-xl px-4 py-3 text-sm focus:border-gold focus:ring-1 focus:ring-gold/30 outline-none bg-bg text-text-main">
                        <option value="">Selecione uma série...</option>
                        {seriesList.map((s) => <option key={s.series_id} value={s.series_id}>{s.series_title}</option>)}
                      </select>
                    ) : (
                      <select id="parent-selector" value={formData.parentCollectionId} onChange={(e) => setFormData({ ...formData, parentCollectionId: e.target.value })} className="w-full border border-border rounded-xl px-4 py-3 text-sm focus:border-gold focus:ring-1 focus:ring-gold/30 outline-none bg-bg text-text-main">
                        <option value="">Selecione uma coleção...</option>
                        {collections.map((c) => <option key={c.collection_id} value={c.collection_id}>{c.collection_name}</option>)}
                      </select>
                    )}
                  </div>
                )}
              </div>
            )}

            {step === 3 && (
              <ArtworkForm
                formData={formData}
                setFormData={setFormData}
                seriesList={seriesList}
                MATERIALS_VOCAB={MATERIALS_VOCAB}
                SUPPORTS_VOCAB={SUPPORTS_VOCAB}
                openTooltip={openTooltip}
                setOpenTooltip={setOpenTooltip}
                suggestingField={suggestingField}
                handleSuggestField={handleSuggestField}
                generateCoaId={generateCoaId}
                handleGenerateCOAPDF={handleGenerateCOAPDF}
                isGeneratingCOAPDF={isGeneratingCOAPDF}
                photoSection={<PhotoSlots photos={photos} handlePhotoSlot={handlePhotoSlot} />}
              />
            )}

            <div className="flex justify-between items-center mt-10 pt-6 border-t border-border">
              {step > 1 ? (
                <button onClick={handleBack} className="flex items-center gap-2 px-6 py-2.5 rounded-xl border border-border text-text-muted hover:text-text-main hover:bg-surface-raised transition-all font-bold text-sm">
                  <ChevronLeft size={16} /> Voltar
                </button>
              ) : <div />}

              {step < 3 ? (
                <button onClick={handleNext} className="flex items-center gap-2 px-8 py-2.5 rounded-xl bg-gold text-bg font-bold text-sm hover:bg-gold-light transition-all shadow-gold-glow-sm">
                  Próximo Passo <ChevronRight size={16} />
                </button>
              ) : (
                <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-8 py-2.5 rounded-xl bg-gold text-bg font-bold text-sm hover:bg-gold-light transition-all shadow-gold-glow-sm disabled:opacity-50">
                  {saving ? 'Salvando...' : 'Salvar e Concluir'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
