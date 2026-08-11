import { useState } from 'react';
import { uploadToStorage } from '../../services/supabase';

const DT = {
  text: '#1D1D1F',
  textMuted: '#86868B',
  fontSans: 'system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", sans-serif',
};

interface WizardData {
  selo_url: string;
  assinatura_url: string;
  [key: string]: any;
}

interface Props {
  data: WizardData;
  onChange: (d: Partial<WizardData>) => void;
  T: Record<string, string>;
}

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

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      const url = await uploadToStorage(file, folder);
      onChange(url);
    } catch (err) {
      console.error(err);
      alert(T.upload_error ?? 'Erro ao carregar arquivo.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-5 rounded-2xl bg-[#fafaf8] border border-[#e8e4de] space-y-3">
      <div>
        <h4 className="text-sm font-bold text-[#1A1816]">{label}</h4>
        <p className="text-xs text-[#6B6762] mt-0.5">{description}</p>
      </div>

      <div className="h-32 rounded-xl bg-white border border-dashed border-[#d1ccc4] flex flex-col items-center justify-center relative overflow-hidden group">
        {value ? (
          <div className="relative w-full h-full p-4 flex items-center justify-center">
            <img src={value} alt={label} className="max-h-full max-w-full object-contain" />
            <button
              type="button"
              onClick={() => onChange('')}
              className="absolute top-2 right-2 text-xs bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center shadow"
            >
              ×
            </button>
          </div>
        ) : (
          <label className="cursor-pointer flex flex-col items-center justify-center w-full h-full p-4">
            {uploading ? (
              <div className="w-5 h-5 border-2 border-[#0f3421] border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span className="text-xs text-[#0f3421] font-bold">+ Carregar</span>
                <span className="text-[10px] text-[#6B6762] mt-1">{hint}</span>
              </>
            )}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }}
            />
          </label>
        )}
      </div>
    </div>
  );
}

export function StepMarca({ data, onChange, T }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h2 style={{ fontFamily: DT.fontSans, color: DT.text }}
          className="text-3xl md:text-4xl font-semibold tracking-tight leading-tight mb-1.5">
          {T.step4_title}
        </h2>
        <p className="text-[15px] font-normal leading-relaxed" style={{ color: DT.textMuted }}>
          {T.step4_desc}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <BrandAssetUploader
          label={T.label_seal}
          description={T.desc_seal}
          hint={T.hint_seal}
          value={data.selo_url}
          onChange={(v) => onChange({ selo_url: v })}
          folder="onboarding/selo"
          T={T}
        />
        <BrandAssetUploader
          label={T.label_signature}
          description={T.desc_signature}
          hint={T.hint_signature}
          value={data.assinatura_url}
          onChange={(v) => onChange({ assinatura_url: v })}
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
