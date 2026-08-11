import { useState } from 'react';
import { X } from 'lucide-react';

interface Props {
  id: string;
  label: string;
  value: string;
  onChange: (val: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function PerfilTagInput({ id, label, value, onChange, disabled, placeholder }: Props) {
  const [inputValue, setInputValue] = useState('');
  const tags = value ? value.split(',').map((t) => t.trim()).filter(Boolean) : [];

  const addTag = (tag: string) => {
    const trimmed = tag.trim();
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed].join(', '));
    }
  };

  const removeTag = (indexToRemove: number) => {
    onChange(tags.filter((_, i) => i !== indexToRemove).join(', '));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(inputValue);
      setInputValue('');
    }
  };

  return (
    <div>
      <label htmlFor={id} className="block text-xs font-bold text-text-muted mb-1">{label}</label>
      <div className={`flex flex-wrap gap-2 p-2 border border-border rounded-xl min-h-[46px] bg-surface/50 ${disabled ? 'opacity-75 cursor-not-allowed' : 'focus-within:border-gold focus-within:ring-1 focus-within:ring-gold/30'}`}>
        {tags.map((tag, idx) => (
          <span key={idx} className="flex items-center gap-1 bg-gold/10 text-gold border border-gold/20 text-xs font-medium px-2.5 py-1 rounded-full">
            {tag}
            {!disabled && (
              <button
                type="button"
                onClick={() => removeTag(idx)}
                className="hover:bg-gold/20 rounded-full p-0.5"
                aria-label={`Remover tag ${tag}`}
              >
                <X size={12} />
              </button>
            )}
          </span>
        ))}
        {!disabled && (
          <input
            id={id}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => { if (inputValue.trim()) { addTag(inputValue); setInputValue(''); } }}
            placeholder={tags.length === 0 ? placeholder : ''}
            className="flex-1 min-w-[120px] bg-transparent border-none outline-none text-sm text-text-main py-0.5 px-1 placeholder-text-muted"
          />
        )}
      </div>
    </div>
  );
}
