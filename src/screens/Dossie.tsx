import { useState, useEffect } from 'react';
import { Printer, CheckSquare, Square, Eye, User, Loader2, BookOpen, Layers } from 'lucide-react';
import { getArtworks, getSeries, supabase } from '../services/supabase';
import type { Artwork, Series } from '../types';

interface FormacaoItem {
  anoInicio: string;
  anoFim?: string;
  curso: string;
  instituicao: string;
  cidade?: string;
}

interface PremioItem {
  ano: string;
  nome: string;
  instituicao: string;
}

interface ResidenciaItem {
  ano: string;
  nome: string;
  local: string;
}

interface ExposicaoItem {
  ano: string;
  titulo: string;
  local: string;
  curador?: string;
}

interface PublicacaoItem {
  autor?: string;
  tituloLivro?: string;
  editora?: string;
  ano?: string;
  isbn?: string;
  contribuicao?: string;
}

interface ArtistProfile {
  nome: string;
  nomeArtistico: string;
  nacionalidade: string;
  cidade: string;
  bioShort: string;
  bioLong: string;
  website: string;
  curriculumLattes: string;
  statement: string;
  exposicoes: string;
  foto_url: string;
  email?: string;
  instagrams: unknown[];
  social_links: unknown[];
  formacao: FormacaoItem[];
  premios: PremioItem[];
  residencias: ResidenciaItem[];
  expos_individuais: ExposicaoItem[];
  expos_coletivas: ExposicaoItem[];
  publicacoes: PublicacaoItem[];
}

