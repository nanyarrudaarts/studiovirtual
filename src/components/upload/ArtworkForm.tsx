import React from 'react';
import { FileDown } from 'lucide-react';
import { TagInput } from '../common/TagInput';

interface FormDataState {
  classificacao: string;
  parentCollectionId: string;
  parentSeriesId: string;
  isNewHierarchy: boolean;
  titulo: string;
  tipoObjeto: string;
  autoria: string;
  ano: string;
  tecnica: string;
  suporte: string;
  dimensaoW: string;
  dimensaoH: string;
  dimensaoD: string;
  dimensaoUnidade: string;
  inscricoes: string;
  sentencaResumo: string;
  narrativaCuratorial: string;
  numeroRegistro: string;
  formaAquisicao: string;
  procedencia: string;
  estadoConservacao: string;
  valor: string;
  seguro: string;
  localizacao: string;
  numeroEdicao: string;
  variacaoSerie: string;
  quantidadePrevista: string;
  estruturaEdicao: string;
  periodoColecao: string;
  artistasEnvolvidos: string;
  criterioInclusao: string;
  instituicaoAssociada: string;
  status: string;
  protocoloAtivacao: string;
  perfilPerformer: string;
  duracao: string;
  elementosInegociveis: string;
  possuiTermo: boolean;
  possuiCOA: boolean;
  possuiCessao: boolean;
  subtitle: string;
  statusSerie: string;
  resumoConceitual: string;
  logicaUnidade: string;
  temas: string;
  referencias: string;
  palavrasChave: string;
  anoInicial: string;
  anoInicial2: string;
  anoFinal: string;
  periodoProducao: string;
  locaisCriacao: string;
  tecnicas: string;
  materiais: string;
  suportes: string;
  linguagens: string;
  codigoInterno: string;
  tagsCuratoriais: string;
  direitosAutorais: string;
  certificados: string;
  documentosAnexos: string;
  historicoExpositivo: string;
  recursosHibridos: string;
  suporteDigital: string;
  hashBlockchain: string;
  redeBlockchain: string;
  registroCertificado: string;
  numeroSerie: string;
  regrasEdicao: string;
  sinestesiaSonora: string;
  historicoSerie: string;
  circulacaoSerie: string;
  valorSerie: string;
}

interface SeriesItem {
  series_id: string;
  series_title: string;
}

interface Props {
  formData: FormDataState;
  setFormData: React.Dispatch<React.SetStateAction<FormDataState>>;
  seriesList: SeriesItem[];
  MATERIALS_VOCAB: string[];
  SUPPORTS_VOCAB: string[];
  openTooltip: string | null;
  setOpenTooltip: (id: string | null) => void;
  suggestingField: string | null;
  handleSuggestField: (field: string, label: string, info: string) => Promise<void>;
  generateCoaId: () => Promise<void>;
  handleGenerateCOAPDF: () => Promise<void>;
  isGeneratingCOAPDF: boolean;
  photoSection: React.ReactNode;
}

