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
      case 'Em Estoque': return 'bg-emerald-50 text-emerald-600 border-emerald-200';
      case 'Acabando': return 'bg-rose-50 text-rose-600 border-rose-200';
      case 'Esgotado': return 'bg-gray-100 text-gray-500 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="max-w-[1200px] mx-auto pb-12 relative">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-serif mb-2">{t('materiais.title')}</h1>
          <p className="text-text-muted">Gerencie tintas, papéis, suportes e ferramentas do ateliê.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-6 py-3 bg-accent text-white rounded-xl font-bold hover:bg-accent/90 transition-all hover:-translate-y-0.5 shadow-md"
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
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${activeFilter === f ? 'bg-accent text-white shadow-sm' : 'bg-surface border border-gray-200 text-text-muted hover:border-accent/50'}`}
            >
              {f}
            </button>
          ))}
        </div>
        
        <div className="relative w-full md:w-64 shrink-0">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            placeholder="Buscar material..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-surface text-sm focus:border-accent outline-none"
          />
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredMateriais.map(mat => (
          <div key={mat.id} className="bg-surface border border-gray-100 rounded-2xl p-5 hover:shadow-float transition-all group relative overflow-hidden">
            <div className="flex justify-between items-start mb-4">
              <span className="text-xs font-bold text-accent bg-accent/5 px-2 py-1 rounded-md">
                {mat.categoria}
              </span>
              <span className={`text-[11px] font-bold px-2 py-1 rounded-md border ${getStatusColor(mat.status)}`}>
                {mat.status}
              </span>
            </div>
            
            <h3 className="font-serif text-lg leading-tight mb-1">{mat.nome}</h3>
            <p className="text-text-muted text-sm mb-4">{mat.marca}</p>

            <div className="flex flex-wrap gap-1.5 mb-4">
              {mat.especificacoes.map((esp, i) => (
                <span key={i} className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-sm">
                  {esp}
                </span>
              ))}
            </div>

            <div className="pt-4 border-t border-gray-100 text-xs text-gray-400 flex justify-between items-center">
              <span>Adquirido em {mat.dataAquisicao}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-surface w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-xl font-serif">{t('materiais.cadastrar').replace('+ ', '')}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-text-main transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6 max-h-[70vh] overflow-y-auto">
              {/* AI Scanner Trigger */}
              <div className="mb-6">
                <button className="w-full border-2 border-dashed border-accent/30 bg-accent/5 text-accent py-6 rounded-xl flex flex-col items-center justify-center gap-2 hover:bg-accent/10 transition-colors">
                  <Camera size={28} />
                  <span className="font-bold">{t('materiais.identificar_foto')}</span>
                  <span className="text-xs opacity-70">A IA (Gemini) preencherá os dados automaticamente lendo o rótulo.</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-bold text-text-muted mb-1">{t('materiais.nome')}</label>
                  <input type="text" className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:border-accent outline-none bg-bg" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-text-muted mb-1">{t('materiais.marca')}</label>
                  <input type="text" className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:border-accent outline-none bg-bg" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-text-muted mb-1">{t('materiais.categoria')}</label>
                  <select className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:border-accent outline-none bg-bg">
                    {FILTERS.slice(1).map(f => <option key={f}>{f}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-text-muted mb-1">{t('materiais.quantidade')}</label>
                  <input type="number" className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:border-accent outline-none bg-bg" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-text-muted mb-1">{t('materiais.unidade')}</label>
                  <input type="text" className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:border-accent outline-none bg-bg" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-bold text-text-muted mb-1">Especificações</label>
                  <input type="text" placeholder="Ex: Opaco, Secagem rápida, Série 1" className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:border-accent outline-none bg-bg" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-text-muted mb-1">{t('materiais.status')}</label>
                  <select className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:border-accent outline-none bg-bg">
                    <option>Em Estoque</option>
                    <option>Acabando</option>
                    <option>Esgotado</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-text-muted mb-1">{t('materiais.data_aquisicao')}</label>
                  <input type="date" className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:border-accent outline-none bg-bg" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-bold text-text-muted mb-1">{t('materiais.notas')}</label>
                  <textarea className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:border-accent outline-none bg-bg h-20 resize-none"></textarea>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-bg">
              <button onClick={() => setIsModalOpen(false)} className="px-6 py-2 rounded-lg font-medium bg-white border border-gray-200 hover:bg-gray-50">
                {t('common.cancelar')}
              </button>
              <button className="px-6 py-2 rounded-lg font-bold bg-accent text-white hover:bg-accent/90">
                {t('common.salvar')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
