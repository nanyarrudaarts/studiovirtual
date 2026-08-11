import { useState, useRef } from 'react';
import { CropperModal } from './CropperModal';

const DT = {
  bg: '#F5F5F7',
  surface: '#FFFFFF',
  inputBg: '#F2F2F7',
  black: '#000000',
  blackHover: '#1C1C1E',
  gold: '#C5A059',
  text: '#1D1D1F',
  textMuted: '#86868B',
  textFaint: '#A1A1A6',
  border: 'rgba(0, 0, 0, 0.08)',
  fontSans: 'system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", sans-serif',
};

interface WizardData {
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
  tel_numero: string;
  same_whatsapp: boolean;
  [key: string]: any;
}

interface Props {
  data: WizardData;
  onChange: (d: Partial<WizardData>) => void;
  T: Record<string, string>;
  uploadToStorage: (blob: Blob, path: string) => Promise<string>;
}

function SectionDivider({ label }: { label: string }) {
  return (
    <div className="pt-2 pb-1 border-b border-[#E5E5EA]">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-[#86868B]">
        {label}
      </span>
    </div>
  );
}

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-xs font-semibold text-[#1D1D1F] mb-1.5">
      {children} {required && <span className="text-red-500">*</span>}
    </label>
  );
}

function Input({ ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full bg-[#F2F2F7] border border-transparent focus:border-[#C5A059] focus:bg-white text-[#1D1D1F] text-sm rounded-xl px-4 py-3 outline-none transition-all placeholder-[#A1A1A6]"
    />
  );
}

function AvatarUploader({
  value,
  onChange,
  T,
  uploadToStorage,
}: {
  value: string;
  onChange: (url: string) => void;
  T: Record<string, string>;
  uploadToStorage: (blob: Blob, path: string) => Promise<string>;
}) {
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
        onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }}
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

export function StepPessoal({ data, onChange, T, uploadToStorage }: Props) {
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

      <AvatarUploader value={data.foto_url} onChange={(v) => onChange({ foto_url: v })} T={T} uploadToStorage={uploadToStorage} />

      <SectionDivider label={T.sec_identification} />

      <div className="grid grid-cols-2 gap-x-6 gap-y-5">
        <div className="col-span-2 sm:col-span-1">
          <Label required>{T.field_nome}</Label>
          <Input value={data.nome} onChange={(e) => onChange({ nome: e.target.value })} placeholder={T.ph_nome} />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <Label>{T.field_nomeartistico}</Label>
          <Input value={data.nomeartistico} onChange={(e) => onChange({ nomeartistico: e.target.value })} placeholder={T.ph_nomeartistico} />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <Label>{T.field_pronome}</Label>
          <Input value={data.pronome} onChange={(e) => onChange({ pronome: e.target.value })} placeholder={T.ph_pronome} />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <Label required>{T.field_email}</Label>
          <Input value={data.email} onChange={(e) => onChange({ email: e.target.value })} placeholder={T.ph_email} type="email" />
        </div>
      </div>
    </div>
  );
}
