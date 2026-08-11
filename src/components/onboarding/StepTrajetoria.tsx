import { TrajectorySection } from '../ui/TrajectorySection';
import type { FieldConfig } from '../ui/TrajectoryModal';
import {
  COUNTRIES,
  CITIES,
  GALLERIES_AND_INSTITUTIONS,
  CURATORS,
  ART_FAIRS,
  MEDIA_OUTLETS,
  EXHIBITION_TYPES,
  RESIDENCY_TYPES,
  RESIDENCY_DURATIONS,
  AWARD_TYPES,
  AWARD_RESULTS,
  FAIR_PARTICIPATION_TYPES,
  PUBLICATION_TYPES,
  PUBLICATION_FORMATS,
  PUBLICATION_LANGUAGES,
  COLLECTION_TYPES,
  COLLECTION_AUTHORIZATIONS,
  MEDIA_TYPES,
  CONTENT_TYPES,
  YEARS_LIST,
} from '../../data/trajectoryPresets';

const DT = {
  text: '#1D1D1F',
  textMuted: '#86868B',
  fontSans: 'system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", sans-serif',
};

interface ListItem {
  id: string;
  [key: string]: string;
}

interface WizardData {
  nome: string;
  nomeartistico: string;
  formacao: ListItem[];
  expos_individuais: ListItem[];
  expos_coletivas: ListItem[];
  premios: ListItem[];
  residencias: ListItem[];
  publicacoes: ListItem[];
  bolsas: ListItem[];
  feiras: ListItem[];
  clipping: ListItem[];
  colecoesPublicas: ListItem[];
  colecoesPrivadas: ListItem[];
  [key: string]: any;
}

interface Props {
  data: WizardData;
  onChange: (d: Partial<WizardData>) => void;
  T: Record<string, string>;
}

