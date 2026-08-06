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
const CadastroUsuario = lazy(() => import('./screens/CadastroUsuario'));

// Placeholder Screens
const Analise = () => <div className="space-y-4"><h1 className="text-3xl font-serif">Análise</h1><p>Relatório de saúde e análise curatorial (em breve)</p></div>;
const Importar = () => <div className="space-y-4"><h1 className="text-3xl font-serif">Importar</h1><p>Importação de acervo (em breve)</p></div>;

const LoadingScreen = () => (
  <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4">
    <h1 className="font-serif italic text-2xl text-gold">studio virtual</h1>
    <div className="w-5 h-5 border-2 border-gold border-t-transparent rounded-full animate-spin" />
  </div>
);

// ─── Fix 3: Timeout para getOnboardingStatus ──────────────────────────────────
// Se a chamada ao banco demorar mais de ms, assume o fallback silenciosamente.
// Usa resolve (não reject) para que o catch do caller não seja ativado por timeout.
function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  const timer = new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms));
  return Promise.race([promise, timer]);
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    console.log('App mounted, starting auth listener');

    // ─── Fix 2: ref de timer como variável local no closure ───────────────────
    // Garantimos que só existe UM timer ativo por vez, recriado a cada evento
    // que ativa o loading. A variável é local ao useEffect para não vazar entre renders.
    let fallbackTimerId: ReturnType<typeof setTimeout> | null = null;

    const clearFallback = () => {
      if (fallbackTimerId !== null) {
        clearTimeout(fallbackTimerId);
        fallbackTimerId = null;
      }
    };

    const startFallback = () => {
      clearFallback(); // limpa anterior antes de criar novo (evita acúmulo)
      fallbackTimerId = setTimeout(() => {
        if (active) {
          console.warn('Fallback timer fired: auth check took too long');
          setLoading(false);
        }
      }, 5000);
    };

    // ─── Fix 1: firstLoad — evita re-spinner em re-triggers de INITIAL_SESSION ─
    // É uma variável local no closure (não useRef/useState) porque só precisa
    // ser acessada dentro deste useEffect, e não causa re-renders.
    let firstLoad = true;

    // Inicia fallback para o carregamento inicial (antes do primeiro evento)
    startFallback();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, s) => {
      console.log('onAuthStateChange:', event, s?.user?.email ?? 'no-user');
      if (!active) return;

      // Logout: limpa tudo, reseta firstLoad para o próximo login
      if (event === 'SIGNED_OUT' || !s) {
        firstLoad = true; // próximo SIGNED_IN mostrará loading normalmente
        clearFallback();
        setSession(null);
        setOnboardingDone(null);
        setLoading(false);
        return;
      }

      // Atualiza sessão sempre (inclusive re-triggers silenciosos)
      setSession(s);

      // ─── Fix 1 aplicado ───────────────────────────────────────────────────
      // Só ativa o spinner e recria o fallback na PRIMEIRA vez (login inicial
      // ou pós-logout). Re-triggers de INITIAL_SESSION (ex: volta de outra aba)
      // continuam atualizando o estado silenciosamente, sem travar a UI.
      if (firstLoad) {
        setLoading(true);
        startFallback(); // ─── Fix 2 aplicado: recria timer para este ciclo
      }
      firstLoad = false;

      try {
        // ─── Fix 3 aplicado ───────────────────────────────────────────────
        // Timeout de 6s: se getOnboardingStatus demorar, assume true (done).
        // Usa resolve no timer (não reject), então o catch não é ativado por timeout.
        // Resultado: a usuária vai direto ao dashboard sem ver erro na UI.
        const done = await withTimeout(getOnboardingStatus(), 6000, true);
        if (active) {
          setOnboardingDone(done);
        }
      } catch (err) {
        // Só entra aqui se getOnboardingStatus jogar um erro real (não timeout)
        console.error('getOnboardingStatus falhou, assumindo concluído:', err);
        if (active) {
          setOnboardingDone(true);
        }
      } finally {
        if (active) {
          clearFallback();
          setLoading(false);
        }
      }
    });

    return () => {
      active = false;
      clearFallback();
      subscription.unsubscribe();
    };
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
            <Route path="cadastro-usuario" element={<CadastroUsuario />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Analytics />
        <SpeedInsights />
      </Suspense>
    </ErrorBoundary>
  );
}
