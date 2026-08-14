import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, saveOnboardingStep, completeOnboarding, uploadToStorage } from '../services/supabase';
import ptStrings from '../i18n/pt';
import enStrings from '../i18n/en';
import esStrings from '../i18n/es';
import deStrings from '../i18n/de';
import { StepPessoal } from '../components/onboarding/StepPessoal';
import { StepArtistico } from '../components/onboarding/StepArtistico';
import { StepTrajetoria } from '../components/onboarding/StepTrajetoria';
import { StepMarca } from '../components/onboarding/StepMarca';
import { StepFotos } from '../components/onboarding/StepFotos';
import { StepCertificado } from '../components/onboarding/StepCertificado';
import { SmartImport } from '../components/perfil/SmartImport';
import type { ListItem } from '../components/perfil/AddList';

export interface WizardData {
  nome: string;
  nomeartistico: string;
  email: string;
  nascimento: string;
  nacionalidade: string;
  cidade: string;
  telefone: string;
  whatsapp: string;
  website: string;
  foto_url: string;
  pronome: string;
  cidade_nascimento: string;
  pais_nascimento: string;
  estado_nascimento: string;
  pais_atual: string;
  estado_atual: string;
  tel_ddi: string;
  tel_ddd: string;
  tel_numero: string;
  same_whatsapp: boolean;
  bioshort: string;
  biolong: string;
  statement: string;
  tags: string;
  instagrams: string[];
  processo_criativo: string;
  tecnicas_recorrentes: string;
  temas_centrais: string;
  pesquisa_artistica: string;
  referencias_conceituais: string;
  ano_inicio_carreira: string;
  formacao: ListItem[];
  expos_individuais: ListItem[];
  expos_coletivas: ListItem[];
  premios: ListItem[];
  residencias: ListItem[];
  publicacoes: ListItem[];
  bolsas: ListItem[];
  feiras: ListItem[];
  clipping: ListItem[];
  colecoesPublicas: ListItem[];
  colecoesPrivadas: ListItem[];
  selo_url: string;
  assinatura_url: string;
  fotos_profissionais: string[];
}

const EMPTY_DATA: WizardData = {
  nome: '',
  nomeartistico: '',
  email: '',
  nascimento: '',
  nacionalidade: '',
  cidade: '',
  telefone: '',
  whatsapp: '',
  website: '',
  foto_url: '',
  pronome: '',
  cidade_nascimento: '',
  pais_nascimento: '',
  estado_nascimento: '',
  pais_atual: '',
  estado_atual: '',
  tel_ddi: '+55',
  tel_ddd: '',
  tel_numero: '',
  same_whatsapp: true,
  bioshort: '',
  biolong: '',
  statement: '',
  tags: '',
  instagrams: [],
  processo_criativo: '',
  tecnicas_recorrentes: '',
  temas_centrais: '',
  pesquisa_artistica: '',
  referencias_conceituais: '',
  ano_inicio_carreira: '',
  formacao: [],
  expos_individuais: [],
  expos_coletivas: [],
  premios: [],
  residencias: [],
  publicacoes: [],
  bolsas: [],
  feiras: [],
  clipping: [],
  colecoesPublicas: [],
  colecoesPrivadas: [],
  selo_url: '',
  assinatura_url: '',
  fotos_profissionais: [],
};

const TOTAL_STEPS = 6;

const DT = {
  bg: '#F5F5F7',
  surface: '#FFFFFF',
  black: '#000000',
  gold: '#C5A059',
  text: '#1D1D1F',
  textMuted: '#86868B',
  fontSans: 'system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", sans-serif',
};

interface Props {
  onComplete: () => void;
}

type SupportedLang = 'pt' | 'en' | 'es' | 'de';

type I18nModule = { translation: Record<string, Record<string, string>> };

const langDicts: Record<SupportedLang, I18nModule> = {
  pt: ptStrings as I18nModule,
  en: enStrings as I18nModule,
  es: esStrings as I18nModule,
  de: deStrings as I18nModule,
};

