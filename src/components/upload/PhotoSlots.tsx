import React, { useRef } from 'react';
import { Camera, Plus } from 'lucide-react';

interface PhotoSlot {
  file: File | null;
  url: string | null;
}

interface Props {
  photos: PhotoSlot[];
  handlePhotoSlot: (index: number, e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function PhotoSlots({ photos, handlePhotoSlot }: Props) {
  const photoRefs = useRef<(HTMLInputElement | null)[]>([]);

  return (
    <div className="space-y-3">
      <div
        className="relative border border-dashed border-gold-dim rounded-2xl overflow-hidden aspect-video flex items-center justify-center bg-surface hover:bg-gold/5 transition-colors cursor-pointer group"
        onClick={() => photoRefs.current[0]?.click()}
      >
        <input
          ref={(el) => { photoRefs.current[0] = el; }}
          type="file"
          accept="image/*"
          className="hidden"
          aria-label="Upload imagem principal"
          onChange={(e) => handlePhotoSlot(0, e)}
        />
        {photos[0].url ? (
          <div className="relative w-full h-full">
            <img src={photos[0].url} alt="Foto principal" className="w-full h-full object-contain" />
            <span className="absolute top-2 left-2 bg-gold text-bg text-xs font-bold px-2 py-1 rounded">CAPA</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-text-muted group-hover:text-gold transition-colors">
            <Camera size={40} />
            <span className="text-sm font-medium">Foto principal — clique para selecionar</span>
          </div>
        )}
      </div>
      <div className="grid grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="relative border border-dashed border-border rounded-xl overflow-hidden bg-surface hover:bg-gold/5 transition-colors cursor-pointer group aspect-[3/4] flex items-center justify-center"
            onClick={() => photoRefs.current[i]?.click()}
          >
            <input
              ref={(el) => { photoRefs.current[i] = el; }}
              type="file"
              accept="image/*"
              className="hidden"
              aria-label={`Upload imagem ${i + 1}`}
              onChange={(e) => handlePhotoSlot(i, e)}
            />
            {photos[i].url ? (
              <img src={photos[i].url} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
            ) : (
              <Camera size={20} className="text-text-faint group-hover:text-gold transition-colors" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function CompactPhotoSlots({ photos, handlePhotoSlot }: Props) {
  const photoRefs = useRef<(HTMLInputElement | null)[]>([]);

  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      <div
        className="shrink-0 w-20 h-20 border border-dashed border-gold-dim rounded-xl overflow-hidden flex items-center justify-center bg-surface hover:bg-gold/5 cursor-pointer"
        onClick={() => photoRefs.current[0]?.click()}
      >
        <input
          ref={(el) => { photoRefs.current[0] = el; }}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handlePhotoSlot(0, e)}
          title="Foto de capa"
          aria-label="Foto de capa"
        />
        {photos[0].url ? (
          <img src={photos[0].url} alt="Foto de capa" className="w-full h-full object-cover" />
        ) : (
          <Camera size={24} className="text-gold/50" />
        )}
      </div>
      {[1, 2, 3, 4].map((i) =>
        photos[i - 1].url ? (
          <div
            key={i}
            className="shrink-0 w-20 h-20 border border-dashed border-border rounded-xl overflow-hidden flex items-center justify-center bg-surface hover:bg-surface-raised cursor-pointer"
            onClick={() => photoRefs.current[i]?.click()}
          >
            <input
              ref={(el) => { photoRefs.current[i] = el; }}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handlePhotoSlot(i, e)}
              title={`Foto adicional ${i}`}
              aria-label={`Foto adicional ${i}`}
            />
            {photos[i].url ? (
              <img src={photos[i].url} alt={`Foto adicional ${i}`} className="w-full h-full object-cover" />
            ) : (
              <Plus size={24} className="text-text-muted" />
            )}
          </div>
        ) : null
      )}
    </div>
  );
}
