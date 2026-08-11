import { useState, useEffect, useRef, useMemo } from 'react';

interface Props {
  id: string;
  label: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  suggestions: string[];
  className?: string;
  disabled?: boolean;
}

export function AutocompleteInput({ id, label, value, onChange, placeholder, suggestions, className = '', disabled = false }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const safeVal = (value || '').trim();
  const filtered = useMemo(() => {
    if (!safeVal) return suggestions;
    const query = safeVal.toLowerCase();
    return suggestions.filter((item) => item.toLowerCase().includes(query) && item.toLowerCase() !== query);
  }, [safeVal, suggestions]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <label htmlFor={id} className="block text-sm font-bold text-text-muted mb-1">{label}</label>
      <input
        id={id}
        aria-label={label}
        value={value}
        disabled={disabled}
        onChange={(e) => { onChange(e.target.value); setIsOpen(true); }}
        onFocus={() => setIsOpen(true)}
        placeholder={placeholder}
        className="w-full border border-border rounded-lg px-4 py-2 text-sm focus:border-gold focus:ring-1 focus:ring-gold/30 outline-none bg-surface/50 text-text-main disabled:opacity-75 disabled:cursor-not-allowed transition-all"
        autoComplete="off"
      />
      {isOpen && !disabled && filtered.length > 0 && (
        <ul className="absolute z-[999] left-0 right-0 mt-1 bg-surface border border-border rounded-lg shadow-gold-glow max-h-48 overflow-y-auto divide-y divide-border">
          {filtered.map((item, idx) => (
            <li key={idx}>
              <button
                type="button"
                onClick={() => { onChange(item); setIsOpen(false); }}
                className="w-full text-left px-4 py-2 text-sm hover:bg-gold/10 hover:text-gold transition-colors"
              >
                {item}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
