import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { format } from 'date-fns';
import type { Artwork } from '../types';
import {
  UploadCloud, FileText, Activity, AlertCircle,
  Sparkles, ChevronRight, CheckCircle2, ArrowUpRight, Plus
} from 'lucide-react';
import { ptBR, enUS, es, de } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const navigate = useNavigate();
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
        // ⚡ BOLT OPTIMIZATION: Parallelize Supabase queries to eliminate request waterfall
        const [
          { data: obrasData },
          { count: alertasMateriais },
          { count: totalObras }
        ] = await Promise.all([
          supabase
            .from('artworks')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(6),
          supabase
            .from('artworks')
            .select('*', { count: 'exact', head: true })
            .eq('sale_status', 'available'),
          supabase
            .from('artworks')
            .select('*', { count: 'exact', head: true })
        ]);

        if (obrasData) setObras(obrasData);

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
          <p className="text-xs uppercase tracking-widest text-text-faint capitalize">
            {dataAtual}
          </p>
          <h1 className="text-3xl md:text-4xl font-serif leading-tight text-text-main">
            {t('dashboard.welcome')}
          </h1>
          {/* Gold accent line under heading */}
          <div className="gold-line mt-3 w-24" />
        </header>

        {/* ── Metric Cards ── */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-5">

          {/* Hero Card – Total Obras — glass slab with gold glow */}
          <div className="glass-slab rounded-2xl p-7 hover-lift cursor-default relative overflow-hidden float-anim">
            <div className="card-shimmer-top" />
            <p className="text-[10px] uppercase tracking-[0.18em] mb-5 text-text-faint">
              {t('dashboard.total_obras')}
            </p>
            <div className="flex items-end justify-between">
              <span className="text-6xl font-serif leading-none text-gold-number">
                {metricas.totalObras}
              </span>
              <span className="text-xs mb-1 flex items-center gap-1 text-gold">
                <ArrowUpRight size={12} /> {t('dashboard.mais_dois_mes')}
              </span>
            </div>
          </div>

          {/* Health Score Card */}
          <div className="glass-slab rounded-2xl p-7 hover-lift cursor-default relative overflow-hidden float-anim delay-800">
            <div className="card-shimmer-top-dim" />
            <p className="text-[10px] uppercase tracking-[0.18em] mb-5 text-text-faint">
              {t('dashboard.health_score')}
            </p>
            <div className="flex items-end justify-between">
              <span className="text-6xl font-serif leading-none text-text-main">
                {metricas.healthScore}<span className="text-2xl text-text-muted">%</span>
              </span>
              <span className="text-xs font-medium mb-1 flex items-center gap-1 text-emerald">
                <CheckCircle2 size={12} /> {t('dashboard.excelente')}
              </span>
            </div>
            <div className="progress-track mt-5">
              <div
                className="progress-fill-emerald"
                style={{ width: `${metricas.healthScore}%` }}
              />
            </div>
          </div>

          {/* Alertas Card */}
          <div className="glass-slab rounded-2xl p-7 hover-lift cursor-default relative overflow-hidden float-anim delay-1600">
            <div className="card-shimmer-top-amber" />
            <p className="text-[10px] uppercase tracking-[0.18em] mb-5 text-text-faint">
              {t('dashboard.alertas')}
            </p>
            <div className="flex items-end justify-between">
              <span className="text-6xl font-serif leading-none text-text-main">
                {metricas.alertasMateriais}
              </span>
              <span className="text-xs font-medium mb-1 flex items-center gap-1 text-amber">
                <AlertCircle size={12} /> {t('dashboard.reposicao')}
              </span>
            </div>
          </div>
        </section>

        {/* ── Quick Actions ── */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Primary CTA — gold */}
          <button
            onClick={() => navigate('/upload')}
            className="group btn-gold-gradient rounded-xl p-5 hover-lift flex items-center justify-between transition-all duration-200 cursor-pointer relative overflow-hidden gold-pulse"
          >
            <div className="flex items-center gap-3">
              <UploadCloud size={18} />
              <span className="font-serif text-base font-semibold">{t('dashboard.novo_upload')}</span>
            </div>
            <ArrowUpRight size={15} className="opacity-60 group-hover:opacity-100 transition-opacity" />
          </button>

          <button
            onClick={() => navigate('/dossie')}
            className="group glass-slab rounded-xl p-5 hover-lift flex items-center justify-between transition-all duration-200 cursor-pointer"
          >
            <div className="flex items-center gap-3 text-text-main">
              <FileText size={18} className="text-gold" />
              <span className="font-serif text-base">{t('dashboard.criar_dossie')}</span>
            </div>
            <ArrowUpRight size={15} className="text-text-faint group-hover:text-gold transition-colors" />
          </button>

          <button
            onClick={() => navigate('/analise')}
            className="group glass-slab rounded-xl p-5 hover-lift flex items-center justify-between transition-all duration-200 cursor-pointer"
          >
            <div className="flex items-center gap-3 text-text-main">
              <Activity size={18} className="text-gold" />
              <span className="font-serif text-base">{t('dashboard.analise_curatorial')}</span>
            </div>
            <ArrowUpRight size={15} className="text-text-faint" />
          </button>
        </section>

        {/* ── Obras Recentes ── */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-serif text-text-main">
                {t('dashboard.obras_recentes')}
              </h2>
              <div className="gold-line mt-1.5 w-12" />
            </div>
            <button
              onClick={() => navigate('/obras')}
              className="text-[10px] uppercase tracking-widest flex items-center gap-1 transition-colors cursor-pointer text-gold"
            >
              {t('dashboard.ver_galeria')} <ChevronRight size={13} />
            </button>
          </div>

          <div className="flex overflow-x-auto gap-5 pb-4 -mx-5 md:-mx-2 px-5 md:px-2 snap-x scrollbar-hide">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="min-w-[200px] h-[300px] rounded-2xl animate-pulse shrink-0 snap-start skeleton-card"
                />
              ))
            ) : obras.length > 0 ? (
              obras.map((obra, idx) => (
                <div
                  key={obra.artwork_id}
                  className="min-w-[200px] w-[200px] shrink-0 snap-start group cursor-pointer float-anim"
                  style={{ animationDelay: `${idx * 0.2}s` }}
                  onClick={() => navigate('/obras')}
                >
                  <div
                    className="relative h-[260px] rounded-2xl overflow-hidden mb-3 hover-lift"
                    style={{
                      background: 'var(--surface-raised)',
                      border: '1px solid var(--border)',
                      boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
                    }}
                  >
                    {obra.cover_image ? (
                      <img
                        src={obra.cover_image}
                        alt={obra.artwork_title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[10px] uppercase tracking-widest text-text-faint">
                        {t('dashboard.sem_imagem')}
                      </div>
                    )}
                    {/* Gold top edge */}
                    <div className="absolute top-0 inset-x-0 h-px"
                      style={{ background: 'linear-gradient(90deg, transparent, var(--gold), transparent)', opacity: 0.5 }} />
                    <div className="artwork-badge">
                      {obra.accession_number || 'NA'}
                    </div>
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/12 transition-colors duration-300 rounded-2xl" />
                  </div>
                  <h3 className="font-serif text-sm leading-snug text-text-main">
                    {obra.artwork_title}
                  </h3>
                  <p className="text-[11px] mt-0.5 tracking-wide text-text-faint">
                    {obra.creation_year} · {obra.medium}
                  </p>
                </div>
              ))
            ) : (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="min-w-[200px] w-[200px] shrink-0 snap-start group cursor-pointer"
                  onClick={() => navigate('/obras')}>
                  <div
                    className="relative h-[260px] rounded-2xl overflow-hidden mb-3 hover-lift"
                    style={{ border: '1px solid var(--border)', boxShadow: '0 8px 32px rgba(0,0,0,0.25)' }}
                  >
                    <img
                      src={`https://images.unsplash.com/photo-1549490349-8643362247b5?w=600&h=800&fit=crop&auto=format&q=80`}
                      alt="Mock"
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute top-0 inset-x-0 h-px"
                      style={{ background: 'linear-gradient(90deg, transparent, var(--gold), transparent)', opacity: 0.5 }} />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/12 transition-colors duration-300 rounded-2xl" />
                  </div>
                  <h3 className="font-serif text-sm text-text-main">
                    Aura Emersa {i + 1}
                  </h3>
                  <p className="text-[11px] mt-0.5 tracking-wide text-text-faint">
                    2026 · Óleo sobre tela
                  </p>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      {/* ── Right Panel: Nota da Curadoria AI ── */}
      <aside className="w-full lg:w-[280px] shrink-0">
        <div className="glass-slab rounded-2xl p-6 sticky top-8 relative overflow-hidden">
          {/* Gold top edge */}
          <div className="card-shimmer-top-strong" />

          <div className="flex items-center gap-2.5 mb-5">
            <Sparkles size={15} className="text-gold" />
            <h2 className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">
              {t('dashboard.nota_curadoria')}
            </h2>
          </div>

          <span className="pill pill-gold mb-5 inline-flex">
            {t('dashboard.insight_tag')}
          </span>

          <div className="space-y-3 text-sm leading-relaxed">
            <p className="text-text-main">{t('dashboard.insight_p1')}</p>
            <p className="italic text-xs leading-relaxed text-text-muted">
              {t('dashboard.insight_p2')}
            </p>
          </div>

          <button
            className="mt-6 w-full py-2.5 rounded-xl font-medium text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer btn-ghost-border"
          >
            {t('dashboard.expandir_insights')} <ChevronRight size={12} />
          </button>
        </div>

        {/* ── Mini Quick Add FAB ── */}
        <button
          onClick={() => navigate('/upload')}
          className="mt-6 w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-semibold text-sm cursor-pointer transition-all hover-lift gold-pulse btn-gold-gradient"
        >
          <Plus size={16} />
          Nova Obra
        </button>
      </aside>
    </div>
  );
}
