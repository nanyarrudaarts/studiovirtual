import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, saveOnboardingStep, completeOnboarding } from '../services/supabase';

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

async function compressAndCropImage(
  imageSrc: string,
  cropArea: { x: number; y: number; width: number; height: number },
  targetSize: number = 600
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = targetSize;
      canvas.height = targetSize;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }
      ctx.drawImage(
        img,
        cropArea.x,
        cropArea.y,
        cropArea.width,
        cropArea.height,
        0,
        0,
        targetSize,
        targetSize
      );
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Canvas compression failed'));
          }
        },
        'image/jpeg',
        0.8
      );
    };
    img.onerror = () => reject(new Error('Failed to load image for cropping'));
    img.src = imageSrc;
  });
}

// Cropper Modal Component
function CropperModal({
  imageSrc,
  onClose,
  onSave,
}: {
  imageSrc: string;
  onClose: () => void;
  onSave: (croppedBlob: Blob) => void;
}) {
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const imageRef = useRef<HTMLImageElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStart.current = { x: e.clientX - offset.x, y: e.clientY - offset.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setOffset({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    setIsDragging(true);
    dragStart.current = {
      x: e.touches[0].clientX - offset.x,
      y: e.touches[0].clientY - offset.y,
    };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    setOffset({
      x: e.touches[0].clientX - dragStart.current.x,
      y: e.touches[0].clientY - dragStart.current.y,
    });
  };

  const handleCrop = async () => {
    const img = imageRef.current;
    if (!img) return;

    const displayedWidth = img.clientWidth * zoom;
    const displayedHeight = img.clientHeight * zoom;

    const cropSize = 250;
    const containerWidth = 300;
    const containerHeight = 300;

    const cropBoxLeft = (containerWidth - cropSize) / 2;
    const cropBoxTop = (containerHeight - cropSize) / 2;

    const imgLeft = (containerWidth - displayedWidth) / 2 + offset.x;
    const imgTop = (containerHeight - displayedHeight) / 2 + offset.y;

    const xOnImg = (cropBoxLeft - imgLeft) / zoom;
    const yOnImg = (cropBoxTop - imgTop) / zoom;
    const cropWidthOnImg = cropSize / zoom;
    const cropHeightOnImg = cropSize / zoom;

    const scaleX = img.naturalWidth / img.clientWidth;
    const scaleY = img.naturalHeight / img.clientHeight;

    const cropArea = {
      x: xOnImg * scaleX,
      y: yOnImg * scaleY,
      width: cropWidthOnImg * scaleX,
      height: cropHeightOnImg * scaleY,
    };

    try {
      const cropped = await compressAndCropImage(imageSrc, cropArea, 500);
      onSave(cropped);
    } catch (e) {
      console.error(e);
      alert('Erro ao cortar a imagem');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full space-y-6 shadow-2xl">
        <div className="text-center">
          <h3 className="font-serif text-lg text-[#1A1816] font-medium">Ajustar foto de perfil</h3>
          <p className="text-xs text-[#6B6762] mt-1">Arraste e ajuste o zoom para enquadrar a foto no círculo.</p>
        </div>

        <div className="flex justify-center">
          <div
            className="w-[300px] h-[300px] bg-[#fafaf8] border border-[#e8e4de] rounded-xl overflow-hidden relative cursor-move select-none"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleMouseUp}
          >
            <div
              className="absolute inset-0 pointer-events-none z-10"
              style={{
                boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)',
                margin: '25px',
                width: '250px',
                height: '250px',
                borderRadius: '50%',
                border: '2px solid white',
              }}
            />

            <img
              ref={imageRef}
              src={imageSrc}
              alt="Preview"
              draggable={false}
              className="absolute pointer-events-none max-w-none max-h-none"
              style={{
                width: '250px',
                height: 'auto',
                left: '50%',
                top: '50%',
                transform: `translate(-50%, -50%) translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
                transformOrigin: 'center center',
              }}
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs uppercase tracking-widest text-[#6B6762] block">Zoom</label>
          <input
            type="range"
            min="1"
            max="3"
            step="0.01"
            value={zoom}
            onChange={(e) => setZoom(parseFloat(e.target.value))}
            className="w-full accent-[#0f3421]"
            aria-label="Ajustar zoom"
          />
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg border border-[#d1ccc4] text-sm font-medium text-[#1A1816] hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleCrop}
            className="flex-1 py-2.5 rounded-lg text-sm font-medium text-white bg-[#0f3421]"
          >
            Cortar & Salvar
          </button>
        </div>
      </div>
    </div>
  );
}


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
const STEP_LABELS = ['Conta', 'Artístico', 'Trajetória', 'Marca', 'Fotos'];

const EMPTY_DATA: WizardData = {
  nome: '', nomeartistico: '', email: '', nascimento: '',
  nacionalidade: '', cidade: '', telefone: '', whatsapp: '', website: '',
  foto_url: '', pronome: '', cidade_nascimento: '', pais_nascimento: '', pais_atual: '',
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
                className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
                  done || active ? 'bg-[#0f3421]' : 'bg-transparent border border-[#d1ccc4]'
                }`}
              >
                {done ? (
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                ) : (
                  <span className={`text-xs font-bold ${active ? 'text-white' : 'text-[#b0ada8]'}`}>
                    {i + 1}
                  </span>
                )}
              </div>
              <span
                className={`hidden sm:block text-[10px] uppercase tracking-widest text-center whitespace-nowrap transition-all duration-300 ${
                  active || done ? 'text-[#0f3421] font-bold' : 'text-[#b0ada8] font-normal'
                }`}
              >
                {label}
              </span>
            </div>
            {i < TOTAL_STEPS - 1 && (
              <div
                className={`h-[1.5px] w-8 mb-[18px] transition-colors duration-300 ${
                  i < current ? 'bg-[#0f3421]' : 'bg-[#e8e4de]'
                }`}
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
      <div className="flex-1 h-px bg-[#e8e4de]" />
      <span className="text-[10px] uppercase tracking-widest text-[#b0ada8]">{label}</span>
      <div className="flex-1 h-px bg-[#e8e4de]" />
    </div>
  );
}

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-xs uppercase tracking-widest mb-1 text-[#6B6762]">
      {children}{required && <span className="ml-1 text-[#0f3421]">*</span>}
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
      className="w-full bg-transparent border-b border-[#d1ccc4] py-2 text-sm text-[#1A1816] outline-none transition-colors focus:border-[#0f3421]"
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
      className="w-full bg-transparent border border-[#d1ccc4] rounded-lg p-3 text-sm text-[#1A1816] outline-none resize-none transition-colors focus:border-[#0f3421]"
    />
  );
}

function WordCount({ text }: { text: string }) {
  const n = text.trim().split(/\s+/).filter(Boolean).length;
  return <p className="text-xs text-right mt-1 text-[#b0ada8]">{n} palavras</p>;
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
            className="text-sm flex-shrink-0 text-[#b0ada8]">×</button>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...values, ''])}
        className="text-xs uppercase tracking-widest text-[#0f3421]">
        + Adicionar Instagram
      </button>
    </div>
  );
}

