import { useState, useRef, useCallback } from 'react';
import { supabase, saveOnboardingStep, completeOnboarding } from '../services/supabase';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ListItem {
  id: string;
  titulo: string;
  local?: string;
  ano?: string;
}

interface WizardData {
  // Step 1
  nome: string;
  nomeartistico: string;
  email: string;
  nascimento: string;
  nacionalidade: string;
  cidade: string;
  telefone: string;
  foto_url: string;
  // Step 2
  bioshort: string;
  statement: string;
  tags: string;
  // Step 3
  formacao: ListItem[];
  expos_individuais: ListItem[];
  expos_coletivas: ListItem[];
  premios: ListItem[];
  // Step 4
  selo_url: string;
  assinatura_url: string;
  // Step 5
  fotos_profissionais: string[];
}

interface Props {
  onComplete: () => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const uid = () => Math.random().toString(36).slice(2);
const GREEN = '#0f3421';
const GREEN_LIGHT = '#e8f0eb';
const TOTAL_STEPS = 5;

async function uploadToStorage(file: File, folder: string): Promise<string> {
  const ext = file.name.split('.').pop();
  const path = `${folder}/${Date.now()}-${uid()}.${ext}`;
  const { error } = await supabase.storage.from('obras-images').upload(path, file, { upsert: true });
  if (error) throw error;
  return supabase.storage.from('obras-images').getPublicUrl(path).data.publicUrl;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ProgressDots({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
        <div key={i} className="flex items-center gap-2">
          <div
            style={{
              width: i === current ? 28 : 8,
              height: 8,
              borderRadius: 99,
              background: i === current ? GREEN : i < current ? GREEN : '#d1ccc4',
              opacity: i < current ? 0.4 : 1,
              transition: 'all 0.3s ease',
            }}
          />
        </div>
      ))}
    </div>
  );
}

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-xs uppercase tracking-widest mb-1" style={{ color: '#6B6762' }}>
      {children}{required && <span style={{ color: GREEN }} className="ml-1">*</span>}
    </label>
  );
}

function Input({ value, onChange, placeholder, type = 'text', disabled }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string; disabled?: boolean;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className="w-full bg-transparent border-b py-2 text-sm outline-none transition-colors"
      style={{ borderColor: '#d1ccc4', color: '#1A1816' }}
      onFocus={e => (e.target.style.borderColor = GREEN)}
      onBlur={e => (e.target.style.borderColor = '#d1ccc4')}
    />
  );
}

function Textarea({ value, onChange, placeholder, rows = 4 }: {
  value: string; onChange: (v: string) => void; placeholder?: string; rows?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full bg-transparent border rounded-lg p-3 text-sm outline-none resize-none transition-colors"
      style={{ borderColor: '#d1ccc4', color: '#1A1816' }}
      onFocus={e => (e.target.style.borderColor = GREEN)}
      onBlur={e => (e.target.style.borderColor = '#d1ccc4')}
    />
  );
}

function AvatarUploader({ value, onChange }: { value: string; onChange: (url: string) => void }) {
  const [uploading, setUploading] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      const url = await uploadToStorage(file, 'onboarding/avatar');
      onChange(url);
    } catch { /* silent */ } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex items-center gap-5">
      <div
        onClick={() => ref.current?.click()}
        className="relative cursor-pointer flex-shrink-0"
        style={{ width: 88, height: 88, borderRadius: '50%', overflow: 'hidden', background: GREEN_LIGHT, border: `2px dashed ${GREEN}` }}
      >
        {value ? (
          <img src={value} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
            {uploading ? (
              <div className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: GREEN, borderTopColor: 'transparent' }} />
            ) : (
              <>
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke={GREEN} strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
                </svg>
                <span className="text-xs" style={{ color: GREEN }}>foto</span>
              </>
            )}
          </div>
        )}
      </div>
      <div>
        <p className="text-sm font-medium" style={{ color: '#1A1816' }}>Foto de perfil</p>
        <p className="text-xs mt-0.5" style={{ color: '#6B6762' }}>JPG, PNG ou WEBP · recomendado 400×400</p>
        <button
          type="button"
          onClick={() => ref.current?.click()}
          className="mt-2 text-xs underline"
          style={{ color: GREEN }}
        >
          {value ? 'Trocar foto' : 'Escolher arquivo'}
        </button>
      </div>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }}
      />
    </div>
  );
}

