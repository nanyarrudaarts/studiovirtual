import { Loader2, Sparkles } from 'lucide-react';
import type { FormState } from './TabPessoal';
import { PerfilTagInput } from './PerfilTagInput';

interface Props {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  isEditing: boolean;
  generatingBioCurta: boolean;
  handleGenerateBioCurta: () => Promise<void>;
  generatingBioCompleta: boolean;
  handleGenerateBioCompleta: () => Promise<void>;
  generatingStatement: boolean;
  handleGenerateStatement: () => Promise<void>;
  optimizingProcesso: boolean;
  handleOptimizeProcessoCriativo: () => Promise<void>;
  t: (k: string, fallback?: any) => string;
}

export function TabArtistico({
  form,
  setForm,
  isEditing,
  generatingBioCurta,
  handleGenerateBioCurta,
  generatingBioCompleta,
  handleGenerateBioCompleta,
  generatingStatement,
  handleGenerateStatement,
  optimizingProcesso,
  handleOptimizeProcessoCriativo,
  t
}: Props) {
  const set = (key: keyof FormState, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  const wordCount = (text: string) => (text || '').trim().split(/\s+/).filter(Boolean).length;

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Biografias Institucionais */}
      <section className="glass-slab rounded-2xl overflow-hidden">
        <div className="px-7 py-5 border-b border-border bg-surface-raised/35">
          <h2 className="text-lg font-serif text-gold font-bold">{t('perfil.biografia', 'Biografias Institucionais')}</h2>
        </div>
        <div className="p-7 space-y-6">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-text-muted">{t('perfil.bio_curta', 'Biografia Curta (máx. 120 palavras)')}</label>
                {isEditing && (
                  <button
                    onClick={handleGenerateBioCurta}
                    disabled={generatingBioCurta}
                    className="flex items-center gap-1 px-2.5 py-1 bg-gold/10 text-gold border border-gold/20 text-[11px] font-bold rounded-lg hover:bg-gold/20 transition-colors disabled:opacity-50"
                  >
                    {generatingBioCurta ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
                    {t('perfil.gerar_bio_curta', 'Gerar Bio Curta')}
                  </button>
                )}
              </div>
              <span className={`text-xs ${wordCount(form.bioShort) > 120 ? 'text-red-500 font-semibold' : 'text-gray-400'}`}>
                {wordCount(form.bioShort)}/120 {t('perfil.palavras', 'palavras')}
              </span>
            </div>
            <textarea
              value={form.bioShort}
              disabled={!isEditing}
              onChange={(e) => set('bioShort', e.target.value)}
              placeholder={t('perfil.usada_capa', 'Escreva uma bio rápida para previews, feiras ou capas...')}
              className="w-full border border-border rounded-xl px-4 py-3 text-sm focus:border-gold focus:ring-1 focus:ring-gold/30 outline-none bg-surface/50 text-text-main h-24 resize-none disabled:opacity-75 disabled:cursor-not-allowed transition-all placeholder-text-muted"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-text-muted">{t('perfil.bio_completa', 'Biografia Completa / Institucional')}</label>
                {isEditing && (
                  <button
                    onClick={handleGenerateBioCompleta}
                    disabled={generatingBioCompleta}
                    className="flex items-center gap-1 px-2.5 py-1 bg-gold/10 text-gold border border-gold/20 text-[11px] font-bold rounded-lg hover:bg-gold/20 transition-colors disabled:opacity-50"
                  >
                    {generatingBioCompleta ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
                    {t('perfil.gerar_bio_completa', 'Gerar Bio Completa')}
                  </button>
                )}
              </div>
            </div>
            <textarea
              value={form.bioLong}
              disabled={!isEditing}
              onChange={(e) => set('bioLong', e.target.value)}
              placeholder={t('perfil.bio_completa_placeholder', 'Escreva sua biografia institucional completa (3 a 4 parágrafos)...')}
              className="w-full border border-border rounded-xl px-4 py-3 text-sm focus:border-gold focus:ring-1 focus:ring-gold/30 outline-none bg-surface/50 text-text-main h-48 resize-none disabled:opacity-75 disabled:cursor-not-allowed transition-all placeholder-text-muted"
            />
          </div>
        </div>
      </section>

      {/* Statement & Poética */}
      <section className="glass-slab rounded-2xl overflow-hidden">
        <div className="px-7 py-5 border-b border-border bg-surface-raised/35">
          <h2 className="text-lg font-serif text-gold font-bold">{t('perfil.statement_poetica', 'Artist Statement & Poética')}</h2>
        </div>
        <div className="p-7 space-y-6">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-text-muted">{t('perfil.statement', 'Artist Statement (Declaração de Artista)')}</label>
                {isEditing && (
                  <button
                    onClick={handleGenerateStatement}
                    disabled={generatingStatement}
                    className="flex items-center gap-1 px-2.5 py-1 bg-gold/10 text-gold border border-gold/20 text-[11px] font-bold rounded-lg hover:bg-gold/20 transition-colors disabled:opacity-50"
                  >
                    {generatingStatement ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
                    {t('perfil.gerar_statement', 'Gerar Statement')}
                  </button>
                )}
              </div>
            </div>
            <textarea
              value={form.statement}
              disabled={!isEditing}
              onChange={(e) => set('statement', e.target.value)}
              placeholder={t('perfil.statement_placeholder', 'Descreva o núcleo conceitual de sua prática artística...')}
              className="w-full border border-border rounded-xl px-4 py-3 text-sm focus:border-gold focus:ring-1 focus:ring-gold/30 outline-none bg-surface/50 text-text-main h-36 resize-none disabled:opacity-75 disabled:cursor-not-allowed transition-all placeholder-text-muted"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-text-muted">{t('perfil.processo_criativo', 'Processo Criativo & Pesquisa de Atelier')}</label>
                {isEditing && (
                  <button
                    onClick={handleOptimizeProcessoCriativo}
                    disabled={optimizingProcesso || !form.processo_criativo.trim()}
                    className="flex items-center gap-1 px-2.5 py-1 bg-gold/10 text-gold border border-gold/20 text-[11px] font-bold rounded-lg hover:bg-gold/20 transition-colors disabled:opacity-50"
                  >
                    {optimizingProcesso ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
                    {t('perfil.otimizar_processo', 'Otimizar com IA')}
                  </button>
                )}
              </div>
            </div>
            <textarea
              value={form.processo_criativo}
              disabled={!isEditing}
              onChange={(e) => set('processo_criativo', e.target.value)}
              placeholder={t('perfil.processo_placeholder', 'Descreva como desenvolve suas obras, rituais de atelier, procedimentos...')}
              className="w-full border border-border rounded-xl px-4 py-3 text-sm focus:border-gold focus:ring-1 focus:ring-gold/30 outline-none bg-surface/50 text-text-main h-32 resize-none disabled:opacity-75 disabled:cursor-not-allowed transition-all placeholder-text-muted"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-text-muted mb-1">{t('perfil.tecnicas_recorrentes', 'Técnicas Recorrentes')}</label>
              <input
                value={form.tecnicas_recorrentes}
                disabled={!isEditing}
                onChange={(e) => set('tecnicas_recorrentes', e.target.value)}
                placeholder="Ex: Pintura a óleo, Serigrafia, Instalações sonoras"
                className="w-full border border-border rounded-lg px-4 py-2 text-sm focus:border-gold focus:ring-1 focus:ring-gold/30 outline-none bg-surface/50 text-text-main disabled:opacity-75 disabled:cursor-not-allowed transition-all placeholder-text-muted"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-text-muted mb-1">{t('perfil.temas_centrais', 'Temas Centrais / Vetores Poéticos')}</label>
              <input
                value={form.temas_centrais}
                disabled={!isEditing}
                onChange={(e) => set('temas_centrais', e.target.value)}
                placeholder="Ex: Memória, Cidade, Identidade, Natureza"
                className="w-full border border-border rounded-lg px-4 py-2 text-sm focus:border-gold focus:ring-1 focus:ring-gold/30 outline-none bg-surface/50 text-text-main disabled:opacity-75 disabled:cursor-not-allowed transition-all placeholder-text-muted"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-text-muted mb-1">{t('perfil.pesquisa_artistica', 'Pesquisa Artística & Referências')}</label>
              <input
                value={form.pesquisa_artistica}
                disabled={!isEditing}
                onChange={(e) => set('pesquisa_artistica', e.target.value)}
                placeholder="Ex: Filosofia contemporânea, Arquitetura brutalista"
                className="w-full border border-border rounded-lg px-4 py-2 text-sm focus:border-gold focus:ring-1 focus:ring-gold/30 outline-none bg-surface/50 text-text-main disabled:opacity-75 disabled:cursor-not-allowed transition-all placeholder-text-muted"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-text-muted mb-1">{t('perfil.ano_inicio_carreira', 'Ano de Início da Carreira Artística')}</label>
              <input
                type="number"
                value={form.ano_inicio_carreira}
                disabled={!isEditing}
                onChange={(e) => set('ano_inicio_carreira', e.target.value)}
                placeholder="Ex: 2015"
                className="w-full border border-border rounded-lg px-4 py-2 text-sm focus:border-gold focus:ring-1 focus:ring-gold/30 outline-none bg-surface/50 text-text-main disabled:opacity-75 disabled:cursor-not-allowed transition-all placeholder-text-muted"
              />
            </div>
          </div>

          <div>
            <PerfilTagInput
              id="perfil-tags"
              label={t('perfil.tags_gerais', 'Palavras-chave & Tags de Curadoria')}
              value={form.tags}
              onChange={(val) => set('tags', val)}
              disabled={!isEditing}
              placeholder="Pressione Enter ou vírgula para adicionar tags gerais de pesquisa e curadoria"
            />
          </div>
        </div>
      </section>
    </div>
  );
}
