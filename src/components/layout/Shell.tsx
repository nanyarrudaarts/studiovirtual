import { useState, useRef, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, UploadCloud, Image as ImageIcon, FileText, Activity,
  DownloadCloud, Award, Box, Settings, UserCircle, LogOut,
  Sun, Moon, Globe
} from 'lucide-react';
import { supabase } from '../../services/supabase';
import { useTheme, useLanguage } from '../../hooks/useTheme';

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/upload', label: 'Upload', icon: UploadCloud },
  { path: '/obras', label: 'Obras', icon: ImageIcon },
  { path: '/dossie', label: 'Dossiê', icon: FileText },
  { path: '/analise', label: 'Análise', icon: Activity },
  { path: '/importar', label: 'Importar', icon: DownloadCloud },
  { path: '/certificados', label: 'Certificados', icon: Award },
  { path: '/configuracoes', label: 'Configurações', icon: Settings },
  { path: '/materiais', label: 'Materiais', icon: Box },
  { path: '/perfil', label: 'Perfil', icon: UserCircle },
];

const LANGUAGES = [
  { value: 'pt-BR', label: 'Português (BR)' },
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Español' },
  { value: 'de', label: 'Deutsch' },
];

export function Shell() {
  const { isDark, toggle: toggleTheme } = useTheme();
  const { lang, label: langLabel, change: changeLang } = useLanguage();
  const navigate = useNavigate();

  const [showLangDropdown, setShowLangDropdown] = useState(false);
  const [showAvatarDropdown, setShowAvatarDropdown] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);
  const avatarRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (langRef.current && !langRef.current.contains(e.target as Node)) setShowLangDropdown(false);
      if (avatarRef.current && !avatarRef.current.contains(e.target as Node)) setShowAvatarDropdown(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="flex h-screen w-full overflow-hidden" style={{ backgroundColor: 'var(--bg)', color: 'var(--text-main)' }}>
      {/* Sidebar */}
      <aside className="w-[220px] flex flex-col shadow-sm z-10 shrink-0 transition-colors duration-300" style={{ backgroundColor: 'var(--surface)' }}>
        <div className="p-6">
          <h1 className="font-serif italic text-2xl tracking-wide">studio virtual</h1>
        </div>
        
        <nav className="flex-1 px-4 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
                    isActive 
                      ? 'bg-accent text-white' 
                      : 'text-text-muted hover:text-text-main'
                  }`
                }
                style={({ isActive }) => isActive ? {} : { '--tw-text-opacity': 1 } as React.CSSProperties}
              >
                <Icon size={18} />
                <span className="font-medium text-sm">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-100/20">
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2 text-rose-500 hover:text-rose-600 hover:bg-rose-50/10 transition-colors w-full rounded-xl"
          >
            <LogOut size={18} />
            <span className="font-medium text-sm">Sair</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Topbar */}
        <header className="h-16 border-b flex items-center justify-between px-8 shrink-0 z-10 transition-colors duration-300"
          style={{ backgroundColor: 'var(--surface)', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)' }}>
          <div />

          <div className="flex items-center gap-3">
            {/* Language selector */}
            <div ref={langRef} className="relative">
              <button
                onClick={() => setShowLangDropdown(d => !d)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                style={{ backgroundColor: 'var(--bg)', color: 'var(--text-muted)' }}
              >
                <Globe size={16} />
                <span>{langLabel}</span>
              </button>
              {showLangDropdown && (
                <div className="absolute right-0 top-full mt-2 w-48 rounded-xl shadow-lg border overflow-hidden z-50"
                  style={{ backgroundColor: 'var(--surface)', borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#e5e7eb' }}>
                  {LANGUAGES.map(l => (
                    <button key={l.value} onClick={() => { changeLang(l.value); setShowLangDropdown(false); }}
                      className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-left transition-colors hover:bg-accent/10"
                      style={{ color: lang === l.value ? 'var(--accent)' : 'var(--text-main)', fontWeight: lang === l.value ? '700' : '400' }}>
                      {lang === l.value && <span className="w-1.5 h-1.5 rounded-full bg-accent inline-block" />}
                      {l.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Dark/Light toggle */}
            <button
              onClick={toggleTheme}
              className="w-9 h-9 flex items-center justify-center rounded-xl transition-all hover:scale-110"
              style={{ backgroundColor: 'var(--bg)', color: 'var(--text-muted)' }}
              title={isDark ? 'Modo claro' : 'Modo escuro'}
            >
              {isDark ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} />}
            </button>

            {/* User Avatar */}
            <div ref={avatarRef} className="relative">
              <button
                onClick={() => setShowAvatarDropdown(d => !d)}
                className="w-9 h-9 rounded-full bg-accent text-white flex items-center justify-center text-sm font-bold hover:bg-accent/90 transition-colors shadow-sm"
              >
                NA
              </button>
              {showAvatarDropdown && (
                <div className="absolute right-0 top-full mt-2 w-44 rounded-xl shadow-lg border overflow-hidden z-50"
                  style={{ backgroundColor: 'var(--surface)', borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#e5e7eb' }}>
                  <div className="px-4 py-3 border-b" style={{ borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#f3f4f6' }}>
                    <p className="text-xs font-bold" style={{ color: 'var(--text-muted)' }}>Nany Arruda</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>contato@nanyarruda.com</p>
                  </div>
                  <button onClick={() => { navigate('/perfil'); setShowAvatarDropdown(false); }}
                    className="flex items-center gap-2 w-full px-4 py-2.5 text-sm hover:bg-accent/10 transition-colors"
                    style={{ color: 'var(--text-main)' }}>
                    <UserCircle size={16} /> Perfil
                  </button>
                  <button onClick={() => { navigate('/configuracoes'); setShowAvatarDropdown(false); }}
                    className="flex items-center gap-2 w-full px-4 py-2.5 text-sm hover:bg-accent/10 transition-colors"
                    style={{ color: 'var(--text-main)' }}>
                    <Settings size={16} /> Configurações
                  </button>
                  <div className="border-t" style={{ borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#f3f4f6' }}>
                    <button onClick={handleLogout}
                      className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-rose-500 hover:bg-rose-50/10 transition-colors">
                      <LogOut size={16} /> Sair
                    </button>
                  </div>
                </div>
              )}
            </div>
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
