import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { 
  LayoutDashboard, 
  UploadCloud, 
  Image as ImageIcon, 
  FileText, 
  Activity, 
  DownloadCloud, 
  Award, 
  Box,
  Settings,
  LogOut
} from 'lucide-react';
import { supabase } from '../../services/supabase';

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/upload', label: 'Upload', icon: UploadCloud },
  { path: '/obras', label: 'Obras', icon: ImageIcon },
  { path: '/dossie', label: 'Dossiê', icon: FileText },
  { path: '/analise', label: 'Análise', icon: Activity },
  { path: '/importar', label: 'Importar', icon: DownloadCloud },
  { path: '/certificados', label: 'Certificados', icon: Award },
  { path: '/materiais', label: 'Materiais', icon: Box },
];

export function Shell() {
  const [aiProvider, setAiProvider] = useState('gemini');
  const [apiKey, setApiKey] = useState('');

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="flex h-screen w-full bg-bg text-text-main overflow-hidden">
      {/* Sidebar */}
      <aside className="w-[220px] bg-surface flex flex-col shadow-sm z-10 shrink-0">
        <div className="p-6">
          <h1 className="font-serif italic text-2xl tracking-wide">
            studio virtual
          </h1>
        </div>
        
        <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
                    isActive 
                      ? 'bg-accent text-white' 
                      : 'text-text-muted hover:bg-bg hover:text-text-main'
                  }`
                }
              >
                <Icon size={18} />
                <span className="font-medium text-sm">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-100 space-y-1">
          <button className="flex items-center gap-3 px-3 py-2 text-text-muted hover:text-text-main transition-colors w-full rounded-xl hover:bg-bg">
            <Settings size={18} />
            <span className="font-medium text-sm">Configurações</span>
          </button>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2 text-rose-500 hover:text-rose-600 hover:bg-rose-50 transition-colors w-full rounded-xl"
          >
            <LogOut size={18} />
            <span className="font-medium text-sm">Sair</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Topbar */}
        <header className="h-16 bg-surface/50 backdrop-blur-md border-b border-gray-100 flex items-center justify-between px-8 shrink-0 z-10">
          <div className="flex items-center gap-4">
            {/* Topbar left area if needed */}
          </div>
          
          <div className="flex items-center gap-4">
            <select 
              value={aiProvider}
              onChange={(e) => setAiProvider(e.target.value)}
              className="bg-bg border-none rounded-lg px-3 py-1.5 text-sm font-medium focus:ring-2 focus:ring-accent outline-none"
            >
              <option value="gemini">Gemini (Google)</option>
              <option value="chatgpt">ChatGPT (OpenAI)</option>
              <option value="notebooklm">NotebookLM</option>
            </select>
            
            <input 
              type="password" 
              placeholder="API Key" 
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="bg-bg border-none rounded-lg px-3 py-1.5 text-sm w-48 focus:ring-2 focus:ring-accent outline-none"
            />
          </div>
        </header>

        {/* Scrollable Page Content */}
        <div className="flex-1 overflow-y-auto p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
