import { useState } from 'react';
import { Plus, Search, Camera, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

type Status = 'Em Estoque' | 'Acabando' | 'Esgotado';

interface Material {
  id: string;
  nome: string;
  marca: string;
  categoria: string;
  status: Status;
  especificacoes: string[];
  dataAquisicao: string;
}

const mockMateriais: Material[] = [
  {
    id: '1',
    nome: 'Tinta Óleo Titânio Branco',
    marca: 'W&N Professional',
    categoria: 'Tintas',
    status: 'Acabando',
    especificacoes: ['Tubo 200ml', 'Opaco', 'Série 1'],
    dataAquisicao: '15/03/2023'
  },
  {
    id: '2',
    nome: 'Papel Arches Aquarelle',
    marca: 'Arches',
    categoria: 'Papéis',
    status: 'Em Estoque',
    especificacoes: ['300g/m²', '100% Algodão', '56x76cm'],
    dataAquisicao: '02/05/2023'
  },
  {
    id: '3',
    nome: 'Medium Liquin Original',
    marca: 'Winsor & Newton',
    categoria: 'Médios',
    status: 'Esgotado',
    especificacoes: ['Garrafa 250ml', 'Secagem rápida'],
    dataAquisicao: '10/01/2023'
  },
  {
    id: '4',
    nome: 'Tela Lona Belga',
    marca: 'Paris Telas',
    categoria: 'Suportes',
    status: 'Em Estoque',
    especificacoes: ['100x100cm', 'Linho', 'Chassi Duplo'],
    dataAquisicao: '20/06/2023'
  }
];

const FILTERS = ['Todos', 'Tintas', 'Papéis', 'Suportes', 'Ferramentas', 'Médios'];

export default function Materiais() {
  const { t } = useTranslation();
  const [activeFilter, setActiveFilter] = useState('Todos');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filteredMateriais = mockMateriais.filter(m => {
    const matchesFilter = activeFilter === 'Todos' || m.categoria === activeFilter;
    const matchesSearch = m.nome.toLowerCase().includes(search.toLowerCase()) || m.marca.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getStatusColor = (status: Status) => {
    switch(status) {
      case 'Em Estoque': return 'bg-emerald-950/20 text-emerald-400 border-emerald-900/40';
      case 'Acabando': return 'bg-rose-950/20 text-rose-400 border-rose-900/40';
      case 'Esgotado': return 'bg-surface text-text-muted border-border';
      default: return 'bg-surface text-text-muted border-border';
    }
  };

  return (
    <div className="max-w-[1200px] mx-auto pb-12 relative">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-serif mb-2 text-text-main">{t('materiais.title')}</h1>
          <p className="text-text-muted">Gerencie tintas, papéis, suportes e ferramentas do ateliê.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-6 py-3 bg-gold text-bg rounded-xl font-bold hover:bg-gold-light transition-all hover-lift shadow-gold-glow"
        >
          <Plus size={20} /> {t('materiais.cadastrar').replace('+ ', '')}
        </button>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center mb-8">
        <div className="flex gap-2 overflow-x-auto w-full pb-2 md:pb-0 hide-scrollbar">
          {FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${activeFilter === f ? 'bg-gold text-bg font-bold shadow-gold-glow-sm' : 'bg-surface border border-border text-text-muted hover:border-gold/50 hover:text-text-main'}`}
            >
              {f}
            </button>
          ))}
        </div>
        
        <div className="relative w-full md:w-64 shrink-0">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input 
            type="text" 
            placeholder="Buscar material..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-surface/50 text-sm focus:border-gold focus:ring-1 focus:ring-gold/30 outline-none text-text-main transition-all placeholder-text-muted"
          />
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredMateriais.map(mat => (
          <div key={mat.id} className="glass-slab rounded-2xl p-5 hover-lift-3d hover:shadow-gold-glow-sm transition-all duration-300 group relative overflow-hidden">
            <div className="flex justify-between items-start mb-4">
              <span className="text-xs font-bold text-gold bg-gold/10 border border-gold/15 px-2.5 py-1 rounded-md font-mono">
                {mat.categoria}
              </span>
              <span className={`text-[11px] font-bold px-2 py-1 rounded-md border ${getStatusColor(mat.status)}`}>
                {mat.status}
              </span>
            </div>
            
            <h3 className="font-serif text-gold font-bold text-lg leading-tight mb-1">{mat.nome}</h3>
            <p className="text-text-muted text-sm mb-4">{mat.marca}</p>

            <div className="flex flex-wrap gap-1.5 mb-4">
              {mat.especificacoes.map((esp, i) => (
                <span key={i} className="text-[10px] text-text-muted bg-surface/50 border border-border/60 px-2 py-0.5 rounded-sm font-mono">
                  {esp}
                </span>
              ))}
            </div>

            <div className="pt-4 border-t border-border text-xs text-text-muted flex justify-between items-center">
              <span>Adquirido em {mat.dataAquisicao}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-surface border border-border w-full max-w-2xl rounded-2xl shadow-gold-glow overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-border bg-surface-raised/35">
              <h2 className="text-xl font-serif text-gold font-bold">{t('materiais.cadastrar').replace('+ ', '')}</h2>
              <button onClick={() => setIsModalOpen(false)}
                aria-label="Fechar"
                className="text-text-muted hover:text-text-main transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6 max-h-[70vh] overflow-y-auto">
              {/* AI Scanner Trigger */}
              <div className="mb-6">
                <button className="w-full border border-dashed border-gold/45 bg-gold/5 text-gold py-6 rounded-xl flex flex-col items-center justify-center gap-2 hover:bg-gold/10 transition-all shadow-gold-glow-sm">
                  <Camera size={28} />
                  <span className="font-bold">{t('materiais.identificar_foto')}</span>
                  <span className="text-xs opacity-70">A IA (Groq) preencherá os dados automaticamente lendo o rótulo.</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label htmlFor="mat-nome" className="block text-sm font-bold text-text-muted mb-1">{t('materiais.nome')}</label>
                  <input id="mat-nome" type="text" aria-label={t('materiais.nome')}
                    className="w-full border border-border rounded-lg px-4 py-2 text-sm focus:border-gold focus:ring-1 focus:ring-gold/30 outline-none bg-surface/50 text-text-main transition-all" />
                </div>
                <div>
                  <label htmlFor="mat-marca" className="block text-sm font-bold text-text-muted mb-1">{t('materiais.marca')}</label>
                  <input id="mat-marca" type="text" aria-label={t('materiais.marca')}
                    className="w-full border border-border rounded-lg px-4 py-2 text-sm focus:border-gold focus:ring-1 focus:ring-gold/30 outline-none bg-surface/50 text-text-main transition-all" />
                </div>
                <div>
                  <label htmlFor="mat-categoria" className="block text-sm font-bold text-text-muted mb-1">{t('materiais.categoria')}</label>
                  <select id="mat-categoria" aria-label={t('materiais.categoria')}
                    className="w-full border border-border rounded-lg px-4 py-2 text-sm focus:border-gold focus:ring-1 focus:ring-gold/30 outline-none bg-surface/50 text-text-main transition-all cursor-pointer">
                    {FILTERS.slice(1).map(f => <option key={f}>{f}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="mat-quantidade" className="block text-sm font-bold text-text-muted mb-1">{t('materiais.quantidade')}</label>
                  <input id="mat-quantidade" type="number" aria-label={t('materiais.quantidade')}
                    className="w-full border border-border rounded-lg px-4 py-2 text-sm focus:border-gold focus:ring-1 focus:ring-gold/30 outline-none bg-surface/50 text-text-main transition-all" />
                </div>
                <div>
                  <label htmlFor="mat-unidade" className="block text-sm font-bold text-text-muted mb-1">{t('materiais.unidade')}</label>
                  <input id="mat-unidade" type="text" aria-label={t('materiais.unidade')}
                    className="w-full border border-border rounded-lg px-4 py-2 text-sm focus:border-gold focus:ring-1 focus:ring-gold/30 outline-none bg-surface/50 text-text-main transition-all" />
                </div>
                <div className="col-span-2">
                  <label htmlFor="mat-especificacoes" className="block text-sm font-bold text-text-muted mb-1">Especificações</label>
                  <input id="mat-especificacoes" type="text" aria-label="Especificações" placeholder="Ex: Opaco, Secagem rápida, Série 1"
                    className="w-full border border-border rounded-lg px-4 py-2 text-sm focus:border-gold focus:ring-1 focus:ring-gold/30 outline-none bg-surface/50 text-text-main transition-all placeholder-text-muted" />
                </div>
                <div>
                  <label htmlFor="mat-status" className="block text-sm font-bold text-text-muted mb-1">{t('materiais.status')}</label>
                  <select id="mat-status" aria-label={t('materiais.status')}
                    className="w-full border border-border rounded-lg px-4 py-2 text-sm focus:border-gold focus:ring-1 focus:ring-gold/30 outline-none bg-surface/50 text-text-main transition-all cursor-pointer">
                    <option>Em Estoque</option>
                    <option>Acabando</option>
                    <option>Esgotado</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="mat-data" className="block text-sm font-bold text-text-muted mb-1">{t('materiais.data_aquisicao')}</label>
                  <input id="mat-data" type="date" aria-label={t('materiais.data_aquisicao')}
                    className="w-full border border-border rounded-lg px-4 py-2 text-sm focus:border-gold focus:ring-1 focus:ring-gold/30 outline-none bg-surface/50 text-text-main transition-all" />
                </div>
                <div className="col-span-2">
                  <label htmlFor="mat-notas" className="block text-sm font-bold text-text-muted mb-1">{t('materiais.notas')}</label>
                  <textarea id="mat-notas" aria-label={t('materiais.notas')}
                    className="w-full border border-border rounded-lg px-4 py-2 text-sm focus:border-gold focus:ring-1 focus:ring-gold/30 outline-none bg-surface/50 text-text-main h-20 resize-none transition-all"></textarea>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-border flex justify-end gap-3 bg-surface-raised/35">
              <button onClick={() => setIsModalOpen(false)} className="px-6 py-2 rounded-lg font-bold bg-surface border border-border text-text-main hover:bg-surface-raised transition-all">
                {t('common.cancelar')}
              </button>
              <button className="px-6 py-2 rounded-lg font-bold bg-gold text-bg hover:bg-gold-light shadow-gold-glow hover-lift transition-all">
                {t('common.salvar')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
