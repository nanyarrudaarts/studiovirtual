import React, { useState, useRef, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, UploadCloud, Image as ImageIcon, FileText, Activity,
  DownloadCloud, Award, Box, Settings, UserCircle, LogOut,
  Sun, Moon, Globe, Menu, X
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import i18n from '../../i18n/index';
import { supabase } from '../../services/supabase';
import { useTheme } from '../../hooks/useTheme';

const navGroups = [
  {
    label: 'Acervo',
    items: [
      { path: '/', labelKey: 'nav.dashboard', icon: LayoutDashboard },
      { path: '/obras', labelKey: 'nav.obras', icon: ImageIcon },
      { path: '/materiais', labelKey: 'nav.materiais', icon: Box },
    ]
  },
  {
    label: 'Criar',
    items: [
      { path: '/upload', labelKey: 'nav.upload', icon: UploadCloud },
      { path: '/dossie', labelKey: 'nav.dossie', icon: FileText },
      { path: '/certificados', labelKey: 'nav.certificados', icon: Award },
    ]
  },
  {
    label: 'Inteligência',
    items: [
      { path: '/analise', labelKey: 'nav.analise', icon: Activity },
      { path: '/importar', labelKey: 'nav.importar', icon: DownloadCloud },
    ]
  }
];

const bottomItems = [
  { path: '/perfil', labelKey: 'nav.perfil', icon: UserCircle },
  { path: '/configuracoes', labelKey: 'nav.configuracoes', icon: Settings },
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
  const location = useLocation();
  const currentLang = i18n.language || 'pt';

  const [showLangDropdown, setShowLangDropdown] = useState(false);
  const [showAvatarDropdown, setShowAvatarDropdown] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);
  const avatarRef = useRef<HTMLDivElement>(null);

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

  const touchStartX = useRef(0);
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const touchEndX = e.changedTouches[0].clientX;
    if (touchStartX.current - touchEndX > 50) {
      setMobileMenuOpen(false);
    }
  };

  const pageTitles: Record<string, string> = {
    '/': 'Visão Geral',
    '/obras': 'Acervo de Obras',
    '/upload': 'Nova Obra',
    '/dossie': 'Montagem de Dossiê',
    '/analise': 'Análise Curatorial',
    '/importar': 'Importar Obras',
    '/certificados': 'Certificados',
    '/materiais': 'Inventário de Ateliê',
    '/perfil': 'Perfil da Artista',
    '/configuracoes': 'Configurações'
  };
  const currentPageTitle = pageTitles[location.pathname] || 'Visão Geral';

  const navLinkClasses = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 h-[52px] md:h-[40px] px-3 rounded-lg transition-colors font-medium text-sm ${
      isActive 
        ? 'bg-[#6B5CE7] text-white' 
        : 'text-text-muted hover:bg-[#F0EDE6] hover:text-[#1a1a1a]'
    }`;

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
        className={`shell-sidebar fixed md:static inset-y-0 left-0 w-[280px] md:w-[220px] bg-white flex flex-col shadow-xl md:shadow-sm z-50 shrink-0 transition-transform duration-300 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`} 
      >
        <div className="p-6 pb-4 relative">
          <button 
            aria-label="Fechar menu"
            className="md:hidden absolute top-4 right-4 w-11 h-11 flex items-center justify-center text-text-muted"
            onClick={() => setMobileMenuOpen(false)}
          >
            <X size={24} />
          </button>
          
          <div className="flex items-center gap-2">
            <img src="/logo-nany.png" alt="Seal" className="w-[20px] h-[20px] object-contain" />
            <h1 className="font-serif italic text-[18px] tracking-wide text-text-main leading-none">studio virtual</h1>
          </div>
          <div className="mt-2 font-sans text-[11px] text-[#B0ADA8]">
            Nany Arruda | 1988
          </div>
        </div>
        <div className="mx-6 mb-2 border-b border-[#B0ADA8]/20"></div>
        
        <nav className="flex-1 px-4 overflow-y-auto">
          {navGroups.map((group, idx) => (
            <div key={idx} className="mb-4">
              <div className="text-[9px] uppercase tracking-[0.1em] text-[#B0ADA8] mt-5 mb-2 pl-[12px] font-bold">
                {group.label}
              </div>
              <div className="space-y-1">
                {group.items.map(item => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      end={item.path === '/'}
                      onClick={() => setMobileMenuOpen(false)}
                      className={navLinkClasses}
                    >
                      <Icon size={18} />
                      <span>{t(item.labelKey)}</span>
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-4 border-t border-[#B0ADA8]/20 bg-white">
          <div className="text-[9px] uppercase tracking-[0.1em] text-[#B0ADA8] mb-2 pl-[12px] font-bold">
            Gestão
          </div>
          <div className="space-y-1">
            {bottomItems.map(item => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/'}
                  onClick={() => setMobileMenuOpen(false)}
                  className={navLinkClasses}
                >
                  <Icon size={18} />
                  <span>{t(item.labelKey)}</span>
                </NavLink>
              );
            })}
          </div>
          <div className="my-4 mx-2 border-b border-[#B0ADA8]/20"></div>
          <div className="font-sans text-[11px] text-[#B0ADA8] pl-[12px] mb-3">
            Nany Arruda | 1988
          </div>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 h-[52px] md:h-[40px] px-3 w-full rounded-lg text-rose-500 hover:bg-rose-50 transition-colors"
          >
            <LogOut size={18} />
            <span className="font-medium text-sm">{t('nav.sair')}</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden min-w-0 bg-bg">
        {/* Topbar */}
        <header className="h-16 md:h-16 border-b border-gray-100/50 flex items-center justify-between px-4 md:px-8 shrink-0 z-10 transition-colors duration-300 shell-topbar relative bg-white/50 backdrop-blur-sm">
          
          <div className="flex items-center gap-2">
            <button 
              aria-label="Abrir menu"
              className="md:hidden w-11 h-11 flex items-center justify-center -ml-2 text-text-muted hover:text-text-main"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu size={24} />
            </button>
            <div className="md:hidden flex items-center gap-2">
              <h1 className="font-serif italic text-lg tracking-wide truncate">studio virtual</h1>
            </div>
          </div>

          <div className="absolute left-1/2 -translate-x-1/2 hidden md:block">
            <h2 className="font-serif italic text-[22px] text-text-main">{currentPageTitle}</h2>
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            {/* Desktop Actions */}
            <div className="hidden md:flex items-center gap-3">
              <div ref={langRef} className="relative">
                <button
                  onClick={() => setShowLangDropdown(d => !d)}
                  aria-label="Selecionar idioma"
                  className="shell-lang-btn flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors hover:bg-black/5"
                >
                  <Globe size={16} />
                  <span className="uppercase">{currentLang.split('-')[0]}</span>
                </button>
                {showLangDropdown && (
                  <div className={`absolute right-0 top-full mt-2 w-48 rounded-xl shadow-lg border overflow-hidden z-50 shell-dropdown ${isDark ? 'shell-dropdown-dark' : 'shell-dropdown-light'}`}>
                    {LANGUAGES.map(l => (
                      <button key={l.value} onClick={() => handleLangChange(l.value)}
                        aria-label={`Idioma: ${l.label}`}
                        className={`flex items-center gap-2 w-full px-4 py-2.5 text-sm text-left transition-colors hover:bg-[#6B5CE7]/10 ${
                          currentLang === l.value ? 'text-[#6B5CE7] font-bold' : 'text-text-main font-normal'
                        }`}>
                        {currentLang === l.value && <span className="w-1.5 h-1.5 rounded-full bg-[#6B5CE7] inline-block" />}
                        {l.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                onClick={toggleTheme}
                className="w-9 h-9 flex items-center justify-center rounded-xl transition-all hover:scale-110 hover:bg-black/5 shell-lang-btn"
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
                className="w-10 h-10 md:w-9 md:h-9 rounded-full bg-[#6B5CE7] text-white flex items-center justify-center text-sm font-bold active:scale-95 hover:bg-[#6B5CE7]/90 transition-all shadow-sm"
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
                                ? 'bg-[#6B5CE7] text-white'
                                : 'bg-bg text-text-main'
                            }`}>
                            {l.label.split(' ')[0]}
                          </button>
                        ))}
                      </div>
                    </div>
                    <button onClick={() => { toggleTheme(); setShowAvatarDropdown(false); }}
                      className="flex items-center gap-3 w-full px-4 py-3 text-sm transition-colors text-text-main hover:bg-[#6B5CE7]/5">
                      {isDark ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} />}
                      {isDark ? 'Modo claro' : 'Modo escuro'}
                    </button>
                  </div>

                  <div className="py-1">
                    <button onClick={() => { navigate('/perfil'); setShowAvatarDropdown(false); }}
                      className="flex items-center gap-3 w-full px-4 py-3 md:py-2.5 text-sm transition-colors text-text-main hover:bg-[#6B5CE7]/5">
                      <UserCircle size={18} /> {t('nav.perfil')}
                    </button>
                    <button onClick={() => { navigate('/configuracoes'); setShowAvatarDropdown(false); }}
                      className="flex items-center gap-3 w-full px-4 py-3 md:py-2.5 text-sm transition-colors text-text-main hover:bg-[#6B5CE7]/5">
                      <Settings size={18} /> {t('nav.configuracoes')}
                    </button>
                  </div>
                  <div className="border-t shell-border">
                    <button onClick={handleLogout}
                      className="flex items-center gap-3 w-full px-4 py-3 md:py-2.5 text-sm text-rose-500 hover:bg-rose-50 transition-colors">
                      <LogOut size={18} /> {t('nav.sair')}
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

