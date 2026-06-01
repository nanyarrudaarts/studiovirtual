import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, saveOnboardingStep, completeOnboarding } from '../services/supabase';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface ListItem {
  id: string;
  [key: string]: string;
}

interface WizardData {
  // Step 1 — Conta / Perfil Pessoal
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
  // Pessoal virtual (saved in social_links → custom_metadata)
  pronome: string;
  cidade_nascimento: string;
  pais_nascimento: string;
  pais_atual: string;
  // Step 2 — Perfil Artístico
  bioshort: string;
  biolong: string;
  statement: string;
  tags: string;
  instagrams: string[];
  // Artistic virtual
  processo_criativo: string;
  tecnicas_recorrentes: string;
  temas_centrais: string;
  pesquisa_artistica: string;
  referencias_conceituais: string;
  // Step 3 — Trajetória & Currículo
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
  // Step 4 — Marca & Identidade
  selo_url: string;
  assinatura_url: string;
  // Step 5 — Fotos Profissionais
  fotos_profissionais: string[];
}

interface Props {
  onComplete: () => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const uid = () => Math.random().toString(36).slice(2);
const GREEN = '#0f3421';
const GREEN_LIGHT = '#e8f0eb';
const TOTAL_STEPS = 5;
const STEP_LABELS = ['Conta', 'Artístico', 'Trajetória', 'Marca', 'Fotos'];

const EMPTY_DATA: WizardData = {
  nome: '', nomeartistico: '', email: '', nascimento: '',
  nacionalidade: '', cidade: '', telefone: '', whatsapp: '', website: '',
  foto_url: '', pronome: '', cidade_nascimento: '', pais_nascimento: '', pais_atual: '',
  bioshort: '', biolong: '', statement: '', tags: '', instagrams: [],
  processo_criativo: '', tecnicas_recorrentes: '', temas_centrais: '',
  pesquisa_artistica: '', referencias_conceituais: '',
  formacao: [], expos_individuais: [], expos_coletivas: [], premios: [],
  residencias: [], publicacoes: [], bolsas: [], feiras: [],
  clipping: [], colecoesPublicas: [], colecoesPrivadas: [],
  selo_url: '', assinatura_url: '',
  fotos_profissionais: [],
};

// ─── Storage ──────────────────────────────────────────────────────────────────

async function uploadToStorage(file: File, folder: string): Promise<string> {
  const ext = file.name.split('.').pop();
  const path = `${folder}/${Date.now()}-${uid()}.${ext}`;
  const { error } = await supabase.storage.from('obras-images').upload(path, file, { upsert: true });
  if (error) throw error;
  return supabase.storage.from('obras-images').getPublicUrl(path).data.publicUrl;
}

// ─── ProgressBar ─────────────────────────────────────────────────────────────

function ProgressBar({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-0">
      {STEP_LABELS.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <div key={i} className="flex items-center">
            <div className="flex flex-col items-center gap-1.5">
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: done || active ? GREEN : 'transparent',
                  border: done || active ? 'none' : '1.5px solid #d1ccc4',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.35s ease',
                  flexShrink: 0,
                }}
              >
                {done ? (
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                ) : (
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: active ? 'white' : '#b0ada8',
                    }}
                  >
                    {i + 1}
                  </span>
                )}
              </div>
              <span
                className="hidden sm:block text-[10px] uppercase tracking-widest text-center"
                style={{
                  color: active ? GREEN : done ? GREEN : '#b0ada8',
                  fontWeight: active ? 700 : 400,
                  transition: 'all 0.3s',
                  whiteSpace: 'nowrap',
                }}
              >
                {label}
              </span>
            </div>
            {i < TOTAL_STEPS - 1 && (
              <div
                style={{
                  height: 1.5,
                  width: 32,
                  marginBottom: 18,
                  background: i < current ? GREEN : '#e8e4de',
                  transition: 'background 0.35s ease',
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Shared UI Components ─────────────────────────────────────────────────────

function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 pt-2">
      <div style={{ flex: 1, height: 1, background: '#e8e4de' }} />
      <span className="text-[10px] uppercase tracking-widest" style={{ color: '#b0ada8' }}>{label}</span>
      <div style={{ flex: 1, height: 1, background: '#e8e4de' }} />
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

function WordCount({ text }: { text: string }) {
  const n = text.trim().split(/\s+/).filter(Boolean).length;
  return <p className="text-xs text-right mt-1" style={{ color: '#b0ada8' }}>{n} palavras</p>;
}

function TagInput({ value, onChange, placeholder }: {
  value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  const [input, setInput] = useState('');
  const tags = value ? value.split(',').map(t => t.trim()).filter(Boolean) : [];

  const add = (raw: string) => {
    const t = raw.trim();
    if (t && !tags.includes(t)) onChange([...tags, t].join(', '));
  };
  const remove = (idx: number) => onChange(tags.filter((_, i) => i !== idx).join(', '));
  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      add(input);
      setInput('');
    }
  };

  return (
    <div
      className="flex flex-wrap gap-2 p-2 border rounded-xl min-h-[46px] transition-colors"
      style={{ borderColor: '#d1ccc4' }}
    >
      {tags.map((tag, i) => (
        <span key={i} className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full" style={{ background: GREEN_LIGHT, color: GREEN }}>
          {tag}
          <button type="button" onClick={() => remove(i)} style={{ lineHeight: 1, color: GREEN }}>×</button>
        </span>
      ))}
      <input
        type="text"
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={handleKey}
        onBlur={() => { if (input.trim()) { add(input); setInput(''); } }}
        placeholder={tags.length === 0 ? placeholder : ''}
        className="flex-1 min-w-[120px] bg-transparent border-none outline-none text-sm"
        style={{ color: '#1A1816' }}
      />
    </div>
  );
}

function InstagramList({ values, onChange }: { values: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="space-y-2">
      {values.map((v, i) => (
        <div key={i} className="flex gap-2 items-center">
          <Input
            value={v}
            onChange={val => { const n = [...values]; n[i] = val; onChange(n); }}
            placeholder="@usuario"
          />
          <button type="button" onClick={() => onChange(values.filter((_, j) => j !== i))}
            className="text-sm flex-shrink-0" style={{ color: '#b0ada8' }}>×</button>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...values, ''])}
        className="text-xs uppercase tracking-widest"
        style={{ color: GREEN }}>
        + Adicionar Instagram
      </button>
    </div>
  );
}

// ─── Avatar Uploader ──────────────────────────────────────────────────────────

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
        aria-label="Escolher foto de perfil"
        className="hidden"
        onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }}
      />
    </div>
  );
}

