import { useState, useEffect, lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { Analytics } from '@vercel/analytics/react';
import { Shell } from './components/layout/Shell';
import { supabase } from './services/supabase';
import { getOnboardingStatus } from './services/supabase';
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
const SerieDetail = lazy(() => import('./screens/SerieDetail'));
const Certificados = lazy(() => import('./screens/Certificados'));
const Portfolio = lazy(() => import('./screens/Portfolio'));
const Onboarding = lazy(() => import('./screens/Onboarding'));

// Placeholder Screens
const Analise = () => <div className="space-y-4"><h1 className="text-3xl font-serif">Análise</h1><p>Relatório de saúde e análise curatorial (em breve)</p></div>;
const Importar = () => <div className="space-y-4"><h1 className="text-3xl font-serif">Importar</h1><p>Importação de acervo (em breve)</p></div>;

const LoadingScreen = () => (
  <div className="min-h-screen bg-bg flex flex-col items-center justify-center gap-4">
    <h1 className="font-serif italic text-2xl" style={{ color: '#0f3421' }}>studio virtual</h1>
    <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: '#0f3421', borderTopColor: 'transparent' }} />
  </div>
);

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null);

  useEffect(() => {
    console.log('App mounted, starting getSession');
    const fallbackTimer = setTimeout(() => {
      console.warn('Fallback timer fired: getSession took too long');
      setLoading(false);
    }, 3000);

    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      console.log('getSession resolved', s);
      setSession(s);
      if (s) {
        try {
          const done = await getOnboardingStatus();
          console.log('onboarding status:', done);
          setOnboardingDone(done);
        } catch (err) {
          console.error('Error fetching onboarding status:', err);
          setOnboardingDone(null);
        }
      } else {
        setOnboardingDone(null);
      }
      clearTimeout(fallbackTimer);
      setLoading(false);
    }).catch(err => {
      console.error('Error getting session:', err);
      setSession(null);
      setOnboardingDone(null);
      clearTimeout(fallbackTimer);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, s) => {
      setSession(s);
      if (s) {
        try {
          const done = await getOnboardingStatus();
          setOnboardingDone(done);
        } catch (err) {
          console.error('Error in auth state change onboarding fetch:', err);
          setOnboardingDone(null);
        }
      } else {
        setOnboardingDone(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) return <LoadingScreen />;

  // Not logged in — always show Login
  if (!session) {
    return (
      <ErrorBoundary>
        <Suspense fallback={<LoadingScreen />}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
          <Analytics />
          <SpeedInsights />
        </Suspense>
      </ErrorBoundary>
    );
  }

  // Logged in but onboarding not complete → force /onboarding
  if (onboardingDone === false) {
    return (
      <ErrorBoundary>
        <Suspense fallback={<LoadingScreen />}>
          <Routes>
            <Route
              path="/onboarding"
              element={
                <Onboarding
                  onComplete={() => setOnboardingDone(true)}
                />
              }
            />
            <Route path="*" element={<Navigate to="/onboarding" replace />} />
          </Routes>
          <Analytics />
          <SpeedInsights />
        </Suspense>
      </ErrorBoundary>
    );
  }

  // Logged in + onboarding done → normal app
  return (
    <ErrorBoundary>
      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          <Route path="/login" element={<Navigate to="/" replace />} />
          <Route path="/onboarding" element={<Navigate to="/" replace />} />

          <Route path="/" element={<Shell />}>
            <Route index element={<Dashboard />} />
            <Route path="upload" element={<Upload />} />
            <Route path="obras" element={<Obras />} />
            <Route path="obras/serie/:id" element={<SerieDetail />} />
            <Route path="dossie" element={<Dossie />} />
            <Route path="analise" element={<Analise />} />
            <Route path="importar" element={<Importar />} />
            <Route path="certificados" element={<Certificados />} />
            <Route path="portfolio" element={<Portfolio />} />
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
