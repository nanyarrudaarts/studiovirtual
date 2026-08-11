export const COUNTRIES = [
  'Brasil', 'Portugal', 'Estados Unidos', 'França', 'Alemanha', 'Reino Unido', 'Itália', 'Espanha',
  'Suíça', 'Japão', 'Argentina', 'México', 'Colômbia', 'Chile', 'Uruguai', 'Holanda', 'Bélgica',
  'Áustria', 'Canadá', 'Austrália', 'China', 'Coreia do Sul', 'África do Sul', 'Outro'
];

export const CITIES = [
  'São Paulo', 'Rio de Janeiro', 'Belo Horizonte', 'Porto Alegre', 'Curitiba', 'Salvador', 'Brasília',
  'Recife', 'Fortaleza', 'Florianópolis', 'Belém', 'Manaus', 'Porto', 'Lisboa', 'Nova York', 'Londres',
  'Paris', 'Berlim', 'Roma', 'Veneza', 'Madri', 'Barcelona', 'Basileia', 'Zurique', 'Tóquio',
  'Buenos Aires', 'Cidade do México', 'Bogotá', 'Santiago', 'Montevidéu', 'Amsterdã', 'Bruxelas', 'Viena'
];

export const GALLERIES_AND_INSTITUTIONS = [
  'Masp — Museu de Arte de São Paulo',
  'Pinacoteca do Estado de São Paulo',
  'MAM — Museu de Arte Moderna de São Paulo',
  'MAM — Museu de Arte Moderna do Rio de Janeiro',
  'MAC USP — Museu de Arte Contemporânea da USP',
  'Instituto Tomie Ohtake',
  'Itaú Cultural',
  'Sesc SP',
  'Centro Cultural Banco do Brasil (CCBB)',
  'Inhotim',
  'MAR — Museu de Arte do Rio',
  'Fundação Iberê Camargo',
  'Galeria Luisa Strina',
  'Fortes D\'Aloia & Gabriel',
  'Mendes Wood DM',
  'A Gentil Carioca',
  'Casa Triângulo',
  'Galeria Nara Roesler',
  'Vermelho',
  'Galeria Millan',
  'Zilberman Gallery',
  'MoMA — Museum of Modern Art (NY)',
  'Tate Modern (Londres)',
  'Centre Pompidou (Paris)',
  'Palais de Tokyo (Paris)',
  'Guggenheim Museum',
  'Museo Reina Sofía (Madri)',
  'Fundación Proa (Buenos Aires)'
];

export const CURATORS = [
  'Adriano Pedrosa', 'Agnaldo Farias', 'Aracy Amaral', 'Cauê Alves', 'Clarissa Diniz',
  'Consuelo Cornelsen', 'Cristiana Tejo', 'Daniel Rangel', 'Denilson Baniwa', 'Eder Chiodetto',
  'Hélio Menezes', 'Jochen Volz', 'Lisette Lagnado', 'Luiz Camillo Osorio', 'Marcio Harum',
  'Moacir dos Anjos', 'Paulo Miyada', 'Paulo Herkenhoff', 'Rosana Paulino', 'Taisa Palhares',
  'Vicente de Mello', 'Hans Ulrich Obrist', 'Massimiliano Gioni', 'Cecilia Alemani'
];

export const ART_FAIRS = [
  'SP-Arte (São Paulo)',
  'Art Rio (Rio de Janeiro)',
  'Art Basel (Suíça)',
  'Art Basel Miami Beach',
  'Frieze London',
  'Frieze New York',
  'ARCOmadrid',
  'Pinta Miami',
  'BA-photo (Buenos Aires)',
  'ArtBO (Bogotá)',
  'PARC (Lima)',
  'FIAC (Paris)'
];

export const MEDIA_OUTLETS = [
  'Folha de S.Paulo',
  'O Estado de S. Paulo',
  'O Globo',
  'Revista Select',
  'Arte!Brasileiros',
  'ZUM — Revista de Fotografia',
  'Revista DASartes',
  'Artforum',
  'Frieze Magazine',
  'The Art Newspaper',
  'Hyperallergic',
  'Cultura FM / TV Cultura',
  'Globo News / Arte 1'
];

export const EXHIBITION_TYPES = [
  'Exposição coletiva',
  'Bienal',
  'Trienal',
  'Salão',
  'Mostra',
  'Outro'
];

export const RESIDENCY_TYPES = [
  'Residência artística',
  'Fellowship',
  'Programa internacional',
  'Outro'
];

export const RESIDENCY_DURATIONS = [
  'Menos de 1 mês',
  '1–3 meses',
  '3–6 meses',
  '6–12 meses',
  'Mais de 1 ano'
];

export const AWARD_TYPES = [
  'Prêmio',
  'Bolsa',
  'Fomento',
  'Menção honrosa',
  'Reconhecimento'
];

export const AWARD_RESULTS = [
  '1º lugar',
  '2º lugar',
  '3º lugar',
  'Finalista',
  'Selecionado',
  'Menção honrosa',
  'Beneficiário'
];

export const FAIR_PARTICIPATION_TYPES = [
  'Artista representado',
  'Galeria',
  'Stand próprio',
  'Participação coletiva'
];

export const PUBLICATION_TYPES = [
  'Livro',
  'Catálogo',
  'Revista',
  'Jornal',
  'Entrevista',
  'Ensaio',
  'Artigo',
  'Website',
  'Outro'
];

export const PUBLICATION_FORMATS = [
  'Impresso',
  'Digital',
  'Impresso + Digital'
];

export const PUBLICATION_LANGUAGES = [
  'Português',
  'Inglês',
  'Espanhol',
  'Francês',
  'Alemão',
  'Outro'
];

export const COLLECTION_TYPES = [
  'Pública',
  'Privada',
  'Corporativa'
];

export const COLLECTION_AUTHORIZATIONS = [
  'Nome autorizado',
  'Nome não autorizado',
  'Anônimo'
];

export const MEDIA_TYPES = [
  'Jornal',
  'Revista',
  'TV',
  'Rádio',
  'Podcast',
  'Website',
  'YouTube',
  'Instagram',
  'Outro'
];

export const CONTENT_TYPES = [
  'Entrevista',
  'Crítica',
  'Reportagem',
  'Resenha',
  'Nota',
  'Perfil',
  'Documentário'
];

// Gerador de anos (2026 até 1950)
export const YEARS_LIST = Array.from({ length: 77 }, (_, i) => String(2026 - i));