// ─── Image Uploader (Marca) ───────────────────────────────────────────────────

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
          height: 140,
          border: `1.5px dashed ${value ? GREEN : '#d1ccc4'}`,
          background: value ? GREEN_LIGHT : '#fafaf8',
        }}
      >
        {uploading ? (
          <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: GREEN, borderTopColor: 'transparent' }} />
        ) : value ? (
          <img src={value} alt={label} style={{ maxHeight: 130, maxWidth: '90%', objectFit: 'contain', padding: 4 }} />
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
      <input ref={ref} type="file" accept="image/*" aria-label={`Escolher ${label}`} className="hidden"
        onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }} />
    </div>
  );
}

// ─── Multi Photo Uploader ─────────────────────────────────────────────────────

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

  return (
    <div>
      <div className="grid grid-cols-3 gap-3 mb-3">
        {values.map((url, i) => (
          <div key={i} className="relative rounded-xl overflow-hidden" style={{ aspectRatio: '1', background: '#f0ece6' }}>
            <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <button
              type="button"
              onClick={() => onChange(values.filter((_, j) => j !== i))}
              className="absolute top-1.5 right-1.5 flex items-center justify-center rounded-full w-6 h-6 text-white text-sm"
              style={{ background: 'rgba(0,0,0,0.55)' }}
            >×</button>
          </div>
        ))}
        {values.length < MAX && (
          <div
            onClick={() => ref.current?.click()}
            className="rounded-xl flex flex-col items-center justify-center cursor-pointer"
            style={{ aspectRatio: '1', border: `1.5px dashed ${GREEN}`, background: GREEN_LIGHT }}
          >
            {uploading ? (
              <div className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: GREEN, borderTopColor: 'transparent' }} />
            ) : (
              <>
                <span style={{ color: GREEN, fontSize: 24 }}>+</span>
                <span style={{ color: GREEN, fontSize: 10 }}>adicionar</span>
              </>
            )}
          </div>
        )}
      </div>
      <p className="text-xs" style={{ color: '#6B6762' }}>{values.length}/{MAX} fotos · JPG, PNG ou WEBP</p>
      <input
        ref={ref} type="file" accept="image/*" multiple aria-label="Adicionar fotos profissionais" className="hidden"
        onChange={e => { if (e.target.files) handleFiles(e.target.files); }}
      />
    </div>
  );
}