export default function Onboarding({ onComplete }: Props) {
  const navigate = useNavigate();
  const [lang] = useState<SupportedLang>('pt');
  const T = ((langDicts[lang] ?? ptStrings as I18nModule).translation).onboarding as Record<string, string>;
  const [step, setStep] = useState(0);
  const [data, setData] = useState<WizardData>(EMPTY_DATA);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadArtistProfile() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile, error } = await supabase
          .from('artista')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) throw error;
        if (profile) {
          type MetaRecord = Record<string, unknown>;
          let meta: MetaRecord = {};
          function ensureArray<T>(v: unknown): T[] {
            return Array.isArray(v) ? (v as T[]) : [];
          }

          if (profile.social_links) {
            const arr = ensureArray<MetaRecord>(profile.social_links);
            const found = arr.find((l) => l?.id === 'custom_metadata');
            if (found) meta = found;
          }

          setData({
            nome: profile.nome || '',
            nomeartistico: profile.nomeartistico || profile.nomeArtistico || '',
            email: profile.email || '',
            nascimento: profile.nascimento || '',
            nacionalidade: profile.nacionalidade || '',
            cidade: profile.cidade || '',
            telefone: profile.telefone || '',
            whatsapp: profile.whatsapp || '',
            website: profile.website || '',
            foto_url: profile.foto_url || '',
            pronome: (meta.pronome as string) || '',
            cidade_nascimento: (meta.cidade_nascimento as string) || '',
            pais_nascimento: (meta.pais_nascimento as string) || '',
            estado_nascimento: (meta.estado_nascimento as string) || '',
            pais_atual: (meta.pais_atual as string) || '',
            estado_atual: (meta.estado_atual as string) || '',
            tel_ddi: (meta.tel_ddi as string) || '+55',
            tel_ddd: (meta.tel_ddd as string) || '',
            tel_numero: (meta.tel_numero as string) || '',
            same_whatsapp: (meta.same_whatsapp as boolean) ?? true,
            bioshort: profile.bioshort || profile.bioShort || '',
            biolong: profile.biolong || profile.bioLong || '',
            statement: profile.statement || '',
            tags: profile.tags || '',
            instagrams: ensureArray<string>(profile.instagrams),
            processo_criativo: (meta.processo_criativo as string) || '',
            tecnicas_recorrentes: (meta.tecnicas_recorrentes as string) || '',
            temas_centrais: (meta.temas_centrais as string) || '',
            pesquisa_artistica: (meta.pesquisa_artistica as string) || '',
            referencias_conceituais: (meta.referencias_conceituais as string) || '',
            ano_inicio_carreira: (meta.ano_inicio_carreira as string) || '',
            formacao: ensureArray<ListItem>(profile.formacao),
            expos_individuais: ensureArray<ListItem>(profile.expos_individuais),
            expos_coletivas: ensureArray<ListItem>(profile.expos_coletivas),
            premios: ensureArray<ListItem>(profile.premios),
            residencias: ensureArray<ListItem>(profile.residencias),
            publicacoes: ensureArray<ListItem>(profile.publicacoes),
            bolsas: ensureArray<ListItem>(meta.bolsas),
            feiras: ensureArray<ListItem>(meta.feiras),
            clipping: ensureArray<ListItem>(meta.clipping),
            colecoesPublicas: ensureArray<ListItem>(meta.colecoesPublicas),
            colecoesPrivadas: ensureArray<ListItem>(meta.colecoesPrivadas),
            selo_url: profile.selo_url || '',
            assinatura_url: profile.assinatura_url || '',
            fotos_profissionais: ensureArray<string>(profile.fotos_profissionais),
          });
        }
      } catch (err) {
        console.error('Erro ao carregar perfil existente para o onboarding:', err);
      } finally {
        setLoadingProfile(false);
      }
    }

    loadArtistProfile();
  }, []);

  const update = useCallback((patch: Partial<WizardData>) => {
    setData((prev) => ({ ...prev, ...patch }));
    setErrors([]);
  }, []);

  const handleImportOnboarding = useCallback((imported: Record<string, unknown>) => {
    setData((prev) => {
      const next = { ...prev };
      if (imported.nome) next.nome = String(imported.nome);
      if (imported.nomeArtistico) next.nomeartistico = String(imported.nomeArtistico);
      if (imported.email) next.email = String(imported.email);
      if (imported.nacionalidade) next.nacionalidade = String(imported.nacionalidade);
      if (imported.cidade) next.cidade = String(imported.cidade);
      if (imported.bioShort) next.bioshort = String(imported.bioShort);
      if (imported.bioLong) next.biolong = String(imported.bioLong);
      if (imported.website) next.website = String(imported.website);

      if (Array.isArray(imported.instagrams)) {
        next.instagrams = Array.from(new Set([...prev.instagrams, ...(imported.instagrams as string[])]));
      }

      const toList = (arr: unknown[]) => arr.map((item) => ({ id: Math.random().toString(36).slice(2), ...(item as object) }));
      if (Array.isArray(imported.formacao)) next.formacao = [...prev.formacao, ...toList(imported.formacao)];
      if (Array.isArray(imported.premios)) next.premios = [...prev.premios, ...toList(imported.premios)];
      if (Array.isArray(imported.residencias)) next.residencias = [...prev.residencias, ...toList(imported.residencias)];
      if (Array.isArray(imported.exposIndividuais)) next.expos_individuais = [...prev.expos_individuais, ...toList(imported.exposIndividuais)];
      if (Array.isArray(imported.exposColetivas)) next.expos_coletivas = [...prev.expos_coletivas, ...toList(imported.exposColetivas)];
      if (Array.isArray(imported.publicacoes)) next.publicacoes = [...prev.publicacoes, ...toList(imported.publicacoes)];

      return next;
    });
    setErrors([]);
  }, []);

  const scrollToTop = () => {
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const validateStep1 = (): string[] => {
    const errs: string[] = [];
    if (!data.nome.trim()) errs.push(T.error_nome ?? 'Nome completo é obrigatório.');
    if (!data.email.trim()) errs.push(T.error_email ?? 'E-mail é obrigatório.');
    return errs;
  };

  const buildPayload = () => ({
    nome: data.nome,
    nomeartistico: data.nomeartistico,
    email: data.email,
    nascimento: data.nascimento,
    nacionalidade: data.nacionalidade,
    cidade: data.cidade,
    telefone: data.telefone,
    whatsapp: data.whatsapp,
    website: data.website,
    foto_url: data.foto_url,
    pronome: data.pronome,
    cidade_nascimento: data.cidade_nascimento,
    pais_nascimento: data.pais_nascimento,
    pais_atual: data.pais_atual,
    bioshort: data.bioshort,
    biolong: data.biolong,
    statement: data.statement,
    tags: data.tags,
    instagrams: data.instagrams,
    processo_criativo: data.processo_criativo,
    tecnicas_recorrentes: data.tecnicas_recorrentes,
    temas_centrais: data.temas_centrais,
    pesquisa_artistica: data.pesquisa_artistica,
    referencias_conceituais: data.referencias_conceituais,
    ano_inicio_carreira: data.ano_inicio_carreira,
    formacao: data.formacao,
    expos_individuais: data.expos_individuais,
    expos_coletivas: data.expos_coletivas,
    premios: data.premios,
    residencias: data.residencias,
    publicacoes: data.publicacoes,
    bolsas: data.bolsas,
    feiras: data.feiras,
    clipping: data.clipping,
    colecoesPublicas: data.colecoesPublicas,
    colecoesPrivadas: data.colecoesPrivadas,
    selo_url: data.selo_url,
    assinatura_url: data.assinatura_url,
    fotos_profissionais: data.fotos_profissionais,
  });

  const handleNext = async () => {
    if (step === 0) {
      const errs = validateStep1();
      if (errs.length) { setErrors(errs); return; }
    }
    try {
      await saveOnboardingStep(buildPayload());
    } catch (err) {
      console.error('Erro ao salvar passo do onboarding:', err);
    }
    scrollToTop();
    setStep((s) => s + 1);
  };

  const handleBack = () => {
    setErrors([]);
    scrollToTop();
    setStep((s) => s - 1);
  };

  const handleFinish = async (destination: 'upload' | 'dashboard') => {
    setSaving(true);
    try {
      await completeOnboarding({ ...buildPayload(), onboarding_completed: true });
      onComplete();
      navigate(destination === 'upload' ? '/upload' : '/');
    } catch (err: unknown) {
      console.error('Erro ao salvar onboarding:', err);
      alert('Erro ao salvar as informações: ' + ((err as Error)?.message || JSON.stringify(err)));
      setSaving(false);
    }
  };

  /** Called when the user confirms the certificate template (step 5). */
  const handleCertSaved = () => handleFinish('dashboard');

  /** Called when the user skips the certificate step (step 5). */
  const handleCertSkip = () => handleFinish('dashboard');

  if (loadingProfile) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4">
        <h1 className="font-serif italic text-2xl text-[#b8943f]">{T.loading_profile ?? 'studio virtual'}</h1>
        <div className="w-5 h-5 border-2 border-[#b8943f] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex p-3 sm:p-5 lg:p-6 gap-5 overflow-x-hidden" style={{ background: DT.bg, fontFamily: DT.fontSans }}>
      <main className="flex-1 flex flex-col min-w-0 max-w-4xl mx-auto">
        <div ref={scrollRef} className="flex-1 bg-white rounded-2xl p-6 sm:p-10 shadow-sm overflow-y-auto space-y-6">
          {step < 5 && (
            <div className="mb-6">
              <SmartImport
                currentData={data as unknown as Record<string, unknown>}
                onImport={handleImportOnboarding}
                t={(k: string) => T[k] || k}
              />
            </div>
          )}

          {step === 0 && <StepPessoal data={data} onChange={update} T={T} uploadToStorage={uploadToStorage} />}
          {step === 1 && <StepArtistico data={data} onChange={update} T={T} />}
          {step === 2 && <StepTrajetoria data={data} onChange={update} T={T} />}
          {step === 3 && <StepMarca data={data} onChange={update} T={T} />}
          {step === 4 && <StepFotos data={data} onChange={update} T={T} />}
          {step === 5 && (
            <StepCertificado
              onSaved={handleCertSaved}
              onSkip={handleCertSkip}
              artistName={data.nomeartistico || data.nome || undefined}
            />
          )}

          {errors.length > 0 && (
            <div className="mt-4 p-3 rounded-xl bg-red-50 text-red-600 text-xs">
              {errors.map((e, idx) => <p key={idx}>{e}</p>)}
            </div>
          )}

          {/* Step 5 (Certificado) manages its own navigation buttons */}
          {step < TOTAL_STEPS - 1 && (
            <div className="flex justify-between items-center mt-10 pt-6 border-t border-[#E5E5EA]">
              {step > 0 ? (
                <button onClick={handleBack} className="px-6 py-2.5 rounded-xl border text-sm font-semibold text-[#1D1D1F] hover:bg-[#F2F2F7]">
                  Voltar
                </button>
              ) : <div />}

              {step < TOTAL_STEPS - 2 ? (
                <button onClick={handleNext} className="px-8 py-2.5 rounded-xl bg-[#000] text-white text-sm font-semibold hover:bg-[#1C1C1E]">
                  Continuar →
                </button>
              ) : (
                <button onClick={handleNext} disabled={saving} className="px-8 py-2.5 rounded-xl bg-[#000] text-white text-sm font-semibold hover:bg-[#1C1C1E] disabled:opacity-60">
                  {saving ? 'Salvando…' : 'Continuar →'}
                </button>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
