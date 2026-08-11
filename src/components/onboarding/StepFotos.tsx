import { useState } from 'react';
import { uploadToStorage } from '../../services/supabase';

const DT = {
  text: '#1D1D1F',
  textMuted: '#86868B',
  fontSans: 'system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", sans-serif',
};

interface WizardData {
  fotos_profissionais: string[];
  [key: string]: any;
}

interface Props {
  data: WizardData;
  onChange: (d: Partial<WizardData>) => void;
  T: Record<string, string>;
}

function MultiPhotoUploader({
  values,
  onChange,
  T,
}: {
  values: string[];
  onChange: (urls: string[]) => void;
  T: Record<string, string>;
}) {
  const [uploading, setUploading] = useState(false);

  const handleFiles = async (files: FileList) => {
    setUploading(true);
    try {
      const newUrls: string[] = [];
      for (const file of Array.from(files)) {
        const url = await uploadToStorage(file, 'onboarding/fotos');
        newUrls.push(url);
      }
      onChange([...values, ...newUrls].slice(0, 5));
    } catch (err) {
      console.error(err);
      alert(T.upload_error ?? 'Erro ao enviar fotos.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {values.map((url, i) => (
          <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-white border border-[#e8e4de] group">
            <img src={url} alt={`foto ${i + 1}`} className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => onChange(values.filter((_, j) => j !== i))}
              className="absolute top-1 right-1 text-xs bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              ×
            </button>
          </div>
        ))}

        {values.length < 5 && (
          <label className="aspect-square rounded-xl border-2 border-dashed border-[#d1ccc4] flex flex-col items-center justify-center cursor-pointer hover:border-[#0f3421] transition-colors bg-[#fafaf8]">
            {uploading ? (
              <div className="w-5 h-5 border-2 border-[#0f3421] border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span className="text-xs font-bold text-[#0f3421]">+ Foto</span>
                <span className="text-[10px] text-[#6B6762]">{values.length}/5</span>
              </>
            )}
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => { if (e.target.files?.length) handleFiles(e.target.files); }}
            />
          </label>
        )}
      </div>
    </div>
  );
}

export function StepFotos({ data, onChange, T }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h2 style={{ fontFamily: DT.fontSans, color: DT.text }}
          className="text-3xl md:text-4xl font-semibold tracking-tight leading-tight mb-1.5">
          {T.step5_title}
        </h2>
        <p className="text-[15px] font-normal leading-relaxed" style={{ color: DT.textMuted }}>
          {T.step5_desc}
        </p>
      </div>

      <div className="rounded-xl p-4 bg-[#fafaf8] border border-[#e8e4de]">
        <p className="text-xs text-[#6B6762]">
          {T.step5_note}
        </p>
      </div>

      <MultiPhotoUploader
        values={data.fotos_profissionais}
        onChange={(v) => onChange({ fotos_profissionais: v })}
        T={T}
      />
    </div>
  );
}