// ─── AddList ──────────────────────────────────────────────────────────────────

type FieldDef = { key: string; label: string; placeholder?: string; type?: string; className?: string };

function AddList({ title, fields, items, onChange }: {
  title: string;
  fields: FieldDef[];
  items: ListItem[];
  onChange: (items: ListItem[]) => void;
}) {
  const addEmpty = () => {
    const empty: ListItem = { id: uid() };
    fields.forEach(f => { empty[f.key] = ''; });
    onChange([...items, empty]);
  };
  const remove = (id: string) => onChange(items.filter(i => i.id !== id));
  const update = (id: string, key: string, value: string) =>
    onChange(items.map(i => i.id === id ? { ...i, [key]: value } : i));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-widest font-medium" style={{ color: GREEN }}>{title}</p>
        <button type="button" onClick={addEmpty}
          className="text-xs uppercase tracking-widest"
          style={{ color: GREEN }}>+ Adicionar</button>
      </div>
      {items.map(item => (
        <div key={item.id} className="rounded-xl p-4 relative" style={{ background: GREEN_LIGHT }}>
          <button type="button" onClick={() => remove(item.id)}
            className="absolute right-3 top-3 text-sm" style={{ color: '#b0ada8' }}>×</button>
          <div className="grid grid-cols-2 gap-3 pr-6">
            {fields.map(f => (
              <div key={f.key} className={f.className ?? (f.key === fields[0].key ? 'col-span-2' : '')}>
                <label className="block text-xs mb-1" style={{ color: '#6B6762' }}>{f.label}</label>
                <input
                  type={f.type ?? 'text'}
                  value={item[f.key] ?? ''}
                  placeholder={f.placeholder}
                  onChange={e => update(item.id, f.key, e.target.value)}
                  className="w-full bg-white border-b py-1.5 text-sm outline-none"
                  style={{ borderColor: '#d1ccc4', color: '#1A1816' }}
                />
              </div>
            ))}
          </div>
        </div>
      ))}
      {items.length === 0 && (
        <p className="text-xs italic" style={{ color: '#b0ada8' }}>Nenhum item adicionado.</p>
      )}
    </div>
  );
}

// ─── Step 1 — Conta / Perfil Pessoal ─────────────────────────────────────────

