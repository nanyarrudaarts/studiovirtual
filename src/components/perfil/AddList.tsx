import { Plus, X } from 'lucide-react';

export interface ListItem {
  id: string;
  [key: string]: string;
}

const uid = () => Math.random().toString(36).slice(2);

interface FieldDef {
  key: string;
  label: string;
  type?: string;
  options?: string[];
  className?: string;
}

interface Props {
  title: string;
  fields: FieldDef[];
  items: ListItem[];
  onChange: (items: ListItem[]) => void;
  t: (k: string, fallback?: any) => string;
  disabled?: boolean;
}

export function AddList({ title, fields, items, onChange, t, disabled }: Props) {
  const add = () => {
    if (disabled) return;
    const empty: ListItem = { id: uid() };
    fields.forEach((f) => { empty[f.key] = ''; });
    onChange([...items, empty]);
  };

  const remove = (id: string) => {
    if (disabled) return;
    onChange(items.filter((i) => i.id !== id));
  };

  const update = (id: string, key: string, value: string) => {
    if (disabled) return;
    onChange(items.map((i) => (i.id === id ? { ...i, [key]: value } : i)));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-bold text-sm text-text-muted">{title}</h4>
        {!disabled && (
          <button onClick={add} className="flex items-center gap-1 text-gold text-xs font-bold hover:text-gold-light transition-colors">
            <Plus size={14} /> {t('perfil.adicionar', 'Adicionar')}
          </button>
        )}
      </div>
      {items.map((item) => (
        <div key={item.id} className="bg-surface/30 border border-border rounded-xl p-4 relative">
          {!disabled && (
            <button
              onClick={() => remove(item.id)}
              aria-label="Remover item"
              className="absolute right-3 top-3 text-gray-400 hover:text-red-500 transition-colors"
            >
              <X size={16} />
            </button>
          )}
          <div className="grid grid-cols-2 gap-3 pr-6">
            {fields.map((f) => (
              <div key={f.key} className={f.className || (f.key === fields[0].key ? 'col-span-2' : '')}>
                <label htmlFor={`${item.id}-${f.key}`} className="block text-xs text-text-muted mb-1">{f.label}</label>
                {f.options ? (
                  <select
                    id={`${item.id}-${f.key}`}
                    aria-label={f.label}
                    value={item[f.key] || ''}
                    disabled={disabled}
                    onChange={(e) => update(item.id, f.key, e.target.value)}
                    className="w-full border border-border rounded-lg px-3 py-1.5 text-sm focus:border-gold focus:ring-1 focus:ring-gold/30 outline-none bg-bg font-medium text-text-main cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed transition-all"
                  >
                    <option value="">{t('perfil.selecione', 'Selecione...')}</option>
                    {f.options.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    id={`${item.id}-${f.key}`}
                    aria-label={f.label}
                    type={f.type || 'text'}
                    value={item[f.key] || ''}
                    disabled={disabled}
                    onChange={(e) => update(item.id, f.key, e.target.value)}
                    className="w-full border border-border rounded-lg px-3 py-1.5 text-sm focus:border-gold focus:ring-1 focus:ring-gold/30 outline-none bg-bg text-text-main disabled:opacity-75 disabled:cursor-not-allowed transition-all"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
