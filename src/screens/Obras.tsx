import { Search, Filter, Plus } from 'lucide-react';

export default function Obras() {

  return (
    <div className="space-y-6 relative pb-20 md:pb-0">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <h1 className="text-3xl font-serif text-text-main">Obras</h1>
        
        <button className="hidden md:flex items-center gap-2 bg-accent text-white px-6 py-2.5 rounded-xl font-medium hover:bg-accent/90 transition-colors">
          <Plus size={20} /> Nova Obra
        </button>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Buscar obras..." 
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-surface focus:border-accent outline-none text-sm"
          />
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 bg-surface hover:border-accent transition-colors text-sm font-medium">
          <Filter size={18} /> Filtros
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="bg-surface rounded-xl overflow-hidden shadow-sm border border-gray-100 hover-float group cursor-pointer">
            <div className="relative aspect-square bg-gray-100 overflow-hidden">
              <img 
                src={`https://images.unsplash.com/photo-1549490349-8643362247b5?w=600&h=600&fit=crop&auto=format&q=80`} 
                alt="Mock" 
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            </div>
            <div className="p-4">
              <h3 className="font-serif text-lg text-text-main mb-1">Aura Emersa {i + 1}</h3>
              <p className="text-text-muted text-sm">2026 • Óleo sobre tela</p>
            </div>
          </div>
        ))}
      </div>

      <button className="md:hidden fixed bottom-6 right-6 w-14 h-14 bg-accent text-white rounded-full shadow-lg flex items-center justify-center hover:scale-105 transition-transform z-50">
        <Plus size={24} />
      </button>
    </div>
  );
}