function Step1({ data, onChange }: { data: WizardData; onChange: (d: Partial<WizardData>) => void }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-2xl mb-1" style={{ color: '#1A1816' }}>Conta &amp; perfil pessoal</h2>
        <p className="text-sm" style={{ color: '#6B6762' }}>Estas informações identificam você no sistema e nos documentos.</p>
      </div>

      <AvatarUploader value={data.foto_url} onChange={v => onChange({ foto_url: v })} />

      <SectionDivider label="Identificação" />

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
          <Label>Pronome</Label>
          <Input value={data.pronome} onChange={v => onChange({ pronome: v })} placeholder="ela/dela · ele/dele · elu/delu" />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <Label required>E-mail profissional</Label>
          <Input value={data.email} onChange={v => onChange({ email: v })} placeholder="contato@artista.com" type="email" />
        </div>
      </div>

      <SectionDivider label="Localização" />

      <div className="grid grid-cols-2 gap-x-6 gap-y-5">
        <div className="col-span-2 sm:col-span-1">
          <Label>Cidade de nascimento</Label>
          <Input value={data.cidade_nascimento} onChange={v => onChange({ cidade_nascimento: v })} placeholder="São Paulo" />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <Label>País de nascimento</Label>
          <Input value={data.pais_nascimento} onChange={v => onChange({ pais_nascimento: v })} placeholder="Brasil" />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <Label>Cidade atual</Label>
          <Input value={data.cidade} onChange={v => onChange({ cidade: v })} placeholder="Rio de Janeiro" />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <Label>País atual</Label>
          <Input value={data.pais_atual} onChange={v => onChange({ pais_atual: v })} placeholder="Brasil" />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <Label>Nacionalidade</Label>
          <Input value={data.nacionalidade} onChange={v => onChange({ nacionalidade: v })} placeholder="Brasileira" />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <Label>Ano de nascimento</Label>
          <Input value={data.nascimento} onChange={v => onChange({ nascimento: v })} placeholder="1985" />
        </div>
      </div>

      <SectionDivider label="Contato" />

      <div className="grid grid-cols-2 gap-x-6 gap-y-5">
        <div className="col-span-2 sm:col-span-1">
          <Label>Telefone</Label>
          <Input value={data.telefone} onChange={v => onChange({ telefone: v })} placeholder="+55 21 99999-0000" />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <Label>WhatsApp</Label>
          <Input value={data.whatsapp} onChange={v => onChange({ whatsapp: v })} placeholder="+55 21 99999-0000" />
        </div>
        <div className="col-span-2">
          <Label>Website</Label>
          <Input value={data.website} onChange={v => onChange({ website: v })} placeholder="https://seusite.com" />
        </div>
      </div>
    </div>
  );
}

// ─── Step 2 — Perfil Artístico ────────────────────────────────────────────────

function Step2({ data, onChange }: { data: WizardData; onChange: (d: Partial<WizardData>) => void }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-2xl mb-1" style={{ color: '#1A1816' }}>Perfil artístico</h2>
        <p className="text-sm" style={{ color: '#6B6762' }}>Quem você é como artista — em suas próprias palavras.</p>
      </div>

      <SectionDivider label="Biografias" />

      <div>
        <Label>Biografia curta <span style={{ color: '#b0ada8', textTransform: 'none', letterSpacing: 0 }}>(máx. 120 palavras)</span></Label>
        <Textarea
          value={data.bioshort}
          onChange={v => onChange({ bioshort: v })}
          placeholder="Uma ou duas frases que resumem sua prática artística..."
          rows={3}
        />
        <WordCount text={data.bioshort} />
      </div>

      <div>
        <Label>Biografia completa / institucional</Label>
        <Textarea
          value={data.biolong}
          onChange={v => onChange({ biolong: v })}
          placeholder="Texto mais amplo para catálogos, dossiês e candidaturas. 3 a 4 parágrafos..."
          rows={6}
        />
        <WordCount text={data.biolong} />
      </div>

      <SectionDivider label="Poética & Pesquisa" />

      <div>
        <Label>Artist statement</Label>
        <Textarea
          value={data.statement}
          onChange={v => onChange({ statement: v })}
          placeholder="Descreva sua pesquisa, linguagem e o que move seu trabalho..."
          rows={5}
        />
        <WordCount text={data.statement} />
      </div>

      <div>
        <Label>Processo criativo</Label>
        <Textarea
          value={data.processo_criativo}
          onChange={v => onChange({ processo_criativo: v })}
          placeholder="Como você trabalha? Quais são seus rituais, materiais, métodos..."
          rows={4}
        />
      </div>

      <div className="grid grid-cols-2 gap-x-6 gap-y-5">
        <div className="col-span-2 sm:col-span-1">
          <Label>Técnicas recorrentes</Label>
          <Input value={data.tecnicas_recorrentes} onChange={v => onChange({ tecnicas_recorrentes: v })} placeholder="Pintura a óleo, gravura, vídeo..." />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <Label>Temas centrais</Label>
          <Input value={data.temas_centrais} onChange={v => onChange({ temas_centrais: v })} placeholder="Memória, corpo, identidade..." />
        </div>
        <div className="col-span-2">
          <Label>Pesquisa artística</Label>
          <Input value={data.pesquisa_artistica} onChange={v => onChange({ pesquisa_artistica: v })} placeholder="Qual campo ou questão você investiga..." />
        </div>
        <div className="col-span-2">
          <Label>Referências conceituais</Label>
          <Input value={data.referencias_conceituais} onChange={v => onChange({ referencias_conceituais: v })} placeholder="Artistas, filósofos, movimentos que influenciam seu trabalho..." />
        </div>
      </div>

      <SectionDivider label="Tags & Redes" />

      <div>
        <Label>Palavras-chave / Tags</Label>
        <TagInput
          value={data.tags}
          onChange={v => onChange({ tags: v })}
          placeholder="pintura, cor, memória... (Enter para adicionar)"
        />
        <p className="text-xs mt-1.5" style={{ color: '#b0ada8' }}>Separe por vírgula ou pressione Enter. Ajuda na busca e curadoria.</p>
      </div>

      <div>
        <Label>Instagram(s) profissional</Label>
        <InstagramList values={data.instagrams} onChange={v => onChange({ instagrams: v })} />
      </div>
    </div>
  );
}