export function StepTrajetoria({ data, onChange, T }: Props) {
  const artistName = data.nome || data.nomeartistico;

  const formacaoFields: FieldConfig[] = [
    { key: 'ano', label: 'Ano de Conclusão', type: 'dropdown', options: YEARS_LIST, required: true },
    { key: 'titulo', label: 'Grau / Curso (ex: Bacharelado em Artes Visuais)', type: 'text', required: true },
    { key: 'local', label: 'Instituição / Universidade', type: 'autocomplete', options: GALLERIES_AND_INSTITUTIONS, required: true },
    { key: 'cidade', label: 'Cidade', type: 'autocomplete', options: CITIES },
    { key: 'pais', label: 'País', type: 'dropdown', options: COUNTRIES },
    { key: 'observacoes', label: 'Observações / Tese', type: 'textarea' },
    { key: 'documentacao', label: 'Comprovante / Diploma', type: 'upload' },
  ];

  const exposIndividuaisFields: FieldConfig[] = [
    { key: 'ano', label: 'Ano', type: 'dropdown', options: YEARS_LIST, required: true },
    { key: 'titulo', label: 'Título da Exposição', type: 'text', required: true },
    { key: 'local', label: 'Galeria / Instituição', type: 'autocomplete', options: GALLERIES_AND_INSTITUTIONS, required: true },
    { key: 'cidade', label: 'Cidade', type: 'autocomplete', options: CITIES },
    { key: 'pais', label: 'País', type: 'dropdown', options: COUNTRIES },
    { key: 'curador', label: 'Curador(a)', type: 'autocomplete', options: CURATORS },
    { key: 'observacoes', label: 'Observações', type: 'textarea' },
    { key: 'documentacao', label: 'Documentação / Catálogo', type: 'upload' },
  ];

  const exposColetivasFields: FieldConfig[] = [
    { key: 'ano', label: 'Ano', type: 'dropdown', options: YEARS_LIST, required: true },
    { key: 'titulo', label: 'Título da Exposição', type: 'text', required: true },
    { key: 'local', label: 'Galeria / Instituição', type: 'autocomplete', options: GALLERIES_AND_INSTITUTIONS, required: true },
    { key: 'cidade', label: 'Cidade', type: 'autocomplete', options: CITIES },
    { key: 'pais', label: 'País', type: 'dropdown', options: COUNTRIES },
    { key: 'tipo', label: 'Tipo de Exposição', type: 'dropdown', options: EXHIBITION_TYPES },
    { key: 'curador', label: 'Curador(a)', type: 'autocomplete', options: CURATORS },
    { key: 'observacoes', label: 'Observações', type: 'textarea' },
    { key: 'documentacao', label: 'Documentação / Folheto', type: 'upload' },
  ];

  const residenciasFields: FieldConfig[] = [
    { key: 'ano', label: 'Ano / Período', type: 'dropdown', options: YEARS_LIST, required: true },
    { key: 'titulo', label: 'Nome do Programa', type: 'text', required: true },
    { key: 'local', label: 'Instituição Responsável', type: 'autocomplete', options: GALLERIES_AND_INSTITUTIONS, required: true },
    { key: 'cidade', label: 'Cidade', type: 'autocomplete', options: CITIES },
    { key: 'pais', label: 'País', type: 'dropdown', options: COUNTRIES },
    { key: 'tipo', label: 'Tipo', type: 'dropdown', options: RESIDENCY_TYPES },
    { key: 'duracao', label: 'Duração', type: 'dropdown', options: RESIDENCY_DURATIONS },
    { key: 'observacoes', label: 'Descrição / Projeto', type: 'textarea' },
    { key: 'documentacao', label: 'Documentação / Certificado', type: 'upload' },
  ];

  const premiosFields: FieldConfig[] = [
    { key: 'ano', label: 'Ano', type: 'dropdown', options: YEARS_LIST, required: true },
    { key: 'titulo', label: 'Nome do Prêmio / Bolsa / Fomento', type: 'text', required: true },
    { key: 'local', label: 'Instituição Concedente', type: 'autocomplete', options: GALLERIES_AND_INSTITUTIONS, required: true },
    { key: 'tipo', label: 'Tipo', type: 'dropdown', options: AWARD_TYPES },
    { key: 'resultado', label: 'Resultado / Colocação', type: 'dropdown', options: AWARD_RESULTS },
    { key: 'cidade', label: 'Cidade', type: 'autocomplete', options: CITIES },
    { key: 'pais', label: 'País', type: 'dropdown', options: COUNTRIES },
    { key: 'observacoes', label: 'Descrição', type: 'textarea' },
    { key: 'documentacao', label: 'Documentação / Comprovante', type: 'upload' },
  ];

  const feirasFields: FieldConfig[] = [
    { key: 'ano', label: 'Ano', type: 'dropdown', options: YEARS_LIST, required: true },
    { key: 'titulo', label: 'Nome da Feira', type: 'autocomplete', options: ART_FAIRS, required: true },
    { key: 'local', label: 'Galeria / Representação', type: 'autocomplete', options: GALLERIES_AND_INSTITUTIONS },
    { key: 'cidade', label: 'Cidade', type: 'autocomplete', options: CITIES },
    { key: 'pais', label: 'País', type: 'dropdown', options: COUNTRIES },
    { key: 'edicao', label: 'Edição da Feira (ex: 18ª Edição)', type: 'text' },
    { key: 'tipo_participacao', label: 'Tipo de Participação', type: 'dropdown', options: FAIR_PARTICIPATION_TYPES },
    { key: 'secao', label: 'Seção da Feira', type: 'text' },
    { key: 'obras', label: 'Obras Apresentadas', type: 'text' },
    { key: 'documentacao', label: 'Documentação / Fotos', type: 'upload' },
  ];

  const publicacoesFields: FieldConfig[] = [
    { key: 'categoria_publicacao', label: 'Categoria', type: 'dropdown', options: ['Publicações sobre o artista', 'Publicações do artista'], required: true },
    { key: 'tipo_publicacao', label: 'Tipo de Publicação', type: 'dropdown', options: PUBLICATION_TYPES, required: true },
    { key: 'ano', label: 'Ano', type: 'dropdown', options: YEARS_LIST, required: true },
    { key: 'autor', label: 'Autor / Crítico / Organizador', type: 'autocomplete', options: CURATORS },
    { key: 'titulo', label: 'Título', type: 'text', required: true },
    { key: 'local', label: 'Nome da Publicação / Editora', type: 'autocomplete', options: MEDIA_OUTLETS },
    { key: 'idioma', label: 'Idioma', type: 'dropdown', options: PUBLICATION_LANGUAGES },
    { key: 'formato', label: 'Formato', type: 'dropdown', options: PUBLICATION_FORMATS },
    { key: 'pagina', label: 'Página / Edição', type: 'text' },
    { key: 'link', label: 'Link / URL', type: 'text' },
    { key: 'documentacao', label: 'PDF ou Imagem da publicação', type: 'upload' },
  ];

  const colecoesPublicasFields: FieldConfig[] = [
    { key: 'tipo_colecao', label: 'Tipo de Coleção', type: 'dropdown', options: COLLECTION_TYPES, required: true },
    { key: 'local', label: 'Instituição / Museu', type: 'autocomplete', options: GALLERIES_AND_INSTITUTIONS, required: true },
    { key: 'cidade', label: 'Cidade', type: 'autocomplete', options: CITIES },
    { key: 'pais', label: 'País', type: 'dropdown', options: COUNTRIES },
    { key: 'obras', label: 'Obra(s) Adquirida(s)', type: 'text' },
    { key: 'ano', label: 'Ano de Aquisição', type: 'dropdown', options: YEARS_LIST },
    { key: 'documentacao', label: 'Comprovante / Termo de doação', type: 'upload' },
  ];

  const colecoesPrivadasFields: FieldConfig[] = [
    { key: 'tipo_colecao', label: 'Tipo de Coleção', type: 'dropdown', options: COLLECTION_TYPES, required: true },
    { key: 'nome_colecionador', label: 'Nome do Colecionador (Privado / Opcional)', type: 'text' },
    { key: 'pais', label: 'País / Região', type: 'dropdown', options: COUNTRIES },
    { key: 'obras', label: 'Obra(s) Adquirida(s)', type: 'text' },
    { key: 'ano', label: 'Ano de Aquisição', type: 'dropdown', options: YEARS_LIST },
    { key: 'autorizacao', label: 'Autorização para Divulgação', type: 'dropdown', options: COLLECTION_AUTHORIZATIONS, helperText: 'Quando não autorizado, o CV gera a descrição genérica ex: "Coleções privadas no Brasil e Europa".' },
    { key: 'documentacao', label: 'Comprovante / Termo de cessão', type: 'upload' },
  ];

  const clippingFields: FieldConfig[] = [
    { key: 'ano', label: 'Ano', type: 'dropdown', options: YEARS_LIST, required: true },
    { key: 'local', label: 'Veículo / Mídia', type: 'autocomplete', options: MEDIA_OUTLETS, required: true },
    { key: 'titulo', label: 'Título da Matéria', type: 'text', required: true },
    { key: 'tipo_midia', label: 'Tipo de Mídia', type: 'dropdown', options: MEDIA_TYPES },
    { key: 'tipo_conteudo', label: 'Tipo de Conteúdo', type: 'dropdown', options: CONTENT_TYPES },
    { key: 'autor', label: 'Autor / Jornalista', type: 'text' },
    { key: 'idioma', label: 'Idioma', type: 'dropdown', options: PUBLICATION_LANGUAGES },
    { key: 'link', label: 'Link / URL', type: 'text' },
    { key: 'documentacao', label: 'Arquivo / Print do Clipping', type: 'upload' },
    { key: 'observacoes', label: 'Observações', type: 'textarea' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 style={{ fontFamily: DT.fontSans, color: DT.text }}
          className="text-3xl md:text-4xl font-semibold tracking-tight leading-tight mb-1.5">
          {T.step3_title}
        </h2>
        <p className="text-[15px] font-normal leading-relaxed" style={{ color: DT.textMuted }}>
          {T.step3_desc}
        </p>
      </div>

      <TrajectorySection
        title={T.list_education || 'Formação Acadêmica & Cursos'}
        items={data.formacao}
        onChange={(v) => onChange({ formacao: v })}
        fields={formacaoFields}
        artistName={artistName}
      />

      <TrajectorySection
        title={T.list_solo_exhibitions || 'Exposições Individuais'}
        items={data.expos_individuais}
        onChange={(v) => onChange({ expos_individuais: v })}
        fields={exposIndividuaisFields}
        artistName={artistName}
      />

      <TrajectorySection
        title={T.list_group_exhibitions || 'Exposições Coletivas'}
        items={data.expos_coletivas}
        onChange={(v) => onChange({ expos_coletivas: v })}
        fields={exposColetivasFields}
        artistName={artistName}
      />

      <TrajectorySection
        title={T.list_residencies || 'Residências Artísticas'}
        items={data.residencias}
        onChange={(v) => onChange({ residencias: v })}
        fields={residenciasFields}
        artistName={artistName}
      />

      <TrajectorySection
        title={T.list_awards || 'Prêmios & Reconhecimentos'}
        items={data.premios}
        onChange={(v) => onChange({ premios: v })}
        fields={premiosFields}
        artistName={artistName}
      />

      <TrajectorySection
        title={T.list_grants || 'Bolsas & Fomentos'}
        items={data.bolsas}
        onChange={(v) => onChange({ bolsas: v })}
        fields={premiosFields}
        artistName={artistName}
      />

      <TrajectorySection
        title={T.list_art_fairs || 'Feiras de Arte'}
        items={data.feiras}
        onChange={(v) => onChange({ feiras: v })}
        fields={feirasFields}
        artistName={artistName}
      />

      <TrajectorySection
        title={T.list_publications || 'Publicações & Bibliografia'}
        items={data.publicacoes}
        onChange={(v) => onChange({ publicacoes: v })}
        fields={publicacoesFields}
        artistName={artistName}
      />

      <TrajectorySection
        title={T.list_public_collections || 'Coleções Públicas'}
        items={data.colecoesPublicas}
        onChange={(v) => onChange({ colecoesPublicas: v })}
        fields={colecoesPublicasFields}
        artistName={artistName}
      />

      <TrajectorySection
        title={T.list_private_collections || 'Coleções Privadas & Corporativas'}
        items={data.colecoesPrivadas}
        onChange={(v) => onChange({ colecoesPrivadas: v })}
        fields={colecoesPrivadasFields}
        artistName={artistName}
      />

      <TrajectorySection
        title={T.list_clipping || 'Clipping & Mídia'}
        items={data.clipping}
        onChange={(v) => onChange({ clipping: v })}
        fields={clippingFields}
        artistName={artistName}
      />
    </div>
  );
}