function ImageUploader({ label, hint, value, onChange, folder }: {
  label: string; hint: string; value: string; onChange: (url: string) => void; folder: string;
}) {
  const [uploading, setUploading] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      const url = await uploadToStorage(file, folder);
      onChange(url);
    } catch { /* silent */ } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <Label>{label}</Label>
      <div
        onClick={() => ref.current?.click()}
        className="cursor-pointer flex flex-col items-center justify-center rounded-xl transition-colors"
        style={{
          height: 120,
          border: `1.5px dashed ${value ? GREEN : '#d1ccc4'}`,
          background: value ? GREEN_LIGHT : '#fafaf8',
        }}
      >
        {uploading ? (
          <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: GREEN, borderTopColor: 'transparent' }} />
        ) : value ? (
          <img src={value} alt={label} style={{ maxHeight: 110, maxWidth: '90%', objectFit: 'contain', padding: 4 }} />
        ) : (
          <>
            <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke={GREEN} strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
            </svg>
            <p className="text-xs mt-1" style={{ color: '#6B6762' }}>{hint}</p>
          </>
        )}
      </div>
      {value && (
        <button type="button" onClick={() => ref.current?.click()} className="text-xs underline mt-1" style={{ color: GREEN }}>
          Trocar imagem
        </button>
      )}
      <input ref={ref} type="file" accept="image/*" className="hidden"
        onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }} />
    </div>
  );
}

function MultiPhotoUploader({ values, onChange }: { values: string[]; onChange: (urls: string[]) => void }) {
  const [uploading, setUploading] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  const MAX = 5;

  const handleFiles = async (files: FileList) => {
    const remaining = MAX - values.length;
    const toUpload = Array.from(files).slice(0, remaining);
    setUploading(true);
    try {
      const urls = await Promise.all(toUpload.map(f => uploadToStorage(f, 'onboarding/fotos')));
      onChange([...values, ...urls]);
    } catch { /* silent */ } finally {
      setUploading(false);
    }
  };

  const removePhoto = (idx: number) => {
    onChange(values.filter((_, i) => i !== idx));
  };

  return (
    <div>
      <div className="grid grid-cols-3 gap-3 mb-3">
        {values.map((url, i) => (
          <div key={i} className="relative rounded-lg overflow-hidden" style={{ aspectRatio: '1', background: '#f0ece6' }}>
            <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <button
              type="button"
              onClick={() => removePhoto(i)}
              className="absolute top-1 right-1 flex items-center justify-center rounded-full w-5 h-5 text-white"
              style={{ background: 'rgba(0,0,0,0.5)', fontSize: 12 }}
            >×</button>
          </div>
        ))}
        {values.length < MAX && (
          <div
            onClick={() => ref.current?.click()}
            className="rounded-lg flex flex-col items-center justify-center cursor-pointer"
            style={{ aspectRatio: '1', border: `1.5px dashed ${GREEN}`, background: GREEN_LIGHT }}
          >
            {uploading ? (
              <div className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: GREEN, borderTopColor: 'transparent' }} />
            ) : (
              <>
                <span style={{ color: GREEN, fontSize: 22 }}>+</span>
                <span style={{ color: GREEN, fontSize: 11 }}>adicionar</span>
              </>
            )}
          </div>
        )}
      </div>
      <p className="text-xs" style={{ color: '#6B6762' }}>{values.length}/{MAX} fotos · JPG ou PNG</p>
      <input
        ref={ref} type="file" accept="image/*" multiple className="hidden"
        onChange={e => { if (e.target.files) handleFiles(e.target.files); }}
      />
    </div>
  );
}

