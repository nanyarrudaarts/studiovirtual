import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { format } from 'date-fns';
import type { Artwork } from '../types';
import { UploadCloud, FileText, Activity, AlertCircle, Sparkles, ChevronRight, CheckCircle2 } from 'lucide-react';
import { ptBR, enUS, es, de } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';

export default function Dashboard() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const [obras, setObras] = useState<Artwork[]>([]);
  const [metricas, setMetricas] = useState({ totalObras: 0, healthScore: 92, alertasMateriais: 0 });
  const [loading, setLoading] = useState(true);

  const getLocale = () => {
    if (lang === 'en') return enUS;
    if (lang === 'es') return es;
    if (lang === 'de') return de;
    return ptBR;
  };

  useEffect(() => {
    async function loadDashboardData() {
      setLoading(true);
      try {
        // Fetch obras
        const { data: obrasData } = await supabase
          .from('artworks')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(6);
          
        if (obrasData) setObras(obrasData);

        const { count: alertasMateriais } = await supabase
          .from('artworks')
          .select('*', { count: 'exact', head: true })
          .eq('sale_status', 'available');

        // Mock count for total obras
        const { count: totalObras } = await supabase
          .from('artworks')
          .select('*', { count: 'exact', head: true });

        const healthScore = (obrasData && obrasData.length > 0) 
          ? Math.round((obrasData.reduce((acc, o) => {
              let filled = 0;
              if (o.narrativa_curatorial) filled++;
              if (o.sentenca_resumo) filled++;
              if (o.medium) filled++;
              if (o.dimensions) filled++;
              return acc + (filled / 4);
            }, 0) / obrasData.length) * 100) 
          : 100;

        setMetricas({
          totalObras: totalObras || 0,
          healthScore,
          alertasMateriais: alertasMateriais || 0,
        });
      } catch (err) {
        alert('Erro ao carregar dashboard: ' + (err as Error).message);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, []);

  const dataAtual = format(new Date(), "EEEE, d 'de' MMMM", { locale: getLocale() });

  return (
    <div className="flex flex-col md:flex-row gap-8 max-w-[1400px] mx-auto">
      <div className="flex-1 space-y-8 md:space-y-10 min-w-0">
        {/* Header */}
        <header>
          <p className="text-text-muted capitalize mb-1">{dataAtual}</p>
          <h1 className="text-3xl md:text-4xl font-serif text-text-main">
            {t('dashboard.welcome')}
          </h1>
        </header>

        {/* Metric Cards */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          <div className="bg-surface rounded-xl p-6 shadow-sm border border-gray-100 hover-float">
            <h3 className="text-text-muted font-medium text-sm mb-4">{t('dashboard.total_obras')}</h3>
            <div className="flex items-end gap-3">
              <span className="text-4xl font-serif">{metricas.totalObras}</span>
              <span className="text-accent text-sm font-medium mb-1">{t('dashboard.mais_dois_mes')}</span>
            </div>
          </div>
          <div className="bg-surface rounded-xl p-6 shadow-sm border border-gray-100 hover-float">
            <h3 className="text-text-muted font-medium text-sm mb-4">{t('dashboard.health_score')}</h3>
            <div className="flex items-end gap-3">
              <span className="text-4xl font-serif">{metricas.healthScore}%</span>
              <span className="text-emerald-500 text-sm font-medium mb-1 flex items-center gap-1">
                <CheckCircle2 size={14} /> {t('dashboard.excelente')}
              </span>
            </div>
          </div>
          <div className="bg-surface rounded-xl p-6 shadow-sm border border-gray-100 hover-float">
            <h3 className="text-text-muted font-medium text-sm mb-4">{t('dashboard.alertas')}</h3>
            <div className="flex items-end gap-3">
              <span className="text-4xl font-serif">{metricas.alertasMateriais}</span>
              <span className="text-accent2 text-sm font-medium mb-1 flex items-center gap-1">
                <AlertCircle size={14} /> {t('dashboard.reposicao')}
              </span>
            </div>
          </div>
        </section>

        {/* Action Cards */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          <button className="bg-accent text-white rounded-xl p-6 shadow-sm hover-float flex flex-col items-center justify-center gap-3 transition-colors hover:bg-accent/90">
            <UploadCloud size={32} />
            <span className="font-serif text-lg">{t('dashboard.novo_upload')}</span>
          </button>
          <button className="bg-surface text-text-main border border-gray-100 rounded-xl p-6 shadow-sm hover-float flex flex-col items-center justify-center gap-3 transition-colors hover:border-accent/30">
            <FileText size={32} className="text-accent" />
            <span className="font-serif text-lg">{t('dashboard.criar_dossie')}</span>
          </button>
          <button className="bg-surface text-text-main border border-gray-100 rounded-xl p-6 shadow-sm hover-float flex flex-col items-center justify-center gap-3 transition-colors hover:border-accent/30">
            <Activity size={32} className="text-accent" />
            <span className="font-serif text-lg">{t('dashboard.analise_curatorial')}</span>
          </button>
        </section>

        {/* Obras Recentes */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-serif">{t('dashboard.obras_recentes')}</h2>
            <button className="text-accent font-medium text-sm flex items-center gap-1 hover:underline">
              {t('dashboard.ver_galeria')} <ChevronRight size={16} />
            </button>
          </div>
          
          <div className="flex overflow-x-auto gap-4 md:gap-6 pb-6 -mx-4 md:-mx-2 px-4 md:px-2 snap-x scrollbar-hide">
            {loading ? (
              // Skeletons
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="min-w-[260px] md:min-w-[280px] h-[360px] bg-gray-200 rounded-xl animate-pulse shrink-0 snap-start" />
              ))
            ) : obras.length > 0 ? (
              obras.map((obra) => (
                <div key={obra.artwork_id} className="min-w-[260px] md:min-w-[280px] w-[260px] md:w-[280px] shrink-0 snap-start group cursor-pointer hover-float">
                  <div className="relative h-[300px] md:h-[320px] rounded-xl overflow-hidden mb-3 bg-gray-100">
                    {obra.cover_image ? (
                      <img
                        src={obra.cover_image}
                        alt={obra.artwork_title}
                        loading="lazy"
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        {t('dashboard.sem_imagem')}
                      </div>
                    )}
                    <div className="absolute top-3 right-3 bg-black/70 backdrop-blur-md text-white text-xs font-bold px-2.5 py-1 rounded-md">
                      {obra.accession_number || 'NA'}
                    </div>
                  </div>
                  <h3 className="font-serif text-lg text-text-main">{obra.artwork_title}</h3>
                  <p className="text-text-muted text-sm">{obra.creation_year} • {obra.medium}</p>
                </div>
              ))
            ) : (
              // Mock Obras para preview visual
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="min-w-[260px] md:min-w-[280px] w-[260px] md:w-[280px] shrink-0 snap-start group cursor-pointer hover-float">
                  <div className="relative h-[300px] md:h-[320px] rounded-xl overflow-hidden mb-3 bg-gray-200">
                    <img 
                      src={`https://images.unsplash.com/photo-1549490349-8643362247b5?w=600&h=800&fit=crop&auto=format&q=80`} 
                      alt="Mock" 
                      loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute top-3 right-3 bg-black/70 backdrop-blur-md text-white text-xs font-bold px-2.5 py-1 rounded-md">
                      300 DPI
                    </div>
                  </div>
                  <h3 className="font-serif text-lg text-text-main">Aura Emersa {i + 1}</h3>
                  <p className="text-text-muted text-sm">2026 • Óleo sobre tela</p>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      {/* Right Panel: Nota da Curadoria AI */}
      <aside className="w-full md:w-[340px] shrink-0">
        <div className="bg-surface border border-accent/20 rounded-xl p-6 shadow-float sticky top-8">
          <div className="flex items-center gap-3 mb-6 text-accent">
            <Sparkles size={24} />
            <h2 className="text-xl font-serif text-text-main">{t('dashboard.nota_curadoria')}</h2>
          </div>
          
          <div className="inline-block bg-accent/10 text-accent font-semibold text-xs px-3 py-1.5 rounded-full mb-4">
            {t('dashboard.insight_tag')}
          </div>
          
          <div className="space-y-4 text-text-main text-sm leading-relaxed">
            <p>{t('dashboard.insight_p1')}</p>
            <p className="text-text-muted italic">{t('dashboard.insight_p2')}</p>
          </div>
          
          <button className="mt-8 w-full py-3 bg-bg text-text-main hover:bg-gray-100 rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2">
            {t('dashboard.expandir_insights')} <ChevronRight size={16} />
          </button>
        </div>
      </aside>
    </div>
  );
}
