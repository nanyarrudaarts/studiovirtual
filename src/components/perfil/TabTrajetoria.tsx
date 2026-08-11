import { Award, BookOpen, Bookmark, FileText } from 'lucide-react';
import { AddList, type ListItem } from './AddList';

interface Props {
  isEditing: boolean;
  t: (k: string, fallback?: string | any) => string;
  formacao: ListItem[];
  setFormacao: (items: ListItem[]) => void;
  premios: ListItem[];
  setPremios: (items: ListItem[]) => void;
  bolsas: ListItem[];
  setBolsas: (items: ListItem[]) => void;
  residencias: ListItem[];
  setResidencias: (items: ListItem[]) => void;
  exposIndividuais: ListItem[];
  setExposIndividuais: (items: ListItem[]) => void;
  exposColetivas: ListItem[];
  setExposColetivas: (items: ListItem[]) => void;
  feiras: ListItem[];
  setFeiras: (items: ListItem[]) => void;
  bienais: ListItem[];
  setBienais: (items: ListItem[]) => void;
  bibliografia: ListItem[];
  setBibliografia: (items: ListItem[]) => void;
  publicacoesAutora: ListItem[];
  setPublicacoesAutora: (items: ListItem[]) => void;
  clipping: ListItem[];
  setClipping: (items: ListItem[]) => void;
  colecoesPublicas: ListItem[];
  setColecoesPublicas: (items: ListItem[]) => void;
  colecoesPrivadas: ListItem[];
  setColecoesPrivadas: (items: ListItem[]) => void;
}

