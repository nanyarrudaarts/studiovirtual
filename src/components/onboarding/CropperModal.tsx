import { useState, useRef } from 'react';
import { compressAndCropImage } from '../../lib/imageUtils';

interface Props {
  imageSrc: string;
  onClose: () => void;
  onSave: (croppedBlob: Blob) => void;
  T: Record<string, string>;
}

export function CropperModal({ imageSrc, onClose, onSave, T }: Props) {
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
      alert(T.crop_error ?? 'Erro ao cortar a imagem');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full space-y-6 shadow-2xl">
        <div className="text-center">
          <h3 className="font-serif text-lg text-[#1A1816] font-medium">{T.crop_title ?? 'Ajustar foto de perfil'}</h3>
          <p className="text-xs text-[#6B6762] mt-1">{T.crop_desc ?? 'Arraste e ajuste o zoom para enquadrar a foto no círculo.'}</p>
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
          <label className="text-xs uppercase tracking-widest text-[#6B6762] block">{T.crop_zoom ?? 'Zoom'}</label>
          <input
            type="range"
            min="1"
            max="3"
            step="0.01"
            value={zoom}
            onChange={(e) => setZoom(parseFloat(e.target.value))}
            className="w-full accent-[#0f3421]"
            aria-label={T.crop_zoom ?? 'Ajustar zoom'}
          />
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg border border-[#d1ccc4] text-sm font-medium text-[#1A1816] hover:bg-gray-50"
          >
            {T.crop_cancel ?? 'Cancelar'}
          </button>
          <button
            type="button"
            onClick={handleCrop}
            className="flex-1 py-2.5 rounded-lg text-sm font-medium text-white bg-[#0f3421]"
          >
            {T.crop_save ?? 'Cortar & Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}
