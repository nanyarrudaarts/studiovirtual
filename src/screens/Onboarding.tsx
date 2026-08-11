import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, saveOnboardingStep, completeOnboarding } from '../services/supabase';
import { Combobox } from '../components/ui/Combobox';
import ptStrings from '../i18n/pt';
import enStrings from '../i18n/en';
import esStrings from '../i18n/es';
import deStrings from '../i18n/de';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { callAI, readURLWithJina, searchWithJina, cleanTextForAI, chunkTextForAI } from '../services/ai';
import { TrajectorySection } from '../components/ui/TrajectorySection';
import type { FieldConfig } from '../components/ui/TrajectoryModal';
import {
  COUNTRIES,
  CITIES,
  GALLERIES_AND_INSTITUTIONS,
  CURATORS,
  ART_FAIRS,
  MEDIA_OUTLETS,
  EXHIBITION_TYPES,
  RESIDENCY_TYPES,
  RESIDENCY_DURATIONS,
  AWARD_TYPES,
  AWARD_RESULTS,
  FAIR_PARTICIPATION_TYPES,
  PUBLICATION_TYPES,
  PUBLICATION_FORMATS,
  PUBLICATION_LANGUAGES,
  COLLECTION_TYPES,
  COLLECTION_AUTHORIZATIONS,
  MEDIA_TYPES,
  CONTENT_TYPES,
  YEARS_LIST,
} from '../data/trajectoryPresets';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

// ─── Image Crop & Compression Helpers ──────────────────────────────────────────

async function compressImage(file: File, maxSize: number = 1600): Promise<File | Blob> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxSize) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = Math.round((width * maxSize) / height);
            height = maxSize;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            } else {
              resolve(file);
            }
          },
          'image/jpeg',
          0.8
        );
      };
      img.onerror = () => resolve(file);
      img.src = e.target?.result as string;
    };
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
}



import { CropperModal } from '../components/onboarding/CropperModal';


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
  estado_nascimento: string;
  pais_atual: string;
  estado_atual: string;
  // Phone split
  tel_ddi: string;
  tel_ddd: string;
  tel_numero: string;
  same_whatsapp: boolean;
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
  ano_inicio_carreira: string;
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
const TOTAL_STEPS = 5;

// ─── Design Tokens (Apple Obsidian Black) ──────────────────────────────────────
const DT = {
  bg:           '#F5F5F7',
  surface:      '#FFFFFF',
  inputBg:      '#F2F2F7',
  black:        '#000000',
  blackHover:   '#1C1C1E',
  gold:         '#C5A059',
  text:         '#1D1D1F',
  textMuted:    '#86868B',
  textFaint:    '#A1A1A6',
  border:       'rgba(0, 0, 0, 0.08)',
  fontSans:     'system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", sans-serif',
  fontMono:     '"JetBrains Mono", monospace',
};
// ─── Preset Lists para Autocomplete ──────────────────────────────────────────
const PAISES_OPTIONS = [
  'Brasil', 'Portugal', 'França', 'Alemanha', 'Itália', 'Espanha', 'Reino Unido',
  'Estados Unidos', 'Canadá', 'Japão', 'Argentina', 'Chile', 'Colômbia', 'México',
  'Uruguai', 'Suíça', 'Holanda', 'Bélgica', 'Áustria', 'Austrália'
];

const NACIONALIDADES_OPTIONS = [
  'Brasileira', 'Portuguesa', 'Francesa', 'Alemã', 'Italiana', 'Espanhola', 'Britânica',
  'Norte-americana', 'Canadense', 'Japonesa', 'Argentina', 'Chilena', 'Colombiana', 'Mexicana',
  'Uruguaia', 'Suíça', 'Holandesa', 'Belga', 'Austríaca', 'Australiana'
];

const CIDADES_OPTIONS = [
  'São Paulo', 'Rio de Janeiro', 'Belo Horizonte', 'Curitiba', 'Porto Alegre', 'Salvador',
  'Recife', 'Brasília', 'Fortaleza', 'Florianópolis', 'Belém', 'Manaus', 'Goiânia',
  'Lisboa', 'Porto', 'Paris', 'Berlim', 'Roma', 'Madri', 'Londres', 'Nova York'
];

// Estados/províncias por país (BR completo + fallback genérico para outros)
const ESTADOS_BR_OPTIONS = [
  'Acre', 'Alagoas', 'Amapá', 'Amazonas', 'Bahia', 'Ceará', 'Distrito Federal',
  'Espírito Santo', 'Goiás', 'Maranhão', 'Mato Grosso', 'Mato Grosso do Sul',
  'Minas Gerais', 'Pará', 'Paraíba', 'Paraná', 'Pernambuco', 'Piauí', 'Rio de Janeiro',
  'Rio Grande do Norte', 'Rio Grande do Sul', 'Rondônia', 'Roraima', 'Santa Catarina',
  'São Paulo', 'Sergipe', 'Tocantins',
];

const ESTADOS_PT_OPTIONS = [
  'Aveiro', 'Beja', 'Braga', 'Bragança', 'Castelo Branco', 'Coimbra', 'Évora',
  'Faro', 'Guarda', 'Leiria', 'Lisboa', 'Portalegre', 'Porto', 'Santarém', 'Setúbal',
  'Viana do Castelo', 'Vila Real', 'Viseu', 'Açores', 'Madeira',
];

const ESTADOS_ES_OPTIONS = [
  'Andalucía', 'Aragón', 'Asturias', 'Baleares', 'Canarias', 'Cantabria',
  'Castilla-La Mancha', 'Castilla y León', 'Cataluña', 'Extremadura', 'Galicia',
  'La Rioja', 'Madrid', 'Murcia', 'Navarra', 'País Vasco', 'Valencia',
];

function getEstadosOptions(pais: string): string[] {
  const p = pais.toLowerCase();
  if (p.includes('brasil')) return ESTADOS_BR_OPTIONS;
  if (p.includes('portugal')) return ESTADOS_PT_OPTIONS;
  if (p.includes('espanha') || p.includes('spain') || p.includes('españa')) return ESTADOS_ES_OPTIONS;
  return [];
}

// Sugestões para campos artísticos
const TECNICAS_OPTIONS = [
  'Pintura a óleo', 'Aquarela', 'Acrílica', 'Têmpera', 'Guache',
  'Gravura', 'Serigrafia', 'Litografia', 'Xilogravura', 'Água-forte',
  'Escultura', 'Cerâmica', 'Instalação', 'Performance', 'Arte conceitual',
  'Fotografia', 'Vídeo', 'Arte digital', 'Desenho', 'Colagem', 'Técnica mista',
  'Arte generativa', 'NFT / Arte blockchain', 'Bordado', 'Tapeçaria',
];

const TEMAS_OPTIONS = [
  'Memória', 'Identidade', 'Corpo', 'Gênero', 'Sexualidade', 'Raça', 'Política',
  'Natureza', 'Ecologia', 'Urbanismo', 'Arquitetura', 'Afeto', 'Morte', 'Tempo',
  'Linguagem', 'Subjetividade', 'Colonialismo', 'Resistência', 'Feminismo',
  'Tecnologia', 'Psicanálise', 'Espiritualidade', 'Mitologia', 'Cotidiano',
];

const EMPTY_DATA: WizardData = {
  nome: '', nomeartistico: '', email: '', nascimento: '',
  nacionalidade: '', cidade: '', telefone: '', whatsapp: '', website: '',
  foto_url: '', pronome: '', cidade_nascimento: '', pais_nascimento: '',
  estado_nascimento: '', pais_atual: '', estado_atual: '',
  tel_ddi: '+55', tel_ddd: '', tel_numero: '', same_whatsapp: true,
  bioshort: '', biolong: '', statement: '', tags: '', instagrams: [],
  processo_criativo: '', tecnicas_recorrentes: '', temas_centrais: '',
  pesquisa_artistica: '', referencias_conceituais: '',
  ano_inicio_carreira: '',
  formacao: [], expos_individuais: [], expos_coletivas: [], premios: [],
  residencias: [], publicacoes: [], bolsas: [], feiras: [],
  clipping: [], colecoesPublicas: [], colecoesPrivadas: [],
  selo_url: '', assinatura_url: '',
  fotos_profissionais: [],
};

// ─── Storage ──────────────────────────────────────────────────────────────────

async function uploadToStorage(file: File | Blob, folder: string): Promise<string> {
  const ext = file instanceof File ? file.name.split('.').pop() : 'jpg';
  const path = `${folder}/${Date.now()}-${uid()}.${ext}`;
  const { error } = await supabase.storage.from('obras-images').upload(path, file, { upsert: true });
  if (error) throw error;
  return supabase.storage.from('obras-images').getPublicUrl(path).data.publicUrl;
}

// ─── ProgressBar ─────────────────────────────────────────────────────────────
// variant="sidebar"  → stepper vertical na sidebar desktop (default)
// variant="compact"  → dots animados no top bar mobile

function getStepMeta(T: Record<string, string>) {
  return [
    { label: T.step1_label ?? 'Conta & Perfil',   sub: T.step1_sub ?? 'Identificação pessoal' },
    { label: T.step2_label ?? 'Perfil Artístico', sub: T.step2_sub ?? 'Bio e declaração'      },
    { label: T.step3_label ?? 'Trajetória',       sub: T.step3_sub ?? 'Histórico e currículo'  },
    { label: T.step4_label ?? 'Marca',            sub: T.step4_sub ?? 'Identidade visual'      },
    { label: T.step5_label ?? 'Fotos',            sub: T.step5_sub ?? 'Imagens profissionais'  },
  ];
}

function ProgressBar({ current, variant = 'sidebar', T }: { current: number; variant?: 'sidebar' | 'compact'; T: Record<string, string> }) {
  const stepMeta = getStepMeta(T);

  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-1.5">
        {stepMeta.map((_, i) => {
          const done   = i < current;
          const active = i === current;
          return (
            <div key={i}
              className="h-1.5 rounded-full transition-all duration-300"
              style={{
                width:      active ? '28px' : '10px',
                background: active ? DT.black : done ? `${DT.black}60` : '#E5E5EA',
              }}
            />
          );
        })}
      </div>
    );
  }

  // Stepper vertical sidebar (Apple pills)
  return (
    <nav className="space-y-3 mt-4">
      {stepMeta.map((meta, i) => {
        const done   = i < current;
        const active = i === current;
        return (
          <div
            key={i}
            className="flex items-center gap-3.5 p-3 rounded-2xl transition-all duration-300"
            style={{
              background: active
                ? 'rgba(255, 255, 255, 0.15)'
                : 'transparent',
              backdropFilter: active ? 'blur(10px)' : 'none',
              border: active ? '1px solid rgba(255, 255, 255, 0.2)' : '1px solid transparent',
            }}
          >
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 transition-all duration-300"
              style={{
                background: active ? '#FFFFFF' : done ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.08)',
                color:      active ? DT.black : '#FFFFFF',
                fontFamily: DT.fontSans,
              }}
            >
              {done ? (
                <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
              ) : i + 1}
            </div>
            <div className="transition-opacity duration-300" style={{ opacity: active ? 1 : done ? 0.8 : 0.4 }}>
              <p className="text-sm font-semibold tracking-tight text-white">{meta.label}</p>
              <p className="text-[11px] text-white/60" style={{ fontFamily: DT.fontSans }}>{meta.sub}</p>
            </div>
          </div>
        );
      })}
    </nav>
  );
}