function ListManager({ title, items, onChange, placeholder }: {
  title: string; items: ListItem[]; onChange: (items: ListItem[]) => void; placeholder: string;
}) {
  const [titulo, setTitulo] = useState('');
  const [local, setLocal] = useState('');
  const [ano, setAno] = useState('');

  const add = () => {
    if (!titulo.trim()) return;
    onChange([...items, { id: uid(), titulo, local, ano }]);
    setTitulo(''); setLocal(''); setAno('');
  };

  const remove = (id: string) => onChange(items.filter(i => i.id !== id));

  return (
    <div className="space-y-3">
      <p className="text-xs uppercase tracking-widest font-medium" style={{ color: GREEN }}>{title}</p>
      <div className="space-y-2">
        {items.map(item => (
          <div key={item.id} className="flex items-start justify-between gap-2 rounded-lg px-3 py-2" style={{ background: GREEN_LIGHT }}>
            <div>
              <p className="text-sm font-medium" style={{ color: '#1A1816' }}>{item.titulo}</p>
              {(item.local || item.ano) && (
                <p className="text-xs" style={{ color: '#6B6762' }}>{[item.local, item.ano].filter(Boolean).join(' · ')}</p>
              )}
            </div>
            <button type="button" onClick={() => remove(item.id)} className="text-sm flex-shrink-0" style={{ color: '#6B6762' }}>×</button>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="col-span-3">
          <Input value={titulo} onChange={setTitulo} placeholder={placeholder} />
        </div>
        <div className="col-span-2">
          <Input value={local} onChange={setLocal} placeholder="Local / Instituição" />
        </div>
        <div>
          <Input value={ano} onChange={setAno} placeholder="Ano" type="text" />
        </div>
      </div>
      <button
        type="button"
        onClick={add}
        disabled={!titulo.trim()}
        className="text-xs uppercase tracking-widest px-4 py-2 rounded-lg transition-opacity"
        style={{ background: GREEN, color: 'white', opacity: titulo.trim() ? 1 : 0.4 }}
      >+ Adicionar</button>
    </div>
  );
}

// ─── Step Screens ─────────────────────────────────────────────────────────────

function Step1({ data, onChange }: { data: WizardData; onChange: (d: Partial<WizardData>) => void }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-2xl mb-1" style={{ color: '#1A1816' }}>Sua conta &amp; perfil</h2>
        <p className="text-sm" style={{ color: '#6B6762' }}>Estas informações identificam você no sistema.</p>
      </div>
      <AvatarUploader value={data.foto_url} onChange={v => onChange({ foto_url: v })} />
      <div className="grid grid-cols-2 gap-x-6 gap-y-5">
        <div className="col-span-2 sm:col-span-1">
          <Label required>Nome completo</Label>
          <Input value={data.nome} onChange={v => onChange({ nome: v })} placeholder="Maria da Silva" />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <Label>Nome artístico</Label>
          <Input value={data.nomeartistico} onChange={v => onChange({ nomeartistico: v })} placeholder="Como você assina suas obras" />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <Label required>E-mail</Label>
          <Input value={data.email} onChange={v => onChange({ email: v })} placeholder="contato@artista.com" type="email" />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <Label>Data de nascimento</Label>
          <Input value={data.nascimento} onChange={v => onChange({ nascimento: v })} type="date" />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <Label>Nacionalidade</Label>
          <Input value={data.nacionalidade} onChange={v => onChange({ nacionalidade: v })} placeholder="Brasileira" />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <Label>Cidade</Label>
          <Input value={data.cidade} onChange={v => onChange({ cidade: v })} placeholder="Rio de Janeiro" />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <Label>Telefone / WhatsApp</Label>
          <Input value={data.telefone} onChange={v => onChange({ telefone: v })} placeholder="+55 21 99999-0000" />
        </div>
      </div>
    </div>
  );
}

function Step2({ data, onChange }: { data: WizardData; onChange: (d: Partial<WizardData>) => void }) {
  const count = (t: string) => t.trim().split(/\s+/).filter(Boolean).length;
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-2xl mb-1" style={{ color: '#1A1816' }}>Perfil artístico</h2>
        <p className="text-sm" style={{ color: '#6B6762' }}>Quem você é como artista — em suas próprias palavras.</p>
      </div>
      <div>
        <Label>Bio curta</Label>
        <Textarea
          value={data.bioshort}
          onChange={v => onChange({ bioshort: v })}
          placeholder="Uma ou duas frases que resumem sua prática artística..."
          rows={3}
        />
        <p className="text-xs mt-1 text-right" style={{ color: '#6B6762' }}>{count(data.bioshort)} palavras</p>
      </div>
      <div>
        <Label>Artist statement</Label>
        <Textarea
          value={data.statement}
          onChange={v => onChange({ statement: v })}
          placeholder="Descreva sua pesquisa, linguagem e o que move seu trabalho..."
          rows={5}
        />
        <p className="text-xs mt-1 text-right" style={{ color: '#6B6762' }}>{count(data.statement)} palavras</p>
      </div>
      <div>
        <Label>Palavras-chave / Tags</Label>
        <Input value={data.tags} onChange={v => onChange({ tags: v })} placeholder="pintura, cor, memória, abstrato..." />
        <p className="text-xs mt-1" style={{ color: '#6B6762' }}>Separe por vírgula. Ajuda na busca e curadoria.</p>
      </div>
    </div>
  );
}

function Step3({ data, onChange }: { data: WizardData; onChange: (d: Partial<WizardData>) => void }) {
  return (
    <div className="space-y-7">
      <div>
        <h2 className="font-serif text-2xl mb-1" style={{ color: '#1A1816' }}>Trajetória &amp; currículo</h2>
        <p className="text-sm" style={{ color: '#6B6762' }}>Registre suas formações, exposições e prêmios.</p>
      </div>
      <ListManager
        title="Formação"
        items={data.formacao}
        onChange={v => onChange({ formacao: v })}
        placeholder="Graduação, mestrado, curso, workshop..."
      />
      <div style={{ height: 1, background: '#e8e4de' }} />
      <ListManager
        title="Exposições individuais"
        items={data.expos_individuais}
        onChange={v => onChange({ expos_individuais: v })}
        placeholder="Título da exposição"
      />
      <div style={{ height: 1, background: '#e8e4de' }} />
      <ListManager
        title="Exposições coletivas"
        items={data.expos_coletivas}
        onChange={v => onChange({ expos_coletivas: v })}
        placeholder="Título da exposição"
      />
      <div style={{ height: 1, background: '#e8e4de' }} />
      <ListManager
        title="Prêmios &amp; reconhecimentos"
        items={data.premios}
        onChange={v => onChange({ premios: v })}
        placeholder="Nome do prêmio ou bolsa"
      />
    </div>
  );
}

function Step4({ data, onChange }: { data: WizardData; onChange: (d: Partial<WizardData>) => void }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-2xl mb-1" style={{ color: '#1A1816' }}>Marca &amp; identidade</h2>
        <p className="text-sm" style={{ color: '#6B6762' }}>Faça upload do seu selo e assinatura para uso em certificados e dossiês.</p>
      </div>
      <div className="rounded-xl p-4" style={{ background: GREEN_LIGHT, border: `1px solid ${GREEN}20` }}>
        <p className="text-xs" style={{ color: GREEN }}>
          <strong>Dica:</strong> O selo deve ter fundo transparente (PNG). A assinatura pode ser digitalizada ou fotografada em fundo branco.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <ImageUploader
          label="Selo / Carimbo"
          hint="PNG com fundo transparente"
          value={data.selo_url}
          onChange={v => onChange({ selo_url: v })}
          folder="onboarding/selo"
        />
        <ImageUploader
          label="Assinatura"
          hint="JPG ou PNG da sua assinatura"
          value={data.assinatura_url}
          onChange={v => onChange({ assinatura_url: v })}
          folder="onboarding/assinatura"
        />
      </div>
    </div>
  );
}

