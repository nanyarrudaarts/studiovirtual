import { useRef } from 'react';
import { Camera, Loader2, Plus, X } from 'lucide-react';
import { AutocompleteInput } from './AutocompleteInput';

const RESIDENCIA_SUGGESTIONS = [
  'São Paulo, SP', 'Rio de Janeiro, RJ', 'Belo Horizonte, MG', 'Curitiba, PR',
  'Porto Alegre, RS', 'Salvador, BA', 'Recife, PE', 'Brasília, DF', 'Lisboa', 'Paris', 'Nova York'
];

const NACIONALIDADE_SUGGESTIONS = [
  'Brasileira', 'Portuguesa', 'Francesa', 'Italiana', 'Espanhola', 'Norte-americana', 'Argentina'
];

export interface FormState {
  nome: string;
  nomeArtistico: string;
  nacionalidade: string;
  cidade: string;
  nascimento: string;
  email: string;
  website: string;
  bioShort: string;
  bioLong: string;
  tags: string;
  telefone: string;
  whatsapp: string;
  pronome: string;
  cidade_nascimento: string;
  pais_nascimento: string;
  pais_atual: string;
  mostrar_contato_publico: boolean;
  disponivel_exposicoes: boolean;
  disponivel_residencias: boolean;
  disponivel_comissoes: boolean;
  disponivel_colaboracoes: boolean;
  statement: string;
  processo_criativo: string;
  tecnicas_recorrentes: string;
  temas_centrais: string;
  pesquisa_artistica: string;
  referencias_conceituais: string;
  ano_inicio_carreira: string;
}

export interface SocialLink {
  id: string;
  label: string;
  url: string;
}

const uid = () => Math.random().toString(36).slice(2);

interface Props {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  isEditing: boolean;
  photoUrl: string | null;
  uploading: boolean;
  handlePhotoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  instagrams: string[];
  setInstagrams: React.Dispatch<React.SetStateAction<string[]>>;
  socialLinks: SocialLink[];
  setSocialLinks: React.Dispatch<React.SetStateAction<SocialLink[]>>;
  t: (k: string, fallback?: any) => string;
}

