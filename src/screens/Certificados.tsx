import { useState, useEffect } from 'react';
import { getArtworks, getSeries } from '../services/supabase';
import type { Artwork, Series } from '../types';
import { CertificatePreview } from '../components/common/CertificatePreview';
import { downloadCertificate } from '../lib/generateCertificate';
import { Printer, Search, Loader2 } from 'lucide-react';
import { formatCOAID, translateTitle } from '../components/common/CertificatePDF';

export default function Certificados() {
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [seriesList, setSeriesList] = useState<Series[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedArtwork, setSelectedArtwork] = useState<Artwork | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [artList, serList] = await Promise.all([getArtworks(), getSeries()]);
        setArtworks(artList);
        setSeriesList(serList);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleDownload = async (artworkTitle: string, coaId: string) => {
    try {
      setIsGenerating(true);
      if (!selectedArtwork) return;

      const seriesTitle = selectedArtwork.series_reference ? seriesList.find(s => s.series_id === selectedArtwork.series_reference)?.series_title : '';
      const editionStr = selectedArtwork.classification === 'singular' ? 'Unique' : selectedArtwork.edition_number || 'N/A';

      const data = {
        title: selectedArtwork.artwork_title,
        artist: selectedArtwork.artist_name,
        year: selectedArtwork.creation_year?.toString() || 'N/A',
        medium: selectedArtwork.medium || '',
        dimensions: selectedArtwork.dimensions_formatted || 'N/A',
        status: 'Original',
        coaId,
        edition: editionStr,
        seriesTitle: seriesTitle || '—',
        description: selectedArtwork.artwork_description || '',
        artworkImage: selectedArtwork.cover_image || selectedArtwork.artwork_images?.[0] || '',
        sealImage: `${window.location.origin}/stamp.png`,
        issueDate: new Date(),
        creationCity: selectedArtwork.creation_city,
        creationCountry: selectedArtwork.creation_country,
        category: selectedArtwork.medium || 'Painting',
        editionNumber: selectedArtwork.edition_number,
        saleStatus: selectedArtwork.sale_status,
        support: selectedArtwork.support,
        artisticTechnique: selectedArtwork.artistic_technique,
        printRunTotal: (selectedArtwork as Artwork & { print_run_total?: number }).print_run_total,
        creationYear: selectedArtwork.creation_year,
        curatorialNarrative: selectedArtwork.curatorial_narrative,
      };

      const formattedCoaId = formatCOAID(coaId);
      const translatedTitle = translateTitle(selectedArtwork.artwork_title);
      const fileName = `COA_${formattedCoaId}_${translatedTitle.replace(/\s+/g, '_')}.pdf`;
      await downloadCertificate(data, fileName);
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      alert(`Ocorreu um erro ao gerar o certificado: ${error instanceof Error ? error.message : JSON.stringify(error)}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const filteredArtworks = artworks.filter(a => 
    a.artwork_title?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    a.artwork_id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-serif text-text">Certificados de Autenticidade</h1>
          <p className="text-text-muted mt-1">Gere e faça download dos COAs (Certificate of Authenticity) das suas obras.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Lado Esquerdo: Lista de Obras */}
        <div className="lg:col-span-1 bg-white rounded-2xl shadow-sm border border-gray-100 p-4 h-[calc(100vh-12rem)] flex flex-col">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Buscar obra por título ou ID..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:border-accent outline-none text-sm"
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-2">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="animate-spin text-accent" size={24} />
              </div>
            ) : filteredArtworks.map(a => (
              <button 
                key={a.artwork_id}
                onClick={() => setSelectedArtwork(a)}
                className={`w-full text-left p-3 rounded-xl transition-colors border ${
                  selectedArtwork?.artwork_id === a.artwork_id 
                    ? 'border-accent bg-accent/5' 
                    : 'border-transparent hover:bg-gray-50'
                }`}
              >
                <div className="flex gap-3">
                  <div className="w-12 h-12 rounded-lg bg-gray-100 shrink-0 overflow-hidden">
                    {(a.cover_image || (a.artwork_images && a.artwork_images[0])) && (
                      <img src={a.cover_image || a.artwork_images?.[0]} alt={a.artwork_title} className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-text truncate">{a.artwork_title}</h3>
                    <p className="text-xs text-text-muted">{a.artwork_id}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Lado Direito: Preview do Certificado */}
        <div className="lg:col-span-2 bg-gray-50 rounded-2xl border border-gray-100 p-8 flex flex-col items-center overflow-y-auto h-[calc(100vh-12rem)] relative">
          {selectedArtwork ? (
            <div className="w-full max-w-[794px] flex flex-col items-center">
              <div className="w-full flex justify-end mb-4">
                <button 
                  onClick={() => handleDownload(
                    selectedArtwork.artwork_title || 'Obra', 
                    selectedArtwork.accession_number || `NA-${new Date().getFullYear()}-${1000 + artworks.indexOf(selectedArtwork) + 1}`
                  )}
                  disabled={isGenerating}
                  className={`${isGenerating ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'} text-white px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-medium transition-colors`}
                >
                  <Printer size={18} /> {isGenerating ? 'Gerando...' : 'Baixar Certificado (PDF)'}
                </button>
              </div>
              <div className="shadow-xl bg-white origin-top mt-4 scale-[0.8] mb-[-224px]">
                <CertificatePreview 
                  artwork={selectedArtwork} 
                  coaId={selectedArtwork.accession_number || `NA-${new Date().getFullYear()}-${1000 + artworks.indexOf(selectedArtwork) + 1}`} 
                  seriesTitle={selectedArtwork.series_reference ? seriesList.find(s => s.series_id === selectedArtwork.series_reference)?.series_title : ''}
                  editionStr={selectedArtwork.classification === 'singular' ? 'Unique' : selectedArtwork.edition_number || 'N/A'}
                />
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-400">
              <Printer size={48} className="mx-auto mb-4 opacity-50" />
              <p className="text-sm">Selecione uma obra na lista lateral para gerar o certificado.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
