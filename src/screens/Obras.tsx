import { useState } from 'react';
import { Search, Filter, Plus, X, QrCode, Leaf, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react';

interface ObraPreview {
  id: number;
  titulo: string;
  tituloInterpretativo: string;
  ano: string;
  tecnica: string;
  suporte: string;
  dimensoes: string;
  status: 'Disponível' | 'Vendida' | 'Reservada' | 'Coleção Privada';
  narrativaCuratorial: string;
  sentencaResumo: string;
  creditoColecao: string;
  localizacao: string;
  sustentavel: boolean;
  blockchain: boolean;
  imagens: string[];
  tags: string[];
}

const MOCK: ObraPreview[] = Array.from({length:8},(_,i)=>({
  id: i+1,
  titulo: ['Golden\'s Tears','Aura Emersa','Véu de Luz','Silêncio Expandido','Campo Oculto','Memória Líquida','Raiz Celeste','Espelho de Fogo'][i],
  tituloInterpretativo: ['Choro dourado','Aura submersa','Luz velada','Silêncio denso','Território interno','Tempo dissolvido','Raiz no céu','Fogo especular'][i],
  ano: String(2022+i%4),
  tecnica: ['Óleo','Acrílica','Aquarela','Técnica Mista','Óleo','Bordado','Colagem','Acrílica'][i],
  suporte: ['Tela','Tela','Papel algodão','Tela','Madeira','Tecido','Papel kraft','Tela'][i],
  dimensoes: ['100×80 cm','120×90 cm','50×70 cm','150×120 cm','80×80 cm','60×40 cm','90×60 cm','110×85 cm'][i],
  status: (['Disponível','Disponível','Vendida','Reservada','Coleção Privada','Disponível','Disponível','Reservada'] as const)[i],
  narrativaCuratorial: 'A obra explora a tensão entre memória e esquecimento, utilizando camadas sobrepostas de pigmento para criar profundidade visual que convida à contemplação introspectiva.',
  sentencaResumo: 'Uma investigação da matéria e da luz como veículos da memória afetiva.',
  creditoColecao: i%3===0?'Coleção particular, São Paulo':'',
  localizacao: i%2===0?'Ateliê Ipiranga':'Galeria Central',
  sustentavel: i%3===0,
  blockchain: i%4===0,
  imagens: [`https://images.unsplash.com/photo-1549490349-8643362247b5?w=800&h=800&fit=crop&q=80`],
  tags: ['abstrato','cor','memória'].slice(0,2+i%2),
}));

const STATUS_COLOR: Record<string,string> = {
  'Disponível':'bg-emerald-100 text-emerald-700',
  'Vendida':'bg-gray-100 text-gray-500',
  'Reservada':'bg-amber-100 text-amber-700',
  'Coleção Privada':'bg-purple-100 text-purple-700',
};

export default function Obras() {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [selected, setSelected] = useState<ObraPreview|null>(null);
  const [photoIdx, setPhotoIdx] = useState(0);

  const filtered = MOCK.filter(o=>{
    const q = search.toLowerCase();
    return (!q || o.titulo.toLowerCase().includes(q) || o.tecnica.toLowerCase().includes(q))
      && (!filterStatus || o.status === filterStatus);
  });

  return (
    <div className="space-y-6 relative pb-20 md:pb-0">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <h1 className="text-3xl font-serif text-text-main">Obras</h1>
        <button className="hidden md:flex items-center gap-2 bg-accent text-white px-6 py-2.5 rounded-xl font-medium hover:bg-accent/90 transition-colors">
          <Plus size={20}/>Nova Obra
        </button>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18}/>
          <input aria-label="Buscar obras" type="text" placeholder="Buscar obras..." value={search} onChange={e=>setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-surface focus:border-accent outline-none text-sm"/>
        </div>
        <select aria-label="Filtrar por status" value={filterStatus} onChange={e=>setFilterStatus(e.target.value)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 bg-surface hover:border-accent transition-colors text-sm font-medium outline-none focus:border-accent">
          <option value="">Todos os status</option>
          <option>Disponível</option><option>Vendida</option><option>Reservada</option><option>Coleção Privada</option>
        </select>
        <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 bg-surface hover:border-accent transition-colors text-sm font-medium">
          <Filter size={18}/>Filtros
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filtered.map(obra=>(
          <div key={obra.id} onClick={()=>{setSelected(obra);setPhotoIdx(0);}} className="bg-surface rounded-xl overflow-hidden shadow-sm border border-gray-100 hover-float group cursor-pointer transition-shadow hover:shadow-md">
            <div className="relative aspect-square bg-gray-100 overflow-hidden">
              <img src={obra.imagens[0]} alt={obra.titulo} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"/>
              <span className={`absolute top-2 right-2 text-xs font-bold px-2 py-1 rounded-full ${STATUS_COLOR[obra.status]}`}>{obra.status}</span>
              {obra.sustentavel && <span className="absolute top-2 left-2 bg-emerald-100 text-emerald-700 text-xs font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5"><Leaf size={10}/>eco</span>}
            </div>
            <div className="p-4">
              <h3 className="font-serif text-lg text-text-main mb-0.5 leading-snug">{obra.titulo}</h3>
              <p className="text-text-muted text-xs mb-2 italic">{obra.tituloInterpretativo}</p>
              <p className="text-text-muted text-sm">{obra.ano} · {obra.tecnica} sobre {obra.suporte}</p>
              <p className="text-text-muted text-xs mt-1">{obra.dimensoes}</p>
              <div className="flex flex-wrap gap-1 mt-2">
                {obra.tags.map(tag=><span key={tag} className="bg-accent/10 text-accent text-xs px-2 py-0.5 rounded-full">#{tag}</span>)}
              </div>
            </div>
          </div>
        ))}
        {filtered.length===0 && <p className="col-span-4 text-center text-text-muted py-16">Nenhuma obra encontrada.</p>}
      </div>

      <button aria-label="Nova obra" className="md:hidden fixed bottom-6 right-6 w-14 h-14 bg-accent text-white rounded-full shadow-lg flex items-center justify-center hover:scale-105 transition-transform z-50">
        <Plus size={24}/>
      </button>

      {/* Detail Modal */}
      {selected && (
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={()=>setSelected(null)}/>
          <div className="relative z-10 bg-surface w-full md:max-w-4xl max-h-[92vh] md:max-h-[88vh] rounded-t-3xl md:rounded-2xl overflow-y-auto shadow-2xl">
            {/* Header */}
            <div className="sticky top-0 z-20 bg-surface border-b border-gray-100 px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="font-serif text-xl text-text-main">{selected.titulo}</h2>
                <p className="text-xs text-text-muted italic">{selected.tituloInterpretativo}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${STATUS_COLOR[selected.status]}`}>{selected.status}</span>
                <button aria-label="Fechar" onClick={()=>setSelected(null)} className="p-2 rounded-xl hover:bg-gray-100 transition-colors"><X size={20}/></button>
              </div>
            </div>

            <div className="p-6 space-y-8">
              {/* Photo gallery */}
              <div className="relative rounded-2xl overflow-hidden aspect-video bg-gray-100">
                <img src={selected.imagens[photoIdx]||selected.imagens[0]} alt={selected.titulo} className="w-full h-full object-contain"/>
                {selected.imagens.length > 1 && (<>
                  <button aria-label="Foto anterior" onClick={()=>setPhotoIdx(i=>Math.max(0,i-1))} className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/80 rounded-full p-2 shadow hover:bg-white transition-colors"><ChevronLeft size={18}/></button>
                  <button aria-label="Próxima foto" onClick={()=>setPhotoIdx(i=>Math.min(selected.imagens.length-1,i+1))} className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/80 rounded-full p-2 shadow hover:bg-white transition-colors"><ChevronRight size={18}/></button>
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                    {selected.imagens.map((_,i)=><div key={i} className={`w-2 h-2 rounded-full transition-colors ${i===photoIdx?'bg-accent':'bg-white/60'}`}/>)}
                  </div>
                </>)}
              </div>

              {/* I — Metadados */}
              <section>
                <p className="text-xs font-bold tracking-[0.2em] text-accent uppercase mb-4 flex items-center gap-2"><span className="font-serif text-base">I</span>Metadados Essenciais</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {[
                    ['Artista','Nany Arruda'],
                    ['Ano',selected.ano],
                    ['Técnica',selected.tecnica],
                    ['Suporte',selected.suporte],
                    ['Dimensões',selected.dimensoes],
                    ['Localização',selected.localizacao||'—'],
                    ['Crédito',selected.creditoColecao||'—'],
                  ].map(([k,v])=>(
                    <div key={k}>
                      <p className="text-xs font-bold text-text-muted mb-0.5">{k}</p>
                      <p className="text-sm text-text-main">{v}</p>
                    </div>
                  ))}
                </div>
              </section>

              {/* II — Curatorial */}
              <section>
                <p className="text-xs font-bold tracking-[0.2em] text-accent uppercase mb-4 flex items-center gap-2"><span className="font-serif text-base">II</span>Texto Curatorial</p>
                {selected.sentencaResumo && <p className="text-sm text-text-muted mb-3 font-medium">{selected.sentencaResumo}</p>}
                <blockquote className="border-l-4 border-accent/40 bg-accent/5 rounded-r-xl pl-5 pr-4 py-4">
                  <p className="font-serif italic text-text-main leading-relaxed">{selected.narrativaCuratorial}</p>
                </blockquote>
              </section>

              {/* III — Inovações */}
              <section>
                <p className="text-xs font-bold tracking-[0.2em] text-accent uppercase mb-3 flex items-center gap-2"><span className="font-serif text-base">III</span>Inovações</p>
                <div className="flex flex-wrap gap-3">
                  <div className="border border-gray-200 rounded-xl p-3 flex items-center gap-2 text-sm bg-bg">
                    <QrCode size={20} className="text-accent"/>
                    <span className="font-medium">QR Code</span>
                    <button aria-label="Abrir QR code" className="ml-1 text-accent hover:underline text-xs flex items-center gap-0.5"><ExternalLink size={12}/>Ver</button>
                  </div>
                  {selected.blockchain && (
                    <div className="border border-gray-200 rounded-xl p-3 flex items-center gap-2 text-sm bg-bg">
                      <span className="text-accent text-base">⛓</span>
                      <span className="font-medium">Blockchain</span>
                      <span className="text-xs text-emerald-600 font-bold">Registrado</span>
                    </div>
                  )}
                  {selected.sustentavel && (
                    <div className="border border-emerald-200 rounded-xl p-3 flex items-center gap-2 text-sm bg-emerald-50">
                      <Leaf size={18} className="text-emerald-600"/>
                      <span className="font-medium text-emerald-700">Sustentável</span>
                    </div>
                  )}
                </div>
              </section>

              {/* Tags */}
              {selected.tags.length>0 && (
                <div className="flex flex-wrap gap-2">
                  {selected.tags.map(tag=><span key={tag} className="bg-accent/10 text-accent text-xs font-bold px-3 py-1 rounded-full">#{tag}</span>)}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-surface border-t border-gray-100 px-6 py-4 flex gap-3">
              <button className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium hover:border-accent transition-colors">Editar ficha</button>
              <button className="flex-1 py-2.5 rounded-xl bg-accent text-white text-sm font-bold hover:bg-accent/90 hover-float transition-all">Exportar PDF</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
