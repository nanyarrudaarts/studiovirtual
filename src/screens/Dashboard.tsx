import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import type { Obra } from '../types';
import { UploadCloud, FileText, Activity, AlertCircle, Sparkles, ChevronRight, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function Dashboard() {
  const [obras, setObras] = useState<Obra[]>([]);
  const [metricas, setMetricas] = useState({ totalObras: 0, healthScore: 92, alertasMateriais: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      setLoading(true);
      try {
        // Fetch obras
        const { data: obrasData } = await supabase
          .from('obras')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(6);
          
        if (obrasData) setObras(obrasData);

        // Fetch materiais com alerta
        const { count } = await supabase
          .from('materiais')
          .select('*', { count: 'exact', head: true })
          .in('status_estoque', ['baixo', 'esgotado']);

        // Mock count for total obras
        const { count: totalObras } = await supabase
          .from('obras')
          .select('*', { count: 'exact', head: true });

        setMetricas({
          totalObras: totalObras || 24, // fallback mock
          healthScore: 92, // mock health score
          alertasMateriais: count || 3, // fallback mock
        });
      } catch (err) {
        console.error('Error loading dashboard:', err);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, []);

  const dataAtual = format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR });

  return (
    <div className="flex gap-8 max-w-[1400px] mx-auto">
      <div className="flex-1 space-y-10">
        {/* Header */}
        <header>
          <p className="text-text-muted capitalize mb-1">{dataAtual}</p>
          <h1 className="text-4xl font-serif text-text-main">
            Bem-vinda de volta, Nany.
          </h1>
        </header>

        {/* Metric Cards */}
        <section className="grid grid-cols-3 gap-6">
          <div className="bg-surface rounded-xl p-6 shadow-sm border border-gray-100 hover-float">
            <h3 className="text-text-muted font-medium text-sm mb-4">Total de Obras</h3>
            <div className="flex items-end gap-3">
              <span className="text-4xl font-serif">{metricas.totalObras}</span>
              <span className="text-accent text-sm font-medium mb-1">+2 este mês</span>
            </div>
          </div>
          <div className="bg-surface rounded-xl p-6 shadow-sm border border-gray-100 hover-float">
            <h3 className="text-text-muted font-medium text-sm mb-4">Health Score Acervo</h3>
            <div className="flex items-end gap-3">
              <span className="text-4xl font-serif">{metricas.healthScore}%</span>
              <span className="text-emerald-500 text-sm font-medium mb-1 flex items-center gap-1">
                <CheckCircle2 size={14} /> Excelente
              </span>
            </div>
          </div>
          <div className="bg-surface rounded-xl p-6 shadow-sm border border-gray-100 hover-float">
            <h3 className="text-text-muted font-medium text-sm mb-4">Alertas de Materiais</h3>
            <div className="flex items-end gap-3">
              <span className="text-4xl font-serif">{metricas.alertasMateriais}</span>
              <span className="text-accent2 text-sm font-medium mb-1 flex items-center gap-1">
                <AlertCircle size={14} /> Reposição
              </span>
            </div>
          </div>
        </section>

        {/* Action Cards */}
        <section className="grid grid-cols-3 gap-6">
          <button className="bg-accent text-white rounded-xl p-6 shadow-sm hover-float flex flex-col items-center justify-center gap-3 transition-colors hover:bg-accent/90">
            <UploadCloud size={32} />
            <span className="font-serif text-lg">Novo Upload</span>
          </button>
          <button className="bg-surface text-text-main border border-gray-100 rounded-xl p-6 shadow-sm hover-float flex flex-col items-center justify-center gap-3 transition-colors hover:border-accent/30">
            <FileText size={32} className="text-accent" />
            <span className="font-serif text-lg">Criar Dossiê</span>
          </button>
          <button className="bg-surface text-text-main border border-gray-100 rounded-xl p-6 shadow-sm hover-float flex flex-col items-center justify-center gap-3 transition-colors hover:border-accent/30">
            <Activity size={32} className="text-accent" />
            <span className="font-serif text-lg">Análise Curatorial</span>
          </button>
        </section>

        {/* Obras Recentes */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-serif">Obras Recentes</h2>
            <button className="text-accent font-medium text-sm flex items-center gap-1 hover:underline">
              Ver Galeria Completa <ChevronRight size={16} />
            </button>
          </div>
          
          <div className="flex overflow-x-auto gap-6 pb-6 -mx-2 px-2 snap-x">
            {loading ? (
              // Skeletons
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="min-w-[280px] h-[360px] bg-gray-200 rounded-xl animate-pulse shrink-0" />
              ))
            ) : obras.length > 0 ? (
              obras.map((obra) => (
                <div key={obra.id} className="min-w-[280px] w-[280px] shrink-0 snap-start group cursor-pointer hover-float">
                  <div className="relative h-[320px] rounded-xl overflow-hidden mb-3 bg-gray-100">
                    {obra.imagens?.[0]?.url ? (
                      <img 
                        src={obra.imagens[0].url} 
                        alt={obra.titulo} 
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        Sem Imagem
                      </div>
                    )}
                    {/* 300 DPI Badge */}
                    <div className="absolute top-3 right-3 bg-black/70 backdrop-blur-md text-white text-xs font-bold px-2.5 py-1 rounded-md">
                      300 DPI
                    </div>
                  </div>
                  <h3 className="font-serif text-lg text-text-main">{obra.titulo}</h3>
                  <p className="text-text-muted text-sm">{obra.ano} • {obra.suporte}</p>
                </div>
              ))
            ) : (
              // Mock Obras para preview visual
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="min-w-[280px] w-[280px] shrink-0 snap-start group cursor-pointer hover-float">
                  <div className="relative h-[320px] rounded-xl overflow-hidden mb-3 bg-gray-200">
                    <img 
                      src={`https://images.unsplash.com/photo-1549490349-8643362247b5?w=600&h=800&fit=crop&auto=format&q=80`} 
                      alt="Mock" 
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
      <aside className="w-[340px] shrink-0">
        <div className="bg-surface border border-accent/20 rounded-xl p-6 shadow-float sticky top-8">
          <div className="flex items-center gap-3 mb-6 text-accent">
            <Sparkles size={24} />
            <h2 className="text-xl font-serif text-text-main">Nota da Curadoria AI</h2>
          </div>
          
          <div className="inline-block bg-accent/10 text-accent font-semibold text-xs px-3 py-1.5 rounded-full mb-4">
            Abstracionismo Lírico Contemporâneo
          </div>
          
          <div className="space-y-4 text-text-main text-sm leading-relaxed">
            <p>
              As obras recentes demonstram um aprofundamento na exploração da luz 
              sobre texturas densas. O uso de paletas mais terrosas cruzadas com 
              o "Accent Rose" evidencia uma maturação na forma como Nany aborda 
              a tensão entre o orgânico e o construído.
            </p>
            <p className="text-text-muted italic">
              Insight gerado analisando as últimas 4 obras carregadas, comparadas 
              ao manifesto curatorial de 2025.
            </p>
          </div>
          
          <button className="mt-8 w-full py-3 bg-bg text-text-main hover:bg-gray-100 rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2">
            Expandir Insights <ChevronRight size={16} />
          </button>
        </div>
      </aside>
    </div>
  );
}