export function ArtworkForm({
  formData,
  setFormData,
  seriesList,
  MATERIALS_VOCAB,
  SUPPORTS_VOCAB,
  openTooltip,
  setOpenTooltip,
  suggestingField,
  handleSuggestField,
  generateCoaId,
  handleGenerateCOAPDF,
  isGeneratingCOAPDF,
  photoSection,
}: Props) {
  const inp = (
    label: string,
    field: keyof FormDataState,
    opts?: { span2?: boolean; rows?: number; font?: string; info?: string; readOnly?: boolean }
  ) => {
    const id = `inp-${field}`;
    return (
      <div className={opts?.span2 ? 'md:col-span-2' : ''}>
        <label htmlFor={id} className="flex items-center gap-1 text-xs font-bold text-text-muted mb-1">
          {label}
          {opts?.info && (
            <span className="relative inline-flex">
              <button
                type="button"
                aria-label={`Info sobre ${label}`}
                onClick={() => setOpenTooltip(openTooltip === id ? null : id)}
                className="text-gold/60 hover:text-gold transition-colors leading-none"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
              </button>
              {openTooltip === id && (
                <div className="absolute z-50 left-0 top-5 w-72 glass-panel text-text-main text-xs rounded-xl p-3 shadow-xl leading-relaxed border-gold-dim">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-text-main font-normal">{opts.info}</span>
                    <button type="button" onClick={() => setOpenTooltip(null)} className="ml-2 text-text-muted hover:text-text-main shrink-0">✕</button>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSuggestField(field, label, opts.info!)}
                    disabled={suggestingField === field}
                    className="mt-2 w-full flex items-center justify-center gap-1.5 bg-gold/10 hover:bg-gold/20 text-gold font-bold py-2 rounded-lg transition-colors border border-gold-dim disabled:opacity-50 disabled:cursor-wait"
                  >
                    {suggestingField === field ? (
                      <span className="animate-pulse flex items-center gap-1">⏳ Analisando...</span>
                    ) : (
                      <>✨ Sugerir com IA</>
                    )}
                  </button>
                </div>
              )}
            </span>
          )}
        </label>
        {opts?.rows ? (
          <textarea
            id={id}
            value={formData[field] as string}
            onChange={(e) => setFormData({ ...formData, [field]: e.target.value })}
            rows={opts.rows}
            className="w-full border border-border rounded-xl px-4 py-3 text-sm focus:border-gold focus:ring-1 focus:ring-gold/30 outline-none bg-bg resize-none text-text-main"
          />
        ) : (
          <input
            id={id}
            type="text"
            readOnly={opts?.readOnly}
            value={formData[field] as string}
            onChange={(e) => !opts?.readOnly && setFormData({ ...formData, [field]: e.target.value })}
            className={`w-full border border-border rounded-lg px-4 py-2 text-sm focus:border-gold focus:ring-1 focus:ring-gold/30 outline-none bg-bg text-text-main ${
              opts?.readOnly ? 'opacity-60 bg-surface-raised cursor-not-allowed font-medium' : ''
            } ${opts?.font || ''}`}
          />
        )}
      </div>
    );
  };

  const dimInput = () => (
    <div>
      <label className="flex items-center gap-1 text-xs font-bold text-text-muted mb-1">
        Dimensões (H × L × P)
        <span className="relative inline-flex">
          <button
            type="button"
            onClick={() => setOpenTooltip(openTooltip === 'dim' ? null : 'dim')}
            className="text-gold/60 hover:text-gold transition-colors leading-none"
            aria-label="Info sobre Dimensões"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
          </button>
          {openTooltip === 'dim' && (
            <div className="absolute z-50 left-0 top-5 w-72 glass-panel text-text-main text-xs rounded-xl p-3 shadow-xl leading-relaxed border-gold-dim">
              <div className="flex justify-between items-start">
                <span className="text-text-main font-normal">Medidas exatas de Altura, Largura e Profundidade em centímetros. Para obras flexíveis, utilize "dimensões variáveis".</span>
                <button type="button" onClick={() => setOpenTooltip(null)} className="ml-2 text-text-muted hover:text-text-main shrink-0">✕</button>
              </div>
            </div>
          )}
        </span>
      </label>
      <div className="flex gap-1 items-center">
        <input type="text" placeholder="H" aria-label="Altura" value={formData.dimensaoH} onChange={(e) => setFormData({ ...formData, dimensaoH: e.target.value })} className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:border-gold focus:ring-1 focus:ring-gold/30 outline-none bg-bg text-text-main" />
        <span className="text-gray-400">×</span>
        <input type="text" placeholder="L" aria-label="Largura" value={formData.dimensaoW} onChange={(e) => setFormData({ ...formData, dimensaoW: e.target.value })} className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:border-gold focus:ring-1 focus:ring-gold/30 outline-none bg-bg text-text-main" />
        <span className="text-gray-400">×</span>
        <input type="text" placeholder="P" aria-label="Profundidade" value={formData.dimensaoD} onChange={(e) => setFormData({ ...formData, dimensaoD: e.target.value })} className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:border-gold focus:ring-1 focus:ring-gold/30 outline-none bg-bg text-text-main" />
        <select aria-label="Unidade de medida" value={formData.dimensaoUnidade} onChange={(e) => setFormData({ ...formData, dimensaoUnidade: e.target.value })} className="border border-border rounded-lg px-2 py-2 text-sm focus:border-gold focus:ring-1 focus:ring-gold/30 outline-none bg-bg text-text-main">
          <option>cm</option>
          <option>in</option>
        </select>
      </div>
    </div>
  );

  const sec = (num: string, title: string, children: React.ReactNode) => (
    <section>
      <p className="text-xs font-bold tracking-[0.2em] text-gold uppercase mb-4 flex items-center gap-2">
        <span className="font-serif text-base">{num}</span> {title}
      </p>
      {children}
    </section>
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <h2 className="text-2xl font-serif text-gold">Ficha Técnica</h2>
      </div>

      {/* Imagem Principal */}
      {(formData.classificacao === 'singular' || !formData.isNewHierarchy) && (
        <section className="mb-8 glass-panel p-6 rounded-2xl shadow-gold-glow-sm">
          <h3 className="text-lg font-serif mb-4 text-text-main">Imagem Principal</h3>
          {photoSection}
        </section>
      )}

      {/* OBRA SINGULAR — Ficha Completa */}
      {formData.classificacao === 'singular' && (
        <div className="space-y-8">
          {sec(
            'I',
            'Dados de Identificação Básica',
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="inp-tipoObjeto" className="flex items-center gap-1 text-xs font-bold text-text-muted mb-1">Tipo de Objeto</label>
                <select id="inp-tipoObjeto" value={formData.tipoObjeto} onChange={(e) => setFormData({ ...formData, tipoObjeto: e.target.value })} className="w-full border border-border rounded-lg px-4 py-2 text-sm focus:border-gold focus:ring-1 focus:ring-gold/30 outline-none bg-bg text-text-main">
                  <option value="Painting">Pintura (Painting)</option>
                  <option value="Drawing">Desenho (Drawing)</option>
                  <option value="Sculpture">Escultura (Sculpture)</option>
                  <option value="Photography">Fotografia (Photography)</option>
                  <option value="Installation">Instalação (Installation)</option>
                  <option value="Digital Art">Arte Digital (Digital Art)</option>
                  <option value="Mixed Media">Técnica Mista (Mixed Media)</option>
                  <option value="Performance">Performance</option>
                  <option value="Print">Gravura/Impressão (Print)</option>
                  <option value="Textile">Têxtil (Textile)</option>
                  <option value="Other">Outro (Other)</option>
                </select>
              </div>
              {inp('Título *', 'titulo', { font: 'font-serif text-lg', info: 'O nome oficial atribuído pelo artista.' })}
              <div className="flex flex-col gap-1 md:col-span-2">
                <label htmlFor="series-selector-singular" className="text-sm font-bold text-text-muted mb-1 flex items-center gap-1">
                  Título da Série / Vínculo
                </label>
                <select
                  id="series-selector-singular"
                  value={formData.parentSeriesId || ''}
                  onChange={(e) => setFormData({ ...formData, parentSeriesId: e.target.value })}
                  className="w-full border border-border rounded-lg px-4 py-2 text-sm focus:border-gold focus:ring-1 focus:ring-gold/30 outline-none bg-bg text-text-main"
                >
                  <option value="">Não pertence a nenhuma série (Obra Independente)</option>
                  {seriesList.map((s) => (
                    <option key={s.series_id} value={s.series_id}>{s.series_title}</option>
                  ))}
                </select>
              </div>
              {inp('Autoria', 'autoria', { readOnly: true, info: 'Nome completo do criador ou coletivo.' })}
              {inp('Data / Período', 'ano', { info: 'Ano ou intervalo de criação.' })}
              <TagInput
                id="inp-tecnica"
                label="Materiais e Técnicas / Medium"
                value={formData.tecnica}
                onChange={(val) => setFormData({ ...formData, tecnica: val })}
                suggestions={MATERIALS_VOCAB}
                placeholder="Ex: Acrylic, Gold Leaf, Ink..."
              />
              <TagInput
                id="inp-suporte"
                label="Suporte / Support"
                value={formData.suporte}
                onChange={(val) => setFormData({ ...formData, suporte: val })}
                suggestions={SUPPORTS_VOCAB}
                placeholder="Ex: Cotton Canvas, Paper 300g..."
              />
              {dimInput()}
              {inp('Inscrições e Marcas', 'inscricoes', { info: 'Registro de assinaturas, dedicatórias, selos...' })}
              {inp('Descrição Curta', 'sentencaResumo', { span2: true, info: 'Resumo do conteúdo visual.' })}
              {inp('Narrativa Curatorial', 'narrativaCuratorial', { span2: true, rows: 4, info: 'Texto interpretativo.' })}
            </div>
          )}

          {sec(
            'II',
            'Dados Técnicos para Acervo e Gestão (Dossiê)',
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {inp('Número de Registro (Tombo)', 'numeroRegistro', { info: 'Código único e exclusivo.' })}
              <div>
                <label htmlFor="inp-formaAquisicao" className="flex items-center gap-1 text-xs font-bold text-text-muted mb-1">Forma de Aquisição</label>
                <select id="inp-formaAquisicao" value={formData.formaAquisicao} onChange={(e) => setFormData({ ...formData, formaAquisicao: e.target.value })} className="w-full border border-border rounded-lg px-4 py-2 text-sm focus:border-gold focus:ring-1 focus:ring-gold/30 outline-none bg-bg text-text-main">
                  <option value="">Selecione...</option>
                  <option value="Donation">Doação (Donation)</option>
                  <option value="Purchase">Compra (Purchase)</option>
                  <option value="Commission">Encomenda (Commission)</option>
                  <option value="Consignment">Consignação (Consignment)</option>
                  <option value="Exchange">Permuta (Exchange)</option>
                  <option value="Gift">Presente (Gift)</option>
                  <option value="Transfer">Transferência (Transfer)</option>
                </select>
              </div>
              {inp('Procedência e Histórico', 'procedencia', { span2: true, rows: 2, info: 'Registro cronológico de antigos proprietários.' })}
              <div>
                <label htmlFor="inp-estadoConservacao" className="flex items-center gap-1 text-xs font-bold text-text-muted mb-1">Estado de Conservação</label>
                <select id="inp-estadoConservacao" value={formData.estadoConservacao} onChange={(e) => setFormData({ ...formData, estadoConservacao: e.target.value })} className="w-full border border-border rounded-lg px-4 py-2 text-sm focus:border-gold focus:ring-1 focus:ring-gold/30 outline-none bg-bg text-text-main">
                  <option value="Excellent">Excelente (Excellent)</option>
                  <option value="Good">Bom (Good)</option>
                  <option value="Fair">Regular (Fair)</option>
                  <option value="Poor">Precário (Poor)</option>
                </select>
              </div>
              {inp('Localização Física', 'localizacao', { info: 'Indicação precisa de onde a obra está guardada.' })}
              {inp('Valor', 'valor', { info: 'Valor financeiro de mercado.' })}
              {inp('Valor do Seguro', 'seguro', { info: 'Base para apólices.' })}
              {inp('Número de Edição', 'numeroEdicao', { info: 'Ex: 1/10, 2/10.' })}
              <div className="flex flex-col gap-1">
                <label htmlFor="inp-status-venda" className="text-xs font-bold text-text-muted mb-1">Status de Venda</label>
                <select id="inp-status-venda" value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className="w-full border border-border rounded-lg px-4 py-2 text-sm focus:border-gold focus:ring-1 focus:ring-gold/30 outline-none bg-bg text-text-main">
                  <option value="Disponível">Disponível</option>
                  <option value="Vendida">Vendida</option>
                  <option value="Reservada">Reservada</option>
                  <option value="Coleção Privada">Coleção Privada</option>
                  <option value="Não à venda">Não à venda</option>
                </select>
              </div>
              {inp('Detentor dos Direitos Autorais', 'direitosAutorais', { info: 'Nome ou entidade detentora dos direitos.' })}
            </div>
          )}

          {sec(
            'III',
            'Ficha Curatorial para Performances (Modelos 2025/2026)',
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {inp('Protocolo de Ativação (Roteiro)', 'protocoloAtivacao', { span2: true, rows: 3, info: 'Conjunto de instruções detalhadas.' })}
              {inp('Perfil do Performer', 'perfilPerformer', { info: 'Requisitos de habilidades.' })}
              <div>
                <label htmlFor="inp-duracao" className="flex items-center gap-1 text-xs font-bold text-text-muted mb-1">Duração</label>
                <select id="inp-duracao" value={formData.duracao} onChange={(e) => setFormData({ ...formData, duracao: e.target.value })} className="w-full border border-border rounded-lg px-4 py-2 text-sm focus:border-gold focus:ring-1 focus:ring-gold/30 outline-none bg-bg text-text-main">
                  <option value="">Selecione...</option>
                  <option value="Short (up to 30 min)">Curta — até 30 min</option>
                  <option value="Medium (30–90 min)">Média — 30 a 90 min</option>
                  <option value="Long Duration (over 2 hours)">Longa — mais de 2h</option>
                  <option value="Variable Duration">Duração Variável</option>
                </select>
              </div>
              {inp('Elementos Inegociáveis', 'elementosInegociveis', { span2: true, rows: 2, info: 'Parâmetros fixos.' })}
            </div>
          )}

          {sec(
            'IV',
            'Documentação Jurídica Associada',
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-2">
                <input id="possuiTermo" type="checkbox" checked={formData.possuiTermo} onChange={(e) => setFormData({ ...formData, possuiTermo: e.target.checked })} className="rounded text-accent focus:ring-accent" />
                <label htmlFor="possuiTermo" className="text-sm font-medium">Termo de Doação/Compra assinado</label>
              </div>
              <div className="flex items-center gap-2">
                <input id="possuiCOA" type="checkbox" checked={formData.possuiCOA} onChange={(e) => setFormData({ ...formData, possuiCOA: e.target.checked })} className="rounded text-accent focus:ring-accent" />
                <label htmlFor="possuiCOA" className="text-sm font-medium">Certificado de Autenticidade (COA)</label>
              </div>
              <div className="flex items-center gap-2">
                <input id="possuiCessao" type="checkbox" checked={formData.possuiCessao} onChange={(e) => setFormData({ ...formData, possuiCessao: e.target.checked })} className="rounded text-accent focus:ring-accent" />
                <label htmlFor="possuiCessao" className="text-sm font-medium">Cessão de Direitos de Imagem/Voz</label>
              </div>
            </div>
          )}

          {sec(
            'V',
            'Recursos Interdisciplinares & Autenticação Digital (Blockchain)',
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {inp('Recursos Híbridos / Multimídia', 'recursosHibridos', { info: 'Detalhamento de componentes extras.' })}
              {inp('Suporte Digital / Mídia', 'suporteDigital', { info: 'Especificação técnica do formato.' })}
              {inp('Registro / Hash do Smart Contract', 'hashBlockchain', { info: 'Identificador digital único.' })}
              <div className="flex flex-col gap-1">
                <label htmlFor="inp-redeBlockchain" className="flex items-center gap-1 text-xs font-bold text-text-muted mb-1">Rede Blockchain</label>
                <select id="inp-redeBlockchain" value={formData.redeBlockchain} onChange={(e) => setFormData({ ...formData, redeBlockchain: e.target.value })} className="w-full border border-border rounded-lg px-4 py-2 text-sm focus:border-gold focus:ring-1 focus:ring-gold/30 outline-none bg-bg text-text-main">
                  <option value="Ethereum">Ethereum</option>
                  <option value="Polygon">Polygon</option>
                  <option value="Tezos">Tezos</option>
                  <option value="Solana">Solana</option>
                  <option value="Base">Base</option>
                  <option value="Other">Outra (Other)</option>
                </select>
              </div>
              <div className="flex flex-col gap-1 md:col-span-2">
                <label className="text-sm font-bold text-text-muted mb-1 flex items-center justify-between">
                  <span>Código do Certificado (COA ID) / Unique ID</span>
                </label>
                <div className="flex gap-2">
                  <input
                    id="inp-registroCertificado"
                    type="text"
                    readOnly
                    value={formData.registroCertificado}
                    onChange={(e) => setFormData({ ...formData, registroCertificado: e.target.value })}
                    className="flex-1 border border-gray-200 rounded-lg px-4 py-2 text-sm outline-none bg-gray-50 text-gray-500 font-mono"
                    placeholder="Clique em Gerar para criar ID único"
                  />
                  <button
                    type="button"
                    onClick={generateCoaId}
                    className="px-4 py-2 bg-gold/10 text-gold font-bold rounded-lg hover:bg-gold/20 transition-colors text-sm whitespace-nowrap border border-gold-dim"
                  >
                    Gerar COA
                  </button>
                  {formData.registroCertificado && (
                    <button
                      type="button"
                      onClick={handleGenerateCOAPDF}
                      disabled={isGeneratingCOAPDF}
                      className="flex items-center gap-1.5 px-4 py-2 bg-gold text-bg font-bold rounded-lg hover:bg-gold-light transition-colors text-sm whitespace-nowrap shadow-sm disabled:opacity-60"
                    >
                      <FileDown size={16} />
                      {isGeneratingCOAPDF ? 'Gerando...' : 'Baixar COA'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
