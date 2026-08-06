import React, { useState } from 'react';
import {
  UserPlus,
  Mail,
  Phone,
  User,
  Building2,
  Globe,
  AtSign,
  CheckCircle2,
  Loader2,
  X,
  ChevronRight,
  Sparkles,
  Clock,
  Users,
} from 'lucide-react';
import { supabase } from '../services/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

interface FormData {
  nome: string;
  email: string;
  telefone: string;
  nomeArtistico: string;
  cidade: string;
  pais: string;
  instagram: string;
  site: string;
  areaAtuacao: string;
  mensagem: string;
}

const AREAS = [
  'Artes Visuais',
  'Fotografia',
  'Escultura',
  'Instalação',
  'Arte Digital',
  'Gravura',
  'Desenho',
  'Performance',
  'Arte Multimídia',
  'Outra',
];

const INITIAL_FORM: FormData = {
  nome: '',
  email: '',
  telefone: '',
  nomeArtistico: '',
  cidade: '',
  pais: 'Brasil',
  instagram: '',
  site: '',
  areaAtuacao: '',
  mensagem: '',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)] mb-2">
      {children}
      {required && <span className="text-[var(--accent)] ml-1">*</span>}
    </label>
  );
}

function InputField({
  id,
  icon: Icon,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  id: string;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
}) {
  return (
    <div className="relative">
      {Icon && (
        <Icon
          size={15}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-faint)] pointer-events-none"
        />
      )}
      <input
        id={id}
        className={`w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl py-3 text-sm text-[var(--text-main)] placeholder:text-[var(--text-faint)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/10 outline-none transition-all ${
          Icon ? 'pl-10 pr-4' : 'px-4'
        }`}
        {...props}
      />
    </div>
  );
}