export function TabTrajetoria({
  isEditing,
  t,
  formacao,
  setFormacao,
  premios,
  setPremios,
  bolsas,
  setBolsas,
  residencias,
  setResidencias,
  exposIndividuais,
  setExposIndividuais,
  exposColetivas,
  setExposColetivas,
  feiras,
  setFeiras,
  bienais,
  setBienais,
  bibliografia,
  setBibliografia,
  publicacoesAutora,
  setPublicacoesAutora,
  clipping,
  setClipping,
  colecoesPublicas,
  setColecoesPublicas,
  colecoesPrivadas,
  setColecoesPrivadas,
}: Props) {
  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Formação Acadêmica & Prêmios */}
      <section className="glass-slab rounded-2xl overflow-hidden">
        <div className="px-7 py-5 border-b border-border bg-surface-raised/35 flex items-center gap-2">
          <BookOpen size={20} className="text-gold" />
          <h2 className="text-lg font-serif text-gold font-bold">{t('perfil.formacao_premios', 'Formação Acadêmica & Prêmios')}</h2>
        </div>
        <div className="p-7 space-y-8">
          {/* Formação */}
          <AddList title={t('perfil.educacao', 'Educação / Formação')} items={formacao} disabled={!isEditing} onChange={setFormacao} t={t} fields={[
            { key: 'curso', label: t('perfil.curso', 'Curso / Habilitação') },
            {
              key: 'tipo',
              label: t('perfil.tipo_curso', 'Tipo'),
              options: ['Graduação', 'Mestrado', 'Doutorado', 'Especialização', 'Curso Livre', 'Workshop', 'Mentoria']
            },
            { key: 'instituicao', label: t('perfil.instituicao', 'Instituição') },
            { key: 'cidade', label: t('perfil.cidade', 'Cidade') },
            { key: 'pais', label: t('perfil.pais', 'País') },
            { key: 'anoInicio', label: t('perfil.ano_inicio', 'Ano de Início'), type: 'number' },
            { key: 'anoFim', label: t('perfil.ano_fim', 'Ano de Conclusão'), type: 'number' },
            { key: 'descricao', label: t('perfil.descricao', 'Descrição (Opcional)'), className: 'col-span-2' },
          ]} />

          {/* Prêmios */}
          <div className="border-t border-border pt-8">
            <AddList title={t('perfil.premios_distincoes', 'Prêmios, Distinções & Títulos')} items={premios} disabled={!isEditing} onChange={setPremios} t={t} fields={[
              { key: 'nome', label: t('perfil.nome_premio', 'Nome do Prêmio') },
              { key: 'categoria', label: t('perfil.categoria', 'Categoria') },
              { key: 'instituicao', label: t('perfil.instituicao', 'Instituição Outorgante') },
              { key: 'cidade', label: t('perfil.cidade', 'Cidade') },
              { key: 'pais', label: t('perfil.pais', 'País') },
              { key: 'ano', label: t('perfil.ano', 'Ano'), type: 'number' },
              { key: 'colocacao', label: t('perfil.colocacao', 'Colocação / Seleção') },
              { key: 'descricao', label: t('perfil.descricao', 'Descrição (Opcional)'), className: 'col-span-2' },
            ]} />
          </div>

          {/* Bolsas & Grants */}
          <div className="border-t border-border pt-8">
            <AddList title={t('perfil.bolsas_grants', 'Bolsas, Grants e Fomentos')} items={bolsas} disabled={!isEditing} onChange={setBolsas} t={t} fields={[
              { key: 'nome', label: t('perfil.nome_bolsa', 'Nome da Bolsa / Fomento') },
              { key: 'instituicao', label: t('perfil.instituicao', 'Instituição Financiadora') },
              { key: 'pais', label: t('perfil.pais', 'País') },
              { key: 'ano', label: t('perfil.ano', 'Ano'), type: 'number' },
              { key: 'valor', label: t('perfil.valor_grant', 'Valor (Opcional)') },
              { key: 'descricao', label: t('perfil.descricao', 'Descrição do Projeto Contemplado'), className: 'col-span-2' },
            ]} />
          </div>
        </div>
      </section>

      {/* Exposições & Residências */}
      <section className="glass-slab rounded-2xl overflow-hidden">
        <div className="px-7 py-5 border-b border-border bg-surface-raised/35 flex items-center gap-2">
          <Award size={20} className="text-gold" />
          <h2 className="text-lg font-serif text-gold font-bold">{t('perfil.trajetoria_expositiva', 'Trajetória Expositiva & Residências')}</h2>
        </div>
        <div className="p-7 space-y-8">
          {/* Residências */}
          <AddList title={t('perfil.residencias_artisticas', 'Residências Artísticas')} items={residencias} disabled={!isEditing} onChange={setResidencias} t={t} fields={[
            { key: 'nome', label: t('perfil.nome_residencia', 'Nome da Residência') },
            { key: 'instituicao', label: t('perfil.instituicao', 'Instituição Organizadora') },
            { key: 'cidade', label: t('perfil.cidade', 'Cidade') },
            { key: 'pais', label: t('perfil.pais', 'País') },
            { key: 'ano', label: t('perfil.ano', 'Ano'), type: 'number' },
            { key: 'curador', label: t('perfil.curador_opcional', 'Curador / Orientador') },
            { key: 'descricao', label: t('perfil.descricao', 'Resumo da Experiência / Obra Produzida'), className: 'col-span-2' },
          ]} />

          {/* Individuais */}
          <div className="border-t border-border pt-8">
            <AddList title={t('perfil.individuais', 'Exposições Individuais')} items={exposIndividuais} disabled={!isEditing} onChange={setExposIndividuais} t={t} fields={[
              { key: 'titulo', label: t('perfil.titulo_expo', 'Título da Exposição') },
              { key: 'local', label: t('perfil.galeria_museu', 'Espaço / Galeria / Museu') },
              { key: 'curador', label: t('perfil.curador_opcional', 'Curadoria') },
              { key: 'cidade', label: t('perfil.cidade', 'Cidade') },
              { key: 'pais', label: t('perfil.pais', 'País') },
              { key: 'ano', label: t('perfil.ano', 'Ano'), type: 'number' },
              { key: 'link', label: t('perfil.link_opcional', 'Link para registro ou catálogo') },
              { key: 'descricao', label: t('perfil.descricao', 'Breve descrição / Conceito exposto'), className: 'col-span-2' },
            ]} />
          </div>

          {/* Coletivas */}
          <div className="border-t border-border pt-8">
            <AddList title={t('perfil.coletivas', 'Exposições Coletivas')} items={exposColetivas} disabled={!isEditing} onChange={setExposColetivas} t={t} fields={[
              { key: 'titulo', label: t('perfil.titulo_expo', 'Título da Exposição') },
              { key: 'local', label: t('perfil.galeria_museu', 'Espaço / Galeria / Museu') },
              { key: 'curador', label: t('perfil.curador_opcional', 'Curadoria') },
              { key: 'cidade', label: t('perfil.cidade', 'Cidade') },
              { key: 'pais', label: t('perfil.pais', 'País') },
              { key: 'ano', label: t('perfil.ano', 'Ano'), type: 'number' },
              { key: 'participacao', label: t('perfil.obras_expostas', 'Obras expostas') },
              { key: 'link', label: t('perfil.link_opcional', 'Link da exposição') },
            ]} />
          </div>

          {/* Feiras de Arte */}
          <div className="border-t border-border pt-8">
            <AddList title={t('perfil.feiras_arte', 'Feiras de Arte')} items={feiras} disabled={!isEditing} onChange={setFeiras} t={t} fields={[
              { key: 'nome', label: t('perfil.nome_feira', 'Nome da Feira') },
              { key: 'galeria', label: t('perfil.galeria_representante', 'Galeria Representante') },
              { key: 'cidade', label: t('perfil.cidade', 'Cidade') },
              { key: 'pais', label: t('perfil.pais', 'País') },
              { key: 'ano', label: t('perfil.ano', 'Ano'), type: 'number' },
            ]} />
          </div>

          {/* Bienais e Festivais */}
          <div className="border-t border-border pt-8">
            <AddList title={t('perfil.bienais_festivais', 'Bienais & Festivais')} items={bienais} disabled={!isEditing} onChange={setBienais} t={t} fields={[
              { key: 'nome', label: t('perfil.nome_evento', 'Nome da Bienal ou Festival') },
              { key: 'obra', label: t('perfil.obra_exposta', 'Título da Obra / Projeto Exposto') },
              { key: 'curadoria', label: t('perfil.curador_opcional', 'Curador responsável') },
              { key: 'cidade', label: t('perfil.cidade', 'Cidade') },
              { key: 'pais', label: t('perfil.pais', 'País') },
              { key: 'ano', label: t('perfil.ano', 'Ano'), type: 'number' },
              { key: 'link', label: t('perfil.link_opcional', 'Link oficial'), className: 'col-span-2' },
            ]} />
          </div>
        </div>
      </section>

      {/* Publicações e Fortuna Crítica */}
      <section className="glass-slab rounded-2xl overflow-hidden">
        <div className="px-7 py-5 border-b border-border bg-surface-raised/35 flex items-center gap-2">
          <FileText size={20} className="text-gold" />
          <h2 className="text-lg font-serif text-gold font-bold">{t('perfil.publicacoes_critica', 'Publicações & Fortuna Crítica')}</h2>
        </div>
        <div className="p-7 space-y-8">
          {/* Bibliografia Crítica */}
          <AddList title={t('perfil.bibliografia_sobre', 'Bibliografia (Textos Críticos e Ensaios sobre a Artista)')} items={bibliografia} disabled={!isEditing} onChange={setBibliografia} t={t} fields={[
            { key: 'titulo', label: t('perfil.titulo_texto', 'Título do Texto / Resenha') },
            { key: 'autor', label: t('perfil.autor_critico', 'Autor / Crítico') },
            { key: 'veiculo', label: t('perfil.veiculo_publicacao', 'Veículo, Catálogo ou Revista') },
            { key: 'ano', label: t('perfil.ano', 'Ano'), type: 'number' },
            { key: 'link', label: t('perfil.link_opcional', 'Link para leitura'), className: 'col-span-2' },
          ]} />

          {/* Publicações da Artista */}
          <div className="border-t border-border pt-8">
            <AddList title={t('perfil.publicacoes_autora', 'Publicações da Artista (Livros, Zines, Artigos)')} items={publicacoesAutora} disabled={!isEditing} onChange={setPublicacoesAutora} t={t} fields={[
              { key: 'titulo', label: t('perfil.titulo_publicacao', 'Título da Publicação') },
              {
                key: 'tipo',
                label: t('perfil.tipo_publicacao', 'Tipo'),
                options: ['Livro de Artista', 'Livro Acadêmico', 'Zine', 'Artigo de Opinião', 'Ensaio Teórico', 'Outro']
              },
              { key: 'editora', label: t('perfil.editora', 'Editora / Auto-publicação') },
              { key: 'cidade', label: t('perfil.cidade', 'Cidade') },
              { key: 'pais', label: t('perfil.pais', 'País') },
              { key: 'ano', label: t('perfil.ano', 'Ano'), type: 'number' },
              { key: 'link', label: t('perfil.link_opcional', 'Link oficial'), className: 'col-span-2' },
            ]} />
          </div>

          {/* Clipping / Press */}
          <div className="border-t border-border pt-8">
            <AddList title={t('perfil.clipping_press', 'Clipping / Press (Matérias, Entrevistas e Mídia)')} items={clipping} disabled={!isEditing} onChange={setClipping} t={t} fields={[
              { key: 'titulo', label: t('perfil.titulo_materia', 'Título da Matéria / Entrevista') },
              { key: 'veiculo', label: t('perfil.veiculo_comunicacao', 'Veículo de Comunicação') },
              { key: 'autor', label: t('perfil.autor_jornalista', 'Jornalista (Opcional)') },
              { key: 'data', label: t('perfil.data_publicacao', 'Data de Publicação'), type: 'date' },
              {
                key: 'tipo',
                label: t('perfil.tipo_midia', 'Tipo de Mídia'),
                options: ['Online', 'Impresso', 'TV / Vídeo', 'Rádio / Podcast']
              },
              { key: 'link', label: t('perfil.link_opcional', 'Link da matéria'), className: 'col-span-2' },
            ]} />
          </div>
        </div>
      </section>

      {/* Coleções */}
      <section className="glass-slab rounded-2xl overflow-hidden">
        <div className="px-7 py-5 border-b border-border bg-surface-raised/35 flex items-center gap-2">
          <Bookmark size={20} className="text-gold" />
          <h2 className="text-lg font-serif text-gold font-bold">{t('perfil.colecoes_acervos', 'Coleções & Acervos')}</h2>
        </div>
        <div className="p-7 space-y-8">
          {/* Coleções Públicas */}
          <AddList title={t('perfil.colecoes_publicas', 'Coleções Públicas (Museus, Centros Culturais)')} items={colecoesPublicas} disabled={!isEditing} onChange={setColecoesPublicas} t={t} fields={[
            { key: 'instituicao', label: t('perfil.instituicao_acervo', 'Nome da Instituição / Museu') },
            { key: 'cidade', label: t('perfil.cidade', 'Cidade') },
            { key: 'pais', label: t('perfil.pais', 'País') },
            { key: 'obra', label: t('perfil.obra_acervo', 'Obra incorporada ao Acervo') },
            { key: 'ano', label: t('perfil.ano_aquisicao', 'Ano de Aquisição'), type: 'number' },
          ]} />

          {/* Coleções Privadas */}
          <div className="border-t border-border pt-8">
            <AddList title={t('perfil.colecoes_privadas', 'Coleções Privadas (Colecionadores Relevantes)')} items={colecoesPrivadas} disabled={!isEditing} onChange={setColecoesPrivadas} t={t} fields={[
              { key: 'colecionador', label: t('perfil.colecionador', 'Nome do Colecionador / Nome da Coleção') },
              { key: 'pais', label: t('perfil.pais_regiao', 'País / Região') },
              { key: 'ano', label: t('perfil.ano_aquisicao', 'Ano de Aquisição'), type: 'number' },
            ]} />
          </div>
        </div>
      </section>
    </div>
  );
}
