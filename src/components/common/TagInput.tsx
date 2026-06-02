import { useState, useRef, useEffect } from 'react';
import { X } from 'lucide-react';

interface TagInputProps {
  id?: string;
  value: string;           // comma-separated string stored in DB
  onChange: (val: string) => void;
  suggestions: string[];   // predefined vocabulary
  placeholder?: string;
  label?: string;
}

export function TagInput({ id, value, onChange, suggestions, placeholder, label }: TagInputProps) {
  const tags = value ? value.split(',').map(t => t.trim()).filter(Boolean) : [];
  const [input, setInput] = useState('');
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = suggestions.filter(
    s => s.toLowerCase().includes(input.toLowerCase()) && !tags.includes(s)
  );

  const addTag = (tag: string) => {
    const trimmed = tag.trim();
    if (!trimmed || tags.includes(trimmed)) return;
    onChange([...tags, trimmed].join(', '));
    setInput('');
    setOpen(false);
    inputRef.current?.focus();
  };

  const removeTag = (tag: string) => {
    onChange(tags.filter(t => t !== tag).join(', '));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === 'Enter' || e.key === ',') && input.trim()) {
      e.preventDefault();
      addTag(input);
    }
    if (e.key === 'Backspace' && !input && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
    if (e.key === 'Escape') setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      {label && (
        <label htmlFor={id} className="flex items-center gap-1 text-xs font-bold text-text-muted mb-1">
          {label}
        </label>
      )}
      <div
        className="flex flex-wrap gap-1.5 border border-border rounded-lg px-3 py-2 bg-bg focus-within:border-gold focus-within:ring-1 focus-within:ring-gold/30 cursor-text min-h-[42px]"
        onClick={() => inputRef.current?.focus()}
      >
        {tags.map(tag => (
          <span
            key={tag}
            className="flex items-center gap-1 bg-gold/10 text-gold text-xs font-semibold px-2.5 py-1 rounded-full border border-gold/20"
          >
            {tag}
            <button
              type="button"
              onClick={e => { e.stopPropagation(); removeTag(tag); }}
              className="hover:text-red-500 transition-colors leading-none"
              aria-label={`Remover ${tag}`}
            >
              <X size={11} />
            </button>
          </span>
        ))}
        <input
          id={id}
          ref={inputRef}
          type="text"
          value={input}
          onChange={e => { setInput(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={tags.length === 0 ? (placeholder ?? 'Digite e pressione Enter...') : ''}
          className="flex-1 min-w-[120px] bg-transparent text-sm outline-none placeholder:text-text-muted"
        />
      </div>

      {/* Dropdown suggestions */}
      {open && filtered.length > 0 && (
        <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-surface-raised border border-border rounded-xl shadow-2xl max-h-52 overflow-y-auto">
          {filtered.map(s => (
            <button
              key={s}
              type="button"
              onMouseDown={e => { e.preventDefault(); addTag(s); }}
              className="w-full text-left px-4 py-2 text-sm hover:bg-gold/10 hover:text-gold transition-colors text-text-main"
            >
              {s}
            </button>
          ))}
          {input.trim() && !suggestions.includes(input.trim()) && (
            <button
              type="button"
              onMouseDown={e => { e.preventDefault(); addTag(input); }}
              className="w-full text-left px-4 py-2 text-sm text-text-muted italic border-t border-border hover:bg-surface"
            >
              Adicionar "{input.trim()}"
            </button>
          )}
        </div>
      )}
      <p className="text-[10px] text-text-muted mt-1">Pressione <kbd className="bg-surface px-1 rounded border border-border">Enter</kbd> ou <kbd className="bg-surface px-1 rounded border border-border">,</kbd> para adicionar. Clique nas sugestões abaixo.</p>
    </div>
  );
}