// ─── Shared UI Components ─────────────────────────────────────────────────────

function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 pt-3 pb-1">
      <div className="flex-1 h-px" style={{ background: DT.border }} />
      <span style={{ fontFamily: DT.fontSans, color: DT.textMuted }}
        className="text-[11px] font-semibold uppercase tracking-wider">{label}</span>
      <div className="flex-1 h-px" style={{ background: DT.border }} />
    </div>
  );
}

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label style={{ fontFamily: DT.fontSans, color: DT.text }}
      className="block text-xs font-semibold tracking-tight mb-1.5">
      {children}{required && <span className="ml-1 text-red-500">*</span>}
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
      className="w-full rounded-xl px-4 py-3 text-[15px] outline-none transition-all disabled:opacity-50 placeholder:text-[#A1A1A6]"
      style={{
        background: DT.inputBg,
        border: '1px solid transparent',
        color: DT.text,
        fontFamily: DT.fontSans,
      }}
      onFocus={e => {
        e.currentTarget.style.background = '#FFFFFF';
        e.currentTarget.style.border = `1px solid ${DT.black}`;
        e.currentTarget.style.boxShadow = `0 0 0 4px rgba(0, 0, 0, 0.08)`;
      }}
      onBlur={e => {
        e.currentTarget.style.background = DT.inputBg;
        e.currentTarget.style.border = '1px solid transparent';
        e.currentTarget.style.boxShadow = 'none';
      }}
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
      className="w-full rounded-xl px-4 py-3 text-[15px] outline-none resize-none transition-all placeholder:text-[#A1A1A6]"
      style={{
        background: DT.inputBg,
        border: '1px solid transparent',
        color: DT.text,
        fontFamily: DT.fontSans,
      }}
      onFocus={e => {
        e.currentTarget.style.background = '#FFFFFF';
        e.currentTarget.style.border = `1px solid ${DT.black}`;
        e.currentTarget.style.boxShadow = `0 0 0 4px rgba(0, 0, 0, 0.08)`;
      }}
      onBlur={e => {
        e.currentTarget.style.background = DT.inputBg;
        e.currentTarget.style.border = '1px solid transparent';
        e.currentTarget.style.boxShadow = 'none';
      }}
    />
  );
}

function WordCount({ text, T }: { text: string; T: Record<string, string> }) {
  const n = text.trim().split(/\s+/).filter(Boolean).length;
  return <p className="text-xs text-right mt-1 text-[#b0ada8]">{T.word_count?.replace('{{count}}', String(n)) ?? `${n} palavras`}</p>;
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
    <div className="flex flex-wrap gap-2 p-2 border border-[#d1ccc4] rounded-xl min-h-[46px] transition-colors">
      {tags.map((tag, i) => (
        <span key={i} className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-[#e8f3ee] text-[#0f3421]">
          {tag}
          <button type="button" onClick={() => remove(i)} className="leading-none text-[#0f3421]">×</button>
        </span>
      ))}
      <input
        type="text"
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={handleKey}
        onBlur={() => { if (input.trim()) { add(input); setInput(''); } }}
        placeholder={tags.length === 0 ? placeholder : ''}
        className="flex-1 min-w-[120px] bg-transparent border-none outline-none text-sm text-[#1A1816]"
      />
    </div>
  );
}

function InstagramList({ values, onChange, T }: { values: string[]; onChange: (v: string[]) => void; T: Record<string, string> }) {
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
            className="text-sm flex-shrink-0 text-[#b0ada8]">×</button>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...values, ''])}
        className="text-xs uppercase tracking-widest text-[#0f3421]">
        {T.btn_add_instagram ?? '+ Adicionar Instagram'}
      </button>
    </div>
  );
}

// ─── Avatar Uploader ──────────────────────────────────────────────────────────

function AvatarUploader({ value, onChange, T }: { value: string; onChange: (url: string) => void; T: Record<string, string> }) {
  const [uploading, setUploading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const ref = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    const url = URL.createObjectURL(file);
    setSelectedImage(url);
  };

  const handleCropSave = async (blob: Blob) => {
    setSelectedImage(null);
    setUploading(true);
    try {
      const url = await uploadToStorage(blob, 'onboarding/avatar');
      onChange(url);
    } catch (err) {
      console.error(err);
      alert(T.avatar_error ?? 'Erro ao carregar avatar.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex items-center gap-5">
      <div
        onClick={() => ref.current?.click()}
        className="relative cursor-pointer flex-shrink-0 w-[88px] h-[88px] rounded-full overflow-hidden bg-[#e8f0eb] border-2 border-dashed border-[#0f3421]"
      >
        {value ? (
          <img src={value} alt="avatar" className="w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
            {uploading ? (
              <div className="w-4 h-4 border-2 border-[#0f3421] border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#0f3421" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
                </svg>
                <span className="text-xs text-[#0f3421]">{T.avatar_label ?? 'foto'}</span>
              </>
            )}
          </div>
        )}
      </div>
      <div>
        <p className="text-sm font-medium text-[#1A1816]">{T.avatar_title ?? 'Foto de perfil'}</p>
        <p className="text-xs mt-0.5 text-[#6B6762]">{T.avatar_hint ?? 'JPG, PNG ou WEBP · corte quadrado e compressão automática'}</p>
        <button
          type="button"
          onClick={() => ref.current?.click()}
          className="mt-2 text-xs underline text-[#0f3421]"
        >
          {value ? (T.avatar_change ?? 'Trocar foto') : (T.avatar_choose ?? 'Escolher arquivo')}
        </button>
      </div>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        aria-label={T.avatar_aria ?? 'Escolher foto de perfil'}
        className="hidden"
        onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }}
      />

      {selectedImage && (
        <CropperModal
          imageSrc={selectedImage}
          onClose={() => setSelectedImage(null)}
          onSave={handleCropSave}
          T={T}
        />
      )}
    </div>
  );
}

// ─── Brand Asset Uploader (Marca & Identidade) ────────────────────────────────

function BrandAssetUploader({
  label,
  description,
  hint,
  value,
  onChange,
  folder,
  T,
}: {
  label: string;
  description: string;
  hint: string;
  value: string;
  onChange: (url: string) => void;
  folder: string;
  T: Record<string, string>;
}) {
  const [uploading, setUploading] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      const compressed = await compressImage(file, 1200);
      const url = await uploadToStorage(compressed, folder);
      onChange(url);
    } catch (err) {
      console.error(err);
      alert(T.upload_error ?? 'Erro ao carregar imagem.');
    } finally {
      setUploading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(true);
  };

  const handleDragLeave = () => {
    setIsDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
    if (e.dataTransfer.files?.[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <label className="block text-xs uppercase tracking-widest mb-1.5 font-medium text-[#6B6762]">
        {label}
      </label>
      
      {/* Upload Card */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`flex-1 border-2 border-dashed rounded-xl p-5 flex flex-col items-center justify-center text-center cursor-pointer transition-all min-h-[160px] ${
          value ? 'bg-[#e8f0eb] border-[#0f3421]' : isDragActive ? 'bg-gray-50 border-[#0f3421]' : 'bg-[#fafaf8] border-[#d1ccc4]'
        } hover:border-[#0f3421]`}
      >
        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <div className="w-5 h-5 border-2 border-[#0f3421] border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-[#6B6762]">{T.upload_loading ?? 'Carregando...'}</span>
          </div>
        ) : value ? (
          <div className="relative group w-full h-full flex items-center justify-center max-h-[120px]">
            <img src={value} alt={label} className="max-h-[120px] max-w-full object-contain" />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange('');
                }}
                className="bg-white/90 hover:bg-white text-xs px-3 py-1.5 rounded-lg text-red-600 font-medium"
              >
                {T.upload_remove ?? 'Remover'}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="#0f3421" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
            </svg>
            <span className="text-xs font-medium text-[#1A1816]">{T.upload_drag_click ?? 'Arraste ou clique para enviar'}</span>
            <span className="text-[10px] text-[#6B6762]">{hint}</span>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          aria-label={`${T.avatar_choose ?? 'Escolher'} ${label}`}
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.[0]) handleFile(e.target.files[0]);
          }}
        />
      </div>

      <p className="text-xs mt-2 text-[#6B6762] leading-relaxed">
        {description}
      </p>
    </div>
  );
}

// ─── Multi Photo Uploader (Fotos Profissionais) ────────────────────────────────