// ─── Avatar Uploader ──────────────────────────────────────────────────────────

function AvatarUploader({ value, onChange }: { value: string; onChange: (url: string) => void }) {
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
      alert('Erro ao carregar avatar.');
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
                <span className="text-xs text-[#0f3421]">foto</span>
              </>
            )}
          </div>
        )}
      </div>
      <div>
        <p className="text-sm font-medium text-[#1A1816]">Foto de perfil</p>
        <p className="text-xs mt-0.5 text-[#6B6762]">JPG, PNG ou WEBP · corte quadrado e compressão automática</p>
        <button
          type="button"
          onClick={() => ref.current?.click()}
          className="mt-2 text-xs underline text-[#0f3421]"
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

      {selectedImage && (
        <CropperModal
          imageSrc={selectedImage}
          onClose={() => setSelectedImage(null)}
          onSave={handleCropSave}
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
}: {
  label: string;
  description: string;
  hint: string;
  value: string;
  onChange: (url: string) => void;
  folder: string;
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
      alert('Erro ao carregar imagem.');
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
            <span className="text-xs text-[#6B6762]">Carregando...</span>
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
                Remover
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="#0f3421" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
            </svg>
            <span className="text-xs font-medium text-[#1A1816]">Arraste ou clique para enviar</span>
            <span className="text-[10px] text-[#6B6762]">{hint}</span>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          aria-label={`Escolher ${label}`}
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

function MultiPhotoUploader({ values, onChange }: { values: string[]; onChange: (urls: string[]) => void }) {
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
      alert('Erro ao carregar algumas fotos.');
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
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
            isDragActive ? 'bg-gray-50 border-[#0f3421]' : 'bg-[#fafaf8] border-[#d1ccc4]'
          } hover:border-[#0f3421]`}
        >
          <div className="flex flex-col items-center gap-2">
            <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="#0f3421" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            <span className="text-sm font-medium text-[#1A1816]">Arraste suas fotos profissionais aqui</span>
            <span className="text-xs text-[#6B6762]">Ou clique para selecionar arquivos (JPEG, PNG, WebP)</span>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            aria-label="Adicionar fotos profissionais"
            className="hidden"
            onChange={(e) => {
              if (e.target.files) handleFiles(e.target.files);
            }}
          />
        </div>
      )}

      {/* Slots Counter */}
      <div className="flex justify-between items-center text-xs text-[#6B6762]">
        <span>Formatos recomendados: JPG, PNG, WebP</span>
        <span className="font-medium text-[#0f3421]">
          {values.length} de {MAX} fotos carregadas
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
                  title="Excluir foto"
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
                  title="Mover para esquerda"
                >
                  ←
                </button>
                <button
                  type="button"
                  disabled={i === values.length - 1}
                  onClick={() => moveRight(i)}
                  className="bg-white/90 hover:bg-white text-gray-800 disabled:opacity-40 rounded p-1 text-xs flex-1 flex justify-center items-center shadow"
                  title="Mover para direita"
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
        <p className="text-xs uppercase tracking-widest font-medium text-[#0f3421]">{title}</p>
        <button type="button" onClick={addEmpty}
          className="text-xs uppercase tracking-widest text-[#0f3421]">+ Adicionar</button>
      </div>
      {items.map(item => (
        <div key={item.id} className="rounded-xl p-4 relative bg-[#e8f0eb]">
          <button type="button" onClick={() => remove(item.id)}
            className="absolute right-3 top-3 text-sm text-[#b0ada8]">×</button>
          <div className="grid grid-cols-2 gap-3 pr-6">
            {fields.map(f => (
              <div key={f.key} className={f.className ?? (f.key === fields[0].key ? 'col-span-2' : '')}>
                <label className="block text-xs mb-1 text-[#6B6762]">{f.label}</label>
                <input
                  type={f.type ?? 'text'}
                  value={item[f.key] ?? ''}
                  placeholder={f.placeholder}
                  onChange={e => update(item.id, f.key, e.target.value)}
                  className="w-full bg-white border-b border-[#d1ccc4] py-1.5 text-sm text-[#1A1816] outline-none"
                />
              </div>
            ))}
          </div>
        </div>
      ))}
      {items.length === 0 && (
        <p className="text-xs italic text-[#b0ada8]">Nenhum item adicionado.</p>
      )}
    </div>
  );
}