function TextareaField({ id, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { id: string }) {
  return (
    <textarea
      id={id}
      rows={3}
      className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl px-4 py-3 text-sm text-[var(--text-main)] placeholder:text-[var(--text-faint)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/10 outline-none transition-all resize-none"
      {...props}
    />
  );
}

// ─── Success State ─────────────────────────────────────────────────────────────

function SuccessCard({ nome, onNew }: { nome: string; onNew: () => void }) {
  return (
    <div className="flex flex-col items-center text-center gap-6 py-10">
      <div className="w-20 h-20 rounded-full bg-[var(--surface-raised)] flex items-center justify-center">
        <CheckCircle2 size={40} className="text-emerald-500" />
      </div>
      <div>
        <h2 className="font-serif text-2xl text-[var(--text-main)] mb-2">
          Cadastro realizado!
        </h2>
        <p className="text-sm text-[var(--text-muted)] max-w-sm leading-relaxed">
          <strong className="text-[var(--text-main)]">{nome}</strong> foi adicionado(a) à lista de espera.
          Você poderá enviar o convite de acesso quando quiser.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
        <button
          onClick={onNew}
          className="flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-[var(--accent)] text-[var(--surface)] rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          <UserPlus size={16} />
          Cadastrar outro
        </button>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CadastroUsuario() {
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const update = (field: keyof FormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }));
    setError('');
  };

  const validateStep1 = () => {
    if (!form.nome.trim()) return 'O nome completo é obrigatório.';
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      return 'Informe um e-mail válido.';
    return '';
  };

  const handleNext = () => {
    const err = validateStep1();
    if (err) { setError(err); return; }
    setStep(2);
  };

  const handleBack = () => {
    setStep(1);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const payload = {
        nome: form.nome.trim(),
        email: form.email.trim().toLowerCase(),
        telefone: form.telefone.trim() || null,
        nome_artistico: form.nomeArtistico.trim() || null,
        cidade: form.cidade.trim() || null,
        pais: form.pais.trim() || 'Brasil',
        instagram: form.instagram.trim() || null,
        site: form.site.trim() || null,
        area_atuacao: form.areaAtuacao || null,
        mensagem: form.mensagem.trim() || null,
        status: 'pendente',
      };

      const { error: dbError } = await supabase
        .from('usuarios_futuros')
        .insert(payload);

      if (dbError) {
        if (dbError.code === '23505') {
          throw new Error('Este e-mail já está cadastrado na lista de espera.');
        }
        throw dbError;
      }

      setSuccess(true);
    } catch (err: unknown) {
      console.error(err);
      setError((err as Error)?.message || 'Ocorreu um erro. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleNew = () => {
    setForm(INITIAL_FORM);
    setStep(1);
    setError('');
    setSuccess(false);
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] flex items-start justify-center px-4 py-12">
      <div className="w-full max-w-xl">

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-2xl bg-[var(--accent)] flex items-center justify-center">
              <Sparkles size={18} className="text-[var(--surface)]" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-[var(--text-faint)]">
                studio virtual
              </p>
              <h1 className="font-serif text-xl text-[var(--text-main)] leading-tight">
                Lista de Espera
              </h1>
            </div>
          </div>
          <p className="text-sm text-[var(--text-muted)] leading-relaxed">
            Cadastre artistas que desejam acessar o Studio Virtual. Eles receberão um convite quando houver vaga disponível.
          </p>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          {[
            { icon: Users, label: 'Na fila', value: '—' },
            { icon: Clock, label: 'Tempo médio', value: '~2 sem.' },
            { icon: CheckCircle2, label: 'Aprovados', value: '—' },
          ].map(({ icon: Icon, label, value }) => (
            <div
              key={label}
              className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4 text-center"
            >
              <Icon size={16} className="text-[var(--text-faint)] mx-auto mb-2" />
              <p className="text-base font-bold text-[var(--text-main)]">{value}</p>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-3xl shadow-[var(--shadow-soft)] overflow-hidden">

          {/* Progress bar */}
          {!success && (
            <div className="h-1 bg-[var(--border)]">
              <div
                className="h-full bg-[var(--accent)] transition-all duration-500 ease-out"
                style={{ width: step === 1 ? '50%' : '100%' }}
              />
            </div>
          )}

          <div className="p-8">
            {success ? (
              <SuccessCard nome={form.nome} onNew={handleNew} />
            ) : (
              <>
                {/* Step indicator */}
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-2">
                    {[1, 2].map((s) => (
                      <React.Fragment key={s}>
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                            s <= step
                              ? 'bg-[var(--accent)] text-[var(--surface)]'
                              : 'bg-[var(--surface-raised)] text-[var(--text-faint)]'
                          }`}
                        >
                          {s < step ? <CheckCircle2 size={14} /> : s}
                        </div>
                        {s < 2 && (
                          <div
                            className={`w-8 h-px transition-all ${
                              s < step ? 'bg-[var(--accent)]' : 'bg-[var(--border)]'
                            }`}
                          />
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                  <span className="text-xs text-[var(--text-faint)] font-medium">
                    Etapa {step} de 2
                  </span>
                </div>

                {/* Error */}
                {error && (
                  <div className="flex items-start gap-3 bg-rose-50 border border-rose-100 text-rose-600 text-sm rounded-xl p-3.5 mb-6">
                    <X size={15} className="mt-0.5 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit}>
                  {/* STEP 1 */}
                  {step === 1 && (
                    <div className="space-y-5">
                      <div>
                        <h2 className="font-serif text-xl text-[var(--text-main)] mb-1">
                          Dados essenciais
                        </h2>
                        <p className="text-xs text-[var(--text-muted)]">
                          Nome e e-mail são obrigatórios para o convite de acesso.
                        </p>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <FieldLabel required>Nome Completo</FieldLabel>
                          <InputField
                            id="nome"
                            icon={User}
                            type="text"
                            value={form.nome}
                            onChange={update('nome')}
                            placeholder="Nome completo do artista"
                            autoComplete="name"
                          />
                        </div>

                        <div>
                          <FieldLabel required>E-mail</FieldLabel>
                          <InputField
                            id="email"
                            icon={Mail}
                            type="email"
                            value={form.email}
                            onChange={update('email')}
                            placeholder="contato@artista.com"
                            autoComplete="email"
                          />
                        </div>

                        <div>
                          <FieldLabel>Telefone / WhatsApp</FieldLabel>
                          <InputField
                            id="telefone"
                            icon={Phone}
                            type="tel"
                            value={form.telefone}
                            onChange={update('telefone')}
                            placeholder="+55 (11) 99999-9999"
                            autoComplete="tel"
                          />
                        </div>

                        <div>
                          <FieldLabel>Nome Artístico</FieldLabel>
                          <InputField
                            id="nomeArtistico"
                            icon={Sparkles}
                            type="text"
                            value={form.nomeArtistico}
                            onChange={update('nomeArtistico')}
                            placeholder="Como assina as obras (se diferente)"
                          />
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleNext}
                        className="w-full flex items-center justify-center gap-2 px-5 py-3.5 bg-[var(--accent)] text-[var(--surface)] rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity mt-2"
                      >
                        Continuar
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  )}

                  {/* STEP 2 */}
                  {step === 2 && (
                    <div className="space-y-5">
                      <div>
                        <h2 className="font-serif text-xl text-[var(--text-main)] mb-1">
                          Perfil artístico
                        </h2>
                        <p className="text-xs text-[var(--text-muted)]">
                          Informações para personalizar a experiência.
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <FieldLabel>Cidade</FieldLabel>
                          <InputField
                            id="cidade"
                            icon={Building2}
                            type="text"
                            value={form.cidade}
                            onChange={update('cidade')}
                            placeholder="São Paulo"
                          />
                        </div>

                        <div>
                          <FieldLabel>País</FieldLabel>
                          <InputField
                            id="pais"
                            icon={Globe}
                            type="text"
                            value={form.pais}
                            onChange={update('pais')}
                            placeholder="Brasil"
                          />
                        </div>
                      </div>

                      <div>
                        <FieldLabel>Área de Atuação</FieldLabel>
                        <select
                          id="areaAtuacao"
                          value={form.areaAtuacao}
                          onChange={update('areaAtuacao')}
                          className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl px-4 py-3 text-sm text-[var(--text-main)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/10 outline-none transition-all appearance-none"
                        >
                          <option value="">Selecione...</option>
                          {AREAS.map(a => (
                            <option key={a} value={a}>{a}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <FieldLabel>Instagram</FieldLabel>
                        <InputField
                          id="instagram"
                          icon={AtSign}
                          type="text"
                          value={form.instagram}
                          onChange={update('instagram')}
                          placeholder="@artista"
                        />
                      </div>

                      <div>
                        <FieldLabel>Site / Portfolio</FieldLabel>
                        <InputField
                          id="site"
                          icon={Globe}
                          type="url"
                          value={form.site}
                          onChange={update('site')}
                          placeholder="https://artista.com"
                        />
                      </div>

                      <div>
                        <FieldLabel>Observações</FieldLabel>
                        <TextareaField
                          id="mensagem"
                          value={form.mensagem}
                          onChange={update('mensagem')}
                          placeholder="Notas internas, contexto do cadastro, indicação..."
                        />
                      </div>

                      <div className="flex gap-3 pt-1">
                        <button
                          type="button"
                          onClick={handleBack}
                          className="flex-none px-5 py-3.5 bg-[var(--surface-raised)] text-[var(--text-main)] rounded-xl font-semibold text-sm hover:opacity-80 transition-opacity"
                        >
                          Voltar
                        </button>
                        <button
                          type="submit"
                          disabled={loading}
                          className="flex-1 flex items-center justify-center gap-2 px-5 py-3.5 bg-[var(--accent)] text-[var(--surface)] rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-60"
                        >
                          {loading ? (
                            <Loader2 size={18} className="animate-spin" />
                          ) : (
                            <>
                              <UserPlus size={16} />
                              Adicionar à lista
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </form>
              </>
            )}
          </div>
        </div>

        {/* Footer note */}
        {!success && (
          <p className="text-center text-xs text-[var(--text-faint)] mt-6 leading-relaxed">
            Os dados ficam armazenados de forma segura no Supabase.
            O artista só recebe acesso após convite explícito.
          </p>
        )}
      </div>
    </div>
  );
}
