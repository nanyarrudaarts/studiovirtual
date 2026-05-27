import { useState, useEffect } from 'react';
import { Eye, EyeOff, Check, AlertTriangle } from 'lucide-react';
import { supabase } from '../services/supabase';
import { useTranslation } from 'react-i18next';

type AIProvider = 'groq';

interface Config {
  aiProvider: AIProvider;
  groqKey: string;
  notebooklmId: string;
  notebooklmActive: boolean;
  language: string;
  currency: string;
  units: string;
  dateFormat: string;
  pdfQuality: string;
  pdfFormat: string;
  watermark: boolean;
  watermarkText: string;
}

const defaultConfig: Config = {
  aiProvider: 'groq',
  groqKey: '',
  notebooklmId: 'c31055a1-8a15-4e16-b5cf-1b45b44bb828',
  notebooklmActive: false,
  language: 'pt-BR',
  currency: 'BRL',
  units: 'cm',
  dateFormat: 'DD/MM/AAAA',
  pdfQuality: '300',
  pdfFormat: 'A4',
  watermark: true,
  watermarkText: '© Studio Virtual',
};

function KeyInput({ label, value, onChange, placeholder, onSave, isSaved, t }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder: string; onSave: () => void; isSaved?: boolean; t: (k: string) => string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label className="block text-sm font-bold text-text-muted mb-1">{label}</label>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type={show ? 'text' : 'password'}
            value={value}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full border border-gray-200 rounded-lg pl-4 pr-10 py-2 text-sm focus:border-accent outline-none bg-bg"
          />
          <button type="button" onClick={() => setShow(!show)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-text-main">
            {show ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        <button type="button" onClick={onSave}
          className="px-4 py-2 bg-accent text-white text-sm font-bold rounded-lg hover:bg-accent/90 transition-colors whitespace-nowrap flex items-center gap-2">
          {isSaved ? <><Check size={16} /> {t('configuracoes.salvo')}</> : t('configuracoes.salvar_chave')}
        </button>
      </div>
    </div>
  );
}

export default function Configuracoes() {
  const { t } = useTranslation();
  const [config, setConfig] = useState<Config>(() => {
    const stored = localStorage.getItem('sv_config');
    const directGroqKey = localStorage.getItem('groq_api_key');

    let loaded = { ...defaultConfig };
    if (stored) {
      try {
        loaded = { ...loaded, ...JSON.parse(stored) };
      } catch {
        // Ignorar erro de parse
      }
    }
    if (directGroqKey) loaded.groqKey = directGroqKey;
    loaded.aiProvider = 'groq';
    return loaded;
  });
  const [userEmail, setUserEmail] = useState('');
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [showDangerModal, setShowDangerModal] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserEmail(user.email || '');
      }
    });
  }, []);

  const save = (keys: (keyof Config)[]) => {
    const updated = { ...config };
    localStorage.setItem('sv_config', JSON.stringify(updated));
    localStorage.setItem('ai_provider', 'groq');
    if (keys.includes('groqKey')) localStorage.setItem('groq_api_key', updated.groqKey);

    const newSaved: Record<string, boolean> = {};
    keys.forEach(k => { newSaved[k] = true; });
    setSaved(s => ({ ...s, ...newSaved }));
    setTimeout(() => setSaved(s => {
      const n = { ...s }; keys.forEach(k => delete n[k as string]); return n;
    }), 2000);
  };

  const set = <K extends keyof Config>(key: K, value: Config[K]) => {
    setConfig(c => {
      const updated = { ...c, [key]: value };
      if (key === 'aiProvider') {
        localStorage.setItem('ai_provider', 'groq');
      }
      return updated;
    });
  };

  return (
    <div className="max-w-[800px] mx-auto pb-16 space-y-8">
      <div>
        <h1 className="text-3xl font-serif mb-1">{t('nav.configuracoes')}</h1>
        <p className="text-text-muted">{t('configuracoes.subtitle')}</p>
      </div>

      {/* SECTION 1 — AI */}
      <section className="bg-white rounded-2xl shadow-float border border-gray-100 overflow-hidden">
        <div className="px-7 py-5 border-b border-gray-100">
          <h2 className="text-lg font-serif">{t('configuracoes.provedores_ia')}</h2>
        </div>
        <div className="p-7 space-y-7">
          {/* Provider Selector Info */}
          <div className="border border-accent/20 bg-accent/5 rounded-xl p-4 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-text-main flex items-center gap-2">
                Groq Ativo
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
              </h3>
              <p className="text-xs text-text-muted mt-1">Llama 3.3-70b-versatile · Ultra Rápido</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center">
              <Check size={16} className="text-accent" />
            </div>
          </div>

          {/* API Keys */}
          <div className="space-y-4">
            <KeyInput 
              label="Chave API Groq" 
              value={config.groqKey}
              onChange={v => set('groqKey', v)} 
              placeholder="gsk_..."
              onSave={() => save(['groqKey'])} 
              isSaved={saved['groqKey']} 
              t={t} 
            />
          </div>

          {/* NotebookLM */}
          <div className="bg-bg rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm">{t('configuracoes.integracao_notebooklm')}</h3>
                <p className="text-xs text-text-muted mt-0.5">{t('configuracoes.notebooklm_sub')}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                  config.notebooklmActive ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-500'
                }`}>
                  {config.notebooklmActive ? t('configuracoes.conectado') : t('configuracoes.desconectado')}
                </span>
              <button onClick={() => set('notebooklmActive', !config.notebooklmActive)}
                aria-label={config.notebooklmActive ? 'Desativar NotebookLM' : 'Ativar NotebookLM'}
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  config.notebooklmActive ? 'bg-accent' : 'bg-gray-300'
                }`}>
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  config.notebooklmActive ? 'translate-x-5' : ''
                }`} />
              </button>
              </div>
            </div>
            <div>
              <label htmlFor="notebooklm-id" className="block text-xs font-bold text-text-muted mb-1">{t('configuracoes.id_notebook')}</label>
              <input id="notebooklm-id" type="text" value={config.notebooklmId}
                onChange={e => set('notebooklmId', e.target.value)}
                placeholder="Notebook ID"
                aria-label={t('configuracoes.id_notebook')}
                className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:border-accent outline-none bg-white font-mono" />
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2 — Preferências */}
      <section className="bg-white rounded-2xl shadow-float border border-gray-100 overflow-hidden">
        <div className="px-7 py-5 border-b border-gray-100">
          <h2 className="text-lg font-serif">{t('configuracoes.preferencias')}</h2>
        </div>
        <div className="p-7 space-y-5">
          <div className="grid grid-cols-2 gap-5">
            <div>
              <label htmlFor="sel-idioma" className="block text-sm font-bold text-text-muted mb-1">{t('configuracoes.idioma')}</label>
              <select id="sel-idioma" value={config.language} onChange={e => set('language', e.target.value)}
                aria-label={t('configuracoes.idioma')}
                className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:border-accent outline-none bg-bg">
                <option value="pt-BR">Português (BR)</option>
                <option value="en">English</option>
                <option value="es">Español</option>
                <option value="de">Deutsch</option>
              </select>
            </div>
            <div>
              <label htmlFor="sel-moeda" className="block text-sm font-bold text-text-muted mb-1">{t('configuracoes.moeda')}</label>
              <select id="sel-moeda" value={config.currency} onChange={e => set('currency', e.target.value)}
                aria-label={t('configuracoes.moeda')}
                className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:border-accent outline-none bg-bg">
                <option value="BRL">BRL (R$)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
              </select>
            </div>
            <div>
              <label htmlFor="sel-unidades" className="block text-sm font-bold text-text-muted mb-1">{t('configuracoes.unidades')}</label>
              <select id="sel-unidades" value={config.units} onChange={e => set('units', e.target.value)}
                aria-label={t('configuracoes.unidades')}
                className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:border-accent outline-none bg-bg">
                <option value="cm">Centímetros</option>
                <option value="in">Polegadas</option>
              </select>
            </div>
            <div>
              <label htmlFor="sel-data" className="block text-sm font-bold text-text-muted mb-1">{t('configuracoes.formato_data')}</label>
              <select id="sel-data" value={config.dateFormat} onChange={e => set('dateFormat', e.target.value)}
                aria-label={t('configuracoes.formato_data')}
                className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:border-accent outline-none bg-bg">
                <option value="DD/MM/AAAA">DD/MM/AAAA</option>
                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
              </select>
            </div>
          </div>
          <button onClick={() => save(['language', 'currency', 'units', 'dateFormat'])}
            className="flex items-center gap-2 px-6 py-2.5 bg-accent text-white font-bold rounded-lg hover:bg-accent/90 transition-colors text-sm">
            {saved['language'] ? <><Check size={16} /> {t('configuracoes.salvo')}</> : t('configuracoes.salvar_preferencias')}
          </button>
        </div>
      </section>

      {/* SECTION 3 — Exportação */}
      <section className="bg-white rounded-2xl shadow-float border border-gray-100 overflow-hidden">
        <div className="px-7 py-5 border-b border-gray-100">
          <h2 className="text-lg font-serif">{t('configuracoes.exportacao')}</h2>
        </div>
        <div className="p-7 space-y-5">
          <div className="grid grid-cols-2 gap-5">
            <div>
              <label htmlFor="sel-pdf-quality" className="block text-sm font-bold text-text-muted mb-1">{t('configuracoes.qualidade_pdf')}</label>
              <select id="sel-pdf-quality" value={config.pdfQuality} onChange={e => set('pdfQuality', e.target.value)}
                aria-label={t('configuracoes.qualidade_pdf')}
                className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:border-accent outline-none bg-bg">
                <option value="300">Alta (300 DPI)</option>
                <option value="150">Média (150 DPI)</option>
                <option value="72">Rascunho (72 DPI)</option>
              </select>
            </div>
            <div>
              <label htmlFor="sel-pdf-format" className="block text-sm font-bold text-text-muted mb-1">{t('configuracoes.formato_pdf')}</label>
              <select id="sel-pdf-format" value={config.pdfFormat} onChange={e => set('pdfFormat', e.target.value)}
                aria-label={t('configuracoes.formato_pdf')}
                className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:border-accent outline-none bg-bg">
                <option value="A4">A4</option>
                <option value="A3">A3</option>
                <option value="Carta">Carta</option>
              </select>
            </div>
          </div>
          <div className="flex items-center justify-between py-3 border-t border-gray-100">
            <div>
              <p className="font-medium text-sm">{t('configuracoes.incluir_marca_dagua')}</p>
              <p className="text-xs text-text-muted">{t('configuracoes.marca_dagua_sub')}</p>
            </div>
            <button onClick={() => set('watermark', !config.watermark)}
              aria-label={config.watermark ? 'Desativar marca d\'água' : 'Ativar marca d\'água'}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                config.watermark ? 'bg-accent' : 'bg-gray-300'
              }`}>
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                config.watermark ? 'translate-x-5' : ''
              }`} />
            </button>
          </div>
          {config.watermark && (
            <div>
              <label htmlFor="watermark-text" className="block text-sm font-bold text-text-muted mb-1">{t('configuracoes.texto_marca_dagua')}</label>
              <input id="watermark-text" type="text" value={config.watermarkText}
                onChange={e => set('watermarkText', e.target.value)}
                aria-label={t('configuracoes.texto_marca_dagua')}
                placeholder="© Studio Virtual"
                className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:border-accent outline-none bg-bg" />
            </div>
          )}
          <button onClick={() => save(['pdfQuality', 'pdfFormat', 'watermark', 'watermarkText'])}
            className="flex items-center gap-2 px-6 py-2.5 bg-accent text-white font-bold rounded-lg hover:bg-accent/90 transition-colors text-sm">
            {saved['pdfQuality'] ? <><Check size={16} /> {t('configuracoes.salvo')}</> : t('configuracoes.salvar_config')}
          </button>
        </div>
      </section>

      {/* SECTION 4 — Conta */}
      <section className="bg-white rounded-2xl shadow-float border border-gray-100 overflow-hidden">
        <div className="px-7 py-5 border-b border-gray-100">
          <h2 className="text-lg font-serif">{t('configuracoes.conta')}</h2>
        </div>
        <div className="p-7 space-y-4">
          <div>
            <label htmlFor="input-email-conta" className="block text-sm font-bold text-text-muted mb-1">{t('configuracoes.email_conta')}</label>
            <input id="input-email-conta" type="email" value={userEmail} readOnly
              aria-label={t('configuracoes.email_conta')}
              className="w-full border border-gray-100 rounded-lg px-4 py-2 text-sm bg-bg text-text-muted cursor-not-allowed" />
          </div>
          <div className="flex gap-3 flex-wrap">
            <button className="px-5 py-2 border border-gray-200 rounded-lg text-sm font-medium hover:border-accent transition-colors">
              {t('configuracoes.alterar_senha')}
            </button>
            <button className="px-5 py-2 border border-rose-200 text-rose-600 rounded-lg text-sm font-medium hover:bg-rose-50 transition-colors">
              {t('configuracoes.sair_dispositivos')}
            </button>
          </div>

          <div className="border border-red-200 rounded-xl p-5 bg-red-50/50 mt-6">
            <div className="flex items-start gap-3 mb-4">
              <AlertTriangle size={20} className="text-red-500 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-red-700 text-sm">{t('configuracoes.zona_perigo')}</h3>
                <p className="text-xs text-red-500 mt-0.5">{t('configuracoes.zona_perigo_sub')}</p>
              </div>
            </div>
            <button onClick={() => setShowDangerModal(true)}
              className="px-5 py-2 border border-red-400 text-red-600 rounded-lg text-sm font-bold hover:bg-red-100 transition-colors">
              {t('configuracoes.apagar_dados')}
            </button>
          </div>
        </div>
      </section>

      {/* Danger Modal */}
      {showDangerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 space-y-5">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center shrink-0">
                <AlertTriangle size={20} className="text-red-600" />
              </div>
              <div>
                <h3 className="font-serif text-xl text-red-700">{t('configuracoes.apagar_dados')}</h3>
                <p className="text-sm text-text-muted mt-1">{t('configuracoes.zona_perigo_sub')}</p>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowDangerModal(false)}
                className="px-5 py-2 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50">
                {t('common.cancelar')}
              </button>
              <button className="px-5 py-2 bg-red-600 text-white rounded-lg text-sm font-bold hover:bg-red-700">
                {t('configuracoes.sim_apagar')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
