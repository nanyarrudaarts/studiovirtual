import { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';
import { Shell } from './components/layout/Shell';
import Dashboard from './screens/Dashboard';
import Upload from './screens/Upload';
import Materiais from './screens/Materiais';
import Login from './screens/Login';
import Configuracoes from './screens/Configuracoes';
import Perfil from './screens/Perfil';
import { supabase } from './services/supabase';

// Placeholder Screens
import Obras from './screens/Obras';
import Dossie from './screens/Dossie';
const Analise = () => <div className="space-y-4"><h1 className="text-3xl font-serif">Análise</h1><p>Relatório de saúde e análise curatorial (em breve)</p></div>;
const Importar = () => <div className="space-y-4"><h1 className="text-3xl font-serif">Importar</h1><p>Importação de acervo (em breve)</p></div>;
const Certificados = () => <div className="space-y-4"><h1 className="text-3xl font-serif">Certificados</h1><p>Gestão de certificados (em breve)</p></div>;

export default function App() {
  const [session, setSession] = useState<any>(null);
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
    <>
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
    </>
  );
}