// ─── Step 1 — Conta / Perfil Pessoal ─────────────────────────────────────────

function Step1({ data, onChange }: { data: WizardData; onChange: (d: Partial<WizardData>) => void }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-2xl mb-1 text-[#1A1816]">Conta &amp; perfil pessoal</h2>
        <p className="text-sm text-[#6B6762]">Estas informações identificam você no sistema e nos documentos.</p>
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
        <h2 className="font-serif text-2xl mb-1 text-[#1A1816]">Perfil artístico</h2>
        <p className="text-sm text-[#6B6762]">Quem você é como artista — em suas próprias palavras.</p>
      </div>

      <SectionDivider label="Biografias" />

      <div>
        <Label>Biografia curta <span className="text-[#b0ada8] normal-case tracking-normal">(máx. 120 palavras)</span></Label>
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
          <Label>Ano de início da carreira</Label>
          <Input value={data.ano_inicio_carreira} onChange={v => onChange({ ano_inicio_carreira: v })} placeholder="Ex: 2012" type="number" />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <Label>Técnicas recorrentes</Label>
          <Input value={data.tecnicas_recorrentes} onChange={v => onChange({ tecnicas_recorrentes: v })} placeholder="Pintura a óleo, gravura, vídeo..." />
        </div>
        <div className="col-span-2">
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
        <p className="text-xs mt-1.5 text-[#b0ada8]">Separe por vírgula ou pressione Enter. Ajuda na busca e curadoria.</p>
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
        <h2 className="font-serif text-2xl mb-1 text-[#1A1816]">Trajetória &amp; currículo</h2>
        <p className="text-sm text-[#6B6762]">Registre formações, exposições, prêmios e histórico profissional.</p>
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
      <div className="h-px bg-[#e8e4de]" />

      <AddList
        title="Exposições individuais"
        items={data.expos_individuais}
        onChange={v => onChange({ expos_individuais: v as ListItem[] })}
        fields={exposFields}
      />
      <div className="h-px bg-[#e8e4de]" />

      <AddList
        title="Exposições coletivas"
        items={data.expos_coletivas}
        onChange={v => onChange({ expos_coletivas: v as ListItem[] })}
        fields={exposFields}
      />
      <div className="h-px bg-[#e8e4de]" />

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
      <div className="h-px bg-[#e8e4de]" />

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
      <div className="h-px bg-[#e8e4de]" />

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
      <div className="h-px bg-[#e8e4de]" />

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
      <div className="h-px bg-[#e8e4de]" />

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
      <div className="h-px bg-[#e8e4de]" />

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
      <div className="h-px bg-[#e8e4de]" />

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
      <div className="h-px bg-[#e8e4de]" />

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
        <h2 className="font-serif text-2xl mb-1 text-[#1A1816]">Marca &amp; identidade</h2>
        <p className="text-sm text-[#6B6762]">Faça upload do seu selo e assinatura para uso em certificados e dossiês.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <BrandAssetUploader
          label="Selo / Carimbo da marca"
          description="Usado no rodapé do portfólio PDF e certificado de autenticidade."
          hint="PNG recomendado (fundo transparente)"
          value={data.selo_url}
          onChange={v => onChange({ selo_url: v })}
          folder="onboarding/selo"
        />
        <BrandAssetUploader
          label="Assinatura digital"
          description="Assinatura visual alternativa para validação de autoria nos documentos."
          hint="JPG, PNG ou WebP"
          value={data.assinatura_url}
          onChange={v => onChange({ assinatura_url: v })}
          folder="onboarding/assinatura"
        />
      </div>

      <div className="rounded-xl p-4 mt-4 bg-[#fafaf8] border border-[#e8e4de]">
        <p className="text-xs text-[#6B6762] text-center">
          Adding a brand seal or digital signature is recommended for professional presentations.
        </p>
      </div>
    </div>
  );
}