// ─── Step 3 — Trajetória & Currículo ─────────────────────────────────────────

function Step3({ data, onChange }: { data: WizardData; onChange: (d: Partial<WizardData>) => void }) {
  const exposFields: FieldDef[] = [
    { key: 'titulo', label: 'Título', placeholder: 'Nome da exposição' },
    { key: 'local', label: 'Local / Galeria', placeholder: 'Museu, galeria...' },
    { key: 'cidade', label: 'Cidade', placeholder: 'Rio de Janeiro' },
    { key: 'pais', label: 'País', placeholder: 'Brasil', className: '' },
    { key: 'ano', label: 'Ano', placeholder: '2023', className: '' },
    { key: 'curador', label: 'Curador(a)', placeholder: 'Nome do curador', className: 'col-span-2' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-serif text-2xl mb-1" style={{ color: '#1A1816' }}>Trajetória &amp; currículo</h2>
        <p className="text-sm" style={{ color: '#6B6762' }}>Registre formações, exposições, prêmios e histórico profissional.</p>
      </div>

      <AddList
        title="Formação acadêmica"
        items={data.formacao}
        onChange={v => onChange({ formacao: v as ListItem[] })}
        fields={[
          { key: 'titulo', label: 'Curso / Grau', placeholder: 'Graduação em Artes Visuais' },
          { key: 'local', label: 'Instituição', placeholder: 'UERJ, EBA-UFRJ...' },
          { key: 'ano', label: 'Ano início–fim', placeholder: '2010–2014', className: '' },
        ]}
      />
      <div style={{ height: 1, background: '#e8e4de' }} />

      <AddList
        title="Exposições individuais"
        items={data.expos_individuais}
        onChange={v => onChange({ expos_individuais: v as ListItem[] })}
        fields={exposFields}
      />
      <div style={{ height: 1, background: '#e8e4de' }} />

      <AddList
        title="Exposições coletivas"
        items={data.expos_coletivas}
        onChange={v => onChange({ expos_coletivas: v as ListItem[] })}
        fields={exposFields}
      />
      <div style={{ height: 1, background: '#e8e4de' }} />

      <AddList
        title="Prêmios & reconhecimentos"
        items={data.premios}
        onChange={v => onChange({ premios: v as ListItem[] })}
        fields={[
          { key: 'titulo', label: 'Prêmio / Bolsa', placeholder: 'Nome do prêmio' },
          { key: 'local', label: 'Instituição', placeholder: 'Fundação, museu...' },
          { key: 'ano', label: 'Ano', placeholder: '2022', className: '' },
        ]}
      />
      <div style={{ height: 1, background: '#e8e4de' }} />

      <AddList
        title="Residências artísticas"
        items={data.residencias}
        onChange={v => onChange({ residencias: v as ListItem[] })}
        fields={[
          { key: 'titulo', label: 'Nome da residência', placeholder: 'Residência X' },
          { key: 'local', label: 'Local / País', placeholder: 'Nova York, EUA' },
          { key: 'ano', label: 'Ano', placeholder: '2021', className: '' },
        ]}
      />
      <div style={{ height: 1, background: '#e8e4de' }} />

      <AddList
        title="Bolsas & fomentos"
        items={data.bolsas}
        onChange={v => onChange({ bolsas: v as ListItem[] })}
        fields={[
          { key: 'titulo', label: 'Bolsa / Fomento', placeholder: 'Nome da bolsa' },
          { key: 'local', label: 'Órgão concedente', placeholder: 'FUNARTE, FAC...' },
          { key: 'ano', label: 'Ano', placeholder: '2020', className: '' },
        ]}
      />
      <div style={{ height: 1, background: '#e8e4de' }} />

      <AddList
        title="Feiras de arte"
        items={data.feiras}
        onChange={v => onChange({ feiras: v as ListItem[] })}
        fields={[
          { key: 'titulo', label: 'Feira', placeholder: 'SP-Arte, ArtRio...' },
          { key: 'local', label: 'Galeria representante', placeholder: 'Galeria X' },
          { key: 'ano', label: 'Ano', placeholder: '2023', className: '' },
        ]}
      />
      <div style={{ height: 1, background: '#e8e4de' }} />

      <AddList
        title="Publicações"
        items={data.publicacoes}
        onChange={v => onChange({ publicacoes: v as ListItem[] })}
        fields={[
          { key: 'titulo', label: 'Título da publicação', placeholder: 'Catálogo, livro, artigo...' },
          { key: 'local', label: 'Editora / Veículo', placeholder: 'Editora, jornal, revista...' },
          { key: 'ano', label: 'Ano', placeholder: '2022', className: '' },
        ]}
      />
      <div style={{ height: 1, background: '#e8e4de' }} />

      <AddList
        title="Coleções públicas"
        items={data.colecoesPublicas}
        onChange={v => onChange({ colecoesPublicas: v as ListItem[] })}
        fields={[
          { key: 'titulo', label: 'Instituição', placeholder: 'Museu, fundação...' },
          { key: 'local', label: 'Cidade / País', placeholder: 'São Paulo, Brasil' },
          { key: 'ano', label: 'Ano de aquisição', placeholder: '2019', className: '' },
        ]}
      />
      <div style={{ height: 1, background: '#e8e4de' }} />

      <AddList
        title="Coleções privadas"
        items={data.colecoesPrivadas}
        onChange={v => onChange({ colecoesPrivadas: v as ListItem[] })}
        fields={[
          { key: 'titulo', label: 'Colecionador / Empresa', placeholder: 'Coleção privada' },
          { key: 'local', label: 'País', placeholder: 'Brasil' },
          { key: 'ano', label: 'Ano', placeholder: '2021', className: '' },
        ]}
      />
      <div style={{ height: 1, background: '#e8e4de' }} />

      <AddList
        title="Clipping de mídia"
        items={data.clipping}
        onChange={v => onChange({ clipping: v as ListItem[] })}
        fields={[
          { key: 'titulo', label: 'Título da matéria', placeholder: 'Artigo, entrevista, resenha...' },
          { key: 'local', label: 'Veículo', placeholder: 'Folha, O Globo, Flash Art...' },
          { key: 'ano', label: 'Ano', placeholder: '2022', className: '' },
        ]}
      />
    </div>
  );
}

// ─── Step 4 — Marca & Identidade ──────────────────────────────────────────────

function Step4({ data, onChange }: { data: WizardData; onChange: (d: Partial<WizardData>) => void }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-2xl mb-1" style={{ color: '#1A1816' }}>Marca &amp; identidade</h2>
        <p className="text-sm" style={{ color: '#6B6762' }}>Faça upload do seu selo e assinatura para uso em certificados e dossiês.</p>
      </div>

      <div className="rounded-xl p-4" style={{ background: GREEN_LIGHT, border: `1px solid ${GREEN}20` }}>
        <p className="text-xs leading-relaxed" style={{ color: GREEN }}>
          <strong>Dica:</strong> O selo deve ter fundo transparente (PNG). A assinatura pode ser digitalizada ou fotografada em fundo branco. Pelo menos um dos dois é recomendado para apresentações curatoriais.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div>
          <ImageUploader
            label="Selo / Carimbo da marca"
            hint="PNG com fundo transparente"
            value={data.selo_url}
            onChange={v => onChange({ selo_url: v })}
            folder="onboarding/selo"
          />
          <p className="text-xs mt-2" style={{ color: '#b0ada8' }}>Usado no rodapé do portfólio PDF e certificado de autenticidade.</p>
        </div>
        <div>
          <ImageUploader
            label="Assinatura digital"
            hint="JPG ou PNG da sua assinatura"
            value={data.assinatura_url}
            onChange={v => onChange({ assinatura_url: v })}
            folder="onboarding/assinatura"
          />
          <p className="text-xs mt-2" style={{ color: '#b0ada8' }}>Alternativa ao selo visual para validação de autoria.</p>
        </div>
      </div>
    </div>
  );
}

