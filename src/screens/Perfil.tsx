import { useState, useEffect } from 'react';
import { Briefcase, Loader2, PenLine, Sparkles, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../services/supabase';
import { callAI } from '../services/ai';
import { SmartImport } from '../components/perfil/SmartImport';
import type { ListItem } from '../components/perfil/AddList';
import type { FormState, SocialLink } from '../components/perfil/TabPessoal';
import { TabPessoal } from '../components/perfil/TabPessoal';
import { TabArtistico } from '../components/perfil/TabArtistico';
import { TabTrajetoria } from '../components/perfil/TabTrajetoria';
import { TabIdentidadeVisual } from '../components/perfil/TabIdentidadeVisual';
import { uid } from '../lib/imageUtils';

type ImportedData = Record<string, unknown>;

export default function Perfil() {
  const { t } = useTranslation();

  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [generatingBioCurta, setGeneratingBioCurta] = useState(false);
  const [generatingBioCompleta, setGeneratingBioCompleta] = useState(false);
  const [generatingStatement, setGeneratingStatement] = useState(false);
  const [optimizingProcesso, setOptimizingProcesso] = useState(false);

  const [profileTab, setProfileTab] = useState<'pessoal' | 'artistico' | 'trajetoria' | 'identidadeVisual'>('pessoal');
  const [seloUrl, setSeloUrl] = useState<string | null>(null);
  const [assinaturaUrl, setAssinaturaUrl] = useState<string | null>(null);
  const [fotosProfissionais, setFotosProfissionais] = useState<string[]>([]);
  const [isEditing, setIsEditing] = useState(false);

  const [artistId, setArtistId] = useState<number | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<FormState>({
    nome: '',
    nomeArtistico: '',
    nacionalidade: '',
    cidade: '',
    nascimento: '',
    email: '',
    website: '',
    bioShort: '',
    bioLong: '',
    tags: '',
    telefone: '',
    whatsapp: '',
    pronome: '',
    cidade_nascimento: '',
    pais_nascimento: '',
    pais_atual: '',
    mostrar_contato_publico: false,
    disponivel_exposicoes: false,
    disponivel_residencias: false,
    disponivel_comissoes: false,
    disponivel_colaboracoes: false,
    statement: '',
    processo_criativo: '',
    tecnicas_recorrentes: '',
    temas_centrais: '',
    pesquisa_artistica: '',
    referencias_conceituais: '',
    ano_inicio_carreira: '',
  });

  const [instagrams, setInstagrams] = useState<string[]>([]);
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);

  // Listas de Trajetória / Currículo originais
  const [formacao, setFormacao] = useState<ListItem[]>([]);
  const [premios, setPremios] = useState<ListItem[]>([]);
  const [residencias, setResidencias] = useState<ListItem[]>([]);
  const [exposIndividuais, setExposIndividuais] = useState<ListItem[]>([]);
  const [exposColetivas, setExposColetivas] = useState<ListItem[]>([]);
  const [publicacoes, setPublicacoes] = useState<ListItem[]>([]);

  // Novas listas dinâmicas virtualizadas
  const [bolsas, setBolsas] = useState<ListItem[]>([]);
  const [feiras, setFeiras] = useState<ListItem[]>([]);
  const [bienais, setBienais] = useState<ListItem[]>([]);
  const [bibliografia, setBibliografia] = useState<ListItem[]>([]);
  const [publicacoesAutora, setPublicacoesAutora] = useState<ListItem[]>([]);
  const [clipping, setClipping] = useState<ListItem[]>([]);
  const [colecoesPublicas, setColecoesPublicas] = useState<ListItem[]>([]);
  const [colecoesPrivadas, setColecoesPrivadas] = useState<ListItem[]>([]);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase.from('artista').select('*').eq('user_id', user.id).maybeSingle();
        if (error && error.code !== 'PGRST116') {
          alert('Erro ao carregar perfil: ' + error.message);
        }
        if (data) {
          if (data.id) setArtistId(data.id);

          const cleanData: Record<string, unknown> = {};
          Object.entries(data as Record<string, unknown>).forEach(([key, val]) => {
            if (val !== null && val !== undefined) {
              const lowerKey = key.toLowerCase();
              if (lowerKey === 'nomeartistico') cleanData.nomeArtistico = val;
              else if (lowerKey === 'bioshort') cleanData.bioShort = val;
              else if (lowerKey === 'biolong') cleanData.bioLong = val;
              else cleanData[key] = val;
            }
          });

          interface CustomMetadata {
            pronome?: string;
            cidade_nascimento?: string;
            pais_nascimento?: string;
            pais_atual?: string;
            mostrar_contato_publico?: boolean;
            disponivel_exposicoes?: boolean;
            disponivel_residencias?: boolean;
            disponivel_comissoes?: boolean;
            disponivel_colaboracoes?: boolean;
            processo_criativo?: string;
            tecnicas_recorrentes?: string;
            temas_centrais?: string;
            pesquisa_artistica?: string;
            referencias_conceituais?: string;
            ano_inicio_carreira?: string;
            bolsas?: unknown[];
            feiras?: unknown[];
            bienais?: unknown[];
            bibliografia?: unknown[];
            publicacoesAutora?: unknown[];
            clipping?: unknown[];
            colecoesPublicas?: unknown[];
            colecoesPrivadas?: unknown[];
          }

          let meta: CustomMetadata = {};
          const ensureArray = (v: unknown): unknown[] => {
            if (Array.isArray(v)) return v;
            if (typeof v === 'string' && v.trim().startsWith('[')) {
              try {
                const parsed = JSON.parse(v);
                if (Array.isArray(parsed)) return parsed;
              } catch { /* ignore */ }
            }
            return [];
          };

          if (data.social_links) {
            const arr = ensureArray(data.social_links) as { id: string; [key: string]: unknown }[];
            const found = arr.find((l) => l.id === 'custom_metadata');
            if (found) {
              meta = found as unknown as CustomMetadata;
            }
            setSocialLinks(arr.filter((l) => l.id !== 'custom_metadata') as unknown as SocialLink[]);
          }

          setForm((f) => ({
            ...f,
            ...(cleanData as unknown as Partial<typeof form>),
            pronome: meta.pronome || '',
            cidade_nascimento: meta.cidade_nascimento || '',
            pais_nascimento: meta.pais_nascimento || '',
            pais_atual: meta.pais_atual || '',
            mostrar_contato_publico: !!meta.mostrar_contato_publico,
            disponivel_exposicoes: !!meta.disponivel_exposicoes,
            disponivel_residencias: !!meta.disponivel_residencias,
            disponivel_comissoes: !!meta.disponivel_comissoes,
            disponivel_colaboracoes: !!meta.disponivel_colaboracoes,
            processo_criativo: meta.processo_criativo || '',
            tecnicas_recorrentes: meta.tecnicas_recorrentes || '',
            temas_centrais: meta.temas_centrais || '',
            pesquisa_artistica: meta.pesquisa_artistica || '',
            referencias_conceituais: meta.referencias_conceituais || '',
            ano_inicio_carreira: meta.ano_inicio_carreira || '',
          }));

          if (data.foto_url) setPhotoUrl(data.foto_url);
          if (data.selo_url) setSeloUrl(data.selo_url);
          if (data.assinatura_url) setAssinaturaUrl(data.assinatura_url);
          if (data.fotos_profissionais) setFotosProfissionais(ensureArray(data.fotos_profissionais) as string[]);
          if (data.instagrams) setInstagrams(ensureArray(data.instagrams) as string[]);
          if (data.formacao) setFormacao(ensureArray(data.formacao) as ListItem[]);
          if (data.premios) setPremios(ensureArray(data.premios) as ListItem[]);
          if (data.residencias) setResidencias(ensureArray(data.residencias) as ListItem[]);
          if (data.expos_individuais) setExposIndividuais(ensureArray(data.expos_individuais) as ListItem[]);
          if (data.expos_coletivas) setExposColetivas(ensureArray(data.expos_coletivas) as ListItem[]);
          if (data.publicacoes) setPublicacoes(ensureArray(data.publicacoes) as ListItem[]);

          if (meta.bolsas) setBolsas(ensureArray(meta.bolsas) as ListItem[]);
          if (meta.feiras) setFeiras(ensureArray(meta.feiras) as ListItem[]);
          if (meta.bienais) setBienais(ensureArray(meta.bienais) as ListItem[]);
          if (meta.bibliografia) setBibliografia(ensureArray(meta.bibliografia) as ListItem[]);
          if (meta.publicacoesAutora) setPublicacoesAutora(ensureArray(meta.publicacoesAutora) as ListItem[]);
          if (meta.clipping) setClipping(ensureArray(meta.clipping) as ListItem[]);
          if (meta.colecoesPublicas) setColecoesPublicas(ensureArray(meta.colecoesPublicas) as ListItem[]);
          if (meta.colecoesPrivadas) setColecoesPrivadas(ensureArray(meta.colecoesPrivadas) as ListItem[]);
        }
      } catch (err) {
        console.error('Falha severa ao carregar perfil:', err);
      } finally {
        setProfileLoaded(true);
      }
    };
    loadProfile();
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

  const handleGenerateBioCurta = async () => {
    setGeneratingBioCurta(true);
    try {
      const prompt = `Você é um curador de arte contemporânea de prestígio. Escreva uma Biografia Curta (Short Bio) institucional de impacto para a artista ${form.nomeArtistico || form.nome || 'Nany Arruda'}, de nacionalidade ${form.nacionalidade || 'Brasil'}, cidade atual ${form.cidade || 'Rio de Janeiro'}.
Foque em resumir sua formação, principais mídias e trajetória em um tom profissional, elegante e conciso.
REQUISITO CRÍTICO: O texto gerado deve ter no MÁXIMO 120 palavras.
Retorne APENAS o texto puro da biografia curta, sem introduções ou observações.`;
      const text = await callAI(prompt);
      if (text) {
        setForm((f) => ({ ...f, bioShort: text.trim() }));
      }
    } catch (e) {
      alert((e as Error).message || 'Erro ao gerar bio curta com IA');
    }
    setGeneratingBioCurta(false);
  };

  const handleGenerateBioCompleta = async () => {
    setGeneratingBioCompleta(true);
    try {
      const prompt = `Você é um crítico e curador de arte internacional. Escreva uma Biografia Completa / Institucional de alto impacto para a artista ${form.nomeArtistico || form.nome || 'Nany Arruda'}, de nacionalidade ${form.nacionalidade || 'Brasil'}, cidade atual ${form.cidade || 'Rio de Janeiro'}.
O texto deve descrever a formação artística, a pesquisa de atelier, o histórico de participações/exposições de forma fluida, e o posicionamento da artista no circuito de arte contemporânea.
Mantenha a biografia estruturada em 3 a 4 parágrafos bem elaborados, em tom institucional elegante.
Retorne APENAS o texto completo da biografia, sem introduções ou formatação markdown adicional.`;
      const text = await callAI(prompt);
      if (text) {
        setForm((f) => ({ ...f, bioLong: text.trim() }));
      }
    } catch (e) {
      alert((e as Error).message || 'Erro ao gerar biografia completa com IA');
    }
    setGeneratingBioCompleta(false);
  };

  const handleOptimizeProcessoCriativo = async () => {
    if (!form.processo_criativo.trim()) {
      alert('Por favor, escreva um rascunho ou algumas palavras sobre seu processo criativo antes de otimizar.');
      return;
    }
    setOptimizingProcesso(true);
    try {
      const prompt = `Você é um curador e revisor de textos de arte. Otimize e amadureça o rascunho de texto abaixo sobre o Processo Criativo da artista ${form.nomeArtistico || form.nome || 'Nany Arruda'}.
Deixe o texto mais poético, profissional, coeso e fluído, elevando o vocabulário para os padrões de catálogos e dossiês de arte contemporânea. Preserve a essência e as técnicas relatadas.
RASCUNHO DA ARTISTA:
"${form.processo_criativo}"

Retorne APENAS o texto otimizado, sem introduções ou explicações.`;
      const text = await callAI(prompt);
      if (text) {
        setForm((f) => ({ ...f, processo_criativo: text.trim() }));
      }
    } catch (e) {
      alert((e as Error).message || 'Erro ao otimizar texto com IA');
    }
    setOptimizingProcesso(false);
  };

  const handleGenerateStatement = async () => {
    setGeneratingStatement(true);
    try {
      const prompt = `Você é um curador de arte contemporânea. Escreva um Artist Statement (Declaração de Artista) conceitual e poético para a artista ${form.nomeArtistico || form.nome || 'Nany Arruda'}. Foque em temas centrais como ${form.temas_centrais || 'a memória, a transitoriedade e a forma'} e técnicas recorrentes como ${form.tecnicas_recorrentes || 'técnicas conceituais'}. Mantenha em torno de 150 a 200 palavras. Retorne apenas o texto puro do statement.`;
      const text = await callAI(prompt);
      if (text) {
        setForm((f) => ({ ...f, statement: text.trim() }));
      }
    } catch (e) {
      alert((e as Error).message || 'Erro ao gerar statement com IA');
    }
    setGeneratingStatement(false);
  };

  const handleSave = async () => {
    if (!profileLoaded) {
      alert('Aguarde o carregamento do perfil.');
      return;
    }
    setSaving(true);

    try {
      const metadataItem = {
        id: 'custom_metadata',
        pronome: form.pronome,
        cidade_nascimento: form.cidade_nascimento,
        pais_nascimento: form.pais_nascimento,
        pais_atual: form.pais_atual,
        mostrar_contato_publico: form.mostrar_contato_publico,
        disponivel_exposicoes: form.disponivel_exposicoes,
        disponivel_residencias: form.disponivel_residencias,
        disponivel_comissoes: form.disponivel_comissoes,
        disponivel_colaboracoes: form.disponivel_colaboracoes,
        processo_criativo: form.processo_criativo,
        tecnicas_recorrentes: form.tecnicas_recorrentes,
        temas_centrais: form.temas_centrais,
        pesquisa_artistica: form.pesquisa_artistica,
        referencias_conceituais: form.referencias_conceituais,
        ano_inicio_carreira: form.ano_inicio_carreira,
        bolsas,
        feiras,
        bienais,
        bibliografia,
        publicacoesAutora,
        clipping,
        colecoesPublicas,
        colecoesPrivadas
      };

      const cleanLinks = socialLinks.filter((l) => l.id !== 'custom_metadata');
      const socialLinksPayload = [...cleanLinks, metadataItem];

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const payload = {
        ...(artistId ? { id: artistId } : {}),
        user_id: user.id,
        nome: form.nome,
        nacionalidade: form.nacionalidade,
        cidade: form.cidade,
        nascimento: form.nascimento,
        email: form.email,
        website: form.website,
        nomeartistico: form.nomeArtistico,
        bioshort: form.bioShort,
        biolong: form.bioLong,
        tags: form.tags,
        telefone: form.telefone,
        whatsapp: form.whatsapp,
        statement: form.statement,
        foto_url: photoUrl,
        selo_url: seloUrl,
        assinatura_url: assinaturaUrl,
        fotos_profissionais: fotosProfissionais,
        instagrams: instagrams,
        social_links: socialLinksPayload,
        formacao: formacao,
        premios: premios,
        residencias: residencias,
        expos_individuais: exposIndividuais,
        expos_coletivas: exposColetivas,
        publicacoes: publicacoes,
        updated_at: new Date().toISOString(),
      };

      if (artistId) {
        const { error } = await supabase.from('artista').update(payload).eq('id', artistId);
        if (error) {
          alert('Erro ao atualizar perfil: ' + error.message);
          return;
        }
      } else {
        const { error } = await supabase.from('artista').insert(payload);
        if (error) {
          alert('Erro ao criar perfil: ' + error.message);
          return;
        }
      }
      alert('Perfil salvo com sucesso!');
    } catch (err) {
      console.error(err);
      alert('Erro inesperado ao salvar o perfil.');
    } finally {
      setSaving(false);
    }
  };

  const handleImport = (data: ImportedData) => {
    setIsEditing(true);
    const strKeys = ['nome', 'nomeArtistico', 'nacionalidade', 'cidade', 'email', 'bioShort', 'bioLong', 'website', 'telefone', 'whatsapp', 'statement'] as const;
    strKeys.forEach((k) => { if (data[k]) setForm((f) => ({ ...f, [k]: String(data[k]) })); });
    if (Array.isArray(data.instagrams)) {
      setInstagrams((prev) => Array.from(new Set([...prev, ...(data.instagrams as string[])])));
    }
    const toList = (arr: unknown[]) => arr.map((i) => ({ id: uid(), ...(i as object) }));
    if (Array.isArray(data.formacao)) setFormacao((prev) => [...prev, ...toList(data.formacao as unknown[])]);
    if (Array.isArray(data.premios)) setPremios((prev) => [...prev, ...toList(data.premios as unknown[])]);
    if (Array.isArray(data.residencias)) setResidencias((prev) => [...prev, ...toList(data.residencias as unknown[])]);
    if (Array.isArray(data.exposIndividuais)) setExposIndividuais((prev) => [...prev, ...toList(data.exposIndividuais as unknown[])]);
    if (Array.isArray(data.exposColetivas)) setExposColetivas((prev) => [...prev, ...toList(data.exposColetivas as unknown[])]);
    if (Array.isArray(data.publicacoes)) setPublicacoes((prev) => [...prev, ...toList(data.publicacoes as unknown[])]);
  };

  const currentFormAsRecord: Record<string, unknown> = {
    ...form,
    instagrams,
    formacao,
    premios,
    residencias,
    exposIndividuais,
    exposColetivas,
    publicacoes,
    bolsas,
    feiras,
    bienais,
    bibliografia,
    publicacoesAutora,
    clipping,
    colecoesPublicas,
    colecoesPrivadas
  };

  return (
    <div className="max-w-[900px] mx-auto pb-28 space-y-8">
      <div>
        <h1 className="text-3xl font-serif mb-1">{t('perfil.title', 'Meu Perfil')}</h1>
        <p className="text-text-muted">{t('perfil.subtitle', 'Gerencie suas informações profissionais, artísticas e de carreira.')}</p>
      </div>

      {/* Importador Inteligente por Documento (PDF), URL ou Texto — sempre acessível */}
      <SmartImport currentData={currentFormAsRecord} onImport={handleImport} t={t} />

      {/* Modern Premium Tabs */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setProfileTab('pessoal')}
          className={`flex-1 py-4 text-center font-bold text-sm transition-all border-b-2 outline-none flex items-center justify-center gap-2 ${
            profileTab === 'pessoal'
              ? 'border-gold text-gold font-serif'
              : 'border-transparent text-text-muted hover:text-text-main hover:border-border'
          }`}
        >
          <User size={16} />
          {t('perfil.pessoal', 'Perfil Pessoal')}
        </button>
        <button
          onClick={() => setProfileTab('artistico')}
          className={`flex-1 py-4 text-center font-bold text-sm transition-all border-b-2 outline-none flex items-center justify-center gap-2 ${
            profileTab === 'artistico'
              ? 'border-gold text-gold font-serif'
              : 'border-transparent text-text-muted hover:text-text-main hover:border-border'
          }`}
        >
          <Sparkles size={16} />
          {t('perfil.artistico', 'Perfil Artístico')}
        </button>
        <button
          onClick={() => setProfileTab('trajetoria')}
          className={`flex-1 py-4 text-center font-bold text-sm transition-all border-b-2 outline-none flex items-center justify-center gap-2 ${
            profileTab === 'trajetoria'
              ? 'border-gold text-gold font-serif'
              : 'border-transparent text-text-muted hover:text-text-main hover:border-border'
          }`}
        >
          <Briefcase size={16} />
          {t('perfil.trajetoria_curriculo', 'Trajetória & Currículo')}
        </button>
        <button
          onClick={() => setProfileTab('identidadeVisual')}
          className={`flex-1 py-4 text-center font-bold text-sm transition-all border-b-2 outline-none flex items-center justify-center gap-2 ${
            profileTab === 'identidadeVisual'
              ? 'border-gold text-gold font-serif'
              : 'border-transparent text-text-muted hover:text-text-main hover:border-border'
          }`}
        >
          <Sparkles size={16} />
          {t('perfil.identidade_visual_fotos', 'Identidade Visual & Fotos')}
        </button>
      </div>

      {/* Tab 1: PERFIL PESSOAL */}
      {profileTab === 'pessoal' && (
        <TabPessoal
          form={form}
          setForm={setForm}
          isEditing={isEditing}
          photoUrl={photoUrl}
          uploading={uploading}
          handlePhotoUpload={handlePhotoUpload}
          instagrams={instagrams}
          setInstagrams={setInstagrams}
          socialLinks={socialLinks}
          setSocialLinks={setSocialLinks}
          t={t}
        />
      )}

      {/* Tab 2: PERFIL ARTÍSTICO & POÉTICA */}
      {profileTab === 'artistico' && (
        <TabArtistico
          form={form}
          setForm={setForm}
          isEditing={isEditing}
          generatingBioCurta={generatingBioCurta}
          handleGenerateBioCurta={handleGenerateBioCurta}
          generatingBioCompleta={generatingBioCompleta}
          handleGenerateBioCompleta={handleGenerateBioCompleta}
          generatingStatement={generatingStatement}
          handleGenerateStatement={handleGenerateStatement}
          optimizingProcesso={optimizingProcesso}
          handleOptimizeProcessoCriativo={handleOptimizeProcessoCriativo}
          t={t}
        />
      )}

      {/* Tab 3: EXPOSIÇÕES & TRAJETÓRIA */}
      {profileTab === 'trajetoria' && (
        <TabTrajetoria
          isEditing={isEditing}
          t={t}
          formacao={formacao}
          setFormacao={setFormacao}
          premios={premios}
          setPremios={setPremios}
          bolsas={bolsas}
          setBolsas={setBolsas}
          residencias={residencias}
          setResidencias={setResidencias}
          exposIndividuais={exposIndividuais}
          setExposIndividuais={setExposIndividuais}
          exposColetivas={exposColetivas}
          setExposColetivas={setExposColetivas}
          feiras={feiras}
          setFeiras={setFeiras}
          bienais={bienais}
          setBienais={setBienais}
          bibliografia={bibliografia}
          setBibliografia={setBibliografia}
          publicacoesAutora={publicacoesAutora}
          setPublicacoesAutora={setPublicacoesAutora}
          clipping={clipping}
          setClipping={setClipping}
          colecoesPublicas={colecoesPublicas}
          setColecoesPublicas={setColecoesPublicas}
          colecoesPrivadas={colecoesPrivadas}
          setColecoesPrivadas={setColecoesPrivadas}
        />
      )}

      {/* Tab 4: IDENTIDADE VISUAL & FOTOS */}
      {profileTab === 'identidadeVisual' && (
        <TabIdentidadeVisual
          isEditing={isEditing}
          t={t}
          seloUrl={seloUrl}
          setSeloUrl={setSeloUrl}
          assinaturaUrl={assinaturaUrl}
          setAssinaturaUrl={setAssinaturaUrl}
          fotosProfissionais={fotosProfissionais}
          setFotosProfissionais={setFotosProfissionais}
        />
      )}

      {/* Fixed Save Button */}
      <div className="fixed bottom-0 md:left-[220px] left-0 right-0 bg-bg/85 backdrop-blur-md border-t border-border p-4 flex justify-end z-20 shadow-gold-glow-sm">
        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center justify-center w-full md:w-auto gap-2 px-8 py-3 bg-gold text-bg font-bold rounded-xl hover:bg-gold-light transition-all shadow-gold-glow hover-lift"
          >
            <PenLine size={18} /> {t('perfil.editar_perfil', 'Editar Perfil')}
          </button>
        ) : (
          <div className="flex gap-3 w-full md:w-auto">
            <button
              onClick={() => {
                setIsEditing(false);
                window.location.reload();
              }}
              className="flex items-center justify-center flex-1 md:flex-none gap-2 px-6 py-3 bg-surface border border-border text-text-muted hover:text-text-main font-bold rounded-xl transition-all"
            >
              {t('cancelar', 'Cancelar')}
            </button>
            <button
              onClick={async () => {
                await handleSave();
                setIsEditing(false);
              }}
              disabled={saving}
              className="flex items-center justify-center flex-1 md:flex-none gap-2 px-8 py-3 bg-gold text-bg font-bold rounded-xl hover:bg-gold-light disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-gold-glow hover-lift"
            >
              {saving ? <><Loader2 size={18} className="animate-spin" /> {t('perfil.salvando', 'Salvando')}...</> : t('perfil.salvar_perfil', 'Salvar Perfil')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