// ─── Step 5 — Fotos Profissionais ─────────────────────────────────────────────

function Step5({ data, onChange }: { data: WizardData; onChange: (d: Partial<WizardData>) => void }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-2xl mb-1 text-[#1A1816]">Fotos profissionais</h2>
        <p className="text-sm text-[#6B6762]">Adicione até 5 fotos suas para uso em materiais de divulgação e dossiês.</p>
      </div>

      <div className="rounded-xl p-4 bg-[#fafaf8] border border-[#e8e4de]">
        <p className="text-xs text-[#6B6762]">
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
      <div className="w-16 h-16 rounded-full flex items-center justify-center bg-[#0f3421]">
        <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
        </svg>
      </div>

      <div>
        <h2 className="font-serif text-3xl mb-2 text-[#1A1816]">
          {data.nomeartistico || data.nome
            ? `Bem-vinda, ${data.nomeartistico || data.nome}!`
            : 'Tudo certo!'}
        </h2>
        <p className="text-sm max-w-sm mx-auto text-[#6B6762]">
          Seu perfil foi configurado com sucesso. Você pode complementar qualquer informação a qualquer momento em{' '}
          <strong>Configurações &gt; Perfil</strong>.
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
                  data.ano_inicio_carreira ? `Carreira desde ${data.ano_inicio_carreira}` : null
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
          className={`w-full py-3 rounded-xl font-medium text-sm border border-[#d1ccc4] text-[#1A1816] transition-colors ${loading ? 'opacity-40' : 'opacity-100'}`}
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
            pais_atual: (meta.pais_atual as string) || '',
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
        <h1 className="font-serif italic text-2xl text-[#b8943f]">studio virtual</h1>
        <div className="w-5 h-5 border-2 border-[#b8943f] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-[#F5F3EE]">
      {/* ── Left decorative panel ── */}
      <div className="hidden lg:flex flex-col justify-between p-10 w-72 flex-shrink-0 bg-[#0f3421] text-white">
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
              <div className="w-1.5 h-1.5 rounded-full flex-shrink-0 bg-white/40" />
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
        <div className="flex items-center justify-between px-6 sm:px-8 py-5 border-b border-[#e8e4de]">
          <div className="lg:hidden">
            <p className="font-serif italic text-lg text-[#0f3421]">studio virtual</p>
          </div>
          {!isConclusion && (
            <div className="flex items-center gap-4 ml-auto">
              <span className="text-xs hidden sm:block text-[#b0ada8]">
                {step + 1} de {TOTAL_STEPS}
              </span>
              <ProgressBar current={step} />
            </div>
          )}
          {isConclusion && (
            <div className="ml-auto">
              <span className="text-xs uppercase tracking-widest text-[#0f3421]">Perfil configurado ✓</span>
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
                  <div className="mt-5 rounded-xl px-4 py-3 bg-[#fef2f2] border border-[#fecaca]">
                    {errors.map((e, i) => (
                      <p key={i} className="text-sm text-[#dc2626]">{e}</p>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Bottom navigation */}
        {!isConclusion && (
          <div className="flex items-center justify-between px-6 sm:px-8 py-5 border-t border-[#e8e4de] bg-[#F5F3EE]">
            {step > 0 ? (
              <button
                type="button"
                onClick={handleBack}
                className="text-sm px-5 py-2.5 rounded-lg border border-[#d1ccc4] text-[#1A1816] transition-colors"
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
                  className="text-sm underline text-[#b0ada8]"
                >
                  Pular por agora
                </button>
              )}
              <button
                type="button"
                onClick={handleNext}
                className="text-sm px-6 py-2.5 rounded-lg font-medium text-white transition-opacity bg-[#0f3421]"
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
