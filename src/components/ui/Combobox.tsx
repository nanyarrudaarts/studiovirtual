import React, { useState, useEffect, useRef, useId, useMemo } from 'react';
import { ChevronDown, Check, Loader2 } from 'lucide-react';

export interface ComboboxOption {
  label: string;
  value: string;
}

export interface ComboboxProps {
  value: string;
  onChange: (value: string) => void;
  options?: Array<ComboboxOption | string>;
  placeholder?: string;
  onSearchAsync?: (query: string) => Promise<Array<ComboboxOption | string>>;
  debounceMs?: number;
  allowCustom?: boolean;
  disabled?: boolean;
  id?: string;
  name?: string;
  className?: string;
}

// Auxiliar para normalizar strings (remover acentos e lowercase)
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function Combobox({
  value,
  onChange,
  options = [],
  placeholder = 'Selecione ou digite...',
  onSearchAsync,
  debounceMs = 300,
  allowCustom = true,
  disabled = false,
  id,
  name,
  className = '',
}: ComboboxProps) {
  const generatedId = useId();
  const comboboxId = id || `combobox-${generatedId}`;
  const listboxId = `${comboboxId}-listbox`;

  // Normaliza opções recebidas
  const normalizedOptions: ComboboxOption[] = useMemo(() => {
    return options.map(opt =>
      typeof opt === 'string' ? { label: opt, value: opt } : opt
    );
  }, [options]);

  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value || '');
  const [asyncOptions, setAsyncOptions] = useState<ComboboxOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number>(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxRef = useRef<HTMLUListElement>(null);

  // Sincroniza inputValue quando prop value muda externamente
  useEffect(() => {
    const selectedOption = normalizedOptions.find(o => o.value === value);
    setInputValue(selectedOption ? selectedOption.label : value || '');
  }, [value, normalizedOptions]);

  // Debounce para busca remota
  useEffect(() => {
    if (!onSearchAsync || !isOpen) return;

    setIsLoading(true);
    const timer = setTimeout(async () => {
      try {
        const results = await onSearchAsync(inputValue);
        const formatted = results.map(opt =>
          typeof opt === 'string' ? { label: opt, value: opt } : opt
        );
        setAsyncOptions(formatted);
      } catch (err) {
        console.error('Erro na busca do combobox:', err);
      } finally {
        setIsLoading(false);
      }
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [inputValue, onSearchAsync, debounceMs, isOpen]);

  // Opções filtradas (locais ou assíncronas)
  const filteredOptions = useMemo(() => {
    if (onSearchAsync) {
      return asyncOptions;
    }
    if (!inputValue.trim()) {
      return normalizedOptions;
    }
    const query = normalizeText(inputValue);
    return normalizedOptions.filter(opt =>
      normalizeText(opt.label).includes(query) || normalizeText(opt.value).includes(query)
    );
  }, [normalizedOptions, asyncOptions, inputValue, onSearchAsync]);

  // Fecha o dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setActiveIndex(-1);
        if (allowCustom && inputValue !== value) {
          onChange(inputValue);
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [inputValue, value, onChange, allowCustom]);

  // Scroll automático para item ativo na navegação por teclado
  useEffect(() => {
    if (activeIndex >= 0 && listboxRef.current) {
      const activeEl = listboxRef.current.children[activeIndex] as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [activeIndex]);

  const selectOption = (option: ComboboxOption) => {
    setInputValue(option.label);
    onChange(option.value);
    setIsOpen(false);
    setActiveIndex(-1);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    setIsOpen(true);
    setActiveIndex(0);

    if (allowCustom) {
      onChange(val);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
          setActiveIndex(0);
        } else {
          setActiveIndex(prev => (prev < filteredOptions.length - 1 ? prev + 1 : 0));
        }
        break;

      case 'ArrowUp':
        e.preventDefault();
        if (isOpen) {
          setActiveIndex(prev => (prev > 0 ? prev - 1 : filteredOptions.length - 1));
        }
        break;

      case 'Enter':
        if (isOpen && activeIndex >= 0 && filteredOptions[activeIndex]) {
          e.preventDefault();
          selectOption(filteredOptions[activeIndex]);
        }
        break;

      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setActiveIndex(-1);
        break;

      case 'Tab':
        if (isOpen && activeIndex >= 0 && filteredOptions[activeIndex]) {
          selectOption(filteredOptions[activeIndex]);
        } else {
          setIsOpen(false);
        }
        break;
    }
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Input container */}
      <div className="relative flex items-center">
        <input
          ref={inputRef}
          id={comboboxId}
          name={name}
          type="text"
          role="combobox"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-autocomplete="list"
          aria-controls={listboxId}
          aria-activedescendant={
            isOpen && activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined
          }
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full rounded-xl px-4 py-3 pr-10 text-[15px] outline-none transition-all disabled:opacity-50 placeholder:text-[#A1A1A6]"
          style={{
            background: '#F2F2F7',
            border: '1px solid transparent',
            color: '#1D1D1F',
          }}
          onFocusCapture={e => {
            e.currentTarget.style.background = '#FFFFFF';
            e.currentTarget.style.border = '1px solid #000000';
            e.currentTarget.style.boxShadow = '0 0 0 4px rgba(0, 0, 0, 0.08)';
          }}
          onBlurCapture={e => {
            if (!isOpen) {
              e.currentTarget.style.background = '#F2F2F7';
              e.currentTarget.style.border = '1px solid transparent';
              e.currentTarget.style.boxShadow = 'none';
            }
          }}
        />

        {/* Action icons */}
        <div className="absolute right-3 flex items-center gap-1 text-[#86868B] pointer-events-none">
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin text-black" />
          ) : (
            <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
          )}
        </div>
      </div>

      {/* Floating Dropdown Listbox */}
      {isOpen && (
        <ul
          ref={listboxRef}
          id={listboxId}
          role="listbox"
          className="absolute z-50 left-0 right-0 mt-2 max-h-60 overflow-y-auto rounded-2xl p-1.5 shadow-2xl transition-all"
          style={{
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(0, 0, 0, 0.08)',
          }}
        >
          {filteredOptions.length === 0 ? (
            <li className="px-4 py-3 text-xs text-[#86868B] text-center italic">
              {allowCustom ? `Pressione Enter para usar "${inputValue}"` : 'Nenhuma opção encontrada.'}
            </li>
          ) : (
            filteredOptions.map((option, index) => {
              const isSelected = option.value === value;
              const isActive = index === activeIndex;

              return (
                <li
                  key={option.value || index}
                  id={`${listboxId}-option-${index}`}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => selectOption(option)}
                  onMouseEnter={() => setActiveIndex(index)}
                  className={`flex items-center justify-between px-4 py-2.5 text-sm rounded-xl cursor-pointer transition-all ${
                    isActive
                      ? 'bg-black text-white font-medium'
                      : isSelected
                      ? 'bg-black/5 font-semibold text-[#1D1D1F]'
                      : 'text-[#1D1D1F] hover:bg-black/5'
                  }`}
                >
                  <span className="truncate">{option.label}</span>
                  {isSelected && (
                    <Check className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-black'}`} />
                  )}
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
}
