import { useState, useEffect, lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { Analytics } from '@vercel/analytics/react';
import { Shell } from './components/layout/Shell';
import { supabase } from './services/supabase';
import ErrorBoundary from './components/common/ErrorBoundary';

import type { Session } from '@supabase/supabase-js';

// Lazy load screens
const Dashboard = lazy(() => import('./screens/Dashboard'));
const Upload = lazy(() => import('./screens/Upload'));
const Materiais = lazy(() => import('./screens/Materiais'));
const Login = lazy(() => import('./screens/Login'));
const Configuracoes = lazy(() => import('./screens/Configuracoes'));
const Perfil = lazy(() => import('./screens/Perfil'));
const Obras = lazy(() => import('./screens/Obras'));
const Dossie = lazy(() => import('./screens/Dossie'));

// Placeholder Screens
const Analise = () => <div className="space-y-4"><h1 className="text-3xl font-serif">Análise</h1><p>Relatório de saúde e análise curatorial (em breve)</p></div>;
const Importar = () => <div className="space-y-4"><h1 className="text-3xl font-serif">Importar</h1><p>Importação de acervo (em breve)</p></div>;
const Certificados = () => <div className="space-y-4"><h1 className="text-3xl font-serif">Certificados</h1><p>Gestão de certificados (em breve)</p></div>;

const LoadingScreen = () => (
  <div className="min-h-[50vh] flex items-center justify-center">
    <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin"/>
  </div>
);

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="text-center space-y-3">
          <h1 className="font-serif italic text-2xl text-text-main">studio virtual</h1>
          <p className="text-text-muted text-sm">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          <Route path="/login" element={!session ? <Login /> : <Navigate to="/" replace />} />

          <Route path="/" element={session ? <Shell /> : <Navigate to="/login" replace />}>
            <Route index element={<Dashboard />} />
            <Route path="upload" element={<Upload />} />
            <Route path="obras" element={<Obras />} />
            <Route path="dossie" element={<Dossie />} />
            <Route path="analise" element={<Analise />} />
            <Route path="importar" element={<Importar />} />
            <Route path="certificados" element={<Certificados />} />
            <Route path="materiais" element={<Materiais />} />
            <Route path="configuracoes" element={<Configuracoes />} />
            <Route path="perfil" element={<Perfil />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Analytics />
        <SpeedInsights />
      </Suspense>
    </ErrorBoundary>
  );
}

