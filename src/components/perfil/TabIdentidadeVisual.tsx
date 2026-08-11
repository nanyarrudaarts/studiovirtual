import { FileUp, Plus, X } from 'lucide-react';
import { supabase } from '../../services/supabase';
import { compressImage, uid } from '../../lib/imageUtils';

interface Props {
  isEditing: boolean;
  t: (k: string, fallback?: any) => string;
  seloUrl: string | null;
  setSeloUrl: (url: string | null) => void;
  assinaturaUrl: string | null;
  setAssinaturaUrl: (url: string | null) => void;
  fotosProfissionais: string[];
  setFotosProfissionais: React.Dispatch<React.SetStateAction<string[]>>;
}

export function TabIdentidadeVisual({
  isEditing,
  t,
  seloUrl,
  setSeloUrl,
  assinaturaUrl,
  setAssinaturaUrl,
  fotosProfissionais,
  setFotosProfissionais,
}: Props) {
  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Identidade Visual */}
      <section className="glass-slab rounded-2xl overflow-hidden">
        <div className="px-7 py-5 border-b border-border bg-surface-raised/35">
          <h2 className="text-lg font-serif text-gold font-bold">{t('perfil.identidade_visual', 'Identidade Visual')}</h2>
        </div>
        <div className="p-7">
          <p className="text-sm text-text-muted mb-6">
            {t('perfil.identidade_visual_desc', 'Faça upload do seu selo/carimbo e assinatura para uso em certificados de autenticidade e rodapés de portfólio.')}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Brand Seal */}
            <div className="flex flex-col gap-3">
              <h3 className="text-sm font-bold text-text-main">{t('perfil.selo_marca', 'Selo / Carimbo da Marca')}</h3>
              <p className="text-xs text-text-muted">{t('perfil.selo_desc', 'Usado no rodapé do portfólio PDF e certificado de autenticidade. PNG com fundo transparente recomendado.')}</p>

              {seloUrl ? (
                <div className="relative border border-border bg-surface rounded-xl p-4 flex flex-col items-center justify-center gap-4 h-48 group">
                  <img src={seloUrl} alt="Selo" className="max-h-32 object-contain" />
                  {isEditing && (
                    <button
                      onClick={() => setSeloUrl(null)}
                      title={t('common.remover', 'Remover')}
                      aria-label={t('common.remover', 'Remover')}
                      className="absolute top-2 right-2 bg-red-600/90 text-white rounded-full p-1.5 hover:bg-red-700 transition-colors shadow-lg animate-fadeIn"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              ) : (
                <div className="border border-dashed border-border rounded-xl h-48 flex flex-col items-center justify-center p-6 text-center bg-surface-raised/35">
                  <FileUp size={24} className="text-text-muted mb-2" />
                  <p className="text-xs text-text-muted mb-3">{t('perfil.sem_selo', 'Nenhum selo carregado')}</p>
                  {isEditing && (
                    <button
                      onClick={() => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = 'image/*';
                        input.onchange = async (e) => {
                          const file = (e.target as HTMLInputElement).files?.[0];
                          if (file) {
                            try {
                              const compressed = await compressImage(file, 1200);
                              const ext = compressed instanceof File ? compressed.name.split('.').pop() : 'jpg';
                              const path = `onboarding/selo/${Date.now()}-${uid()}.${ext}`;
                              const { error } = await supabase.storage.from('obras-images').upload(path, compressed, { upsert: true });
                              if (error) throw error;
                              const { data: { publicUrl } } = supabase.storage.from('obras-images').getPublicUrl(path);
                              setSeloUrl(publicUrl);
                            } catch (err) {
                              alert('Erro ao carregar selo: ' + (err as Error).message);
                            }
                          }
                        };
                        input.click();
                      }}
                      className="px-4 py-2 bg-gold text-bg text-xs font-bold rounded-lg hover:bg-gold-light transition-all shadow-gold-glow-sm"
                    >
                      {t('perfil.carregar_selo', 'Carregar Selo')}
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Digital Signature */}
            <div className="flex flex-col gap-3">
              <h3 className="text-sm font-bold text-text-main">{t('perfil.assinatura_digital', 'Assinatura Digital')}</h3>
              <p className="text-xs text-text-muted">{t('perfil.assinatura_desc', 'Assinatura visual alternativa para validação de autoria nos documentos. JPG, PNG ou WebP.')}</p>

              {assinaturaUrl ? (
                <div className="relative border border-border bg-surface rounded-xl p-4 flex flex-col items-center justify-center gap-4 h-48 group">
                  <img src={assinaturaUrl} alt="Assinatura" className="max-h-32 object-contain" />
                  {isEditing && (
                    <button
                      onClick={() => setAssinaturaUrl(null)}
                      title={t('common.remover', 'Remover')}
                      aria-label={t('common.remover', 'Remover')}
                      className="absolute top-2 right-2 bg-red-600/90 text-white rounded-full p-1.5 hover:bg-red-700 transition-colors shadow-lg animate-fadeIn"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              ) : (
                <div className="border border-dashed border-border rounded-xl h-48 flex flex-col items-center justify-center p-6 text-center bg-surface-raised/35">
                  <FileUp size={24} className="text-text-muted mb-2" />
                  <p className="text-xs text-text-muted mb-3">{t('perfil.sem_assinatura', 'Nenhuma assinatura carregada')}</p>
                  {isEditing && (
                    <button
                      onClick={() => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = 'image/*';
                        input.onchange = async (e) => {
                          const file = (e.target as HTMLInputElement).files?.[0];
                          if (file) {
                            try {
                              const compressed = await compressImage(file, 1200);
                              const ext = compressed instanceof File ? compressed.name.split('.').pop() : 'jpg';
                              const path = `onboarding/assinatura/${Date.now()}-${uid()}.${ext}`;
                              const { error } = await supabase.storage.from('obras-images').upload(path, compressed, { upsert: true });
                              if (error) throw error;
                              const { data: { publicUrl } } = supabase.storage.from('obras-images').getPublicUrl(path);
                              setAssinaturaUrl(publicUrl);
                            } catch (err) {
                              alert('Erro ao carregar assinatura: ' + (err as Error).message);
                            }
                          }
                        };
                        input.click();
                      }}
                      className="px-4 py-2 bg-gold text-bg text-xs font-bold rounded-lg hover:bg-gold-light transition-all shadow-gold-glow-sm"
                    >
                      {t('perfil.carregar_assinatura', 'Carregar Assinatura')}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Fotos Profissionais */}
      <section className="glass-slab rounded-2xl overflow-hidden">
        <div className="px-7 py-5 border-b border-border bg-surface-raised/35 flex items-center justify-between">
          <h2 className="text-lg font-serif text-gold font-bold">{t('perfil.fotos_profissionais', 'Fotos Profissionais')}</h2>
          <span className="text-xs text-text-muted font-bold">
            {fotosProfissionais.length} / 5
          </span>
        </div>
        <div className="p-7 space-y-6">
          <p className="text-sm text-text-muted">
            {t('perfil.fotos_desc', 'Envie fotos do seu atelier, retratos de perfil ou processos de montagem para exibição institucional. Reordene-as conforme preferir.')}
          </p>

          {/* Gallery Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            {fotosProfissionais.map((url, i) => (
              <div key={i} className="relative aspect-square border border-border rounded-xl overflow-hidden bg-surface group flex flex-col justify-end">
                <img src={url} alt={`Foto profissional ${i + 1}`} className="absolute inset-0 w-full h-full object-cover" />

                {isEditing && (
                  <div className="absolute inset-x-0 bottom-0 bg-black/60 backdrop-blur-[2px] p-2 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="flex gap-1">
                      <button
                        type="button"
                        disabled={i === 0}
                        onClick={() => {
                          const list = [...fotosProfissionais];
                          const temp = list[i - 1];
                          list[i - 1] = list[i];
                          list[i] = temp;
                          setFotosProfissionais(list);
                        }}
                        className="bg-white/90 hover:bg-white text-gray-800 disabled:opacity-40 rounded p-1 text-xs shadow flex items-center justify-center w-5 h-5 font-bold"
                      >
                        ←
                      </button>
                      <button
                        type="button"
                        disabled={i === fotosProfissionais.length - 1}
                        onClick={() => {
                          const list = [...fotosProfissionais];
                          const temp = list[i + 1];
                          list[i + 1] = list[i];
                          list[i] = temp;
                          setFotosProfissionais(list);
                        }}
                        className="bg-white/90 hover:bg-white text-gray-800 disabled:opacity-40 rounded p-1 text-xs shadow flex items-center justify-center w-5 h-5 font-bold"
                      >
                        →
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setFotosProfissionais(fotosProfissionais.filter((_, idx) => idx !== i));
                      }}
                      title={t('common.remover', 'Remover')}
                      aria-label={t('common.remover', 'Remover')}
                      className="bg-red-600 text-white rounded p-1 hover:bg-red-700 shadow text-xs flex items-center justify-center w-5 h-5"
                    >
                      <X size={12} />
                    </button>
                  </div>
                )}
              </div>
            ))}

            {/* Upload Placeholder */}
            {isEditing && fotosProfissionais.length < 5 && (
              <div
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = 'image/*';
                  input.multiple = true;
                  input.onchange = async (e) => {
                    const files = (e.target as HTMLInputElement).files;
                    if (files) {
                      const slotsLeft = 5 - fotosProfissionais.length;
                      const selectedFiles = Array.from(files).slice(0, slotsLeft);
                      const newUrls: string[] = [];

                      for (const file of selectedFiles) {
                        try {
                          const compressed = await compressImage(file, 1600);
                          const ext = compressed instanceof File ? compressed.name.split('.').pop() : 'jpg';
                          const path = `onboarding/fotos/${Date.now()}-${uid()}.${ext}`;
                          const { error } = await supabase.storage.from('obras-images').upload(path, compressed, { upsert: true });
                          if (error) throw error;
                          const { data: { publicUrl } } = supabase.storage.from('obras-images').getPublicUrl(path);
                          newUrls.push(publicUrl);
                        } catch (err) {
                          alert('Erro ao carregar foto: ' + (err as Error).message);
                        }
                      }
                      setFotosProfissionais((prev) => [...prev, ...newUrls]);
                    }
                  };
                  input.click();
                }}
                className="aspect-square border border-dashed border-gold/40 hover:border-gold hover:bg-gold/5 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-colors"
              >
                <Plus size={20} className="text-gold" />
                <span className="text-[10px] text-gold font-bold mt-1 uppercase tracking-wider">{t('adicionar', 'Adicionar')}</span>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
