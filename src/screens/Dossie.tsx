import { Download, Share2 } from 'lucide-react';

export default function Dossie() {

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif text-text-main">Dossiê</h1>
          <p className="text-text-muted">Montagem de dossiê curatorial</p>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 bg-surface hover:border-accent transition-colors text-sm font-medium">
            <Share2 size={18} /> <span className="hidden md:inline">Compartilhar</span>
          </button>
          <button className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-accent text-white font-medium hover:bg-accent/90 transition-colors text-sm">
            <Download size={18} /> Exportar PDF
          </button>
        </div>
      </div>

      <div className="bg-surface rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-serif mb-4">Obras Selecionadas</h2>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="group relative rounded-xl overflow-hidden aspect-square border border-gray-100 bg-gray-50">
              <img 
                src={`https://images.unsplash.com/photo-1549490349-8643362247b5?w=400&h=400&fit=crop&auto=format&q=80`} 
                alt="Mock" 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3 pt-8">
                <p className="text-white text-xs font-medium truncate">Aura Emersa {i + 1}</p>
              </div>
            </div>
          ))}
          
          <button className="rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-2 text-gray-400 hover:text-accent hover:border-accent/50 transition-colors aspect-square bg-gray-50/50">
            <span className="text-2xl">+</span>
            <span className="text-xs font-medium">Adicionar</span>
          </button>
        </div>
      </div>
    </div>
  );
}
