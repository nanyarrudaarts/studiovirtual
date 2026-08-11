import { useState } from 'react';
import { Check } from 'lucide-react';

type ImportedData = Record<string, unknown>;

interface Props {
  current: Record<string, unknown>;
  imported: ImportedData;
  onApply: (selected: ImportedData) => void;
  t: (k: string) => string;
}

export function DiffPreview({ current, imported, onApply, t }: Props) {
  const [prevImported, setPrevImported] = useState<ImportedData | null>(null);
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  const keys = Object.keys(imported).filter(
    (k) => imported[k] !== undefined && imported[k] !== null && imported[k] !== ''
  );

  if (imported !== prevImported) {
    setPrevImported(imported);
    const initial: Record<string, boolean> = {};
    keys.forEach((k) => { initial[k] = true; });
    setChecked(initial);
  }

  const toggle = (k: string) => setChecked((c) => ({ ...c, [k]: !c[k] }));

  const apply = () => {
    const selected: ImportedData = {};
    keys.filter((k) => checked[k]).forEach((k) => { selected[k] = imported[k]; });
    onApply(selected);
  };

  const fmt = (v: unknown) => {
    if (Array.isArray(v)) return `[${v.length} itens]`;
    return String(v || '—');
  };

  return (
    <div className="border border-border rounded-xl overflow-hidden bg-surface-raised">
      <div className="grid grid-cols-2 text-xs font-bold bg-surface px-4 py-2.5 border-b border-border text-text-muted">
        <span>{t('perfil.dados_atuais')}</span>
        <span className="text-emerald-500">{t('perfil.dados_importados')}</span>
      </div>
      <div className="divide-y divide-border max-h-72 overflow-y-auto bg-bg">
        {keys.map((k) => {
          const isNew = !current[k] || current[k] === '';
          const isConflict = current[k] && current[k] !== imported[k];
          return (
            <label
              key={k}
              className="grid grid-cols-[auto_1fr_1fr] items-center gap-4 px-4 py-2.5 cursor-pointer hover:bg-surface-raised transition-colors"
            >
              <input
                type="checkbox"
                aria-label={`Selecionar ${k}`}
                checked={!!checked[k]}
                onChange={() => toggle(k)}
                className="accent-gold w-4 h-4 cursor-pointer"
              />
              <span className="text-xs text-text-muted truncate">{fmt(current[k])}</span>
              <span
                className={`text-xs font-medium truncate ${
                  isNew ? 'text-emerald-500' : isConflict ? 'text-amber-500' : 'text-text-main'
                }`}
              >
                {fmt(imported[k])}
              </span>
            </label>
          );
        })}
      </div>
      <div className="px-4 py-3 bg-surface border-t border-border flex justify-between items-center">
        <span className="text-xs text-text-muted">
          {keys.filter((k) => checked[k]).length} de {keys.length} {t('campos_selecionados')}
        </span>
        <button
          onClick={apply}
          className="flex items-center gap-2 px-5 py-2 bg-gold text-bg text-sm font-bold rounded-lg hover:bg-gold-light hover-lift transition-all shadow-gold-glow-sm"
        >
          <Check size={14} /> {t('perfil.aplicar_selecionados')}
        </button>
      </div>
    </div>
  );
}
