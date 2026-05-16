export interface Obra {
  id: string;
  titulo: string;
  descricao?: string;
  ano: number;
  dimensoes: string; // ex: 100x120 cm
  materiais: string[];
  suporte: string; // ex: tela, papel
  preco?: number;
  status: 'disponivel' | 'vendido' | 'acervo_pessoal' | 'em_exposicao';
  localizacao?: string;
  imagens: ImagemObra[];
  notaCuratorial?: string; // gerada pela IA
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface ImagemObra {
  id: string;
  url: string;
  isPrincipal: boolean;
  ordem: number;
}

export interface Material {
  id: string;
  nome: string;
  categoria: string; // ex: tinta, pincel, papel
  quantidade: number;
  unidade: string;
  status_estoque: 'ok' | 'baixo' | 'esgotado';
  ultima_compra?: string;
}

export interface DashboardMetrics {
  totalObras: number;
  obrasDisponiveis: number;
  valorEstimado: number;
  exposicoesAtivas: number;
}
