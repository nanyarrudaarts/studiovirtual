import React, { useState, useRef, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, UploadCloud, Image as ImageIcon, FileText, Activity,
  DownloadCloud, Award, Box, Settings, UserCircle, LogOut,
  Sun, Moon, Globe, Menu, X, BookOpen, UserPlus
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
      { path: '/portfolio', labelKey: 'nav.portfolio', icon: BookOpen },
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
  { path: '/cadastro-usuario', labelKey: 'nav.cadastroUsuario', icon: UserPlus },
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
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Logout error:', err);
    }
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
    '/portfolio': 'Gerador de Portfólio',
    '/materiais': 'Inventário de Ateliê',
    '/perfil': 'Perfil da Artista',
    '/configuracoes': 'Configurações',
    '/cadastro-usuario': 'Cadastrar Usuária'
  };
  const currentPageTitle = pageTitles[location.pathname] || 'Visão Geral';

  const navLinkClasses = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 h-[52px] md:h-[40px] px-3 rounded-lg transition-all duration-200 font-medium text-sm cursor-pointer ${
      isActive
        ? 'nav-active'
        : 'nav-inactive'
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
        className={`shell-sidebar fixed md:static inset-y-0 left-0 w-[280px] md:w-[220px] flex flex-col z-50 shrink-0 transition-transform duration-300 shadow-none ${
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
          
          <div className="flex items-center gap-2.5">
            <img src="/logo-nany.png" alt="Seal" className="w-[18px] h-[18px] object-contain logo-seal" />
            <h1 className="font-serif italic text-[17px] tracking-wide leading-none text-text-main">studio virtual</h1>
          </div>
          <div className="mt-1.5 font-sans text-[10px] tracking-[0.18em] uppercase text-gold">
            Nany Arruda
          </div>
        </div>
        <div className="mx-5 mb-2 gold-line" />
        
        <nav className="flex-1 px-4 overflow-y-auto">
          {navGroups.map((group, idx) => (
            <div key={idx} className="mb-4">
              <div className="text-[9px] uppercase tracking-[0.14em] mt-5 mb-1.5 pl-3 font-semibold text-text-faint">
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

        <div className="p-4 border-t border-border-subtle">
          <div className="text-[9px] uppercase tracking-[0.12em] text-text-faint mb-1.5 pl-3 font-semibold">
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
          <div className="my-3 mx-2 border-b border-border-subtle"></div>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 h-[52px] md:h-[40px] px-3 w-full rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-all duration-150 cursor-pointer"
          >
            <LogOut size={18} />
            <span className="font-medium text-sm">{t('nav.sair')}</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden min-w-0 bg-bg">
        {/* Topbar */}
        <header className="h-14 border-b flex items-center justify-between px-4 md:px-8 shrink-0 z-10 shell-topbar relative">
          
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
            <h2 className="font-serif italic text-[20px] text-text-main tracking-tight">{currentPageTitle}</h2>
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
                  <div className="absolute right-0 top-full mt-2 w-48 rounded-xl overflow-hidden z-50 shell-dropdown">
                    {LANGUAGES.map(l => (
                      <button key={l.value} onClick={() => handleLangChange(l.value)}
                        aria-label={`Idioma: ${l.label}`}
                        className={`flex items-center gap-2 w-full px-4 py-2.5 text-sm text-left transition-colors cursor-pointer hover:bg-[var(--surface-raised)] ${
                          currentLang === l.value ? 'text-[var(--text-main)] font-semibold' : 'text-text-muted font-normal'
                        }`}>
                        {currentLang === l.value && <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-main)] inline-block" />}
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
                className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold tracking-wider active:scale-95 hover:opacity-90 transition-all cursor-pointer avatar-ring-gold"
              >
                NA
              </button>
              {showAvatarDropdown && (
                <div className="absolute right-0 top-full mt-2 w-52 rounded-xl overflow-hidden z-50 shell-dropdown">
                  <div className="px-4 py-3 border-b shell-border">
                    <p className="text-xs font-semibold text-text-main">Nany Arruda</p>
                    <p className="text-xs truncate text-text-faint mt-0.5">contato@nanyarruda.com</p>
                  </div>
                  
                  {/* Mobile Language and Theme inside avatar dropdown */}
                  <div className="md:hidden border-b shell-border py-2">
                    <div className="px-4 py-2">
                      <p className="text-[10px] font-semibold uppercase tracking-widest mb-2 text-text-faint">{t('configuracoes.idioma')}</p>
                      <div className="grid grid-cols-2 gap-1.5">
                        {LANGUAGES.map(l => (
                          <button key={l.value} onClick={() => handleLangChange(l.value)}
                            aria-label={`Idioma: ${l.label}`}
                            className={`px-2 py-1.5 text-xs rounded-lg text-center transition-colors cursor-pointer ${
                              currentLang === l.value
                                ? 'bg-[var(--text-main)] text-[var(--bg)]'
                                : 'bg-[var(--surface-raised)] text-text-main'
                            }`}>
                            {l.label.split(' ')[0]}
                          </button>
                        ))}
                      </div>
                    </div>
                    <button onClick={() => { toggleTheme(); setShowAvatarDropdown(false); }}
                      className="flex items-center gap-3 w-full px-4 py-3 text-sm transition-colors text-text-main hover:bg-[var(--surface-raised)] cursor-pointer">
                      {isDark ? <Sun size={16} className="text-amber-400" /> : <Moon size={16} />}
                      {isDark ? 'Modo claro' : 'Modo escuro'}
                    </button>
                  </div>

                  <div className="py-1">
                    <button onClick={() => { navigate('/perfil'); setShowAvatarDropdown(false); }}
                      className="flex items-center gap-3 w-full px-4 py-2.5 text-sm transition-colors text-text-main hover:bg-[var(--surface-raised)] cursor-pointer">
                      <UserCircle size={16} /> {t('nav.perfil')}
                    </button>
                    <button onClick={() => { navigate('/configuracoes'); setShowAvatarDropdown(false); }}
                      className="flex items-center gap-3 w-full px-4 py-2.5 text-sm transition-colors text-text-main hover:bg-[var(--surface-raised)] cursor-pointer">
                      <Settings size={16} /> {t('nav.configuracoes')}
                    </button>
                  </div>
                  <div className="border-t shell-border">
                    <button onClick={handleLogout}
                      className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors cursor-pointer">
                      <LogOut size={16} /> {t('nav.sair')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Scrollable Page Content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-5 md:p-10 relative">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

