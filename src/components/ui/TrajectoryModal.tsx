import React, { useState, useEffect } from 'react';
import { X, Upload, Check, FileText, Search, Loader2, Sparkles } from 'lucide-react';
import { Combobox } from './Combobox';
import { searchWithJina, callAI } from '../../services/ai';

export interface FieldConfig {
  key: string;
  label: string;
  type: 'text' | 'dropdown' | 'autocomplete' | 'textarea' | 'upload' | 'number';
  placeholder?: string;
  options?: string[];
  required?: boolean;
  className?: string;
  helperText?: string;
}

export interface ListItem {
  id: string;
  [key: string]: string;
}

interface TrajectoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: ListItem) => void;
  title: string;
  fields: FieldConfig[];
  initialData?: ListItem | null;
  artistName?: string;
}

export function TrajectoryModal({
  isOpen,
  onClose,
  onSave,
  title,
  fields,
  initialData,
  artistName,
}: TrajectoryModalProps) {
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [, setUploadingField] = useState<string | null>(null);
  const [searchingKey, setSearchingKey] = useState<string | null>(null);
  const [fieldSuggestions, setFieldSuggestions] = useState<Record<string, Record<string, string>>>({});

  useEffect(() => {
    if (initialData) {
      const data: Record<string, string> = {};
      Object.keys(initialData).forEach((k) => {
        data[k] = (initialData[k] as string) || '';
      });
      setFormData(data);
    } else {
      const empty: Record<string, string> = {};
      fields.forEach((f) => {
        empty[f.key] = '';
      });
      setFormData(empty);
    }
    setFieldSuggestions({});
  }, [initialData, fields, isOpen]);

  if (!isOpen) return null;

  const handleChange = (key: string, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleFileUpload = (key: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingField(key);
    const reader = new FileReader();
    reader.onload = () => {
      handleChange(key, reader.result as string);
      handleChange(`${key}_name`, file.name);
      setUploadingField(null);
    };
    reader.onerror = () => {
      setUploadingField(null);
    };
    reader.readAsDataURL(file);
  };

  // ─── Lupa de Pesquisa no Input (Web Search) ─────────────────────────────
  const handleInputWebSearch = async (fieldKey: string, currentVal: string) => {
    console.log("🚀 Lupa clicada! Buscando por:", currentVal);
    if (!currentVal || !currentVal.trim()) return;

    setSearchingKey(fieldKey);
    console.group(`[🔍 Lupa de Pesquisa] Campo: "${fieldKey}", Valor: "${currentVal}"`);

    try {
      const missingKeys = fields
        .map((f) => f.key)
        .filter((k) => !formData[k] || !formData[k].trim());

      let query = '';
      if (fieldKey === 'titulo') {
        query = `Livro Publicação "${currentVal}" ${artistName || ''} artes visuais ficha técnica autor editora ano local`;
      } else if (fieldKey === 'autor') {
        query = `Autor "${currentVal}" ${formData.titulo || ''} ${artistName || ''} artes visuais livro ensaio crítica ficha técnica`;
      } else {
        query = `"${currentVal}" ${artistName || ''} artes visuais ${missingKeys.join(' ')} ficha técnica`;
      }

      console.log('[Lupa] Query enviada para Jina:', query);
      const searchText = await searchWithJina(query);

      if (!searchText || !searchText.trim()) {
        console.warn('[Lupa] Nenhum conteúdo retornado do Jina.');
        setSearchingKey(null);
        console.groupEnd();
        return;
      }

      const miniPrompt = `Você é um pesquisador especialista de arte. Encontre e extraia a ficha técnica para "${currentVal}"${artistName ? ` do artista "${artistName}"` : ''}.
Os seguintes campos estão disponíveis no formulário: ${fields.map((f) => f.key).join(', ')}.

Retorne APENAS um JSON válido no formato:
{ ${fields.map((f) => `"${f.key}": "valor encontrado ou vazio"`).join(', ')} }

TEXTO DA PESQUISA WEB:
${searchText.substring(0, 4000)}`;

      const res = await callAI(miniPrompt, 'Extraia a ficha técnica em JSON puro, sem markdown.');
      console.log('[Lupa] Resposta do Groq:', res);

      const match = res.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          const parsed = JSON.parse(match[0]);
          const suggestionData: Record<string, string> = {};

          fields.forEach((f) => {
            const val = parsed[f.key];
            if (
              val &&
              typeof val === 'string' &&
              val.trim() &&
              val.toLowerCase() !== 'vazio' &&
              val.toLowerCase() !== 'não encontrado'
            ) {
              suggestionData[f.key] = val.trim();
            }
          });

          if (Object.keys(suggestionData).length > 0) {
            setFieldSuggestions((prev) => ({ ...prev, [fieldKey]: suggestionData }));
            console.log(`[Lupa] ✨ Sugestão gerada para o campo "${fieldKey}":`, suggestionData);
          }
        } catch (parseErr) {
          console.error('[Lupa] Erro ao parsear JSON:', parseErr);
        }
      }
    } catch (err) {
      console.error('[Lupa Error]', err);
    } finally {
      setSearchingKey(null);
      console.groupEnd();
    }
  };

  const handleApplySuggestion = (fieldKey: string) => {
    const sug = fieldSuggestions[fieldKey];
    if (!sug) return;

    setFormData((prev) => {
      const next = { ...prev };
      Object.entries(sug).forEach(([k, v]) => {
        if (v && v.trim()) next[k] = v.trim();
      });
      return next;
    });

    setFieldSuggestions((prev) => {
      const next = { ...prev };
      delete next[fieldKey];
      return next;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const id = initialData?.id || `item_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const savedItem: ListItem = {
      id,
      ...initialData,
      ...formData,
    };
    onSave(savedItem);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div
        className="relative w-full max-w-2xl max-h-[90vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-[#d1ccc4]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e8e4de] bg-[#fafaf8]">
          <h3 className="font-serif text-xl font-bold text-[#0f3421]">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-[#6B6762] hover:text-[#0f3421] hover:bg-[#e8f0eb] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {fields.map((f) => {
              const val = formData[f.key] || '';
              const spanClass = f.className || (f.type === 'textarea' || f.type === 'upload' ? 'md:col-span-2' : '');
              const isSearchingThis = searchingKey === f.key;
              const hasSearchableInput = (f.type === 'text' || f.type === 'autocomplete') && (f.key === 'titulo' || f.key === 'autor' || f.key === 'local');
              const suggestionForField = fieldSuggestions[f.key];

              return (
                <div key={f.key} className={spanClass}>
                  <label className="block text-xs font-semibold text-[#0f3421] uppercase tracking-wider mb-1.5 flex items-center justify-between">
                    <span>
                      {f.label} {f.required && <span className="text-red-500">*</span>}
                    </span>
                  </label>

                  {/* Container para Input + Lupa */}
                  <div className="relative flex items-center">
                    {/* Campo Autocomplete ou Dropdown */}
                    {(f.type === 'autocomplete' || f.type === 'dropdown') && (
                      <Combobox
                        value={val}
                        onChange={(v) => handleChange(f.key, v)}
                        options={f.options || []}
                        placeholder={f.placeholder || 'Selecione ou digite...'}
                        allowCustom={f.type === 'autocomplete'}
                        className="!rounded-xl w-full"
                      />
                    )}

                    {/* Campo de Texto Simples */}
                    {f.type === 'text' && (
                      <input
                        type="text"
                        value={val}
                        onChange={(e) => handleChange(f.key, e.target.value)}
                        placeholder={f.placeholder}
                        required={f.required}
                        className={`w-full bg-[#F2F2F7] focus:bg-white border border-transparent focus:border-[#0f3421] rounded-xl px-4 py-2.5 text-sm text-[#1A1816] outline-none transition-all ${
                          hasSearchableInput ? 'pr-10' : ''
                        }`}
                      />
                    )}

                    {/* Botão da Lupa no Input */}
                    {hasSearchableInput && (
                      <button
                        type="button"
                        disabled={isSearchingThis || !val.trim()}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          console.log("🚀 Lupa clicada! Buscando por:", val);
                          handleInputWebSearch(f.key, val);
                        }}
                        className={`absolute right-2.5 z-20 p-1.5 rounded-lg text-[#0284c7] hover:bg-[#e0f2fe] transition-colors disabled:opacity-30 cursor-pointer flex items-center gap-1 ${
                          isSearchingThis ? 'bg-[#e0f2fe] text-[#0284c7] font-bold text-xs px-2' : ''
                        }`}
                        title="Pesquisar detalhes na web para este campo"
                      >
                        {isSearchingThis ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin text-[#0284c7]" />
                            <span className="text-[10px] hidden sm:inline">Buscando na web...</span>
                          </>
                        ) : (
                          <Search className="w-4 h-4" />
                        )}
                      </button>
                    )}

                    {/* Campo de Número */}
                    {f.type === 'number' && (
                      <input
                        type="number"
                        value={val}
                        onChange={(e) => handleChange(f.key, e.target.value)}
                        placeholder={f.placeholder}
                        required={f.required}
                        className="w-full bg-[#F2F2F7] focus:bg-white border border-transparent focus:border-[#0f3421] rounded-xl px-4 py-2.5 text-sm text-[#1A1816] outline-none transition-all"
                      />
                    )}

                    {/* Campo Área de Texto */}
                    {f.type === 'textarea' && (
                      <textarea
                        rows={3}
                        value={val}
                        onChange={(e) => handleChange(f.key, e.target.value)}
                        placeholder={f.placeholder}
                        className="w-full bg-[#F2F2F7] focus:bg-white border border-transparent focus:border-[#0f3421] rounded-xl px-4 py-2.5 text-sm text-[#1A1816] outline-none transition-all resize-none"
                      />
                    )}

                    {/* Campo Upload de Arquivo / Documentação */}
                    {f.type === 'upload' && (
                      <div className="space-y-2 w-full">
                        <div className="flex items-center gap-3">
                          <label className="flex-1 flex items-center justify-center gap-2 p-3 bg-[#F2F2F7] hover:bg-[#e8f0eb] border border-dashed border-[#b0ada8] rounded-xl cursor-pointer transition-colors text-xs text-[#0f3421] font-medium">
                            <Upload className="w-4 h-4 text-[#0f3421]" />
                            <span>{val ? 'Trocar arquivo/documento' : 'Enviar documento ou comprovante'}</span>
                            <input
                              type="file"
                              accept="image/*,.pdf,.doc,.docx"
                              onChange={(e) => handleFileUpload(f.key, e)}
                              className="hidden"
                            />
                          </label>

                          {val && (
                            <div className="flex items-center gap-1.5 text-xs text-[#0284c7] font-medium bg-[#e0f2fe] px-3 py-2 rounded-xl">
                              <FileText className="w-4 h-4" />
                              <span className="truncate max-w-[120px]">{formData[`${f.key}_name`] || 'Anexado'}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  handleChange(f.key, '');
                                  handleChange(`${f.key}_name`, '');
                                }}
                                className="ml-1 text-red-500 hover:text-red-700"
                              >
                                ×
                              </button>
                            </div>
                          )}
                        </div>

                        <input
                          type="url"
                          value={val.startsWith('data:') ? '' : val}
                          onChange={(e) => handleChange(f.key, e.target.value)}
                          placeholder="ou cole o link do documento / catálogo (https://...)"
                          className="w-full bg-[#F2F2F7] focus:bg-white border border-transparent focus:border-[#0f3421] rounded-xl px-3 py-2 text-xs text-[#1A1816] outline-none transition-all"
                        />
                      </div>
                    )}
                  </div>

                  {/* POPUP DE RESULTADOS (Sugestões encontradas via Lupa) */}
                  {suggestionForField && (
                    <div className="mt-2 p-3 rounded-xl bg-[#f0f9ff] border-2 border-[#0284c7] shadow-md space-y-2 text-xs text-[#0369a1] animate-fadeIn">
                      <div className="flex items-center gap-1.5 font-bold text-[#0284c7]">
                        <Sparkles className="w-4 h-4" />
                        <span>✨ Encontramos detalhes na web para este item:</span>
                      </div>
                      <div className="space-y-1 bg-white p-2 rounded-lg border border-[#bae6fd]">
                        {Object.entries(suggestionForField).map(([k, v]) => (
                          <div key={k} className="flex items-center gap-2">
                            <span className="font-semibold text-[#0369a1] capitalize">{k}:</span>
                            <span className="font-bold text-[#0f3421]">{v}</span>
                          </div>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleApplySuggestion(f.key)}
                        className="w-full py-1.5 rounded-lg bg-[#0284c7] hover:bg-[#0369a1] text-white font-bold text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Preencher formulário automaticamente
                      </button>
                    </div>
                  )}

                  {f.helperText && (
                    <p className="mt-1 text-[11px] text-[#6B6762] italic">{f.helperText}</p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#e8e4de] mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-[#d1ccc4] text-[#6B6762] hover:bg-[#F2F2F7] font-medium text-xs uppercase tracking-wider transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-[#0f3421] hover:bg-[#1a4a31] text-white font-bold text-xs uppercase tracking-wider transition-colors flex items-center gap-2 shadow-sm cursor-pointer"
            >
              <Check className="w-4 h-4" />
              Salvar Entrada
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