// ─── Step 5 — Fotos Profissionais ─────────────────────────────────────────────

function Step5({ data, onChange }: { data: WizardData; onChange: (d: Partial<WizardData>) => void }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-2xl mb-1" style={{ color: '#1A1816' }}>Fotos profissionais</h2>
        <p className="text-sm" style={{ color: '#6B6762' }}>Adicione até 5 fotos suas para uso em materiais de divulgação e dossiês.</p>
      </div>

      <div className="rounded-xl p-4" style={{ background: '#fafaf8', border: '1px solid #e8e4de' }}>
        <p className="text-xs" style={{ color: '#6B6762' }}>
          Escolha fotos de alta qualidade, preferencialmente com fundo neutro ou em contexto artístico. Formatos aceitos: JPG, PNG, WEBP.
        </p>
      </div>

      <MultiPhotoUploader
        values={data.fotos_profissionais}
        onChange={v => onChange({ fotos_profissionais: v })}
      />
    </div>
  );
}

// ─── Conclusion Screen ────────────────────────────────────────────────────────

function ConclusionScreen({ data, onAddWork, onDashboard, loading }: {
  data: WizardData;
  onAddWork: () => void;
  onDashboard: () => void;
  loading: boolean;
}) {
  const initials = (data.nomeartistico || data.nome || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  const tags = data.tags ? data.tags.split(',').map(t => t.trim()).filter(Boolean).slice(0, 5) : [];

  return (
    <div className="flex flex-col items-center text-center space-y-7">
      {/* Checkmark */}
      <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: GREEN }}>
        <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
        </svg>
      </div>

      <div>
        <h2 className="font-serif text-3xl mb-2" style={{ color: '#1A1816' }}>
          {data.nomeartistico || data.nome
            ? `Bem-vinda, ${data.nomeartistico || data.nome}!`
            : 'Tudo certo!'}
        </h2>
        <p className="text-sm max-w-sm mx-auto" style={{ color: '#6B6762' }}>
          Seu perfil foi configurado com sucesso. Você pode complementar qualquer informação a qualquer momento em{' '}
          <strong>Configurações &gt; Perfil</strong>.
        </p>
      </div>

      {/* Preview Card */}
      <div className="w-full max-w-sm rounded-2xl p-6 text-left" style={{ background: '#1A1816', color: 'white' }}>
        <div className="flex items-center gap-4 mb-4">
          {data.foto_url ? (
            <img src={data.foto_url} alt="avatar"
              style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
          ) : (
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: GREEN, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ color: 'white', fontSize: 20, fontWeight: 600 }}>{initials}</span>
            </div>
          )}
          <div className="min-w-0">
            <p className="font-serif text-lg leading-tight truncate">{data.nomeartistico || data.nome || 'Artista'}</p>
            {(data.cidade || data.nacionalidade) && (
              <p className="text-xs mt-0.5 truncate" style={{ color: '#B0ADA8' }}>
                {[data.cidade, data.nacionalidade].filter(Boolean).join(' · ')}
              </p>
            )}
          </div>
        </div>
        {data.bioshort && (
          <p className="text-xs leading-relaxed mb-3" style={{ color: '#B0ADA8' }}>
            {data.bioshort.slice(0, 150)}{data.bioshort.length > 150 ? '...' : ''}
          </p>
        )}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {tags.map((t, i) => (
              <span key={i} className="text-xs px-2 py-0.5 rounded-full" style={{ background: GREEN, color: 'white' }}>
                {t}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* CTAs */}
      <div className="w-full max-w-sm space-y-3">
        <button
          type="button"
          onClick={onAddWork}
          disabled={loading}
          className="w-full py-3.5 rounded-xl font-medium text-white transition-opacity text-sm"
          style={{ background: GREEN, opacity: loading ? 0.6 : 1 }}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: 'white', borderTopColor: 'transparent' }} />
              Salvando...
            </span>
          ) : (
            '+ Adicionar primeira obra →'
          )}
        </button>
        <button
          type="button"
          onClick={onDashboard}
          disabled={loading}
          className="w-full py-3 rounded-xl font-medium text-sm border transition-colors"
          style={{ borderColor: '#d1ccc4', color: '#1A1816', opacity: loading ? 0.4 : 1 }}
        >
          Ir ao dashboard
        </button>
      </div>
    </div>
  );
}

