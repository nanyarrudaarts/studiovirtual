import React, { useState } from 'react';

const DT = {
  text: '#1D1D1F',
  textMuted: '#86868B',
  fontSans: 'system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", sans-serif',
};

interface WizardData {
  bioshort: string;
  biolong: string;
  statement: string;
  tags: string;
  instagrams: string[];
  processo_criativo: string;
  tecnicas_recorrentes: string;
  temas_centrais: string;
  pesquisa_artistica: string;
  referencias_conceituais: string;
  ano_inicio_carreira: string;
  [key: string]: any;
}

interface Props {
  data: WizardData;
  onChange: (d: Partial<WizardData>) => void;
  T: Record<string, string>;
}

function SectionDivider({ label }: { label: string }) {
  return (
    <div className="pt-2 pb-1 border-b border-[#E5E5EA]">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-[#86868B]">
        {label}
      </span>
    </div>
  );
}

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-xs font-semibold text-[#1D1D1F] mb-1.5">
      {children} {required && <span className="text-red-500">*</span>}
    </label>
  );
}

function Textarea({ ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className="w-full bg-[#F2F2F7] border border-transparent focus:border-[#C5A059] focus:bg-white text-[#1D1D1F] text-sm rounded-xl p-4 outline-none transition-all placeholder-[#A1A1A6] resize-none"
    />
  );
}

function Input({ ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full bg-[#F2F2F7] border border-transparent focus:border-[#C5A059] focus:bg-white text-[#1D1D1F] text-sm rounded-xl px-4 py-3 outline-none transition-all placeholder-[#A1A1A6]"
    />
  );
}

function WordCount({ text, T }: { text: string; T: Record<string, string> }) {
  const count = (text || '').trim().split(/\s+/).filter(Boolean).length;
  return (
    <div className="text-[11px] text-[#86868B] text-right mt-1">
      {count} {T.palavras ?? 'palavras'}
    </div>
  );
}

function TagInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [input, setInput] = useState('');
  const tags = value ? value.split(',').map((t) => t.trim()).filter(Boolean) : [];

  const add = (raw: string) => {
    const t = raw.trim();
    if (t && !tags.includes(t)) onChange([...tags, t].join(', '));
  };
  const remove = (idx: number) => onChange(tags.filter((_, i) => i !== idx).join(', '));
  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      add(input);
      setInput('');
    }
  };

  return (
    <div className="flex flex-wrap gap-2 p-2 border border-[#d1ccc4] rounded-xl min-h-[46px] transition-colors bg-[#F2F2F7]">
      {tags.map((tag, i) => (
        <span key={i} className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-[#e8f3ee] text-[#0f3421]">
          {tag}
          <button type="button" onClick={() => remove(i)} className="leading-none text-[#0f3421]">×</button>
        </span>
      ))}
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKey}
        onBlur={() => { if (input.trim()) { add(input); setInput(''); } }}
        placeholder={tags.length === 0 ? placeholder : ''}
        className="flex-1 min-w-[120px] bg-transparent border-none outline-none text-sm text-[#1A1816]"
      />
    </div>
  );
}

function InstagramList({ values, onChange, T }: { values: string[]; onChange: (v: string[]) => void; T: Record<string, string> }) {
  return (
    <div className="space-y-2">
      {values.map((v, i) => (
        <div key={i} className="flex gap-2 items-center">
          <Input
            value={v}
            onChange={(e) => { const n = [...values]; n[i] = e.target.value; onChange(n); }}
            placeholder="@usuario"
          />
          <button type="button" onClick={() => onChange(values.filter((_, j) => j !== i))}
            className="text-sm flex-shrink-0 text-[#b0ada8]">×</button>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...values, ''])}
        className="text-xs uppercase tracking-widest text-[#0f3421] font-bold">
        {T.btn_add_instagram ?? '+ Adicionar Instagram'}
      </button>
    </div>
  );
}

export function StepArtistico({ data, onChange, T }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h2 style={{ fontFamily: DT.fontSans, color: DT.text }}
          className="text-3xl md:text-4xl font-semibold tracking-tight leading-tight mb-1.5">
          {T.step2_title}
        </h2>
        <p className="text-[15px] font-normal leading-relaxed" style={{ color: DT.textMuted }}>
          {T.step2_desc}
        </p>
      </div>

      <SectionDivider label={T.sec_bios} />

      <div>
        <Label>{T.field_bioshort} <span className="text-[#b0ada8] normal-case tracking-normal">{T.field_bioshort_max}</span></Label>
        <Textarea
          value={data.bioshort}
          onChange={(e) => onChange({ bioshort: e.target.value })}
          placeholder={T.ph_bioshort}
          rows={3}
        />
        <WordCount text={data.bioshort} T={T} />
      </div>

      <div>
        <Label>{T.field_biolong}</Label>
        <Textarea
          value={data.biolong}
          onChange={(e) => onChange({ biolong: e.target.value })}
          placeholder={T.ph_biolong}
          rows={6}
        />
        <WordCount text={data.biolong} T={T} />
      </div>

      <SectionDivider label={T.sec_statement} />

      <div>
        <Label>{T.field_statement}</Label>
        <Textarea
          value={data.statement}
          onChange={(e) => onChange({ statement: e.target.value })}
          placeholder={T.ph_statement}
          rows={5}
        />
        <WordCount text={data.statement} T={T} />
      </div>

      <SectionDivider label="Redes Sociais & Tags" />

      <div>
        <Label>Instagram Profissional</Label>
        <InstagramList values={data.instagrams || []} onChange={(v) => onChange({ instagrams: v })} T={T} />
      </div>

      <div>
        <Label>Tags Curatoriais</Label>
        <TagInput value={data.tags} onChange={(v) => onChange({ tags: v })} placeholder="Pressione Enter para adicionar tags" />
      </div>
    </div>
  );
}
