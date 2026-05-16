import React, { useState, useRef, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, UploadCloud, Image as ImageIcon, FileText, Activity,
  DownloadCloud, Award, Box, Settings, UserCircle, LogOut,
  Sun, Moon, Globe, Menu, X
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import i18n from '../../i18n/index';
import { supabase } from '../../services/supabase';
import { useTheme } from '../../hooks/useTheme';

const navItems = [
  { path: '/', labelKey: 'nav.dashboard', icon: LayoutDashboard },
  { path: '/upload', labelKey: 'nav.upload', icon: UploadCloud },
  { path: '/obras', labelKey: 'nav.obras', icon: ImageIcon },
  { path: '/dossie', labelKey: 'nav.dossie', icon: FileText },
  { path: '/analise', labelKey: 'nav.analise', icon: Activity },
  { path: '/importar', labelKey: 'nav.importar', icon: DownloadCloud },
  { path: '/certificados', labelKey: 'nav.certificados', icon: Award },
  { path: '/configuracoes', labelKey: 'nav.configuracoes', icon: Settings },
  { path: '/materiais', labelKey: 'nav.materiais', icon: Box },
  { path: '/perfil', labelKey: 'nav.perfil', icon: UserCircle },
];

const LANGUAGES = [
  { value: 'pt', label: 'Português (BR)' },
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Español' },
  { value: 'de', label: 'Deutsch' },
];

export function Shell() {
  const { isDark, toggle: toggleTheme } = useTheme();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const currentLang = i18n.language || 'pt';

  const [showLangDropdown, setShowLangDropdown] = useState(false);
  const [showAvatarDropdown, setShowAvatarDropdown] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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

  const handleLangChange = (lang: string) => {
    i18n.changeLanguage(lang);
    localStorage.setItem('language', lang);
    setShowLangDropdown(false);
    setShowAvatarDropdown(false);
  };

  // Swipe handling
  const touchStartX = useRef(0);
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const touchEndX = e.changedTouches[0].clientX;
    if (touchStartX.current - touchEndX > 50) {
      setMobileMenuOpen(false); // Swiped left
    }
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-bg text-text-main">
      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className={`shell-sidebar fixed md:static inset-y-0 left-0 w-[280px] md:w-[220px] flex flex-col shadow-xl md:shadow-sm z-50 shrink-0 transition-transform duration-300 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`} 
      >
        <div className="p-6 flex items-center justify-between">
          <h1 className="font-serif italic text-2xl tracking-wide">studio virtual</h1>
          <button 
            aria-label="Fechar menu"
            className="md:hidden w-11 h-11 flex items-center justify-center -mr-2"
            onClick={() => setMobileMenuOpen(false)}
          >
            <X size={24} />
          </button>
        </div>
        
        <nav className="flex-1 px-4 space-y-1 md:space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
               <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-4 md:gap-3 px-4 md:px-3 py-4 md:py-2.5 rounded-xl transition-colors ${
                    isActive 
                      ? 'bg-accent text-white' 
                      : 'text-text-muted hover:text-text-main active:bg-accent/10'
                  }`
                }
                style={({ isActive }) => isActive ? {} : { '--tw-text-opacity': 1 } as React.CSSProperties}
              >
                <Icon size={20} className="md:w-[18px] md:h-[18px]" />
                <span className="font-medium text-base md:text-sm">{t(item.labelKey)}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-100/20">
          <button 
            onClick={handleLogout}
            className="flex items-center gap-4 md:gap-3 px-4 md:px-3 py-4 md:py-2 text-rose-500 active:bg-rose-50/20 hover:text-rose-600 hover:bg-rose-50/10 transition-colors w-full rounded-xl"
          >
            <LogOut size={20} className="md:w-[18px] md:h-[18px]" />
            <span className="font-medium text-base md:text-sm">{t('nav.sair')}</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden min-w-0">
        {/* Topbar */}
        <header className="h-16 md:h-16 border-b flex items-center justify-between px-4 md:px-8 shrink-0 z-10 transition-colors duration-300 shell-topbar">
          
          <div className="flex items-center gap-4">
            <button 
              aria-label="Abrir menu"
              className="md:hidden w-11 h-11 flex items-center justify-center -ml-2"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu size={24} />
            </button>
            <h1 className="md:hidden font-serif italic text-xl tracking-wide truncate">studio virtual</h1>
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            {/* Desktop Actions */}
            <div className="hidden md:flex items-center gap-3">
              <div ref={langRef} className="relative">
                <button
                  onClick={() => setShowLangDropdown(d => !d)}
                  aria-label="Selecionar idioma"
                  className="shell-lang-btn flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                >
                  <Globe size={16} />
                  <span className="uppercase">{currentLang.split('-')[0]}</span>
                </button>
                {showLangDropdown && (
                  <div className={`absolute right-0 top-full mt-2 w-48 rounded-xl shadow-lg border overflow-hidden z-50 shell-dropdown ${isDark ? 'shell-dropdown-dark' : 'shell-dropdown-light'}`}>
                    {LANGUAGES.map(l => (
                      <button key={l.value} onClick={() => handleLangChange(l.value)}
                        aria-label={`Idioma: ${l.label}`}
                        className={`flex items-center gap-2 w-full px-4 py-2.5 text-sm text-left transition-colors hover:bg-accent/10 ${
                          currentLang === l.value ? 'text-accent font-bold' : 'text-text-main font-normal'
                        }`}>
                        {currentLang === l.value && <span className="w-1.5 h-1.5 rounded-full bg-accent inline-block" />}
                        {l.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                onClick={toggleTheme}
                className="w-9 h-9 flex items-center justify-center rounded-xl transition-all hover:scale-110 shell-lang-btn"
                title={isDark ? 'Modo claro' : 'Modo escuro'}
                aria-label={isDark ? 'Modo claro' : 'Modo escuro'}
              >
                {isDark ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} />}
              </button>
            </div>

            {/* User Avatar */}
            <div ref={avatarRef} className="relative ml-2 md:ml-0">
              <button
                onClick={() => setShowAvatarDropdown(d => !d)}
                aria-label="Menu do usuário"
                className="w-10 h-10 md:w-9 md:h-9 rounded-full bg-accent text-white flex items-center justify-center text-sm font-bold active:scale-95 hover:bg-accent/90 transition-all shadow-sm"
              >
                NA
              </button>
              {showAvatarDropdown && (
                <div className={`absolute right-0 top-full mt-2 w-56 md:w-44 rounded-xl shadow-lg border overflow-hidden z-50 shell-dropdown ${isDark ? 'shell-dropdown-dark' : 'shell-dropdown-light'}`}>
                  <div className="px-4 py-3 border-b shell-border">
                    <p className="text-sm md:text-xs font-bold text-text-muted">Nany Arruda</p>
                    <p className="text-sm md:text-xs truncate text-text-muted">contato@nanyarruda.com</p>
                  </div>
                  
                  {/* Mobile Language and Theme inside avatar dropdown */}
                  <div className="md:hidden border-b shell-border py-2">
                    <div className="px-4 py-2">
                      <p className="text-xs font-bold uppercase mb-2 text-text-muted">{t('configuracoes.idioma')}</p>
                      <div className="grid grid-cols-2 gap-2">
                        {LANGUAGES.map(l => (
                          <button key={l.value} onClick={() => handleLangChange(l.value)}
                            aria-label={`Idioma: ${l.label}`}
                            className={`px-2 py-1.5 text-xs rounded-lg text-center transition-colors ${
                              currentLang === l.value
                                ? 'bg-accent text-white'
                                : 'bg-bg text-text-main'
                            }`}>
                            {l.label.split(' ')[0]}
                          </button>
                        ))}
                      </div>
                    </div>
                    <button onClick={() => { toggleTheme(); setShowAvatarDropdown(false); }}
                      className="flex items-center gap-3 w-full px-4 py-3 text-sm transition-colors text-text-main">
                      {isDark ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} />}
                      {isDark ? 'Modo claro' : 'Modo escuro'}
                    </button>
                  </div>

                  <div className="py-1">
                    <button onClick={() => { navigate('/perfil'); setShowAvatarDropdown(false); }}
                      className="flex items-center gap-3 w-full px-4 py-3 md:py-2.5 text-sm active:bg-accent/10 hover:bg-accent/10 transition-colors text-text-main">
                      <UserCircle size={18} className="md:w-[16px] md:h-[16px]" /> {t('nav.perfil')}
                    </button>
                    <button onClick={() => { navigate('/configuracoes'); setShowAvatarDropdown(false); }}
                      className="flex items-center gap-3 w-full px-4 py-3 md:py-2.5 text-sm active:bg-accent/10 hover:bg-accent/10 transition-colors text-text-main">
                      <Settings size={18} className="md:w-[16px] md:h-[16px]" /> {t('nav.configuracoes')}
                    </button>
                  </div>
                  <div className="border-t shell-border">
                    <button onClick={handleLogout}
                      className="flex items-center gap-3 w-full px-4 py-3 md:py-2.5 text-sm text-rose-500 active:bg-rose-50/20 hover:bg-rose-50/10 transition-colors">
                      <LogOut size={18} className="md:w-[16px] md:h-[16px]" /> {t('nav.sair')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Scrollable Page Content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-8 relative">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