function MultiPhotoUploader({ values, onChange, T }: { values: string[]; onChange: (urls: string[]) => void; T: Record<string, string> }) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [uploadList, setUploadList] = useState<{ id: string; name: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const MAX = 5;

  const handleFiles = async (files: FileList) => {
    const remaining = MAX - values.length;
    const toUpload = Array.from(files).slice(0, remaining);
    if (toUpload.length === 0) return;

    const tempEntries = toUpload.map(f => ({ id: Math.random().toString(), name: f.name }));
    setUploadList(tempEntries);

    try {
      const uploadedUrls: string[] = [];
      for (const file of toUpload) {
        const compressed = await compressImage(file, 1600);
        const url = await uploadToStorage(compressed, 'onboarding/fotos');
        uploadedUrls.push(url);
      }
      onChange([...values, ...uploadedUrls]);
    } catch (err) {
      console.error(err);
      alert(T.upload_error ?? 'Erro ao carregar algumas fotos.');
    } finally {
      setUploadList([]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(true);
  };

  const handleDragLeave = () => {
    setIsDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
    if (e.dataTransfer.files) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const moveLeft = (index: number) => {
    if (index === 0) return;
    const newPhotos = [...values];
    const temp = newPhotos[index];
    newPhotos[index] = newPhotos[index - 1];
    newPhotos[index - 1] = temp;
    onChange(newPhotos);
  };

  const moveRight = (index: number) => {
    if (index === values.length - 1) return;
    const newPhotos = [...values];
    const temp = newPhotos[index];
    newPhotos[index] = newPhotos[index + 1];
    newPhotos[index + 1] = temp;
    onChange(newPhotos);
  };

  const removePhoto = (index: number) => {
    onChange(values.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      {/* Upload Zone */}
      {values.length < MAX && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all min-h-[160px] ${
            isDragActive ? 'bg-gray-50 border-[#0f3421]' : 'bg-[#fafaf8] border-[#d1ccc4]'
          } hover:border-[#0f3421]`}
        >
          <div className="flex flex-col items-center gap-2">
            <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="#0f3421" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
            </svg>
            <span className="text-xs font-medium text-[#1A1816]">{T.upload_drag_click ?? 'Arraste ou clique para enviar'}</span>
            <span className="text-[10px] text-[#6B6762]">{T.photos_hint ?? 'JPEG, PNG, WebP · até 5 fotos'}</span>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            aria-label={T.add_photos_aria ?? 'Adicionar fotos profissionais'}
            className="hidden"
            onChange={(e) => {
              if (e.target.files) handleFiles(e.target.files);
            }}
          />
        </div>
      )}

      {/* Slots Counter */}
      <div className="flex justify-between items-center text-xs text-[#6B6762]">
        <span>{T.rec_formats ?? 'Formatos recomendados: JPG, PNG, WebP'}</span>
        <span className="font-medium text-[#0f3421]">
          {T.photos_counter?.replace('{{count}}', String(values.length)).replace('{{max}}', String(MAX)) ?? `${values.length} de ${MAX} fotos carregadas`}
        </span>
      </div>

      {/* Preview Gallery */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
        {values.map((url, i) => (
          <div key={url} className="relative rounded-xl overflow-hidden group aspect-square border border-[#e8e4de] bg-[#f5f3ee]">
            <img src={url} alt={`Foto profissional ${i + 1}`} className="w-full h-full object-cover" />
            
            {/* Control Bar Overlay */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => removePhoto(i)}
                  className="bg-red-600 text-white rounded-full p-1 hover:bg-red-700 shadow-lg text-xs"
                  title={T.delete_photo_title ?? 'Excluir foto'}
                >
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="flex justify-between gap-1">
                <button
                  type="button"
                  disabled={i === 0}
                  onClick={() => moveLeft(i)}
                  className="bg-white/90 hover:bg-white text-gray-800 disabled:opacity-40 rounded p-1 text-xs flex-1 flex justify-center items-center shadow"
                  title={T.move_left_title ?? 'Mover para esquerda'}
                >
                  ←
                </button>
                <button
                  type="button"
                  disabled={i === values.length - 1}
                  onClick={() => moveRight(i)}
                  className="bg-white/90 hover:bg-white text-gray-800 disabled:opacity-40 rounded p-1 text-xs flex-1 flex justify-center items-center shadow"
                  title={T.move_right_title ?? 'Mover para direita'}
                >
                  →
                </button>
              </div>
            </div>
          </div>
        ))}

        {/* Loading / Progress Skeletons */}
        {uploadList.map((item) => (
          <div key={item.id} className="relative rounded-xl overflow-hidden aspect-square border border-dashed border-[#d1ccc4] bg-[#fafaf8] flex flex-col items-center justify-center p-3 text-center">
            <div className="w-6 h-6 border-2 border-[#0f3421] border-t-transparent rounded-full animate-spin mb-2" />
            <span className="text-[10px] text-[#6B6762] truncate w-full">{item.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── AddList ──────────────────────────────────────────────────────────────────



const COMMON_DDIS = [
  '+55', '+351', '+1', '+34', '+49', '+33', '+39', '+44', '+54', '+56',
  '+57', '+52', '+598', '+41', '+31', '+43', '+61', '+81', '+86', '+7'
];

function parsePhoneWithDDI(raw: string, currentDDI: string): { ddi: string; numero: string } {
  const trimmed = raw.trim();
  if (trimmed.startsWith('+')) {
    for (const ddi of COMMON_DDIS) {
      if (trimmed.startsWith(ddi)) {
        const rest = trimmed.slice(ddi.length).trim();
        return { ddi, numero: rest };
      }
    }
    const match = trimmed.match(/^(\+\d{1,4})\s*(.*)$/);
    if (match) {
      return { ddi: match[1], numero: match[2] };
    }
  }
  return { ddi: currentDDI || '+55', numero: raw };
}

// ─── CV Import Helpers & Box ──────────────────────────────────────────────────

async function extractTextFromPDFFile(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
  const pdf = await loadingTask.promise;
  let fullText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item: unknown) => (item as { str: string }).str)
      .join(' ');
    fullText += pageText + '\n';
  }
  return fullText;
}

const CV_SCHEMA_PROMPT = `{
  "nome": "Nome completo do artista",
  "nomeartistico": "Nome artístico ou assinatura",
  "pronome": "Pronome (ex: Ele/Dele, Ela/Dela)",
  "nascimento": "Ano de nascimento (ex: 1985)",
  "nacionalidade": "Nacionalidade (ex: Brasileira)",
  "cidade_nascimento": "Cidade de nascimento",
  "estado_nascimento": "Estado de nascimento",
  "pais_nascimento": "País de nascimento",
  "cidade": "Cidade atual de residência",
  "estado_atual": "Estado atual de residência",
  "pais_atual": "País atual de residência",
  "tel_ddi": "DDI (ex: +55 ou +351)",
  "tel_numero": "Número de telefone ou celular",
  "website": "Site oficial ou portfólio URL",
  "bioshort": "Biografia curta (1 a 3 frases resumindo a prática poética e trajetória)",
  "biolong": "Biografia completa ou institucional em texto corrido",
  "statement": "Artist statement / Declaração poética sobre a pesquisa visual",
  "processo_criativo": "Descrição detalhada do processo criativo, métodos e materiais",
  "tecnicas_recorrentes": "Técnicas artísticas recorrentes (ex: Óleo sobre tela, Escultura, Gravura, Fotografia)",
  "temas_centrais": "Temas centrais investigados (ex: Memória, Território, Ancestralidade, Identidade)",
  "pesquisa_artistica": "Campo ou questão principal de investigação poética",
  "referencias_conceituais": "Referências conceituais, filosóficas e artísticas",
  "ano_inicio_carreira": "Ano de início da carreira artística (ex: 2010)",
  "tags": "Palavras-chave descritivas separadas por vírgula",
  "formacao": [{ "titulo": "Curso ou Grau", "local": "Instituição de ensino", "ano": "Ano" }],
  "expos_individuais": [{ "titulo": "Título da exposição", "local": "Galeria/Museu/Espaço", "cidade": "Cidade", "pais": "País", "ano": "Ano", "curador": "Curador(a)" }],
  "expos_coletivas": [{ "titulo": "Título da exposição", "local": "Galeria/Museu/Espaço", "cidade": "Cidade", "pais": "País", "ano": "Ano", "curador": "Curador(a)" }],
  "premios": [{ "titulo": "Nome do prêmio/reconhecimento", "local": "Instituição concedente", "ano": "Ano" }],
  "residencias": [{ "titulo": "Nome da residência artística", "local": "Local/País", "ano": "Ano" }],
  "bolsas": [{ "titulo": "Nome da bolsa ou edital", "local": "Órgão concedente", "ano": "Ano" }],
  "feiras": [{ "titulo": "Nome da feira de arte", "local": "Galeria representante/Local", "ano": "Ano" }],
  "publicacoes": [{ "titulo": "Título do livro/catálogo/artigo", "local": "Editora ou Veículo", "ano": "Ano" }],
  "colecoesPublicas": [{ "titulo": "Nome do museu ou instituição pública", "local": "Cidade/País", "ano": "Ano" }],
  "colecoesPrivadas": [{ "titulo": "Colecionador ou Fundação", "local": "País/Cidade", "ano": "Ano" }],
  "clipping": [{ "titulo": "Título da matéria/reportagem", "local": "Veículo de imprensa", "ano": "Ano" }]
}`;

function extractJsonFromAI(text: string) {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try { return JSON.parse(match[0]); } catch { return null; }
}

function normalizeKey(str: string): string {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

function deduplicateList(items: ListItem[]): ListItem[] {
  const mergedMap = new Map<string, ListItem>();

  items.forEach((item) => {
    const rawTitle = item.titulo || item.nome || '';
    const titleKey = normalizeKey(rawTitle);
    if (!titleKey) return;

    const yearKey = normalizeKey(item.ano || '');
    const uniqueKey = yearKey ? `${titleKey}_${yearKey}` : titleKey;

    if (!mergedMap.has(uniqueKey)) {
      mergedMap.set(uniqueKey, { ...item });
    } else {
      const existing = mergedMap.get(uniqueKey)!;
      console.log("Item duplicado removido:", rawTitle);

      Object.keys(item).forEach((prop) => {
        if (prop === 'id') return;
        const val = item[prop];
        if (typeof val === 'string' && val.trim() && (!existing[prop] || !existing[prop].trim())) {
          existing[prop] = val.trim();
        }
      });

      if (item.ano && (!existing.ano || !existing.ano.trim())) {
        existing.ano = item.ano.trim();
      }

      if (item.suggestion && !existing.suggestion) {
        existing.suggestion = item.suggestion;
      }
      if (item._suggestion && !existing._suggestion) {
        existing._suggestion = item._suggestion;
      }

      if (
        item._autoResearched === 'true' ||
        (item._autoResearched as unknown) === true ||
        existing._autoResearched === 'true' ||
        (existing._autoResearched as unknown) === true
      ) {
        existing._autoResearched = 'true';
      }
    }
  });

  return Array.from(mergedMap.values());
}

function CVImportBox({ data, onChange, T }: { data: WizardData; onChange: (d: Partial<WizardData>) => void; T: Record<string, string> }) {
  const [tab, setTab] = useState<'pdf' | 'url'>('pdf');
  const [filesList, setFilesList] = useState<File[]>([]);
  const [urlsList, setUrlsList] = useState<string[]>([]);
  const [urlInput, setUrlInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  const addFiles = (files: FileList | File[]) => {
    const validPDFs = Array.from(files).filter(
      (f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
    );
    if (validPDFs.length === 0) return;
    setFilesList((prev) => {
      const existingKeys = new Set(prev.map((f) => `${f.name}_${f.size}`));
      const uniqueNew = validPDFs.filter((f) => !existingKeys.has(`${f.name}_${f.size}`));
      return [...prev, ...uniqueNew];
    });
    setFeedback(null);
  };

  const addUrl = () => {
    const trimmed = urlInput.trim();
    if (!trimmed) return;
    if (!urlsList.includes(trimmed)) {
      setUrlsList((prev) => [...prev, trimmed]);
    }
    setUrlInput('');
    setFeedback(null);
  };

  const removeFile = (index: number) => {
    setFilesList((prev) => prev.filter((_, i) => i !== index));
  };

  const removeUrl = (index: number) => {
    setUrlsList((prev) => prev.filter((_, i) => i !== index));
  };

  const clearAllSources = () => {
    setFilesList([]);
    setUrlsList([]);
    setUrlInput('');
    setFeedback(null);
  };

  const processAllSources = async () => {
    const totalSources = filesList.length + urlsList.length;
    if (totalSources === 0) return;

    setLoading(true);
    setFeedback(null);

    // 1. RESET DE ESTADO: Limpar todas as 11 listas antes de processar novas fontes
    const resetPatch: Partial<WizardData> = {
      formacao: [],
      expos_individuais: [],
      expos_coletivas: [],
      premios: [],
      residencias: [],
      bolsas: [],
      feiras: [],
      publicacoes: [],
      colecoesPublicas: [],
      colecoesPrivadas: [],
      clipping: [],
    };
    onChange(resetPatch);

    const extractedTexts: string[] = [];

    try {
      // 1. Process PDFs
      if (filesList.length > 0) {
        setStatusMsg(
          filesList.length === 1
            ? 'Lendo 1 arquivo PDF...'
            : `Lendo ${filesList.length} arquivos PDF...`
        );
        for (let i = 0; i < filesList.length; i++) {
          const file = filesList[i];
          if (filesList.length > 1) {
            setStatusMsg(`Lendo PDF ${i + 1} de ${filesList.length}: ${file.name}...`);
          }
          const rawText = await extractTextFromPDFFile(file);
          const cleanedText = cleanTextForAI(rawText);
          if (cleanedText) {
            extractedTexts.push(`--- DOCUMENTO ${i + 1} (PDF: ${file.name}) ---\n${cleanedText}`);
          }
        }
      }

      // 2. Process URLs
      if (urlsList.length > 0) {
        setStatusMsg(
          urlsList.length === 1
            ? 'Extraindo dados de 1 link...'
            : `Extraindo dados de ${urlsList.length} links...`
        );
        for (let i = 0; i < urlsList.length; i++) {
          const url = urlsList[i];
          if (urlsList.length > 1) {
            setStatusMsg(`Acessando link ${i + 1} de ${urlsList.length}...`);
          }
          try {
            const rawText = await readURLWithJina(url);
            const cleanedText = cleanTextForAI(rawText);
            if (cleanedText) {
              extractedTexts.push(`--- FONTE WEB ${i + 1} (${url}) ---\n${cleanedText}`);
            }
          } catch (e) {
            console.warn(`Erro ao acessar link ${url}:`, e);
          }
        }
      }

      if (extractedTexts.length === 0) {
        throw new Error('Nenhum texto pôde ser extraído das fontes fornecidas.');
      }

      // 3. Consolidated AI processing
      setStatusMsg('Consolidando informações com IA...');

      const rawSuperTexto = extractedTexts.join('\n\n');
      const superTexto = chunkTextForAI(rawSuperTexto, 12000);

      const prompt = `Você é um especialista em curadoria de arte e processamento de dados. Sua tarefa é analisar o texto consolidado a seguir de múltiplos documentos/links de um artista e retornar um JSON estruturado para o sistema StudioVirtual.

REGRAS DE MAPEAMENTO & CONSOLIDAÇÃO:
1. ETAPA 1 (Perfil): Extraia nome completo, nome artístico, pronome, ano de nascimento, nacionalidade, cidade/estado/país de origem e residência atual, telefone/DDI e website oficial.
2. ETAPA 2 (Poética): Sintetize a biografia curta (1-3 frases marcantes), biografia completa, statement (declaração poética), processo criativo, técnicas recorrentes, temas centrais, pesquisa artística e referências.
3. ETAPA 3 (Trajetória): Organize rigorosamente os dados nas 11 listas dinâmicas (formacao, expos_individuais, expos_coletivas, premios, residencias, bolsas, feiras, publicacoes, colecoesPublicas, colecoesPrivadas, clipping).
4. ELIMINAÇÃO DE DUPLICATAS: Ao consolidar informações de diferentes documentos, elimine itens duplicados nas listas e ordene a trajetória cronologicamente.

REQUISITOS TÉCNICOS:
- Retorne APENAS um JSON válido contendo exatamente a chave de cada campo.
- Se uma informação não for encontrada, use string vazia "" para campos de texto ou array vazio [] para listas.
- Mantenha o idioma original do texto para biografias e títulos, mas normalize nomes de países e cidades.

ESTRUTURA DE RESPOSTA ESPERADA (JSON PURO):
${CV_SCHEMA_PROMPT}

TEXTO CONSOLIDADO DAS FONTES:
${superTexto.substring(0, 16000)}`;

      const systemPrompt =
        'Você receberá fragmentos de múltiplos documentos (currículos, portfólios, sites). Sua tarefa é consolidar todas as informações na estrutura JSON das 5 etapas do StudioVirtual, eliminando duplicatas e organizando a trajetória cronologicamente.';

      const response = await callAI(prompt, systemPrompt);
      const parsed = extractJsonFromAI(response);
      if (!parsed) {
        throw new Error('Formato retornado pela IA inválido: ' + response.substring(0, 50));
      }

      // Deduplicação imediata das listas brutas retornadas pela IA
      const allListKeys: (keyof WizardData)[] = [
        'formacao', 'expos_individuais', 'expos_coletivas', 'premios',
        'residencias', 'bolsas', 'feiras', 'publicacoes',
        'colecoesPublicas', 'colecoesPrivadas', 'clipping'
      ];

      allListKeys.forEach((key) => {
        if (Array.isArray(parsed[key]) && parsed[key].length > 0) {
          parsed[key] = deduplicateList(parsed[key] as ListItem[]);
        }
      });

      // 4. Auto-Researching Gaps via Jina Search
      const artistName = parsed.nome || parsed.nomeartistico || data.nome || data.nomeartistico || 'artista';
      
      const gapCategories: { listKey: keyof WizardData; requiredKeys: string[] }[] = [
        { listKey: 'expos_individuais', requiredKeys: ['local', 'ano', 'cidade'] },
        { listKey: 'expos_coletivas', requiredKeys: ['local', 'ano', 'cidade'] },
        { listKey: 'publicacoes', requiredKeys: ['local', 'ano'] },
        { listKey: 'formacao', requiredKeys: ['local', 'ano'] },
        { listKey: 'premios', requiredKeys: ['local', 'ano'] },
        { listKey: 'residencias', requiredKeys: ['local', 'ano'] },
        { listKey: 'bolsas', requiredKeys: ['local', 'ano'] },
        { listKey: 'feiras', requiredKeys: ['local', 'ano'] },
        { listKey: 'colecoesPublicas', requiredKeys: ['local', 'ano'] },
        { listKey: 'colecoesPrivadas', requiredKeys: ['local', 'ano'] },
        { listKey: 'clipping', requiredKeys: ['local', 'ano'] },
      ];

      const gapItems: { listKey: keyof WizardData; index: number; title: string; missingKeys: string[] }[] = [];

      for (const cat of gapCategories) {
        const rawList = parsed[cat.listKey];
        if (Array.isArray(rawList)) {
          for (let i = 0; i < rawList.length; i++) {
            const item = rawList[i] as Record<string, string>;
            const itemTitle = item.titulo || item.nome || '';
            if (!itemTitle) continue;

            const missing = cat.requiredKeys.filter((k) => !item[k] || !item[k].trim());
            if (missing.length > 0) {
              gapItems.push({
                listKey: cat.listKey,
                index: i,
                title: itemTitle,
                missingKeys: missing,
              });
            }
          }
        }
      }

      if (gapItems.length > 0) {
        setStatusMsg('Pesquisando sugestões na web...');
        const gapsToResearch = gapItems.slice(0, 4);

        for (const gap of gapsToResearch) {
          console.log("Iniciando pesquisa para:", gap.title);
          const query = `Ficha técnica completa do item "${gap.title}" de "${artistName}" artes visuais galeria editora ano curador local`;
          try {
            const searchText = await searchWithJina(query);
            console.log(`Resultado da pesquisa para "${gap.title}":`, searchText ? 'Sucesso' : 'Vazio');
            if (searchText && searchText.trim()) {
              const miniPrompt = `Você é um curador e pesquisador de arte. Encontre e retorne a MELHOR CORRESPONDÊNCIA encontrada na web com a ficha técnica para o item de trajetória "${gap.title}" do artista "${artistName}".
Os seguintes campos estão ausentes: ${gap.missingKeys.join(', ')}.

Retorne APENAS um JSON simples com os dados encontrados para esses campos:
{ ${gap.missingKeys.map((k) => `"${k}": "valor encontrado ou vazio"`).join(', ')} }

TEXTO DA PESQUISA WEB:
${searchText.substring(0, 4000)}`;

              const miniRes = await callAI(miniPrompt, 'Extraia a melhor correspondência encontrada na web em JSON puro.');
              const miniParsed = extractJsonFromAI(miniRes);
              if (miniParsed) {
                const suggestionData: Record<string, string> = {};
                gap.missingKeys.forEach((k) => {
                  if (miniParsed[k] && typeof miniParsed[k] === 'string' && miniParsed[k].trim() && miniParsed[k].toLowerCase() !== 'vazio') {
                    suggestionData[k] = miniParsed[k].trim();
                  }
                });

                if (Object.keys(suggestionData).length > 0) {
                  const targetObj = (parsed[gap.listKey] as Record<string, any>[])[gap.index];
                  targetObj.suggestion = suggestionData;
                  targetObj._suggestion = JSON.stringify(suggestionData);
                  console.log(`✨ Sugestão proativa gerada para "${gap.title}":`, suggestionData);
                }
              }
            }
          } catch (researchErr) {
            console.warn(`[Auto-Research Error] para "${gap.title}":`, researchErr);
          }
        }
      }

      const patch: Partial<WizardData> = {};
      let rawTotalItems = 0;
      let cleanTotalItems = 0;

      // Scalar fields
      const scalarKeys: (keyof WizardData)[] = [
        'nome', 'nomeartistico', 'nascimento', 'nacionalidade',
        'cidade_nascimento', 'pais_nascimento', 'estado_nascimento',
        'pais_atual', 'estado_atual', 'cidade', 'tel_ddi', 'tel_numero',
        'website', 'bioshort', 'biolong', 'statement', 'processo_criativo',
        'tecnicas_recorrentes', 'temas_centrais', 'pesquisa_artistica',
        'referencias_conceituais', 'ano_inicio_carreira', 'tags'
      ];

      scalarKeys.forEach((key) => {
        const val = parsed[key];
        if (typeof val === 'string' && val.trim()) {
          (patch as Record<string, string>)[key] = val.trim();
        }
      });

      // List fields
      const listKeys: (keyof WizardData)[] = [
        'formacao', 'expos_individuais', 'expos_coletivas', 'premios',
        'residencias', 'bolsas', 'feiras', 'publicacoes',
        'colecoesPublicas', 'colecoesPrivadas', 'clipping'
      ];

      listKeys.forEach((key) => {
        const rawList = parsed[key];
        if (Array.isArray(rawList) && rawList.length > 0) {
          rawTotalItems += rawList.length;

          const formattedItems: ListItem[] = rawList.map((item: Record<string, any>) => {
            // Normalize suggestion to a JSON string stored in _suggestion for type safety
            const sugObj = item.suggestion || item._suggestion;
            let suggestionStr = '';
            if (sugObj) {
              if (typeof sugObj === 'object') suggestionStr = JSON.stringify(sugObj);
              else if (typeof sugObj === 'string' && sugObj.trim().startsWith('{')) suggestionStr = sugObj;
            }

            const formatted: ListItem = {
              id: uid(),
              _autoResearched: item._autoResearched === 'true' || (item._autoResearched as unknown) === true ? 'true' : '',
              _suggestion: suggestionStr,
            };

            // Copy string-typed fields only
            Object.keys(item).forEach((k) => {
              if (k === 'id' || k === '_suggestion' || k === 'suggestion' || k === '_autoResearched') return;
              const v = item[k];
              if (typeof v === 'string') formatted[k] = v;
            });

            return formatted;
          });

          // Substituição LIMPA da lista sem concatenar com data[key]
          const deduplicated = deduplicateList(formattedItems);

          cleanTotalItems += deduplicated.length;
          (patch as Record<string, ListItem[]>)[key] = deduplicated;
        } else {
          (patch as Record<string, ListItem[]>)[key] = [];
        }
      });

      console.log(`Total de itens brutos da IA: ${rawTotalItems} | Total de itens após limpeza: ${cleanTotalItems}`);

      if (cleanTotalItems === 0) {
        throw new Error('Nenhum item estruturado foi encontrado.');
      }

      onChange(patch);
      setFeedback({
        type: 'success',
        message: `✨ Informações de ${totalSources} ${totalSources === 1 ? 'fonte consolidada' : 'fontes consolidadas'} com sucesso! Revise os itens preenchidos abaixo.`,
      });
    } catch (err) {
      console.error('Erro ao processar fontes:', err);
      const detail = err instanceof Error ? err.message : String(err);
      setFeedback({
        type: 'error',
        message: `Erro: ${detail}`,
      });
    } finally {
      setLoading(false);
      setStatusMsg('');
    }
  };

  const totalQueuedSources = filesList.length + urlsList.length;

  return (
    <div className="rounded-2xl p-6 space-y-4 border border-[#0f3421]/20 bg-[#fafaf8] shadow-sm mb-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-serif text-lg text-[#1A1816] flex items-center gap-2">
            <span>✨</span> {T.cv_title ?? 'Preenchimento Rápido com IA (Opcional)'}
          </h3>
          <p className="text-xs text-[#6B6762] mt-0.5">
            {T.cv_subtitle ?? 'Envie múltiplos PDFs ou links para consolidar seu perfil e trajetória automaticamente.'}
          </p>
        </div>

        {/* Tab pills */}
        <div className="flex items-center p-1 rounded-xl bg-[#e8e4de] text-xs font-medium shrink-0">
          <button
            type="button"
            onClick={() => { setTab('pdf'); setFeedback(null); }}
            className={`px-3 py-1.5 rounded-lg transition-all ${tab === 'pdf' ? 'bg-white text-[#1A1816] shadow-sm font-semibold' : 'text-[#6B6762]'}`}
          >
            📄 PDFs ({filesList.length})
          </button>
          <button
            type="button"
            onClick={() => { setTab('url'); setFeedback(null); }}
            className={`px-3 py-1.5 rounded-lg transition-all ${tab === 'url' ? 'bg-white text-[#1A1816] shadow-sm font-semibold' : 'text-[#6B6762]'}`}
          >
            🔗 Links ({urlsList.length})
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-8 rounded-xl bg-white border border-dashed border-[#0f3421] flex flex-col items-center justify-center gap-3 text-center">
          <div className="w-6 h-6 border-2 border-[#0f3421] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-medium text-[#1A1816]">{statusMsg}</p>
        </div>
      ) : tab === 'pdf' ? (
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragActive(true); }}
          onDragLeave={() => setIsDragActive(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragActive(false);
            if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
          }}
          onClick={() => pdfInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
            isDragActive ? 'bg-[#e8f0eb] border-[#0f3421]' : 'bg-white border-[#d1ccc4]'
          } hover:border-[#0f3421]`}
        >
          <div className="flex flex-col items-center gap-2">
            <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="#0f3421" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
            </svg>
            <span className="text-xs font-medium text-[#1A1816]">
              {T.cv_pdf_drag ?? 'Arraste um ou mais PDFs de currículo/portfólio aqui ou clique para selecionar'}
            </span>
            <span className="text-[10px] text-[#6B6762]">Suporta múltiplos arquivos .PDF</span>
          </div>
          <input
            ref={pdfInputRef}
            type="file"
            accept=".pdf,application/pdf"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.length) addFiles(e.target.files);
            }}
          />
        </div>
      ) : (
        <div className="flex gap-2">
          <input
            type="url"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addUrl(); } }}
            placeholder={T.cv_url_placeholder ?? 'https://seusite.com/sobre ou link de perfil...'}
            className="flex-1 rounded-xl px-4 py-3 text-xs bg-white border border-[#d1ccc4] text-[#1A1816] outline-none focus:border-[#0f3421]"
          />
          <button
            type="button"
            onClick={addUrl}
            disabled={!urlInput.trim()}
            className="px-4 py-3 rounded-xl text-xs font-semibold text-[#0f3421] bg-white border border-[#0f3421] disabled:opacity-40 transition-all hover:bg-[#e8f0eb]"
          >
            + Adicionar Link
          </button>
        </div>
      )}

      {/* Queue Chips Display */}
      {totalQueuedSources > 0 && !loading && (
        <div className="pt-2 border-t border-[#e8e4de] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#1A1816]">
              Fontes adicionadas ({totalQueuedSources}):
            </span>
            <button
              type="button"
              onClick={clearAllSources}
              className="text-[11px] text-[#8C877D] hover:text-red-600 transition-colors"
            >
              Limpar tudo
            </button>
          </div>

          <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto pr-1">
            {filesList.map((file, idx) => (
              <div
                key={`file-${idx}-${file.name}`}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-[#d1ccc4] text-xs text-[#1A1816] shadow-2xs"
              >
                <span className="text-xs">📄</span>
                <span className="truncate max-w-[200px] font-medium">{file.name}</span>
                <button
                  type="button"
                  onClick={() => removeFile(idx)}
                  className="ml-1 text-[#8C877D] hover:text-red-600 font-bold text-xs leading-none"
                >
                  ✕
                </button>
              </div>
            ))}

            {urlsList.map((url, idx) => (
              <div
                key={`url-${idx}-${url}`}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-[#d1ccc4] text-xs text-[#1A1816] shadow-2xs"
              >
                <span className="text-xs">🔗</span>
                <span className="truncate max-w-[220px] font-medium">{url}</span>
                <button
                  type="button"
                  onClick={() => removeUrl(idx)}
                  className="ml-1 text-[#8C877D] hover:text-red-600 font-bold text-xs leading-none"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={processAllSources}
            className="w-full py-3 rounded-xl text-xs font-semibold text-white bg-[#0f3421] shadow-sm transition-all hover:opacity-95 flex items-center justify-center gap-2"
          >
            <span>✨</span> Processar {totalQueuedSources} {totalQueuedSources === 1 ? 'Fonte' : 'Fontes'} com IA
          </button>
        </div>
      )}

      {feedback && (
        <div
          className={`p-3.5 rounded-xl text-xs font-medium border ${
            feedback.type === 'success'
              ? 'bg-[#e8f0eb] border-[#0f3421]/30 text-[#0f3421]'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}
        >
          {feedback.message}
        </div>
      )}
    </div>
  );
}

// ─── Step 1 — Conta / Perfil Pessoal ─────────────────────────────────────────

function Step1({ data, onChange, T }: {
  data: WizardData;
  onChange: (d: Partial<WizardData>) => void;
  T: Record<string, string>;
}) {
  // Derive telefone string from split fields whenever they change
  const updatePhone = (patch: Partial<WizardData>) => {
    const next = { ...data, ...patch };
    const tel = [next.tel_ddi, next.tel_numero].filter(Boolean).join(' ');
    const extra: Partial<WizardData> = { telefone: tel };
    if (next.same_whatsapp) extra.whatsapp = tel;
    onChange({ ...patch, ...extra });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 style={{ fontFamily: DT.fontSans, color: DT.text }}
          className="text-3xl md:text-4xl font-semibold tracking-tight leading-tight mb-1.5">
          {T.step1_title}
        </h2>
        <p className="text-[15px] font-normal leading-relaxed" style={{ color: DT.textMuted }}>
          {T.step1_desc}
        </p>
      </div>

      <CVImportBox data={data} onChange={onChange} T={T} />

      <AvatarUploader value={data.foto_url} onChange={v => onChange({ foto_url: v })} T={T} />

      <SectionDivider label={T.sec_identification} />

      <div className="grid grid-cols-2 gap-x-6 gap-y-5">
        <div className="col-span-2 sm:col-span-1">
          <Label required>{T.field_nome}</Label>
          <Input value={data.nome} onChange={v => onChange({ nome: v })} placeholder={T.ph_nome} />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <Label>{T.field_nomeartistico}</Label>
          <Input value={data.nomeartistico} onChange={v => onChange({ nomeartistico: v })} placeholder={T.ph_nomeartistico} />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <Label>{T.field_pronome}</Label>
          <Input value={data.pronome} onChange={v => onChange({ pronome: v })} placeholder={T.ph_pronome} />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <Label required>{T.field_email}</Label>
          <Input value={data.email} onChange={v => onChange({ email: v })} placeholder={T.ph_email} type="email" />
        </div>
      </div>

      {/* ── Nascimento ── */}
      <SectionDivider label={T.sec_birth} />

      <div className="grid grid-cols-2 gap-x-6 gap-y-5">
        <div className="col-span-2 sm:col-span-1">
          <Label>{T.field_nascimento}</Label>
          <Input value={data.nascimento} onChange={v => onChange({ nascimento: v })} placeholder={T.ph_nascimento} />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <Label>{T.field_nacionalidade}</Label>
          <Combobox
            value={data.nacionalidade}
            onChange={v => onChange({ nacionalidade: v })}
            options={NACIONALIDADES_OPTIONS}
            placeholder={T.ph_search_nacionalidade}
          />
        </div>

        {/* País de nascimento */}
        <div className="col-span-2 sm:col-span-1">
          <Label>{T.field_pais_nascimento}</Label>
          <Combobox
            value={data.pais_nascimento}
            onChange={v => onChange({ pais_nascimento: v })}
            options={PAISES_OPTIONS}
            placeholder={T.ph_search_pais}
          />
        </div>
        {/* Estado de nascimento — encadeado com País de nascimento */}
        <div className="col-span-2 sm:col-span-1">
          <Label>{T.field_estado_nascimento}</Label>
          <Combobox
            value={data.estado_nascimento}
            onChange={v => onChange({ estado_nascimento: v })}
            options={getEstadosOptions(data.pais_nascimento)}
            placeholder={T.ph_search_estado}
            allowCustom
          />
        </div>
        {/* Cidade de nascimento */}
        <div className="col-span-2">
          <Label>{T.field_cidade_nascimento}</Label>
          <Combobox
            value={data.cidade_nascimento}
            onChange={v => onChange({ cidade_nascimento: v })}
            options={CIDADES_OPTIONS}
            placeholder={T.ph_search_cidade}
          />
        </div>
      </div>

      {/* ── Residência Atual ── */}
      <SectionDivider label={T.sec_residence} />

      <div className="grid grid-cols-2 gap-x-6 gap-y-5">
        {/* País atual */}
        <div className="col-span-2 sm:col-span-1">
          <Label>{T.field_pais_atual}</Label>
          <Combobox
            value={data.pais_atual}
            onChange={v => onChange({ pais_atual: v })}
            options={PAISES_OPTIONS}
            placeholder={T.ph_search_pais}
          />
        </div>
        {/* Estado atual — encadeado com País atual */}
        <div className="col-span-2 sm:col-span-1">
          <Label>{T.field_estado_atual}</Label>
          <Combobox
            value={data.estado_atual}
            onChange={v => onChange({ estado_atual: v })}
            options={getEstadosOptions(data.pais_atual)}
            placeholder={T.ph_search_estado}
            allowCustom
          />
        </div>
        {/* Cidade atual */}
        <div className="col-span-2">
          <Label>{T.field_cidade_atual}</Label>
          <Combobox
            value={data.cidade}
            onChange={v => onChange({ cidade: v })}
            options={CIDADES_OPTIONS}
            placeholder={T.ph_search_cidade}
          />
        </div>
      </div>

      {/* ── Contato ── */}
      <SectionDivider label={T.sec_contact} />

      <div className="space-y-5">
        {/* Phone: DDI + Telefone */}
        <div>
          <Label>{T.field_telefone}</Label>
          <div className="grid grid-cols-[100px_1fr] gap-3">
            <div>
              <span className="block text-[11px] text-[#86868B] mb-1">{T.field_ddi}</span>
              <Input
                value={data.tel_ddi}
                onChange={v => {
                  if (v.trim().startsWith('+') && v.trim().length > 3) {
                    const parsed = parsePhoneWithDDI(v, data.tel_ddi);
                    updatePhone({ tel_ddi: parsed.ddi, tel_numero: parsed.numero || data.tel_numero });
                  } else {
                    let formatted = v;
                    if (formatted && !formatted.startsWith('+') && /^\d+$/.test(formatted)) {
                      formatted = '+' + formatted;
                    }
                    updatePhone({ tel_ddi: formatted });
                  }
                }}
                placeholder="+55"
              />
            </div>
            <div>
              <span className="block text-[11px] text-[#86868B] mb-1">{T.field_numero}</span>
              <Input
                value={data.tel_numero}
                onChange={v => {
                  if (v.trim().startsWith('+')) {
                    const parsed = parsePhoneWithDDI(v, data.tel_ddi);
                    updatePhone({ tel_ddi: parsed.ddi, tel_numero: parsed.numero });
                  } else {
                    updatePhone({ tel_numero: v });
                  }
                }}
                placeholder={T.ph_numero}
              />
            </div>
          </div>
        </div>

        {/* Same WhatsApp toggle */}
        <label className="flex items-center gap-3 cursor-pointer select-none group">
          <button
            type="button"
            role="switch"
            aria-checked={data.same_whatsapp}
            onClick={() => {
              const next = !data.same_whatsapp;
              const tel = [data.tel_ddi, data.tel_ddd, data.tel_numero].filter(Boolean).join(' ');
              onChange({ same_whatsapp: next, whatsapp: next ? tel : data.whatsapp });
            }}
            className="relative w-10 h-6 rounded-full transition-colors duration-200 shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-black/40"
            style={{ background: data.same_whatsapp ? DT.black : '#D1D1D6' }}
          >
            <span
              className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200"
              style={{ transform: data.same_whatsapp ? 'translateX(16px)' : 'translateX(0)' }}
            />
          </button>
          <span className="text-sm font-medium" style={{ color: DT.text }}>{T.same_whatsapp}</span>
        </label>

        {/* WhatsApp — shown only when not using same number */}
        {!data.same_whatsapp && (
          <div>
            <Label>{T.field_whatsapp}</Label>
            <Input value={data.whatsapp} onChange={v => onChange({ whatsapp: v })} placeholder={T.ph_numero} />
          </div>
        )}

        <div>
          <Label>{T.field_website}</Label>
          <Input value={data.website} onChange={v => onChange({ website: v })} placeholder="https://seusite.com" />
        </div>
      </div>
    </div>
  );
}


// ─── Step 2 — Perfil Artístico ────────────────────────────────────────────────

function Step2({ data, onChange, T }: { data: WizardData; onChange: (d: Partial<WizardData>) => void; T: Record<string, string> }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-2xl mb-1 text-[#1A1816]">{T.step2_title}</h2>
        <p className="text-sm text-[#6B6762]">{T.step2_desc}</p>
      </div>

      <SectionDivider label={T.sec_bios} />

      <div>
        <Label>{T.field_bioshort} <span className="text-[#b0ada8] normal-case tracking-normal">{T.field_bioshort_max}</span></Label>
        <Textarea
          value={data.bioshort}
          onChange={v => onChange({ bioshort: v })}
          placeholder={T.ph_bioshort}
          rows={3}
        />
        <WordCount text={data.bioshort} T={T} />
      </div>

      <div>
        <Label>{T.field_biolong}</Label>
        <Textarea
          value={data.biolong}
          onChange={v => onChange({ biolong: v })}
          placeholder={T.ph_biolong}
          rows={6}
        />
        <WordCount text={data.biolong} T={T} />
      </div>

      <SectionDivider label={T.sec_poetics} />

      <div>
        <Label>{T.field_statement}</Label>
        <Textarea
          value={data.statement}
          onChange={v => onChange({ statement: v })}
          placeholder={T.ph_statement}
          rows={5}
        />
        <WordCount text={data.statement} T={T} />
      </div>

      <div>
        <Label>{T.field_process}</Label>
        <Textarea
          value={data.processo_criativo}
          onChange={v => onChange({ processo_criativo: v })}
          placeholder={T.ph_process}
          rows={4}
        />
      </div>

      <div className="grid grid-cols-2 gap-x-6 gap-y-5">
        <div className="col-span-2 sm:col-span-1">
          <Input value={data.ano_inicio_carreira} onChange={v => onChange({ ano_inicio_carreira: v })} placeholder={T.ph_career_start} type="number" />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <Label>{T.field_techniques}</Label>
          <Combobox
            value={data.tecnicas_recorrentes}
            onChange={v => onChange({ tecnicas_recorrentes: v })}
            options={TECNICAS_OPTIONS}
            placeholder={T.ph_techniques}
            allowCustom
          />
        </div>
        <div className="col-span-2">
          <Label>{T.field_themes}</Label>
          <Combobox
            value={data.temas_centrais}
            onChange={v => onChange({ temas_centrais: v })}
            options={TEMAS_OPTIONS}
            placeholder={T.ph_themes}
            allowCustom
          />
        </div>
        <div className="col-span-2">
          <Label>{T.field_research}</Label>
          <Input value={data.pesquisa_artistica} onChange={v => onChange({ pesquisa_artistica: v })} placeholder={T.ph_research} />
        </div>
        <div className="col-span-2">
          <Label>{T.field_references}</Label>
          <Input value={data.referencias_conceituais} onChange={v => onChange({ referencias_conceituais: v })} placeholder={T.ph_references} />
        </div>
      </div>

      <SectionDivider label={T.sec_tags_social} />

      <div>
        <Label>{T.field_tags}</Label>
        <TagInput
          value={data.tags}
          onChange={v => onChange({ tags: v })}
          placeholder={T.ph_tags}
        />
        <p className="text-xs mt-1.5 text-[#b0ada8]">{T.tags_hint}</p>
      </div>

      <div>
        <Label>{T.field_instagram}</Label>
        <InstagramList values={data.instagrams} onChange={v => onChange({ instagrams: v })} T={T} />
      </div>
    </div>
  );
}

// ─── Step 3 — Trajetória & Currículo ─────────────────────────────────────────

function Step3({ data, onChange, T }: { data: WizardData; onChange: (d: Partial<WizardData>) => void; T: Record<string, string> }) {
  const artistName = data.nome || data.nomeartistico;

  const formacaoFields: FieldConfig[] = [
    { key: 'ano', label: 'Ano de Conclusão', type: 'dropdown', options: YEARS_LIST, required: true },
    { key: 'titulo', label: 'Grau / Curso (ex: Bacharelado em Artes Visuais)', type: 'text', required: true },
    { key: 'local', label: 'Instituição / Universidade', type: 'autocomplete', options: GALLERIES_AND_INSTITUTIONS, required: true },
    { key: 'cidade', label: 'Cidade', type: 'autocomplete', options: CITIES },
    { key: 'pais', label: 'País', type: 'dropdown', options: COUNTRIES },
    { key: 'observacoes', label: 'Observações / Tese', type: 'textarea' },
    { key: 'documentacao', label: 'Comprovante / Diploma', type: 'upload' },
  ];

  const exposIndividuaisFields: FieldConfig[] = [
    { key: 'ano', label: 'Ano', type: 'dropdown', options: YEARS_LIST, required: true },
    { key: 'titulo', label: 'Título da Exposição', type: 'text', required: true },
    { key: 'local', label: 'Galeria / Instituição', type: 'autocomplete', options: GALLERIES_AND_INSTITUTIONS, required: true },
    { key: 'cidade', label: 'Cidade', type: 'autocomplete', options: CITIES },
    { key: 'pais', label: 'País', type: 'dropdown', options: COUNTRIES },
    { key: 'curador', label: 'Curador(a)', type: 'autocomplete', options: CURATORS },
    { key: 'observacoes', label: 'Observações', type: 'textarea' },
    { key: 'documentacao', label: 'Documentação / Catálogo', type: 'upload' },
  ];

  const exposColetivasFields: FieldConfig[] = [
    { key: 'ano', label: 'Ano', type: 'dropdown', options: YEARS_LIST, required: true },
    { key: 'titulo', label: 'Título da Exposição', type: 'text', required: true },
    { key: 'local', label: 'Galeria / Instituição', type: 'autocomplete', options: GALLERIES_AND_INSTITUTIONS, required: true },
    { key: 'cidade', label: 'Cidade', type: 'autocomplete', options: CITIES },
    { key: 'pais', label: 'País', type: 'dropdown', options: COUNTRIES },
    { key: 'tipo', label: 'Tipo de Exposição', type: 'dropdown', options: EXHIBITION_TYPES },
    { key: 'curador', label: 'Curador(a)', type: 'autocomplete', options: CURATORS },
    { key: 'observacoes', label: 'Observações', type: 'textarea' },
    { key: 'documentacao', label: 'Documentação / Folheto', type: 'upload' },
  ];

  const residenciasFields: FieldConfig[] = [
    { key: 'ano', label: 'Ano / Período', type: 'dropdown', options: YEARS_LIST, required: true },
    { key: 'titulo', label: 'Nome do Programa', type: 'text', required: true },
    { key: 'local', label: 'Instituição Responsável', type: 'autocomplete', options: GALLERIES_AND_INSTITUTIONS, required: true },
    { key: 'cidade', label: 'Cidade', type: 'autocomplete', options: CITIES },
    { key: 'pais', label: 'País', type: 'dropdown', options: COUNTRIES },
    { key: 'tipo', label: 'Tipo', type: 'dropdown', options: RESIDENCY_TYPES },
    { key: 'duracao', label: 'Duração', type: 'dropdown', options: RESIDENCY_DURATIONS },
    { key: 'observacoes', label: 'Descrição / Projeto', type: 'textarea' },
    { key: 'documentacao', label: 'Documentação / Certificado', type: 'upload' },
  ];

  const premiosFields: FieldConfig[] = [
    { key: 'ano', label: 'Ano', type: 'dropdown', options: YEARS_LIST, required: true },
    { key: 'titulo', label: 'Nome do Prêmio / Bolsa / Fomento', type: 'text', required: true },
    { key: 'local', label: 'Instituição Concedente', type: 'autocomplete', options: GALLERIES_AND_INSTITUTIONS, required: true },
    { key: 'tipo', label: 'Tipo', type: 'dropdown', options: AWARD_TYPES },
    { key: 'resultado', label: 'Resultado / Colocação', type: 'dropdown', options: AWARD_RESULTS },
    { key: 'cidade', label: 'Cidade', type: 'autocomplete', options: CITIES },
    { key: 'pais', label: 'País', type: 'dropdown', options: COUNTRIES },
    { key: 'observacoes', label: 'Descrição', type: 'textarea' },
    { key: 'documentacao', label: 'Documentação / Comprovante', type: 'upload' },
  ];

  const feirasFields: FieldConfig[] = [
    { key: 'ano', label: 'Ano', type: 'dropdown', options: YEARS_LIST, required: true },
    { key: 'titulo', label: 'Nome da Feira', type: 'autocomplete', options: ART_FAIRS, required: true },
    { key: 'local', label: 'Galeria / Representação', type: 'autocomplete', options: GALLERIES_AND_INSTITUTIONS },
    { key: 'cidade', label: 'Cidade', type: 'autocomplete', options: CITIES },
    { key: 'pais', label: 'País', type: 'dropdown', options: COUNTRIES },
    { key: 'edicao', label: 'Edição da Feira (ex: 18ª Edição)', type: 'text' },
    { key: 'tipo_participacao', label: 'Tipo de Participação', type: 'dropdown', options: FAIR_PARTICIPATION_TYPES },
    { key: 'secao', label: 'Seção da Feira', type: 'text' },
    { key: 'obras', label: 'Obras Apresentadas', type: 'text' },
    { key: 'documentacao', label: 'Documentação / Fotos', type: 'upload' },
  ];

  const publicacoesFields: FieldConfig[] = [
    { key: 'categoria_publicacao', label: 'Categoria', type: 'dropdown', options: ['Publicações sobre o artista', 'Publicações do artista'], required: true },
    { key: 'tipo_publicacao', label: 'Tipo de Publicação', type: 'dropdown', options: PUBLICATION_TYPES, required: true },
    { key: 'ano', label: 'Ano', type: 'dropdown', options: YEARS_LIST, required: true },
    { key: 'autor', label: 'Autor / Crítico / Organizador', type: 'autocomplete', options: CURATORS },
    { key: 'titulo', label: 'Título', type: 'text', required: true },
    { key: 'local', label: 'Nome da Publicação / Editora', type: 'autocomplete', options: MEDIA_OUTLETS },
    { key: 'idioma', label: 'Idioma', type: 'dropdown', options: PUBLICATION_LANGUAGES },
    { key: 'formato', label: 'Formato', type: 'dropdown', options: PUBLICATION_FORMATS },
    { key: 'pagina', label: 'Página / Edição', type: 'text' },
    { key: 'link', label: 'Link / URL', type: 'text' },
    { key: 'documentacao', label: 'PDF ou Imagem da publicação', type: 'upload' },
  ];

  const colecoesPublicasFields: FieldConfig[] = [
    { key: 'tipo_colecao', label: 'Tipo de Coleção', type: 'dropdown', options: COLLECTION_TYPES, required: true },
    { key: 'local', label: 'Instituição / Museu', type: 'autocomplete', options: GALLERIES_AND_INSTITUTIONS, required: true },
    { key: 'cidade', label: 'Cidade', type: 'autocomplete', options: CITIES },
    { key: 'pais', label: 'País', type: 'dropdown', options: COUNTRIES },
    { key: 'obras', label: 'Obra(s) Adquirida(s)', type: 'text' },
    { key: 'ano', label: 'Ano de Aquisição', type: 'dropdown', options: YEARS_LIST },
    { key: 'documentacao', label: 'Comprovante / Termo de doação', type: 'upload' },
  ];

  const colecoesPrivadasFields: FieldConfig[] = [
    { key: 'tipo_colecao', label: 'Tipo de Coleção', type: 'dropdown', options: COLLECTION_TYPES, required: true },
    { key: 'nome_colecionador', label: 'Nome do Colecionador (Privado / Opcional)', type: 'text' },
    { key: 'pais', label: 'País / Região', type: 'dropdown', options: COUNTRIES },
    { key: 'obras', label: 'Obra(s) Adquirida(s)', type: 'text' },
    { key: 'ano', label: 'Ano de Aquisição', type: 'dropdown', options: YEARS_LIST },
    { key: 'autorizacao', label: 'Autorização para Divulgação', type: 'dropdown', options: COLLECTION_AUTHORIZATIONS, helperText: 'Quando não autorizado, o CV gera a descrição genérica ex: "Coleções privadas no Brasil e Europa".' },
    { key: 'documentacao', label: 'Comprovante / Termo de cessão', type: 'upload' },
  ];

  const clippingFields: FieldConfig[] = [
    { key: 'ano', label: 'Ano', type: 'dropdown', options: YEARS_LIST, required: true },
    { key: 'local', label: 'Veículo / Mídia', type: 'autocomplete', options: MEDIA_OUTLETS, required: true },
    { key: 'titulo', label: 'Título da Matéria', type: 'text', required: true },
    { key: 'tipo_midia', label: 'Tipo de Mídia', type: 'dropdown', options: MEDIA_TYPES },
    { key: 'tipo_conteudo', label: 'Tipo de Conteúdo', type: 'dropdown', options: CONTENT_TYPES },
    { key: 'autor', label: 'Autor / Jornalista', type: 'text' },
    { key: 'idioma', label: 'Idioma', type: 'dropdown', options: PUBLICATION_LANGUAGES },
    { key: 'link', label: 'Link / URL', type: 'text' },
    { key: 'documentacao', label: 'Arquivo / Print do Clipping', type: 'upload' },
    { key: 'observacoes', label: 'Observações', type: 'textarea' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-serif text-2xl mb-1 text-[#1A1816]">{T.step3_title}</h2>
        <p className="text-sm text-[#6B6762]">{T.step3_desc}</p>
      </div>

      <CVImportBox data={data} onChange={onChange} T={T} />

      {/* Seção 1 — Formação Acadêmica */}
      <TrajectorySection
        title={T.list_education || 'Formação Acadêmica & Cursos'}
        items={data.formacao}
        onChange={(v) => onChange({ formacao: v })}
        fields={formacaoFields}
        artistName={artistName}
      />

      {/* Seção 2 — Exposições Individuais */}
      <TrajectorySection
        title={T.list_solo_exhibitions || 'Exposições Individuais'}
        items={data.expos_individuais}
        onChange={(v) => onChange({ expos_individuais: v })}
        fields={exposIndividuaisFields}
        artistName={artistName}
      />

      {/* Seção 3 — Exposições Coletivas */}
      <TrajectorySection
        title={T.list_group_exhibitions || 'Exposições Coletivas'}
        items={data.expos_coletivas}
        onChange={(v) => onChange({ expos_coletivas: v })}
        fields={exposColetivasFields}
        artistName={artistName}
      />

      {/* Seção 4 — Residências Artísticas */}
      <TrajectorySection
        title={T.list_residencies || 'Residências Artísticas'}
        items={data.residencias}
        onChange={(v) => onChange({ residencias: v })}
        fields={residenciasFields}
        artistName={artistName}
      />

      {/* Seção 5 — Prêmios, Bolsas e Reconhecimentos */}
      <TrajectorySection
        title={T.list_awards || 'Prêmios & Reconhecimentos'}
        items={data.premios}
        onChange={(v) => onChange({ premios: v })}
        fields={premiosFields}
        artistName={artistName}
      />

      <TrajectorySection
        title={T.list_grants || 'Bolsas & Fomentos'}
        items={data.bolsas}
        onChange={(v) => onChange({ bolsas: v })}
        fields={premiosFields}
        artistName={artistName}
      />

      {/* Seção 6 — Feiras de Arte */}
      <TrajectorySection
        title={T.list_art_fairs || 'Feiras de Arte'}
        items={data.feiras}
        onChange={(v) => onChange({ feiras: v })}
        fields={feirasFields}
        artistName={artistName}
      />

      {/* Seção 7 — Publicações e Bibliografia */}
      <TrajectorySection
        title={T.list_publications || 'Publicações & Bibliografia'}
        items={data.publicacoes}
        onChange={(v) => onChange({ publicacoes: v })}
        fields={publicacoesFields}
        artistName={artistName}
      />

      {/* Seção 8 — Coleções Públicas e Privadas */}
      <TrajectorySection
        title={T.list_public_collections || 'Coleções Públicas'}
        items={data.colecoesPublicas}
        onChange={(v) => onChange({ colecoesPublicas: v })}
        fields={colecoesPublicasFields}
        artistName={artistName}
      />

      <TrajectorySection
        title={T.list_private_collections || 'Coleções Privadas & Corporativas'}
        items={data.colecoesPrivadas}
        onChange={(v) => onChange({ colecoesPrivadas: v })}
        fields={colecoesPrivadasFields}
        artistName={artistName}
      />

      {/* Seção 9 — Clipping e Mídia */}
      <TrajectorySection
        title={T.list_clipping || 'Clipping & Mídia'}
        items={data.clipping}
        onChange={(v) => onChange({ clipping: v })}
        fields={clippingFields}
        artistName={artistName}
      />
    </div>
  );
}

// ─── Step 4 — Marca & Identidade ──────────────────────────────────────────────

function Step4({ data, onChange, T }: { data: WizardData; onChange: (d: Partial<WizardData>) => void; T: Record<string, string> }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-2xl mb-1 text-[#1A1816]">{T.step4_title}</h2>
        <p className="text-sm text-[#6B6762]">{T.step4_desc}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <BrandAssetUploader
          label={T.label_seal}
          description={T.desc_seal}
          hint={T.hint_seal}
          value={data.selo_url}
          onChange={v => onChange({ selo_url: v })}
          folder="onboarding/selo"
          T={T}
        />
        <BrandAssetUploader
          label={T.label_signature}
          description={T.desc_signature}
          hint={T.hint_signature}
          value={data.assinatura_url}
          onChange={v => onChange({ assinatura_url: v })}
          folder="onboarding/assinatura"
          T={T}
        />
      </div>

      <div className="rounded-xl p-4 mt-4 bg-[#fafaf8] border border-[#e8e4de]">
        <p className="text-xs text-[#6B6762] text-center">
          {T.seal_note}
        </p>
      </div>
    </div>
  );
}

// ─── Step 5 — Fotos Profissionais ─────────────────────────────────────────────

function Step5({ data, onChange, T }: { data: WizardData; onChange: (d: Partial<WizardData>) => void; T: Record<string, string> }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-2xl mb-1 text-[#1A1816]">{T.step5_title}</h2>
        <p className="text-sm text-[#6B6762]">{T.step5_desc}</p>
      </div>

      <div className="rounded-xl p-4 bg-[#fafaf8] border border-[#e8e4de]">
        <p className="text-xs text-[#6B6762]">
          {T.step5_note}
        </p>
      </div>

      <MultiPhotoUploader
        values={data.fotos_profissionais}
        onChange={v => onChange({ fotos_profissionais: v })}
        T={T}
      />
    </div>
  );
}

// ─── Conclusion Screen ────────────────────────────────────────────────────────

function ConclusionScreen({ data, onAddWork, onDashboard, loading, T }: {
  data: WizardData;
  onAddWork: () => void;
  onDashboard: () => void;
  loading: boolean;
  T: Record<string, string>;
}) {
  const initials = (data.nomeartistico || data.nome || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  const tags = data.tags ? data.tags.split(',').map(t => t.trim()).filter(Boolean).slice(0, 5) : [];

  return (
    <div className="flex flex-col items-center text-center space-y-7">
      {/* Checkmark */}
      <div className="w-16 h-16 rounded-full flex items-center justify-center bg-[#0f3421]">
        <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
        </svg>
      </div>

      <div>
        <h2 className="font-serif text-3xl mb-2 text-[#1A1816]">
          {data.nomeartistico || data.nome
            ? (T.conclusion_welcome?.replace('{{name}}', data.nomeartistico || data.nome) ?? `Bem-vinda, ${data.nomeartistico || data.nome}!`)
            : (T.conclusion_done_title ?? 'Tudo certo!')}
        </h2>
        <p className="text-sm max-w-sm mx-auto text-[#6B6762]">
          {T.conclusion_desc}
        </p>
      </div>

      {/* Preview Card */}
      <div className="w-full max-w-sm rounded-2xl p-6 text-left bg-[#1A1816] text-white">
        <div className="flex items-center gap-4 mb-4">
          {data.foto_url ? (
            <img src={data.foto_url} alt="avatar"
              className="w-14 h-14 rounded-full object-cover flex-shrink-0" />
          ) : (
            <div className="w-14 h-14 rounded-full bg-[#0f3421] flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xl font-semibold">{initials}</span>
            </div>
          )}
          <div className="min-w-0">
            <p className="font-serif text-lg leading-tight truncate">{data.nomeartistico || data.nome || 'Artista'}</p>
            {((data.cidade || data.nacionalidade) || data.ano_inicio_carreira) && (
              <p className="text-xs mt-0.5 truncate text-[#B0ADA8]">
                {[
                  [data.cidade, data.nacionalidade].filter(Boolean).join(' · '),
                  data.ano_inicio_carreira ? (T.carreira_desde?.replace('{{year}}', data.ano_inicio_carreira) ?? `Carreira desde ${data.ano_inicio_carreira}`) : null
                ].filter(Boolean).join(' · ')}
              </p>
            )}
          </div>
        </div>
        {data.bioshort && (
          <p className="text-xs leading-relaxed mb-3 text-[#B0ADA8]">
            {data.bioshort.slice(0, 150)}{data.bioshort.length > 150 ? '...' : ''}
          </p>
        )}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {tags.map((t, i) => (
              <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-[#0f3421] text-white">
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
          className={`w-full py-3.5 rounded-xl font-medium text-white transition-opacity text-sm bg-[#0f3421] ${loading ? 'opacity-60' : 'opacity-100'}`}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              {T.saving ?? 'Salvando...'}
            </span>
          ) : (
            T.btn_add_first_work ?? '+ Adicionar primeira obra →'
          )}
        </button>
        <button
          type="button"
          onClick={onDashboard}
          disabled={loading}
          className={`w-full py-3 rounded-xl font-medium text-sm border border-[#d1ccc4] text-[#1A1816] transition-colors ${loading ? 'opacity-40' : 'opacity-100'}`}
        >
          {T.btn_go_dashboard ?? 'Ir ao dashboard'}
        </button>
      </div>
    </div>
  );
}

// ─── Main Wizard ──────────────────────────────────────────────────────────────

type SupportedLang = 'pt' | 'en' | 'es' | 'de';

const langDicts: Record<SupportedLang, any> = {
  pt: ptStrings,
  en: enStrings,
  es: esStrings,
  de: deStrings,
};

export default function Onboarding({ onComplete }: Props) {
  const navigate = useNavigate();
  const [lang, setLang] = useState<SupportedLang>('pt');
  const T = ((langDicts[lang] ?? ptStrings).translation as Record<string, any>).onboarding as Record<string, string>;
  const [step, setStep] = useState(0); // 0–4 = steps, 5 = conclusion
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
            if (found) {
              meta = found;
            }
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
    setData(prev => ({ ...prev, ...patch }));
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
      /* fail silently — user can retry on finish */
    }
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
    } catch (err: unknown) {
      console.error('Erro ao salvar onboarding:', err);
      alert('Erro ao salvar as informações: ' + ((err as Error)?.message || JSON.stringify(err)));
      setSaving(false);
    }
  };

  const isConclusion = step === TOTAL_STEPS;
  const canSkip = step > 0 && step < TOTAL_STEPS;

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

      {/* ── Sidebar Esquerda (Apple Inset Glass Card) ── */}
      <aside
        className="hidden lg:flex flex-col justify-between p-8 w-80 shrink-0 rounded-[28px] relative overflow-hidden shadow-xl"
        style={{ background: DT.black, color: 'white' }}
      >
        {/* Apple subtle blur glow */}
        <div
          className="absolute -top-24 -left-24 w-56 h-56 rounded-full blur-3xl pointer-events-none"
          style={{ background: DT.gold, opacity: 0.12 }}
        />

        <div>
          {/* Brand */}
          <div className="flex items-center gap-3.5 mb-8">
            <div
              className="w-9 h-9 rounded-2xl flex items-center justify-center text-xs font-bold shrink-0 shadow-sm"
              style={{ background: 'rgba(255, 255, 255, 0.15)', backdropFilter: 'blur(10px)', color: '#FFFFFF', border: '1px solid rgba(255, 255, 255, 0.2)' }}
            >
              SV
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight leading-none text-white">
                {T.title ?? 'Studio Virtual'}
              </h1>
              <p className="text-xs text-white/60 mt-1 font-normal">
                {T.subtitle ?? 'Gestão & Dossiê de Acervo'}
              </p>
            </div>
          </div>

          {/* Stepper Vertical */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider mb-2 text-white/50 px-1">
              {T.steps_label ?? 'Etapas do Cadastro'}
            </p>
            {!isConclusion && <ProgressBar current={step} variant="sidebar" T={T} />}
            {isConclusion && (
              <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 mt-4">
                <p className="text-sm font-semibold text-white flex items-center gap-2">
                  <span>✓</span> {T.profile_done ?? 'Perfil Configurado'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer info */}
        <div className="pt-5 border-t border-white/10">
          <p className="text-xs leading-relaxed text-white/70">
            {T.footer_note ?? 'Você pode atualizar suas informações curatórias e arquivos a qualquer momento nas configurações.'}
          </p>
        </div>
      </aside>

      {/* ── Área Principal (Apple Floating Card) ── */}
      <div className="flex-1 flex flex-col rounded-[28px] bg-white/90 backdrop-blur-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-black/5 min-h-[calc(100vh-2.5rem)] overflow-hidden">

        {/* Top bar */}
        <div
          className="flex items-center justify-between px-6 sm:px-10 py-5 border-b border-black/5"
          style={{ background: 'rgba(255, 255, 255, 0.5)' }}
        >
          {/* Logo mobile */}
          <div className="lg:hidden flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-xl bg-[#0B2719] text-white flex items-center justify-center text-xs font-bold">
              SV
            </div>
            <p className="font-semibold text-base tracking-tight text-[#1D1D1F]">
              {T.title ?? 'Studio Virtual'}
            </p>
          </div>

          <div className="flex items-center gap-4 ml-auto">
            {/* Step counter */}
            {!isConclusion && (
              <>
                <span className="text-xs font-medium text-[#86868B] hidden sm:block">
                  {T.step_counter?.replace('{{current}}', String(step + 1)).replace('{{total}}', String(TOTAL_STEPS))}
                </span>
                <div className="lg:hidden">
                  <ProgressBar current={step} variant="compact" T={T} />
                </div>
              </>
            )}
            {isConclusion && (
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-[#0B2719]/10 text-[#0B2719]">
                {T.completed_badge ?? 'Concluído ✓'}
              </span>
            )}

            {/* Language toggle (PT | EN | ES | DE) */}
            <div
              className="flex items-center rounded-full border border-black/10 overflow-hidden text-xs font-semibold"
              style={{ background: 'rgba(242,242,247,0.8)' }}
            >
              {(['pt', 'en', 'es', 'de'] as SupportedLang[]).map(l => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLang(l)}
                  className="px-2.5 py-1.5 transition-colors uppercase"
                  style={{
                    background: lang === l ? DT.black : 'transparent',
                    color: lang === l ? '#FFF' : DT.textMuted,
                  }}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Conteúdo scrollável */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 sm:px-12 py-10">
          <div className="max-w-xl mx-auto">
            {isConclusion ? (
              <ConclusionScreen
                data={data}
                onAddWork={() => handleFinish('upload')}
                onDashboard={() => handleFinish('dashboard')}
                loading={saving}
                T={T}
              />
            ) : (
              <>
                {step === 0 && <Step1 data={data} onChange={update} T={T} />}
                {step === 1 && <Step2 data={data} onChange={update} T={T} />}
                {step === 2 && <Step3 data={data} onChange={update} T={T} />}
                {step === 3 && <Step4 data={data} onChange={update} T={T} />}
                {step === 4 && <Step5 data={data} onChange={update} T={T} />}

                {errors.length > 0 && (
                  <div className="mt-6 rounded-2xl px-5 py-4 bg-red-50 border border-red-100">
                    {errors.map((e, i) => (
                      <p key={i} className="text-sm font-medium text-red-600">{e}</p>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Bottom navigation (Apple Pills) */}
        {!isConclusion && (
          <div
            className="flex items-center justify-between px-6 sm:px-12 py-5 border-t border-black/5"
            style={{ background: 'rgba(255, 255, 255, 0.7)', backdropFilter: 'blur(20px)' }}
          >
            {step > 0 ? (
              <button
                type="button"
                onClick={handleBack}
                className="px-6 py-3 rounded-full text-sm font-semibold transition-all active:scale-[0.98] border border-black/10 text-[#1D1D1F] hover:bg-black/5"
              >
                {T.btn_back ?? '← Voltar'}
              </button>
            ) : <div />}

            <div className="flex items-center gap-4">
              {canSkip && (
                <button
                  type="button"
                  onClick={handleSkip}
                  className="text-sm font-medium text-[#86868B] hover:text-[#1D1D1F] transition-colors"
                >
                  {T.btn_skip ?? 'Pular por agora'}
                </button>
              )}
              <button
                type="button"
                onClick={handleNext}
                className="px-8 py-3.5 rounded-full text-sm font-semibold text-white shadow-sm transition-all active:scale-[0.98] hover:opacity-95"
                style={{
                  background: DT.black,
                  boxShadow: '0 4px 14px rgba(0, 0, 0, 0.25)',
                }}
              >
                {step === TOTAL_STEPS - 1 ? (T.btn_finish ?? 'Concluir →') : (T.btn_continue ?? 'Continuar →')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