export default function Dossie() {
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [, setSeriesList] = useState<Series[]>([]);
  const [artist, setArtist] = useState<ArtistProfile | null>(null);
  
  // Loading states
  const [loadingArtworks, setLoadingArtworks] = useState(true);
  const [loadingArtist, setLoadingArtist] = useState(true);
  
  // Customization controls
  const [selectedArtworkIds, setSelectedArtworkIds] = useState<string[]>([]);
  const [incluirCapa, setIncluirCapa] = useState(true);
  const [incluirIdentificacao, setIncluirIdentificacao] = useState(true);
  const [incluirBios, setIncluirBios] = useState(true);
  const [incluirCV, setIncluirCV] = useState(true);
  const [introCustomizada, setIntroCustomizada] = useState('');
  const [umaObraPorPagina, setUmaObraPorPagina] = useState(true);
  
  // View states
  const [activePreviewTab, setActivePreviewTab] = useState<'visual' | 'codigo'>('visual');

  // Load Artworks and Artist profile
  useEffect(() => {
    (async () => {
      try {
        const [artList, serList] = await Promise.all([getArtworks(), getSeries()]);
        setArtworks(artList);
        setSeriesList(serList);
        // Initially select all artworks
        setSelectedArtworkIds(artList.map(a => a.artwork_id));
      } catch (e) {
        alert('Erro ao carregar obras: ' + (e as Error).message);
      } finally {
        setLoadingArtworks(false);
      }
    })();

    supabase.from('artista').select('*').single().then(({ data, error }) => {
      if (error && error.code !== 'PGRST116') {
        alert('Erro ao carregar perfil do artista: ' + error.message);
      }
      if (data) {
        const ensureArray = (v: unknown): unknown[] => {
          if (Array.isArray(v)) return v;
          if (typeof v === 'string' && v.trim().startsWith('[')) {
            try {
              const parsed = JSON.parse(v);
              if (Array.isArray(parsed)) return parsed;
            } catch { /* ignore */ }
          }
          return [];
        };

        setArtist({
          nome: data.nome || '',
          nomeArtistico: data.nomeArtistico || '',
          nacionalidade: data.nacionalidade || '',
          cidade: data.cidade || '',
          bioShort: data.bioShort || '',
          bioLong: data.bioLong || '',
          website: data.website || '',
          curriculumLattes: data.curriculumLattes || '',
          statement: data.statement || '',
          exposicoes: data.exposicoes || '',
          foto_url: data.foto_url || '',
          email: data.email || '',
          instagrams: ensureArray(data.instagrams),
          social_links: ensureArray(data.social_links),
          formacao: ensureArray(data.formacao) as FormacaoItem[],
          premios: ensureArray(data.premios) as PremioItem[],
          residencias: ensureArray(data.residencias) as ResidenciaItem[],
          expos_individuais: ensureArray(data.expos_individuais) as ExposicaoItem[],
          expos_coletivas: ensureArray(data.expos_coletivas) as ExposicaoItem[],
          publicacoes: ensureArray(data.publicacoes) as PublicacaoItem[],
        });
      }
      setLoadingArtist(false);
    });
  }, []);

  const handleSelectAll = () => {
    setSelectedArtworkIds(artworks.map(a => a.artwork_id));
  };

  const handleDeselectAll = () => {
    setSelectedArtworkIds([]);
  };

  const toggleArtwork = (id: string) => {
    setSelectedArtworkIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handlePrint = () => {
    window.print();
  };

  const selectedArtworks = artworks.filter(a => selectedArtworkIds.includes(a.artwork_id));

  const renderCVSection = <T,>(title: string, list: T[] | undefined, renderer: (item: T, idx: number) => React.ReactNode) => {
    if (!list || list.length === 0) return null;
    return (
      <div className="space-y-3 avoid-break">
        <h3 className="text-sm font-bold tracking-[0.15em] text-accent uppercase border-b border-gray-100 pb-1 font-sans">{title}</h3>
        <ul className="space-y-2 list-none pl-0">
          {list.map((item, idx) => (
            <li key={idx}>
              {renderer(item, idx)}
            </li>
          ))}
        </ul>
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Dynamic print-only style sheet */}
      <style>{`
        @media print {
          /* Force page background to white and hide unnecessary UI elements */
          body {
            background: white !important;
            color: black !important;
          }
          nav, aside, header, footer, button, .no-print, .controls-panel {
            display: none !important;
          }
          .dossier-page-container {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
            background: white !important;
          }
          .a4-page {
            box-shadow: none !important;
            border: none !important;
            padding: 2cm !important;
            margin: 0 !important;
            width: 100% !important;
            height: auto !important;
            min-height: 0 !important;
            page-break-after: always !important;
            break-after: page !important;
            background: white !important;
            color: black !important;
          }
          .page-break {
            page-break-before: always !important;
            break-before: page !important;
          }
          .avoid-break {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          /* Ensure images printed look spectacular */
          .print-image {
            max-height: 14cm !important;
            width: auto !important;
            max-width: 100% !important;
            object-fit: contain !important;
            margin: 0 auto !important;
          }
        }
      `}</style>

      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
        <div>
          <h1 className="text-3xl font-serif text-text-main">Dossiê e Portfólio</h1>
          <div className="gold-line mt-2 w-20" />
          <p className="text-sm mt-2 text-text-muted">Geração e exportação de Portfólio Curatorial &amp; Dossiê de Obras (Object ID / Museum Standards)</p>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button 
            onClick={handlePrint}
            disabled={selectedArtworkIds.length === 0 && !incluirBios && !incluirCV}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold hover-lift transition-all disabled:opacity-50 btn-gold-gradient shadow-[0_4px_20px_var(--gold-glow)]"
          >
            <Printer size={18} /> Exportar Dossiê (PDF)
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT COLUMN: Controls Dashboard (Hides on Print) */}
        <div className="lg:col-span-4 space-y-6 no-print controls-panel">
          
          {/* Customization Options */}
          <div className="glass-slab rounded-2xl p-6 space-y-6">
            <h2 className="text-lg font-serif mb-4 flex items-center gap-2 text-text-main"><Layers size={20} className="text-accent"/> Camadas do Dossiê</h2>
            
            <div className="space-y-4">
              <label className="flex items-start gap-3 cursor-pointer group">
                <input type="checkbox" checked={incluirCapa} onChange={e=>setIncluirCapa(e.target.checked)} className="rounded mt-0.5 text-accent focus:ring-accent" />
                <div>
                  <span className="text-sm font-bold text-text-main group-hover:text-accent transition-colors">Capa Curatorial Principal</span>
                  <p className="text-xs text-text-muted">Apresentação formal com nome do artista, ano e título.</p>
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer group">
                <input type="checkbox" checked={incluirIdentificacao} onChange={e=>setIncluirIdentificacao(e.target.checked)} className="rounded mt-0.5 text-accent focus:ring-accent" />
                <div>
                  <span className="text-sm font-bold text-text-main group-hover:text-accent transition-colors">Identificação & Contatos</span>
                  <p className="text-xs text-text-muted">Nacionalidade, website, emails e instagram profissional.</p>
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer group">
                <input type="checkbox" checked={incluirBios} onChange={e=>setIncluirBios(e.target.checked)} className="rounded mt-0.5 text-accent focus:ring-accent" />
                <div>
                  <span className="text-sm font-bold text-text-main group-hover:text-accent transition-colors">Biografias & Poética (Statement)</span>
                  <p className="text-xs text-text-muted">Biografia Curta, Biografia Longa e Declaração de intenções artísticas.</p>
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer group">
                <input type="checkbox" checked={incluirCV} onChange={e=>setIncluirCV(e.target.checked)} className="rounded mt-0.5 text-accent focus:ring-accent" />
                <div>
                  <span className="text-sm font-bold text-text-main group-hover:text-accent transition-colors">Trajetória e Currículo de Exposições</span>
                  <p className="text-xs text-text-muted">Formações, prêmios, residências, exposições individuais/coletivas e publicações.</p>
                </div>
              </label>
            </div>

            <div className="pt-4 border-t border-gray-100 space-y-4">
              <h3 className="text-xs font-bold tracking-wider text-text-muted uppercase">Configuração de Layout</h3>
              
              <label className="flex items-center gap-3 cursor-pointer group">
                <input type="checkbox" checked={umaObraPorPagina} onChange={e=>setUmaObraPorPagina(e.target.checked)} className="rounded text-accent focus:ring-accent" />
                <span className="text-sm font-medium text-text-main group-hover:text-accent transition-colors">Uma Obra por Página (A4 Standard)</span>
              </label>
            </div>
          </div>

          {/* Custom Curatorial Note */}
          <div className="glass-slab rounded-2xl p-6">
            <h2 className="text-lg font-serif mb-3 text-text-main">Nota Curatorial de Abertura</h2>
            <p className="text-xs text-text-muted mb-3">Insira um texto ou conceito personalizado para introduzir este dossiê específico.</p>
            <textarea
              value={introCustomizada}
              onChange={e=>setIntroCustomizada(e.target.value)}
              placeholder="Digite aqui um texto conceitual de abertura..."
              rows={4}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-accent outline-none bg-bg resize-none"
            />
          </div>

          {/* Artwork Selector Grid */}
          <div className="glass-slab rounded-2xl p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-serif text-text-main">Obras a Incluir</h2>
              <span className="bg-accent/10 text-accent text-xs font-bold px-2 py-0.5 rounded-full">{selectedArtworkIds.length}</span>
            </div>
            
            <div className="flex gap-2 text-xs font-bold text-accent">
              <button onClick={handleSelectAll} className="hover:underline">Selecionar Todas</button>
              <span className="text-gray-300">•</span>
              <button onClick={handleDeselectAll} className="hover:underline">Desmarcar Todas</button>
            </div>

            {loadingArtworks ? (
              <div className="flex justify-center py-6"><Loader2 className="animate-spin text-accent" /></div>
            ) : artworks.length === 0 ? (
              <p className="text-xs text-text-muted text-center py-4">Nenhuma obra cadastrada ainda no acervo.</p>
            ) : (
              <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                {artworks.map(a => {
                  const isSelected = selectedArtworkIds.includes(a.artwork_id);
                  return (
                    <div 
                      key={a.artwork_id} 
                      onClick={() => toggleArtwork(a.artwork_id)}
                      className={`flex items-center gap-3 p-2 rounded-xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'border-[rgba(201,168,76,0.35)] bg-[rgba(201,168,76,0.08)]'
                          : 'border-border bg-transparent hover:bg-surface-raised'
                      }`}
                    >
                      <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 border border-gray-100 bg-gray-50 flex items-center justify-center">
                        {a.cover_image ? (
                          <img src={a.cover_image} alt={a.artwork_title} className="w-full h-full object-cover" />
                        ) : (
                          <User size={16} className="text-gray-300" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-text-main truncate">{a.artwork_title}</p>
                        <p className="text-[10px] text-text-muted truncate">{a.medium || 'Técnica Mista'}{a.creation_year ? `, ${a.creation_year}` : ''}</p>
                      </div>
                      <div className="text-accent shrink-0">
                        {isSelected ? (
                          <CheckSquare size={16} className="fill-accent/20" />
                        ) : (
                          <Square size={16} className="text-gray-300" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Interactive Document Live Preview */}
        <div className="lg:col-span-8 flex flex-col items-center dossier-page-container">
          
          {/* Top Bar Preview Toggles (Hides on Print) */}
          <div className="w-full flex items-center justify-between glass-slab rounded-2xl p-4 mb-6 no-print">
            <span className="text-xs font-bold flex items-center gap-2 text-text-muted"><Eye size={16}/> VISUALIZAÇÃO PRÉVIA (PADRÃO A4)</span>
            <div className="flex p-1 rounded-xl bg-surface-raised">
              <button 
                onClick={() => setActivePreviewTab('visual')}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activePreviewTab === 'visual'
                    ? 'bg-surface text-gold shadow-[0_2px_8px_rgba(0,0,0,0.2)]'
                    : 'text-text-muted'
                }`}
              >
                Visual Dossiê
              </button>
              <button 
                onClick={() => setActivePreviewTab('codigo')}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activePreviewTab === 'codigo'
                    ? 'bg-surface text-gold shadow-[0_2px_8px_rgba(0,0,0,0.2)]'
                    : 'text-text-muted'
                }`}
              >
                Visual Fichas (Fatores ID)
              </button>
            </div>
          </div>

          {loadingArtist ? (
            <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="animate-spin text-accent h-8 w-8" /></div>
          ) : (
            <div className="w-full max-w-[800px] space-y-8 print:space-y-0">
              
              {/* PAGE 1: COVER PAGE */}
              {incluirCapa && (
                <div className="a4-page bg-white w-full aspect-[1/1.414] shadow-float border border-gray-100 p-[2.5cm] flex flex-col justify-between text-text-main relative">
                  
                  {/* Decorative corner */}
                  <div className="absolute top-0 right-0 w-32 h-32 border-t-4 border-r-4 border-accent/20 m-8" />
                  <div className="absolute bottom-0 left-0 w-32 h-32 border-b-4 border-l-4 border-accent/20 m-8" />

                  {/* Header */}
                  <div className="text-sm font-sans tracking-[0.25em] text-accent uppercase font-bold">
                    STUDIO VIRTUAL • ARTIST DOSSIER
                  </div>

                  {/* Title & Artist */}
                  <div className="space-y-6 my-auto">
                    <p className="text-6xl font-serif tracking-tight leading-none text-text-main">
                      {artist?.nomeArtistico || artist?.nome || 'Nany Arruda'}
                    </p>
                    <div className="w-20 h-1 bg-accent my-6" />
                    <p className="text-xl font-sans tracking-[0.2em] text-text-muted uppercase font-medium">
                      PORTFÓLIO CURATORIAL & CATÁLOGO DE OBRAS
                    </p>
                    <p className="text-sm font-sans text-text-muted tracking-widest uppercase">
                      Edição {new Date().getFullYear()} — Catálogo Gerado via Object ID Standard
                    </p>
                  </div>

                  {/* Footer metadata */}
                  <div className="border-t border-gray-100 pt-6 flex flex-col md:flex-row justify-between items-start md:items-center text-xs font-sans text-text-muted gap-2">
                    <div>
                      {artist?.cidade && <p>{artist.cidade}, {artist.nacionalidade || 'Brasil'}</p>}
                      {artist?.website && <p className="font-bold text-accent">{artist.website}</p>}
                    </div>
                    <div className="text-right">
                      <p>Obras Selecionadas: {selectedArtworkIds.length}</p>
                      <p>Gerado em {new Date().toLocaleDateString('pt-BR')}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* INTRODUÇÃO CUSTOMIZADA (Se houver text) */}
              {introCustomizada && (
                <div className="a4-page bg-white w-full aspect-[1/1.414] shadow-float border border-gray-100 p-[2.5cm] flex flex-col justify-between text-text-main relative page-break">
                  <div className="space-y-6">
                    <h2 className="text-sm font-bold tracking-[0.25em] text-accent uppercase border-b border-gray-100 pb-2">NOTA CURATORIAL</h2>
                    <div className="text-base font-serif leading-relaxed text-text-main whitespace-pre-wrap pt-4">
                      {introCustomizada}
                    </div>
                  </div>
                  <div className="text-[10px] text-text-muted font-sans border-t border-gray-100 pt-4 flex justify-between">
                    <span>{artist?.nomeArtistico || 'Artista'}</span>
                    <span>Dossiê de Obras</span>
                  </div>
                </div>
              )}

              {/* PAGE 2: ARTIST BIOGRAPHY & STATEMENT */}
              {incluirBios && artist && (
                <div className="a4-page bg-white w-full aspect-[1/1.414] shadow-float border border-gray-100 p-[2.5cm] flex flex-col justify-between text-text-main relative page-break">
                  <div className="space-y-8">
                    
                    {/* Header line */}
                    <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                      <h2 className="text-sm font-bold tracking-[0.25em] text-accent uppercase">BIOGRAFIA E CONCEITO</h2>
                      {artist.foto_url && <img src={artist.foto_url} alt="Artista" className="w-12 h-12 rounded-full object-cover border border-gray-100 shadow-sm" />}
                    </div>

                    {/* Short Bio */}
                    {artist.bioShort && (
                      <div className="space-y-2">
                        <h3 className="text-xs font-bold tracking-wider text-text-muted uppercase">BIOGRAFIA RESUMIDA (CV SHORT)</h3>
                        <p className="text-sm font-sans leading-relaxed text-text-main">{artist.bioShort}</p>
                      </div>
                    )}

                    {/* Long Bio */}
                    {artist.bioLong && (
                      <div className="space-y-2">
                        <h3 className="text-xs font-bold tracking-wider text-text-muted uppercase">TRAJETÓRIA CURATORIAL (BIO COMPLETA)</h3>
                        <p className="text-sm font-serif leading-relaxed text-text-main whitespace-pre-wrap">{artist.bioLong}</p>
                      </div>
                    )}

                    {/* Artist Statement */}
                    {artist.statement && (
                      <div className="space-y-2 bg-gray-50/50 p-6 rounded-2xl border border-gray-100/50">
                        <h3 className="text-xs font-bold tracking-wider text-accent uppercase">DECLARAÇÃO DE ARTISTA (ARTIST STATEMENT)</h3>
                        <p className="text-sm font-serif italic leading-relaxed text-text-main">"{artist.statement}"</p>
                      </div>
                    )}
                  </div>

                  <div className="text-[10px] text-text-muted font-sans border-t border-gray-100 pt-4 flex justify-between">
                    <span>{artist.nomeArtistico || artist.nome}</span>
                    <span>Biografia & Conceito</span>
                  </div>
                </div>
              )}

              {/* PAGE 3: ARTIST CV (TRAJECTORY) */}
              {incluirCV && artist && (
                <div className="a4-page bg-white w-full aspect-[1/1.414] shadow-float border border-gray-100 p-[2.5cm] flex flex-col justify-between text-text-main relative page-break">
                  <div className="space-y-6">
                    <h2 className="text-sm font-bold tracking-[0.25em] text-accent uppercase border-b border-gray-100 pb-3">CURRICULUM VITAE (CV)</h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 text-xs">
                      
                      {/* Formacao */}
                      {renderCVSection("Formação Acadêmica", artist.formacao, (item) => (
                        <div className="text-text-main leading-snug">
                          <span className="font-bold text-accent">{item.anoInicio}{item.anoFim ? `–${item.anoFim}` : ''}</span>: {item.curso} — <span className="text-text-muted">{item.instituicao}</span>{item.cidade ? `, ${item.cidade}` : ''}
                        </div>
                      ))}

                      {/* Premios */}
                      {renderCVSection("Prêmios & Distinções", artist.premios, (item) => (
                        <div className="text-text-main leading-snug">
                          <span className="font-bold text-accent">{item.ano}</span>: {item.nome} — <span className="text-text-muted">{item.instituicao}</span>
                        </div>
                      ))}

                      {/* Residencias */}
                      {renderCVSection("Residências Artísticas", artist.residencias, (item) => (
                        <div className="text-text-main leading-snug">
                          <span className="font-bold text-accent">{item.ano}</span>: {item.nome} — <span className="text-text-muted">{item.local}</span>
                        </div>
                      ))}

                      {/* Expos Individuais */}
                      {renderCVSection("Exposições Individuais", artist.expos_individuais, (item) => (
                        <div className="text-text-main leading-snug">
                          <span className="font-bold text-accent">{item.ano}</span>: <span className="italic font-serif font-medium">"{item.titulo}"</span> — <span className="text-text-muted">{item.local}</span>{item.curador ? ` (Curadoria: ${item.curador})` : ''}
                        </div>
                      ))}

                      {/* Expos Coletivas */}
                      {renderCVSection("Exposições Coletivas", artist.expos_coletivas, (item) => (
                        <div className="text-text-main leading-snug">
                          <span className="font-bold text-accent">{item.ano}</span>: <span className="italic font-serif font-medium">"{item.titulo}"</span> — <span className="text-text-muted">{item.local}</span>{item.curador ? ` (Curadoria: ${item.curador})` : ''}
                        </div>
                      ))}

                      {/* Publicacoes */}
                      {renderCVSection("Publicações & Catálogos", artist.publicacoes, (item) => {
                        const parts = [];
                        if (item.autor) parts.push(item.autor);
                        if (item.tituloLivro) parts.push(`"${item.tituloLivro}"`);
                        if (item.editora) parts.push(item.editora);
                        if (item.ano) parts.push(item.ano);
                        if (item.isbn) parts.push(`ISBN: ${item.isbn}`);
                        if (item.contribuicao) parts.push(`Artistas: ${item.contribuicao}`);
                        return (
                          <div className="text-text-main leading-snug border-l-2 border-accent/20 pl-2 py-0.5">
                            {parts.join(', ')}.
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="text-[10px] text-text-muted font-sans border-t border-gray-100 pt-4 flex justify-between">
                    <span>{artist.nomeArtistico || artist.nome}</span>
                    <span>Curriculum Vitae</span>
                  </div>
                </div>
              )}

              {/* PAGES: SELECTED ARTWORKS */}
              {selectedArtworks.length === 0 ? (
                <div className="bg-surface rounded-2xl shadow-sm border border-gray-100 p-8 text-center no-print">
                  <p className="text-text-muted">Selecione obras no painel lateral esquerdo para exibi-las no dossiê de catálogo.</p>
                </div>
              ) : (
                selectedArtworks.map((a, idx) => {
                  interface ArtworkExtra {
                    protocoloAtivacao?: string;
                    perfilPerformer?: string;
                    duracao?: string;
                    elementosInegociveis?: string;
                    possuiTermo?: boolean;
                    possuiCOA?: boolean;
                    possuiCessao?: boolean;
                    recursosHibridos?: string;
                    suporteDigital?: string;
                    hashBlockchain?: string;
                    redeBlockchain?: string;
                    registroCertificado?: string;
                  }
                  let extra: ArtworkExtra = {};
                  if (a.intent_note) {
                    try { extra = JSON.parse(a.intent_note) as ArtworkExtra; } catch { extra = {}; }
                  }

                  return (
                    <div 
                      key={a.artwork_id} 
                      className={`a4-page bg-white w-full shadow-float border border-gray-100 p-[2.5cm] flex flex-col justify-between text-text-main page-break ${
                        activePreviewTab === 'codigo' ? 'aspect-auto' : 'aspect-[1/1.414]'
                      }`}
                    >
                      {activePreviewTab === 'visual' ? (
                        <>
                          {/* Image & Main presentation */}
                          <div className="space-y-6">
                            
                            {/* Header */}
                            <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                              <span className="text-[10px] font-sans tracking-widest text-accent font-bold uppercase">OBRA {idx + 1} DE {selectedArtworks.length}</span>
                              <span className="text-[10px] font-sans text-text-muted uppercase">CLASSIFICAÇÃO: {a.classification?.toUpperCase() || 'SINGULAR'}</span>
                            </div>

                            {/* Main Artwork Photo */}
                            <div className="w-full aspect-video border border-gray-100 bg-gray-50/50 rounded-xl overflow-hidden flex items-center justify-center">
                              {a.cover_image ? (
                                <img src={a.cover_image} alt={a.artwork_title} className="max-h-full max-w-full object-contain print-image" />
                              ) : (
                                <div className="text-gray-300 text-sm font-sans flex flex-col items-center gap-2"><BookOpen size={40}/> Sem imagem registrada</div>
                              )}
                            </div>

                            {/* Technical Ficha and curatorial text side by side */}
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                              
                              {/* Ficha Técnica (Museum standard) */}
                              <div className="md:col-span-5 space-y-4 text-xs">
                                <h3 className="font-sans font-bold tracking-wider text-text-muted uppercase">FICHA TÉCNICA (OBJECT ID)</h3>
                                <div className="space-y-2 font-sans">
                                  <p><strong className="text-text-muted">Título:</strong> <span className="font-serif italic font-medium">{a.artwork_title}</span></p>
                                  {a.artist_name && <p><strong className="text-text-muted">Autoria:</strong> {a.artist_name}</p>}
                                  {a.creation_year && <p><strong className="text-text-muted">Data/Período:</strong> {a.creation_year}</p>}
                                  {a.medium && <p><strong className="text-text-muted">Materiais/Técnicas:</strong> {a.medium}</p>}
                                  {a.support && <p><strong className="text-text-muted">Suporte:</strong> {a.support}</p>}
                                  {a.dimensions_formatted && <p><strong className="text-text-muted">Dimensões:</strong> {a.dimensions_formatted}</p>}
                                  {a.inventory_number && <p><strong className="text-text-muted">Reg. Acervo (Tombo):</strong> {a.inventory_number}</p>}
                                  {a.edition_number && <p><strong className="text-text-muted">Edição/Tiragem:</strong> {a.edition_number}</p>}
                                  {a.physical_location && <p><strong className="text-text-muted">Localização Atual:</strong> {a.physical_location}</p>}

                                  {/* Interdisciplinary resources */}
                                  {extra?.recursosHibridos && <p><strong className="text-accent">Recurso Híbrido:</strong> {extra.recursosHibridos}</p>}
                                  {extra?.suporteDigital && <p><strong className="text-accent">Mídia Digital:</strong> {extra.suporteDigital}</p>}
                                  
                                  {/* Blockchain digital registries */}
                                  {extra?.hashBlockchain && (
                                    <div className="bg-accent/5 p-2 rounded-lg border border-accent/10 mt-2 font-mono text-[9px] text-accent space-y-1">
                                      <p className="font-bold uppercase tracking-wider text-[8px] text-text-muted">⛓️ REGISTRO CRIPTOGRÁFICO</p>
                                      <p className="truncate">Rede: {extra.redeBlockchain || 'Ethereum'}</p>
                                      <p className="truncate">Contract/Hash: {extra.hashBlockchain}</p>
                                      {extra.registroCertificado && <p className="truncate">COA ID: {extra.registroCertificado}</p>}
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Concept statement & curatorial narrative */}
                              <div className="md:col-span-7 space-y-4">
                                <h3 className="font-sans font-bold tracking-wider text-text-muted uppercase text-xs">MEMORIAL DESCRITIVO E CURADORIA</h3>
                                
                                {a.summary_sentence && (
                                  <p className="text-xs font-sans text-accent font-bold italic">"{a.summary_sentence}"</p>
                                )}
                                
                                {a.curatorial_narrative ? (
                                  <p className="text-xs font-serif leading-relaxed text-text-main whitespace-pre-wrap">{a.curatorial_narrative}</p>
                                ) : (
                                  <p className="text-xs font-sans text-text-muted italic">Nenhuma narrativa curatorial inserida para esta obra.</p>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="text-[10px] text-text-muted font-sans border-t border-gray-100 pt-4 flex justify-between">
                            <span>{artist?.nomeArtistico || artist?.nome || 'Artista'}</span>
                            <span className="italic">"{a.artwork_title}" {a.creation_year ? `(${a.creation_year})` : ''}</span>
                          </div>
                        </>
                      ) : activePreviewTab === 'codigo' ? (
                        // TAB: REGISTROS DE DETALHE CODIFICADOS (Fatores ID)
                        <div className="space-y-6 text-sm font-sans">
                          <h2 className="text-xl font-serif text-accent pb-2 border-b border-gray-100 flex items-center justify-between">
                            <span>{a.artwork_title}</span>
                            <span className="text-xs font-bold font-sans bg-gray-100 px-2.5 py-0.5 rounded text-text-muted">Ficha Técnica Completa (Object ID)</span>
                          </h2>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-3">
                              <h3 className="text-xs font-bold text-text-muted tracking-wider uppercase border-b border-gray-100 pb-1">I. DADOS DE IDENTIFICAÇÃO BÁSICA</h3>
                              <table className="w-full text-xs">
                                <tbody>
                                  <tr className="border-b border-gray-50"><td className="py-1 font-bold text-text-muted w-1/3">Tipo de Objeto:</td><td className="py-1 text-text-main">Obra de Arte Singular</td></tr>
                                  <tr className="border-b border-gray-50"><td className="py-1 font-bold text-text-muted">Título Principal:</td><td className="py-1 text-text-main font-serif italic font-bold">{a.artwork_title}</td></tr>
                                  <tr className="border-b border-gray-50"><td className="py-1 font-bold text-text-muted">Autoria / Artista:</td><td className="py-1 text-text-main">{a.artist_name || 'Nany Arruda'}</td></tr>
                                  <tr className="border-b border-gray-50"><td className="py-1 font-bold text-text-muted">Ano / Período:</td><td className="py-1 text-text-main">{a.creation_year || 'Sem data'}</td></tr>
                                  <tr className="border-b border-gray-50"><td className="py-1 font-bold text-text-muted">Técnicas / Materiais:</td><td className="py-1 text-text-main">{a.medium || 'Não preenchido'}</td></tr>
                                  <tr className="border-b border-gray-50"><td className="py-1 font-bold text-text-muted">Suporte Físico:</td><td className="py-1 text-text-main">{a.support || 'Não preenchido'}</td></tr>
                                  <tr className="border-b border-gray-50"><td className="py-1 font-bold text-text-muted">Dimensões H×L×P:</td><td className="py-1 text-text-main">{a.dimensions_formatted || 'Não informadas'}</td></tr>
                                </tbody>
                              </table>
                            </div>

                            <div className="space-y-3">
                              <h3 className="text-xs font-bold text-text-muted tracking-wider uppercase border-b border-gray-100 pb-1">II. CONTROLE E JURÍDICO (DOSSIÊ)</h3>
                              <table className="w-full text-xs">
                                <tbody>
                                  <tr className="border-b border-gray-50"><td className="py-1 font-bold text-text-muted w-1/3">Nº Registro (Tombo):</td><td className="py-1 text-text-main">{a.inventory_number || 'Sem código'}</td></tr>
                                  <tr className="border-b border-gray-50"><td className="py-1 font-bold text-text-muted">Nº Edição/Tiragem:</td><td className="py-1 text-text-main">{a.edition_number || 'Obra Única'}</td></tr>
                                  <tr className="border-b border-gray-50"><td className="py-1 font-bold text-text-muted">Disponibilidade:</td><td className="py-1 text-text-main">{({ available: 'Disponível', sold: 'Vendida', reserved: 'Reservada', private_collection: 'Coleção Privada', not_for_sale: 'Não à venda' } as Record<string, string>)[a.sale_status || ''] || 'Disponível'}</td></tr>
                                  <tr className="border-b border-gray-50"><td className="py-1 font-bold text-text-muted">Preço Avaliado:</td><td className="py-1 text-text-main">{a.price ? `R$ ${a.price.toLocaleString('pt-BR')}` : 'Não avaliada'}</td></tr>
                                  <tr className="border-b border-gray-50"><td className="py-1 font-bold text-text-muted">Localização Física:</td><td className="py-1 text-text-main">{a.physical_location || 'Ateliê do Artista'}</td></tr>
                                  <tr className="border-b border-gray-50"><td className="py-1 font-bold text-text-muted">Estado Conservação:</td><td className="py-1 text-text-main">Excelente (Padrão Museológico)</td></tr>
                                </tbody>
                              </table>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                            <div className="space-y-3">
                              <h3 className="text-xs font-bold text-accent tracking-wider uppercase border-b border-gray-100 pb-1">III. RECURSOS INTERDISCIPLINARES</h3>
                              <table className="w-full text-xs">
                                <tbody>
                                  <tr className="border-b border-gray-50"><td className="py-1 font-bold text-text-muted w-1/3">Hibridismo/Multimídia:</td><td className="py-1 text-text-main">{extra?.recursosHibridos || 'Não possui'}</td></tr>
                                  <tr className="border-b border-gray-50"><td className="py-1 font-bold text-text-muted">Recursos Digitais:</td><td className="py-1 text-text-main">{extra?.suporteDigital || 'Não possui'}</td></tr>
                                  <tr className="border-b border-gray-50"><td className="py-1 font-bold text-text-muted">Termo Cessão:</td><td className="py-1 text-text-main">{extra?.possuiCessao ? '✅ Assinado e Arquivado' : '❌ Não cadastrado'}</td></tr>
                                  <tr className="border-b border-gray-50"><td className="py-1 font-bold text-text-muted">Termo Doação:</td><td className="py-1 text-text-main">{extra?.possuiTermo ? '✅ Assinado e Arquivado' : '❌ Não cadastrado'}</td></tr>
                                </tbody>
                              </table>
                            </div>

                            <div className="space-y-3">
                              <h3 className="text-xs font-bold text-accent tracking-wider uppercase border-b border-gray-100 pb-1">IV. CERTIFICAÇÃO DIGITAL & BLOCKCHAIN</h3>
                              <table className="w-full text-xs">
                                <tbody>
                                  <tr className="border-b border-gray-50"><td className="py-1 font-bold text-text-muted w-1/3">Certificado (COA):</td><td className="py-1 text-text-main">{extra?.possuiCOA ? '✅ Certificado Emitido' : '❌ Não emitido'}</td></tr>
                                  <tr className="border-b border-gray-50"><td className="py-1 font-bold text-text-muted">Código de COA:</td><td className="py-1 text-text-main font-mono">{extra?.registroCertificado || 'Não gerado'}</td></tr>
                                  <tr className="border-b border-gray-50"><td className="py-1 font-bold text-text-muted">Smart Contract:</td><td className="py-1 text-text-main font-mono text-[10px] break-all">{extra?.hashBlockchain || 'Não registrado'}</td></tr>
                                  <tr className="border-b border-gray-50"><td className="py-1 font-bold text-text-muted">Rede Blockchain:</td><td className="py-1 text-text-main">{extra?.redeBlockchain || 'Nenhuma'}</td></tr>
                                </tbody>
                              </table>
                            </div>
                          </div>

                          <div className="pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-text-muted font-mono bg-gray-50 p-4 rounded-xl">
                            <span>ID da Obra: {a.artwork_id}</span>
                            <span>Rede Segura Supabase</span>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
