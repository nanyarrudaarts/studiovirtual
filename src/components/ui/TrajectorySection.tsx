import { useState } from 'react';
import { Plus, Edit2, Trash2, Sparkles, MapPin, User, Calendar, ExternalLink, FileText } from 'lucide-react';
import { TrajectoryModal } from './TrajectoryModal';
import type { FieldConfig, ListItem } from './TrajectoryModal';
import { searchWithJina, callAI } from '../../services/ai';

interface TrajectorySectionProps {
  title: string;
  items: ListItem[];
  onChange: (items: ListItem[]) => void;
  fields: FieldConfig[];
  artistName?: string;
  emptyMessage?: string;
}

export function TrajectorySection({
  title,
  items,
  onChange,
  fields,
  artistName,
  emptyMessage = 'Nenhuma entrada cadastrada.',
}: TrajectorySectionProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ListItem | null>(null);
  const [searchingId, setSearchingId] = useState<string | null>(null);

  // Ordenação cronológica inversa (mais recente para mais antigo)
  const sortedItems = [...items].sort((a, b) => {
    const yearA = parseInt(String(a.ano || '0').match(/\d{4}/)?.[0] || '0', 10);
    const yearB = parseInt(String(b.ano || '0').match(/\d{4}/)?.[0] || '0', 10);
    return yearB - yearA;
  });

  const handleOpenAdd = () => {
    setEditingItem(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: ListItem) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    onChange(items.filter((i) => i.id !== id));
  };

  const handleSave = (savedItem: ListItem) => {
    if (editingItem) {
      onChange(items.map((i) => (i.id === savedItem.id ? savedItem : i)));
    } else {
      onChange([...items, savedItem]);
    }
  };

  // Busca manual na web para preenchimento de lacunas
  const handleManualSearch = async (item: ListItem) => {
    const itemTitle = (item.titulo || item.nome || '') as string;
    if (!itemTitle) return;
    setSearchingId(item.id);

    try {
      const missingKeys = fields
        .map((f) => f.key)
        .filter((k) => !item[k] || !(item[k] as string).trim());

      if (missingKeys.length === 0) {
        setSearchingId(null);
        return;
      }

      const query = `"${itemTitle}" ${artistName || ''} artes visuais ${missingKeys.join(' ')} ficha técnica`;
      const searchText = await searchWithJina(query);

      if (searchText && searchText.trim()) {
        const miniPrompt = `Você é um pesquisador de artes visuais. Encontre os dados para "${itemTitle}"${artistName ? ` do artista "${artistName}"` : ''}.
Campos necessários: ${missingKeys.join(', ')}.
Retorne APENAS um JSON válido (sem markdown) no formato:
{ ${missingKeys.map((k) => `"${k}": "valor encontrado ou vazio"`).join(', ')} }

TEXTO DA PESQUISA WEB:
${searchText.substring(0, 4000)}`;

        const res = await callAI(miniPrompt, 'Extraia a ficha técnica solicitada em JSON puro, sem markdown.');
        const match = res.match(/\{[\s\S]*\}/);
        if (match) {
          try {
            const parsed = JSON.parse(match[0]);
            const suggestionData: Record<string, string> = {};
            missingKeys.forEach((k) => {
              const val = parsed[k];
              if (
                val &&
                typeof val === 'string' &&
                val.trim() &&
                val.toLowerCase() !== 'vazio' &&
                val.toLowerCase() !== 'não encontrado'
              ) {
                suggestionData[k] = val.trim();
              }
            });

            if (Object.keys(suggestionData).length > 0) {
              onChange(
                items.map((i) =>
                  i.id === item.id
                    ? { ...i, _suggestion: JSON.stringify(suggestionData) }
                    : i
                )
              );
            }
          } catch {
            /* ignore parse errors */
          }
        }
      }
    } catch (err) {
      console.warn('[Manual Search Error]', err);
    } finally {
      setSearchingId(null);
    }
  };

  return (
    <div className="space-y-4 py-2">
      {/* Section Header */}
      <div className="flex items-center justify-between pb-2 border-b border-[#e8e4de]">
        <h3 className="text-xs uppercase tracking-widest font-bold text-[#0f3421]">{title}</h3>
        <button
          type="button"
          onClick={handleOpenAdd}
          className="px-3 py-1.5 rounded-lg bg-[#0f3421] hover:bg-[#1a4a31] text-white text-xs font-semibold uppercase tracking-wider transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
        >
          <Plus className="w-3.5 h-3.5" />
          Adicionar
        </button>
      </div>

      {/* List of Compact Cards */}
      <div className="space-y-3">
        {sortedItems.map((item) => {
          // Parse suggestion
          let suggestionObj: Record<string, string> | null = null;
          const rawSug = item._suggestion as string;
          if (rawSug && typeof rawSug === 'string' && rawSug.trim().startsWith('{')) {
            try {
              suggestionObj = JSON.parse(rawSug);
            } catch {
              suggestionObj = null;
            }
          }

          const hasSuggestion = Boolean(
            suggestionObj && Object.keys(suggestionObj).filter((k) => suggestionObj![k]?.trim()).length > 0
          );

          const isAutoResearched =
            item._autoResearched === 'true' ||
            (item._autoResearched as unknown) === true ||
            String(item._autoResearched) === 'true';

          const year = (item.ano || item.periodo || '') as string;
          const mainTitle = (item.titulo || item.nome || item.nome_programa || 'Sem título') as string;
          const institution = (item.local || item.instituicao || item.galeria || item.veiculo || '') as string;
          const city = (item.cidade || '') as string;
          const country = (item.pais || '') as string;
          const curator = (item.curador || item.autor || '') as string;
          const type = (item.tipo || item.tipo_participacao || item.tipo_publicacao || item.tipo_midia || item.tipo_colecao || '') as string;

          const locationText = [institution, city, country].filter(Boolean).join(' · ');
          const isIncomplete = fields.some((f) => !item[f.key] || !(item[f.key] as string).trim());
          const isSearching = searchingId === item.id;

          return (
            <div
              key={item.id}
              className={`rounded-xl p-4 transition-all relative group border ${
                hasSuggestion
                  ? 'bg-[#f0f9ff] border-[#0284c7] shadow-sm'
                  : isAutoResearched
                  ? 'bg-[#f0f9ff] border-[#0284c7]/40'
                  : 'bg-white border-[#e8e4de] hover:border-[#b0ada8] shadow-2xs'
              }`}
            >
              {/* Header Card line: Year — Title */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {year && (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-[#0f3421] bg-[#e8f0eb] px-2 py-0.5 rounded-md">
                        <Calendar className="w-3 h-3" />
                        {year}
                      </span>
                    )}
                    <span className="font-serif text-base font-bold text-[#1A1816]">{mainTitle}</span>
                    {type && (
                      <span className="text-[10px] uppercase tracking-wider font-semibold text-[#6B6762] bg-[#f4f2ee] px-2 py-0.5 rounded border border-[#e8e4de]">
                        {type}
                      </span>
                    )}
                  </div>

                  {/* Location line */}
                  {locationText && (
                    <div className="flex items-center gap-1.5 text-xs text-[#6B6762] mt-1">
                      <MapPin className="w-3.5 h-3.5 shrink-0 text-[#0f3421]" />
                      <span>{locationText}</span>
                    </div>
                  )}

                  {/* Curator / Author line */}
                  {curator && (
                    <div className="flex items-center gap-1.5 text-xs text-[#6B6762] mt-0.5">
                      <User className="w-3.5 h-3.5 shrink-0 text-[#6B6762]" />
                      <span>Curadoria / Autoria: <strong className="text-[#1A1816]">{curator}</strong></span>
                    </div>
                  )}

                  {/* Additional details */}
                  {item.duracao && (
                    <p className="text-xs text-[#6B6762] mt-0.5">Duração: {item.duracao}</p>
                  )}
                  {item.resultado && (
                    <p className="text-xs font-semibold text-[#0f3421] mt-0.5">Resultado: {item.resultado}</p>
                  )}
                  {item.link && (
                    <a
                      href={item.link as string}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-[#0284c7] hover:underline mt-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>Acessar link</span>
                    </a>
                  )}
                  {item.documentacao && (
                    <div className="inline-flex items-center gap-1 text-xs text-[#0f3421] bg-[#e8f0eb] px-2 py-0.5 rounded mt-1">
                      <FileText className="w-3 h-3" />
                      <span>Documento Anexado</span>
                    </div>
                  )}
                </div>

                {/* Edit & Delete Action Buttons */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(item)}
                    className="p-1.5 rounded-lg text-[#6B6762] hover:text-[#0f3421] hover:bg-[#e8f0eb] transition-colors cursor-pointer"
                    title="Editar entrada"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(item.id)}
                    className="p-1.5 rounded-lg text-[#6B6762] hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                    title="Excluir entrada"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Banner de Sugestão de IA */}
              {hasSuggestion && suggestionObj && (
                <div className="mt-3 rounded-xl border-2 border-[#0284c7] bg-[#f0f9ff] p-3 text-xs text-[#0369a1] space-y-2">
                  <div className="flex items-center gap-1.5 font-bold text-[#0284c7]">
                    <Sparkles className="w-4 h-4" />
                    <span>Sugestão encontrada na web:</span>
                  </div>
                  <div className="space-y-1 bg-white p-2 rounded-lg border border-[#bae6fd]">
                    {Object.entries(suggestionObj)
                      .filter(([, v]) => v?.trim())
                      .map(([k, v]) => (
                        <div key={k} className="flex items-center gap-2">
                          <span className="font-semibold text-[#0369a1] capitalize">{k}:</span>
                          <span className="font-bold text-[#0f3421]">{v}</span>
                        </div>
                      ))}
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        const updated: ListItem = { ...item };
                        Object.entries(suggestionObj!).forEach(([k, v]) => {
                          if (v && v.trim()) updated[k] = v.trim();
                        });
                        updated._suggestion = '';
                        updated._autoResearched = 'true';
                        onChange(items.map((i) => (i.id === item.id ? updated : i)));
                      }}
                      className="flex-1 px-3 py-1.5 rounded-lg bg-[#0284c7] hover:bg-[#0369a1] text-white font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer flex items-center justify-center gap-1"
                    >
                      ✅ APLICAR ESTA SUGESTÃO
                    </button>
                    <button
                      type="button"
                      onClick={() => onChange(items.map((i) => (i.id === item.id ? { ...i, _suggestion: '' } : i)))}
                      className="px-3 py-1.5 rounded-lg bg-white border border-[#bae6fd] text-[#64748b] font-medium text-xs hover:bg-[#f0f9ff] cursor-pointer"
                    >
                      ❌ Ignorar
                    </button>
                  </div>
                </div>
              )}

              {/* Botão de Busca Manual se Incompleto */}
              {isIncomplete && !hasSuggestion && !isAutoResearched && (
                <div className="mt-2 flex justify-end">
                  <button
                    type="button"
                    disabled={isSearching}
                    onClick={() => handleManualSearch(item)}
                    className="flex items-center gap-1 text-[11px] text-[#0284c7] hover:text-[#0369a1] font-medium cursor-pointer disabled:opacity-50"
                  >
                    {isSearching ? (
                      <span>⏳ Pesquisando...</span>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Pesquisar detalhes na Web</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {items.length === 0 && (
          <p className="text-xs italic text-[#b0ada8] py-2">{emptyMessage}</p>
        )}
      </div>

      {/* Trajectory Form Modal */}
      <TrajectoryModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        title={`${editingItem ? 'Editar' : 'Adicionar'} — ${title}`}
        fields={fields}
        initialData={editingItem}
        artistName={artistName}
      />
    </div>
  );
}