export function TabPessoal({
  form,
  setForm,
  isEditing,
  photoUrl,
  uploading,
  handlePhotoUpload,
  instagrams,
  setInstagrams,
  socialLinks,
  setSocialLinks,
  t
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);

  const set = (key: keyof FormState, value: string | boolean) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Identificação Profissional */}
      <section className="glass-slab rounded-2xl overflow-hidden">
        <div className="px-7 py-5 border-b border-border bg-surface-raised/35">
          <h2 className="text-lg font-serif text-gold font-bold">{t('perfil.identidade_pessoal', 'Identificação Profissional')}</h2>
        </div>
        <div className="p-7">
          <div className="flex flex-col md:flex-row gap-8">
            {/* Photo Upload Box */}
            <div className="flex flex-col items-center gap-4 md:w-1/3">
              <div className="relative w-[130px] h-[130px]">
                <div className="w-[130px] h-[130px] rounded-full overflow-hidden bg-surface border-2 border-gold/20 flex items-center justify-center relative">
                  {photoUrl ? (
                    <img src={photoUrl} alt="Foto" className="w-full h-full object-cover" />
                  ) : (
                    <Camera size={36} className="text-text-muted" />
                  )}
                  {isEditing && (
                    <button
                      onClick={() => fileRef.current?.click()}
                      aria-label="Alterar foto de perfil"
                      className="absolute inset-0 bg-black/60 text-white flex flex-col items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-pointer"
                    >
                      {uploading ? <Loader2 size={20} className="animate-spin" /> : <Camera size={20} />}
                      <span className="text-[10px] mt-1 font-bold">{t('perfil.alterar', 'Alterar')}</span>
                    </button>
                  )}
                </div>
                <input ref={fileRef} type="file" accept="image/*" aria-label="Selecionar foto de perfil" className="hidden" onChange={handlePhotoUpload} />
              </div>
              <p className="text-xs text-text-muted text-center max-w-[150px]">{t('perfil.clique_alterar_foto', 'Recomendado imagem quadrada de alta resolução.')}</p>
            </div>

            {/* Form Fields */}
            <div className="flex-1 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="perfil-nome-artistico" className="block text-xs font-bold text-text-muted mb-1">{t('perfil.nome_artistico', 'Nome Artístico / Profissional')}</label>
                  <input id="perfil-nome-artistico" aria-label={t('perfil.nome_artistico')} value={form.nomeArtistico} disabled={!isEditing} onChange={(e) => set('nomeArtistico', e.target.value)}
                    className="w-full border border-border rounded-lg px-4 py-2 text-sm focus:border-gold focus:ring-1 focus:ring-gold/30 outline-none bg-surface/50 text-text-main disabled:opacity-75 disabled:cursor-not-allowed transition-all" />
                </div>
                <div>
                  <label htmlFor="perfil-nome" className="block text-xs font-bold text-text-muted mb-1">{t('perfil.nome_completo', 'Nome Completo')}</label>
                  <input id="perfil-nome" aria-label={t('perfil.nome_completo')} value={form.nome} disabled={!isEditing} onChange={(e) => set('nome', e.target.value)}
                    className="w-full border border-border rounded-lg px-4 py-2 text-sm focus:border-gold focus:ring-1 focus:ring-gold/30 outline-none bg-surface/50 text-text-main disabled:opacity-75 disabled:cursor-not-allowed transition-all" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="col-span-2">
                  <label htmlFor="perfil-pronome" className="block text-xs font-bold text-text-muted mb-1">{t('perfil.pronome', 'Pronome (Opcional)')}</label>
                  <input id="perfil-pronome" placeholder="Ex: ela/dela, ele/dele" aria-label={t('perfil.pronome')} value={form.pronome} disabled={!isEditing} onChange={(e) => set('pronome', e.target.value)}
                    className="w-full border border-border rounded-lg px-4 py-2 text-sm focus:border-gold focus:ring-1 focus:ring-gold/30 outline-none bg-surface/50 text-text-main disabled:opacity-75 disabled:cursor-not-allowed transition-all placeholder-text-muted" />
                </div>
                <div className="col-span-2">
                  <label htmlFor="perfil-nascimento" className="block text-xs font-bold text-text-muted mb-1">{t('perfil.ano_nascimento', 'Ano de Nascimento')}</label>
                  <input id="perfil-nascimento" aria-label={t('perfil.ano_nascimento')} type="number" placeholder="Ex: 1990" value={form.nascimento} disabled={!isEditing} onChange={(e) => set('nascimento', e.target.value)}
                    className="w-full border border-border rounded-lg px-4 py-2 text-sm focus:border-gold focus:ring-1 focus:ring-gold/30 outline-none bg-surface/50 text-text-main disabled:opacity-75 disabled:cursor-not-allowed transition-all placeholder-text-muted" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="perfil-cidade-nascimento" className="block text-xs font-bold text-text-muted mb-1">{t('perfil.cidade_nascimento', 'Cidade de Nascimento')}</label>
                  <input id="perfil-cidade-nascimento" aria-label={t('perfil.cidade_nascimento')} placeholder="Cidade" value={form.cidade_nascimento} disabled={!isEditing} onChange={(e) => set('cidade_nascimento', e.target.value)}
                    className="w-full border border-border rounded-lg px-4 py-2 text-sm focus:border-gold focus:ring-1 focus:ring-gold/30 outline-none bg-surface/50 text-text-main disabled:opacity-75 disabled:cursor-not-allowed transition-all placeholder-text-muted" />
                </div>
                <div>
                  <label htmlFor="perfil-pais-nascimento" className="block text-xs font-bold text-text-muted mb-1">{t('perfil.pais_nascimento', 'País de Nascimento')}</label>
                  <input id="perfil-pais-nascimento" aria-label={t('perfil.pais_nascimento')} placeholder="País" value={form.pais_nascimento} disabled={!isEditing} onChange={(e) => set('pais_nascimento', e.target.value)}
                    className="w-full border border-border rounded-lg px-4 py-2 text-sm focus:border-gold focus:ring-1 focus:ring-gold/30 outline-none bg-surface/50 text-text-main disabled:opacity-75 disabled:cursor-not-allowed transition-all placeholder-text-muted" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="col-span-2">
                  <AutocompleteInput
                    id="perfil-cidade"
                    label={t('perfil.cidade_atual', 'Cidade Atual / Residência')}
                    value={form.cidade}
                    disabled={!isEditing}
                    onChange={(val) => set('cidade', val)}
                    placeholder="Ex: Rio de Janeiro, RJ"
                    suggestions={RESIDENCIA_SUGGESTIONS}
                  />
                </div>
                <div>
                  <label htmlFor="perfil-pais-atual" className="block text-xs font-bold text-text-muted mb-1">{t('perfil.pais_atual', 'País Atual')}</label>
                  <input id="perfil-pais-atual" aria-label={t('perfil.pais_atual')} placeholder="Ex: Brasil" value={form.pais_atual} disabled={!isEditing} onChange={(e) => set('pais_atual', e.target.value)}
                    className="w-full border border-border rounded-lg px-4 py-2 text-sm focus:border-gold focus:ring-1 focus:ring-gold/30 outline-none bg-surface/50 text-text-main disabled:opacity-75 disabled:cursor-not-allowed transition-all placeholder-text-muted" />
                </div>
              </div>

              <div>
                <AutocompleteInput
                  id="perfil-nacionalidade"
                  label={t('perfil.nacionalidade', 'Nacionalidade')}
                  value={form.nacionalidade}
                  disabled={!isEditing}
                  onChange={(val) => set('nacionalidade', val)}
                  placeholder="Ex: Brasileira"
                  suggestions={NACIONALIDADE_SUGGESTIONS}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contato Profissional & Presença Digital */}
      <section className="glass-slab rounded-2xl overflow-hidden">
        <div className="px-7 py-5 border-b border-border bg-surface-raised/35">
          <h2 className="text-lg font-serif text-gold font-bold">{t('perfil.contato_presenca', 'Contato Profissional & Presença Digital')}</h2>
        </div>
        <div className="p-7 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label htmlFor="perfil-email" className="block text-xs font-bold text-text-muted mb-1">{t('perfil.email', 'E-mail Profissional')}</label>
              <input id="perfil-email" aria-label={t('perfil.email')} type="email" placeholder="email@exemplo.com" value={form.email} disabled={!isEditing} onChange={(e) => set('email', e.target.value)}
                className="w-full border border-border rounded-lg px-4 py-2 text-sm focus:border-gold focus:ring-1 focus:ring-gold/30 outline-none bg-surface/50 text-text-main disabled:opacity-75 disabled:cursor-not-allowed transition-all placeholder-text-muted" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="perfil-telefone" className="block text-xs font-bold text-text-muted mb-1">{t('perfil.telefone', 'Telefone Internacional')}</label>
                <input id="perfil-telefone" aria-label={t('perfil.telefone')} placeholder="+55 21 99999-9999" value={form.telefone} disabled={!isEditing} onChange={(e) => set('telefone', e.target.value)}
                  className="w-full border border-border rounded-lg px-4 py-2 text-sm focus:border-gold focus:ring-1 focus:ring-gold/30 outline-none bg-surface/50 text-text-main disabled:opacity-75 disabled:cursor-not-allowed transition-all placeholder-text-muted" />
              </div>
              <div>
                <label htmlFor="perfil-whatsapp" className="block text-xs font-bold text-text-muted mb-1">{t('perfil.whatsapp', 'WhatsApp')}</label>
                <input id="perfil-whatsapp" aria-label={t('perfil.whatsapp')} placeholder="+55 21 99999-9999" value={form.whatsapp} disabled={!isEditing} onChange={(e) => set('whatsapp', e.target.value)}
                  className="w-full border border-border rounded-lg px-4 py-2 text-sm focus:border-gold focus:ring-1 focus:ring-gold/30 outline-none bg-surface/50 text-text-main disabled:opacity-75 disabled:cursor-not-allowed transition-all placeholder-text-muted" />
              </div>
            </div>

            <div>
              <label htmlFor="perfil-website" className="block text-xs font-bold text-text-muted mb-1">{t('perfil.website', 'Website Oficial')}</label>
              <input id="perfil-website" aria-label={t('perfil.website')} placeholder="https://..." value={form.website} disabled={!isEditing} onChange={(e) => set('website', e.target.value)}
                className="w-full border border-border rounded-lg px-4 py-2 text-sm focus:border-gold focus:ring-1 focus:ring-gold/30 outline-none bg-surface/50 text-text-main disabled:opacity-75 disabled:cursor-not-allowed transition-all placeholder-text-muted" />
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-text-muted">{t('perfil.instagram', 'Instagram Profissional')}</label>
                {isEditing && (
                  <button onClick={() => setInstagrams((ig) => [...ig, ''])}
                    className="text-gold hover:text-gold-light text-xs font-bold flex items-center gap-1 transition-colors">
                    <Plus size={12} /> {t('perfil.adicionar', 'Adicionar')}
                  </button>
                )}
              </div>
              <div className="space-y-2">
                {instagrams.length === 0 && <p className="text-xs text-text-muted italic">{t('perfil.sem_instagram', 'Nenhum instagram cadastrado.')}</p>}
                {instagrams.map((ig, i) => (
                  <div key={i} className="flex gap-2">
                    <input aria-label={`Instagram ${i + 1}`} placeholder="@usuario" value={ig} disabled={!isEditing} onChange={(e) => {
                      const n = [...instagrams]; n[i] = e.target.value; setInstagrams(n);
                    }} className="flex-1 border border-border rounded-lg px-4 py-2 text-sm focus:border-gold focus:ring-1 focus:ring-gold/30 outline-none bg-surface/50 text-text-main disabled:opacity-75 disabled:cursor-not-allowed transition-all placeholder-text-muted" />
                    {isEditing && (
                      <button onClick={() => setInstagrams((ig) => ig.filter((_, j) => j !== i))}
                        aria-label="Remover Instagram"
                        className="text-gray-400 hover:text-red-500 px-2 flex items-center justify-center">
                        <X size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-text-muted">{t('perfil.outros_links', 'Outras Redes (Behance, ArtStation, LinkedIn)')}</label>
                {isEditing && (
                  <button onClick={() => setSocialLinks((s) => [...s, { id: uid(), label: '', url: '' }])}
                    className="text-gold hover:text-gold-light text-xs font-bold flex items-center gap-1 transition-colors">
                    <Plus size={12} /> {t('perfil.adicionar_campo', 'Adicionar')}
                  </button>
                )}
              </div>
              <div className="space-y-2">
                {socialLinks.length === 0 && <p className="text-xs text-text-muted italic">{t('perfil.sem_links', 'Nenhum outro link cadastrado.')}</p>}
                {socialLinks.map((link) => (
                  <div key={link.id} className="flex gap-2">
                    <input aria-label="Nome do link" placeholder="Ex: Behance" value={link.label}
                      disabled={!isEditing}
                      onChange={(e) => setSocialLinks((s) => s.map((l) => (l.id === link.id ? { ...l, label: e.target.value } : l)))}
                      className="w-28 border border-border rounded-lg px-3 py-2 text-sm focus:border-gold focus:ring-1 focus:ring-gold/30 outline-none bg-surface/50 text-text-main disabled:opacity-75 disabled:cursor-not-allowed transition-all placeholder-text-muted" />
                    <input aria-label="URL do link" placeholder="https://..." value={link.url}
                      disabled={!isEditing}
                      onChange={(e) => setSocialLinks((s) => s.map((l) => (l.id === link.id ? { ...l, url: e.target.value } : l)))}
                      className="flex-1 border border-border rounded-lg px-3 py-2 text-sm focus:border-gold focus:ring-1 focus:ring-gold/30 outline-none bg-surface/50 text-text-main disabled:opacity-75 disabled:cursor-not-allowed transition-all placeholder-text-muted" />
                    {isEditing && (
                      <button onClick={() => setSocialLinks((s) => s.filter((l) => l.id !== link.id))}
                        aria-label="Remover link"
                        className="text-gray-400 hover:text-red-500 px-2 flex items-center justify-center">
                        <X size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Configuração Pública */}
      <section className="glass-slab rounded-2xl overflow-hidden">
        <div className="px-7 py-5 border-b border-border bg-surface-raised/35">
          <h2 className="text-lg font-serif text-gold font-bold">{t('perfil.config_publica', 'Configuração Pública & Disponibilidade')}</h2>
        </div>
        <div className="p-7 space-y-4">
          <label className="flex items-center gap-3 cursor-pointer p-3 bg-surface/30 border border-border/50 rounded-xl hover:bg-surface/55 transition-colors">
            <input
              type="checkbox"
              aria-label="Mostrar Contato Publicamente"
              checked={form.mostrar_contato_publico}
              disabled={!isEditing}
              onChange={(e) => set('mostrar_contato_publico', e.target.checked)}
              className="accent-gold w-5 h-5 cursor-pointer rounded"
            />
            <div>
              <span className="text-sm font-bold block text-text-main">{t('perfil.mostrar_contato', 'Mostrar Contato Publicamente')}</span>
              <span className="text-xs text-text-muted">{t('perfil.mostrar_contato_desc', 'Permite que visitantes vejam seu e-mail e telefone no portfólio público.')}</span>
            </div>
          </label>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="flex items-center gap-3 cursor-pointer p-3 bg-surface/30 border border-border/50 rounded-xl hover:bg-surface/55 transition-colors">
              <input
                type="checkbox"
                aria-label="Disponível para Exposições"
                checked={form.disponivel_exposicoes}
                disabled={!isEditing}
                onChange={(e) => set('disponivel_exposicoes', e.target.checked)}
                className="accent-gold w-4 h-4 cursor-pointer rounded"
              />
              <div>
                <span className="text-xs font-bold block text-text-main">{t('perfil.disp_exposicoes', 'Disponível para Exposições')}</span>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer p-3 bg-surface/30 border border-border/50 rounded-xl hover:bg-surface/55 transition-colors">
              <input
                type="checkbox"
                aria-label="Disponível para Residências"
                checked={form.disponivel_residencias}
                disabled={!isEditing}
                onChange={(e) => set('disponivel_residencias', e.target.checked)}
                className="accent-gold w-4 h-4 cursor-pointer rounded"
              />
              <div>
                <span className="text-xs font-bold block text-text-main">{t('perfil.disp_residencias', 'Disponível para Residências')}</span>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer p-3 bg-surface/30 border border-border/50 rounded-xl hover:bg-surface/55 transition-colors">
              <input
                type="checkbox"
                aria-label="Disponível para Comissões"
                checked={form.disponivel_comissoes}
                disabled={!isEditing}
                onChange={(e) => set('disponivel_comissoes', e.target.checked)}
                className="accent-gold w-4 h-4 cursor-pointer rounded"
              />
              <div>
                <span className="text-xs font-bold block text-text-main">{t('perfil.disp_comissoes', 'Disponível para Comissões (Projetos Comissionados)')}</span>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer p-3 bg-surface/30 border border-border/50 rounded-xl hover:bg-surface/55 transition-colors">
              <input
                type="checkbox"
                aria-label="Disponível para Colaborações"
                checked={form.disponivel_colaboracoes}
                disabled={!isEditing}
                onChange={(e) => set('disponivel_colaboracoes', e.target.checked)}
                className="accent-gold w-4 h-4 cursor-pointer rounded"
              />
              <div>
                <span className="text-xs font-bold block text-text-main">
                  {t('perfil.disp_colaboracoes', 'Disponível para Colaborações (Parcerias e Projetos Conjuntos)')}
                </span>
              </div>
            </label>
          </div>
        </div>
      </section>
    </div>
  );
}