// ─── Main Wizard ──────────────────────────────────────────────────────────────

export default function Onboarding({ onComplete }: Props) {
  const navigate = useNavigate();
  const [step, setStep] = useState(0); // 0–4 = steps, 5 = conclusion
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
    } catch { /* fail silently — user can retry on finish */ }
    scrollToTop();
    setStep(s => s + 1);
  };

  const handleSkip = () => {
    scrollToTop();
    setStep(s => s + 1);
  };

  const handleBack = () => {
    setErrors([]);
    scrollToTop();
    setStep(s => s - 1);
  };

  const handleFinish = async (destination: 'upload' | 'dashboard') => {
    setSaving(true);
    try {
      await completeOnboarding({ ...buildPayload(), onboarding_completed: true });
      onComplete();
      navigate(destination === 'upload' ? '/upload' : '/');
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
            'Marca & identidade visual',
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
        <div className="flex items-center justify-between px-6 sm:px-8 py-5 border-b" style={{ borderColor: '#e8e4de' }}>
          <div className="lg:hidden">
            <p className="font-serif italic text-lg" style={{ color: GREEN }}>studio virtual</p>
          </div>
          {!isConclusion && (
            <div className="flex items-center gap-4 ml-auto">
              <span className="text-xs hidden sm:block" style={{ color: '#b0ada8' }}>
                {step + 1} de {TOTAL_STEPS}
              </span>
              <ProgressBar current={step} />
            </div>
          )}
          {isConclusion && (
            <div className="ml-auto">
              <span className="text-xs uppercase tracking-widest" style={{ color: GREEN }}>Perfil configurado ✓</span>
            </div>
          )}
        </div>

        {/* Scrollable content */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 sm:px-8 py-10">
          <div className="max-w-lg mx-auto">
            {isConclusion ? (
              <ConclusionScreen
                data={data}
                onAddWork={() => handleFinish('upload')}
                onDashboard={() => handleFinish('dashboard')}
                loading={saving}
              />
            ) : (
              <>
                {step === 0 && <Step1 data={data} onChange={update} />}
                {step === 1 && <Step2 data={data} onChange={update} />}
                {step === 2 && <Step3 data={data} onChange={update} />}
                {step === 3 && <Step4 data={data} onChange={update} />}
                {step === 4 && <Step5 data={data} onChange={update} />}

                {errors.length > 0 && (
                  <div className="mt-5 rounded-xl px-4 py-3" style={{ background: '#fef2f2', border: '1px solid #fecaca' }}>
                    {errors.map((e, i) => (
                      <p key={i} className="text-sm" style={{ color: '#dc2626' }}>{e}</p>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Bottom navigation */}
        {!isConclusion && (
          <div
            className="flex items-center justify-between px-6 sm:px-8 py-5 border-t"
            style={{ borderColor: '#e8e4de', background: '#F5F3EE' }}
          >
            {step > 0 ? (
              <button
                type="button"
                onClick={handleBack}
                className="text-sm px-5 py-2.5 rounded-lg border transition-colors"
                style={{ borderColor: '#d1ccc4', color: '#1A1816' }}
              >
                ← Voltar
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-4">
              {canSkip && (
                <button
                  type="button"
                  onClick={handleSkip}
                  className="text-sm underline"
                  style={{ color: '#b0ada8' }}
                >
                  Pular por agora
                </button>
              )}
              <button
                type="button"
                onClick={handleNext}
                className="text-sm px-6 py-2.5 rounded-lg font-medium text-white transition-opacity"
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
