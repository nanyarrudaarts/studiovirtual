import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { format } from 'date-fns';
import type { Artwork } from '../types';
import { UploadCloud, FileText, Activity, AlertCircle, Sparkles, ChevronRight, CheckCircle2, ArrowUpRight } from 'lucide-react';
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

        const { count: totalObras } = await supabase
          .from('artworks')
          .select('*', { count: 'exact', head: true });

        const healthScore =
          obrasData && obrasData.length > 0
            ? Math.round(
                (obrasData.reduce((acc, o) => {
                  let filled = 0;
                  if (o.narrativa_curatorial) filled++;
                  if (o.sentenca_resumo) filled++;
                  if (o.medium) filled++;
                  if (o.dimensions) filled++;
                  return acc + filled / 4;
                }, 0) /
                  obrasData.length) *
                100
              )
            : 100;

        setMetricas({
          totalObras: totalObras || 0,
          healthScore,
          alertasMateriais: alertasMateriais || 0,
        });
      } catch (err) {
        console.error('Erro ao carregar dashboard:', err);
      } finally {
        setLoading(false);
      }
    }
    loadDashboardData();
  }, []);

  const dataAtual = format(new Date(), "EEEE, d 'de' MMMM", { locale: getLocale() });

  return (
    <div className="flex flex-col lg:flex-row gap-10 max-w-[1400px] mx-auto">
      <div className="flex-1 space-y-10 min-w-0">

        {/* ── Header ── */}
        <header className="space-y-1">
          <p className="text-xs uppercase tracking-widest text-text-faint capitalize">{dataAtual}</p>
          <h1 className="text-3xl md:text-4xl font-serif text-text-main leading-tight">
            {t('dashboard.welcome')}
          </h1>
        </header>

        {/* ── Metric Cards ── */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-surface rounded-xl p-6 border border-border hover-lift cursor-default">
            <p className="text-xs uppercase tracking-widest text-text-faint mb-4">{t('dashboard.total_obras')}</p>
            <div className="flex items-end justify-between">
              <span className="text-5xl font-serif text-accent leading-none">{metricas.totalObras}</span>
              <span className="text-xs text-text-faint font-medium mb-1 flex items-center gap-1">
                <ArrowUpRight size={12} /> {t('dashboard.mais_dois_mes')}
              </span>
            </div>
          </div>

          <div className="bg-surface rounded-xl p-6 border border-border hover-lift cursor-default">
            <p className="text-xs uppercase tracking-widest text-text-faint mb-4">{t('dashboard.health_score')}</p>
            <div className="flex items-end justify-between">
              <span className="text-5xl font-serif text-accent leading-none">
                {metricas.healthScore}<span className="text-2xl">%</span>
              </span>
              <span className="text-xs font-medium mb-1 flex items-center gap-1" style={{ color: 'var(--accent)' }}>
                <CheckCircle2 size={12} /> {t('dashboard.excelente')}
              </span>
            </div>
            <div className="mt-4 h-[2px] bg-border rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${metricas.healthScore}%`, background: 'var(--accent)' }}
              />
            </div>
          </div>

          <div className="bg-surface rounded-xl p-6 border border-border hover-lift cursor-default">
            <p className="text-xs uppercase tracking-widest text-text-faint mb-4">{t('dashboard.alertas')}</p>
            <div className="flex items-end justify-between">
              <span className="text-5xl font-serif text-accent leading-none">{metricas.alertasMateriais}</span>
              <span className="text-xs font-medium mb-1 flex items-center gap-1" style={{ color: 'var(--accent)' }}>
                <AlertCircle size={12} /> {t('dashboard.reposicao')}
              </span>
            </div>
          </div>
        </section>

        {/* ── Quick Actions ── */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <button
            className="group rounded-xl p-5 hover-lift flex items-center justify-between transition-all duration-200 cursor-pointer"
            style={{ background: 'var(--accent)', color: '#0A0A0C' }}
          >
            <div className="flex items-center gap-3">
              <UploadCloud size={18} className="text-[#0A0A0C]" />
              <span className="font-serif text-base font-bold">{t('dashboard.novo_upload')}</span>
            </div>
            <ArrowUpRight size={15} className="opacity-70 group-hover:opacity-100 transition-opacity text-[#0A0A0C]" />
          </button>

          <button className="group bg-surface border border-accent/20 rounded-xl p-5 hover-lift flex items-center justify-between transition-all duration-200 cursor-pointer hover:border-accent">
            <div className="flex items-center gap-3 text-text-main">
              <FileText size={18} />
              <span className="font-serif text-base">{t('dashboard.criar_dossie')}</span>
            </div>
            <ArrowUpRight size={15} className="text-text-faint group-hover:text-accent transition-colors" />
          </button>

          <button className="group bg-surface border border-accent/20 rounded-xl p-5 hover-lift flex items-center justify-between transition-all duration-200 cursor-pointer hover:border-accent">
            <div className="flex items-center gap-3 text-text-main">
              <Activity size={18} />
              <span className="font-serif text-base">{t('dashboard.analise_curatorial')}</span>
            </div>
            <ArrowUpRight size={15} className="text-text-faint group-hover:text-accent transition-colors" />
          </button>
        </section>

        {/* ── Obras Recentes ── */}
        <section>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-serif text-text-main">{t('dashboard.obras_recentes')}</h2>
            <button className="text-[10px] uppercase tracking-widest text-text-muted hover:text-text-main flex items-center gap-1 transition-colors cursor-pointer">
              {t('dashboard.ver_galeria')} <ChevronRight size={13} />
            </button>
          </div>

          <div className="flex overflow-x-auto gap-5 pb-4 -mx-5 md:-mx-2 px-5 md:px-2 snap-x scrollbar-hide">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="min-w-[210px] h-[310px] bg-surface-raised rounded-xl animate-pulse shrink-0 snap-start border border-border"
                />
              ))
            ) : obras.length > 0 ? (
              obras.map((obra) => (
                <div
                  key={obra.artwork_id}
                  className="min-w-[210px] w-[210px] shrink-0 snap-start group cursor-pointer"
                >
                  <div className="relative h-[270px] rounded-xl overflow-hidden mb-3 bg-surface-raised border border-border">
                    {obra.cover_image ? (
                      <img
                        src={obra.cover_image}
                        alt={obra.artwork_title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-text-faint text-[10px] uppercase tracking-widest">
                        {t('dashboard.sem_imagem')}
                      </div>
                    )}
                    <div className="absolute top-2.5 right-2.5 bg-black/55 backdrop-blur-md text-white text-[9px] font-mono px-2 py-0.5 rounded tracking-wider">
                      {obra.accession_number || 'NA'}
                    </div>
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/8 transition-colors duration-300 rounded-xl" />
                  </div>
                  <h3 className="font-serif text-sm text-text-main leading-snug">{obra.artwork_title}</h3>
                  <p className="text-text-faint text-[11px] mt-0.5 tracking-wide">
                    {obra.creation_year} · {obra.medium}
                  </p>
                </div>
              ))
            ) : (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="min-w-[210px] w-[210px] shrink-0 snap-start group cursor-pointer">
                  <div className="relative h-[270px] rounded-xl overflow-hidden mb-3 bg-surface-raised border border-border">
                    <img
                      src="https://images.unsplash.com/photo-1549490349-8643362247b5?w=600&h=800&fit=crop&auto=format&q=80"
                      alt="Mock"
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300 rounded-xl" />
                  </div>
                  <h3 className="font-serif text-sm text-text-main">Aura Emersa {i + 1}</h3>
                  <p className="text-text-faint text-[11px] mt-0.5 tracking-wide">2026 · Óleo sobre tela</p>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      {/* ── Right Panel: Nota da Curadoria AI ── */}
      <aside className="w-full lg:w-[280px] shrink-0">
        <div className="bg-surface border border-border rounded-xl p-6 sticky top-8">
          <div className="flex items-center gap-2.5 mb-5 text-text-main">
            <Sparkles size={15} className="text-text-muted" />
            <h2 className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">
              {t('dashboard.nota_curadoria')}
            </h2>
          </div>

          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[9px] uppercase tracking-widest font-semibold mb-5 bg-accent/10 text-accent border border-accent/20">
            {t('dashboard.insight_tag')}
          </span>

          <div className="space-y-3 text-text-main text-sm leading-relaxed">
            <p>{t('dashboard.insight_p1')}</p>
            <p className="text-text-muted italic text-xs leading-relaxed">{t('dashboard.insight_p2')}</p>
          </div>

          <button className="mt-6 w-full py-2.5 bg-surface-raised hover:bg-surface border border-border text-text-muted hover:text-accent rounded-lg font-medium text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 cursor-pointer">
            {t('dashboard.expandir_insights')} <ChevronRight size={12} />
          </button>
        </div>
      </aside>
    </div>
  );
}