function Step5({ data, onChange }: { data: WizardData; onChange: (d: Partial<WizardData>) => void }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-2xl mb-1" style={{ color: '#1A1816' }}>Fotos profissionais</h2>
        <p className="text-sm" style={{ color: '#6B6762' }}>Adicione até 5 fotos suas para uso em materiais de divulgação.</p>
      </div>
      <MultiPhotoUploader
        values={data.fotos_profissionais}
        onChange={v => onChange({ fotos_profissionais: v })}
      />
    </div>
  );
}

function ConclusionScreen({ data, onFinish, loading }: {
  data: WizardData; onFinish: () => void; loading: boolean;
}) {
  return (
    <div className="flex flex-col items-center text-center space-y-6">
      {/* Checkmark */}
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center"
        style={{ background: GREEN }}
      >
        <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
        </svg>
      </div>

      <div>
        <h2 className="font-serif text-3xl mb-2" style={{ color: '#1A1816' }}>
          {data.nomeartistico || data.nome ? `Bem-vinda, ${data.nomeartistico || data.nome}!` : 'Tudo certo!'}
        </h2>
        <p className="text-sm" style={{ color: '#6B6762' }}>
          Seu perfil foi configurado. Você pode complementar qualquer informação a qualquer momento pela seção <strong>Perfil</strong>.
        </p>
      </div>

      {/* Preview card */}
      <div
        className="w-full max-w-sm rounded-2xl p-5 text-left"
        style={{ background: '#1A1816', color: 'white' }}
      >
        <div className="flex items-center gap-3 mb-4">
          {data.foto_url ? (
            <img
              src={data.foto_url}
              alt="avatar"
              style={{ width: 52, height: 52, borderRadius: '50%', objectFit: 'cover' }}
            />
          ) : (
            <div
              style={{ width: 52, height: 52, borderRadius: '50%', background: GREEN, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <span style={{ color: 'white', fontSize: 20 }}>
                {(data.nomeartistico || data.nome || '?')[0].toUpperCase()}
              </span>
            </div>
          )}
          <div>
            <p className="font-serif text-lg leading-tight">{data.nomeartistico || data.nome || 'Artista'}</p>
            {data.cidade && <p className="text-xs" style={{ color: '#B0ADA8' }}>{data.cidade}</p>}
          </div>
        </div>
        {data.bioshort && (
          <p className="text-xs leading-relaxed" style={{ color: '#B0ADA8' }}>
            {data.bioshort.slice(0, 140)}{data.bioshort.length > 140 ? '...' : ''}
          </p>
        )}
        {data.tags && (
          <div className="flex flex-wrap gap-1 mt-3">
            {data.tags.split(',').slice(0, 4).map((t, i) => (
              <span key={i} className="text-xs px-2 py-0.5 rounded-full" style={{ background: GREEN, color: 'white' }}>
                {t.trim()}
              </span>
            ))}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={onFinish}
        disabled={loading}
        className="w-full max-w-sm py-3 rounded-xl font-medium text-white transition-opacity"
        style={{ background: GREEN, opacity: loading ? 0.6 : 1 }}
      >
        {loading ? 'Salvando...' : 'Entrar no Studio Virtual →'}
      </button>
    </div>
  );
}

// ─── Main Wizard Component ─────────────────────────────────────────────────────

const EMPTY_DATA: WizardData = {
  nome: '', nomeartistico: '', email: '', nascimento: '',
  nacionalidade: '', cidade: '', telefone: '', foto_url: '',
  bioshort: '', statement: '', tags: '',
  formacao: [], expos_individuais: [], expos_coletivas: [], premios: [],
  selo_url: '', assinatura_url: '',
  fotos_profissionais: [],
};

export default function Onboarding({ onComplete }: Props) {
  const [step, setStep] = useState(0); // 0-4 = wizard steps, 5 = conclusion
  const [data, setData] = useState<WizardData>(EMPTY_DATA);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const update = useCallback((patch: Partial<WizardData>) => {
    setData(prev => ({ ...prev, ...patch }));
    setErrors([]);
  }, []);

  const scrollToTop = () => {
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const validateStep1 = (): string[] => {
    const errs: string[] = [];
    if (!data.nome.trim()) errs.push('Nome completo é obrigatório.');
    if (!data.email.trim()) errs.push('E-mail é obrigatório.');
    return errs;
  };

  const handleNext = async () => {
    if (step === 0) {
      const errs = validateStep1();
      if (errs.length) { setErrors(errs); return; }
    }

    // Save partial data to DB on each step forward
    try {
      await saveOnboardingStep({
        nome: data.nome,
        nomeartistico: data.nomeartistico,
        email: data.email,
        nascimento: data.nascimento,
        nacionalidade: data.nacionalidade,
        cidade: data.cidade,
        telefone: data.telefone,
        foto_url: data.foto_url,
        bioshort: data.bioshort,
        statement: data.statement,
        tags: data.tags,
        formacao: data.formacao,
        expos_individuais: data.expos_individuais,
        expos_coletivas: data.expos_coletivas,
        premios: data.premios,
        selo_url: data.selo_url,
        assinatura_url: data.assinatura_url,
        fotos_profissionais: data.fotos_profissionais,
      });
    } catch { /* fail silently — user can retry on finish */ }

    scrollToTop();
    setStep(s => s + 1);
  };

  const handleSkip = () => {
    scrollToTop();
    setStep(s => s + 1);
  };

  const handleBack = () => {
    scrollToTop();
    setStep(s => s - 1);
  };

  const handleFinish = async () => {
    setSaving(true);
    try {
      await completeOnboarding({
        nome: data.nome,
        nomeartistico: data.nomeartistico,
        email: data.email,
        nascimento: data.nascimento,
        nacionalidade: data.nacionalidade,
        cidade: data.cidade,
        telefone: data.telefone,
        foto_url: data.foto_url,
        bioshort: data.bioshort,
        statement: data.statement,
        tags: data.tags,
        formacao: data.formacao,
        expos_individuais: data.expos_individuais,
        expos_coletivas: data.expos_coletivas,
        premios: data.premios,
        selo_url: data.selo_url,
        assinatura_url: data.assinatura_url,
        fotos_profissionais: data.fotos_profissionais,
        onboarding_completed: true,
      });
      onComplete();
    } catch (err) {
      console.error(err);
      setSaving(false);
    }
  };

  const isConclusion = step === TOTAL_STEPS;
  const canSkip = step > 0 && step < TOTAL_STEPS;

  return (
    <div className="min-h-screen flex" style={{ background: '#F5F3EE' }}>
      {/* ── Left decorative panel ── */}
      <div
        className="hidden lg:flex flex-col justify-between p-10 w-72 flex-shrink-0"
        style={{ background: GREEN, color: 'white' }}
      >
        <div>
          <p className="font-serif italic text-2xl tracking-wide">studio virtual</p>
          <p className="text-xs mt-1 opacity-60 uppercase tracking-widest">para artistas visuais</p>
        </div>

        <div className="space-y-4">
          {[
            'Catálogo de obras',
            'Dossiê curatorial',
            'Portfolio gerado em PDF',
            'Certificados de autenticidade',
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: 'rgba(255,255,255,0.4)' }} />
              <p className="text-sm opacity-80">{item}</p>
            </div>
          ))}
        </div>

        <p className="text-xs opacity-40">
          Você pode editar todas as informações a qualquer momento.
        </p>
      </div>

      {/* ── Right: wizard content ── */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top bar */}
        <div className="flex items-center justify-between px-8 py-5 border-b" style={{ borderColor: '#e8e4de' }}>
          <div className="lg:hidden">
            <p className="font-serif italic text-lg" style={{ color: GREEN }}>studio virtual</p>
          </div>
          {!isConclusion && (
            <div className="flex items-center gap-4 ml-auto">
              <p className="text-xs hidden sm:block" style={{ color: '#6B6762' }}>
                {step + 1} de {TOTAL_STEPS}
              </p>
              <ProgressDots current={step} />
            </div>
          )}
        </div>

        {/* Scrollable content area */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-8 py-10">
          <div className="max-w-lg mx-auto">
            {isConclusion ? (
              <ConclusionScreen data={data} onFinish={handleFinish} loading={saving} />
            ) : (
              <>
                {step === 0 && <Step1 data={data} onChange={update} />}
                {step === 1 && <Step2 data={data} onChange={update} />}
                {step === 2 && <Step3 data={data} onChange={update} />}
                {step === 3 && <Step4 data={data} onChange={update} />}
                {step === 4 && <Step5 data={data} onChange={update} />}

                {/* Validation errors */}
                {errors.length > 0 && (
                  <div className="mt-4 rounded-lg px-4 py-3" style={{ background: '#fef2f2', border: '1px solid #fecaca' }}>
                    {errors.map((e, i) => (
                      <p key={i} className="text-sm" style={{ color: '#dc2626' }}>{e}</p>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Bottom nav */}
        {!isConclusion && (
          <div
            className="flex items-center justify-between px-8 py-5 border-t"
            style={{ borderColor: '#e8e4de', background: '#F5F3EE' }}
          >
            {step > 0 ? (
              <button
                type="button"
                onClick={handleBack}
                className="text-sm px-5 py-2 rounded-lg border transition-colors"
                style={{ borderColor: '#d1ccc4', color: '#1A1816' }}
              >
                ← Voltar
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-3">
              {canSkip && (
                <button
                  type="button"
                  onClick={handleSkip}
                  className="text-sm underline"
                  style={{ color: '#6B6762' }}
                >
                  Pular por agora
                </button>
              )}
              <button
                type="button"
                onClick={handleNext}
                className="text-sm px-6 py-2 rounded-lg font-medium text-white transition-opacity"
                style={{ background: GREEN }}
              >
                {step === TOTAL_STEPS - 1 ? 'Concluir →' : 'Continuar →'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
