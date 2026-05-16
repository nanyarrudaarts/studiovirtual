import { useState, useEffect, useRef } from 'react';
import { Plus, X, Sparkles, Loader2, Camera } from 'lucide-react';
import { supabase } from '../services/supabase';

interface ListItem {
  id: string;
  [key: string]: string;
}

const uid = () => Math.random().toString(36).slice(2);

function AddList({ title, fields, items, onChange }: {
  title: string;
  fields: { key: string; label: string; type?: string }[];
  items: ListItem[];
  onChange: (items: ListItem[]) => void;
}) {
  const add = () => {
    const empty: ListItem = { id: uid() };
    fields.forEach(f => { empty[f.key] = ''; });
    onChange([...items, empty]);
  };
  const remove = (id: string) => onChange(items.filter(i => i.id !== id));
  const update = (id: string, key: string, value: string) =>
    onChange(items.map(i => i.id === id ? { ...i, [key]: value } : i));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-bold text-sm text-text-muted">{title}</h4>
        <button onClick={add} className="flex items-center gap-1 text-accent text-xs font-bold hover:underline">
          <Plus size={14} /> Adicionar
        </button>
      </div>
      {items.map(item => (
        <div key={item.id} className="bg-bg rounded-xl p-4 relative">
          <button onClick={() => remove(item.id)}
            className="absolute right-3 top-3 text-gray-400 hover:text-red-500 transition-colors">
            <X size={16} />
          </button>
          <div className="grid grid-cols-2 gap-3 pr-6">
            {fields.map(f => (
              <div key={f.key} className={f.key === fields[0].key ? 'col-span-2' : ''}>
                <label className="block text-xs text-text-muted mb-1">{f.label}</label>
                <input
                  type={f.type || 'text'}
                  value={item[f.key] || ''}
                  onChange={e => update(item.id, f.key, e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:border-accent outline-none bg-white"
                />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Perfil() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generatingBio, setGeneratingBio] = useState(false);

  const [form, setForm] = useState({
    nome: 'Nany Arruda',
    nomeArtistico: 'Nany Arruda',
    nacionalidade: 'Brasil',
    cidade: '',
    nascimento: '',
    website: 'nanyarruda.com',
    bioShort: '',
    bioLong: '',
    tags: '',
  });

  const [instagrams, setInstagrams] = useState(['@nany_arruda', '@nanyarrudaart']);
  const [socialLinks, setSocialLinks] = useState<{id:string; label:string; url:string}[]>([]);
  const [formacao, setFormacao] = useState<ListItem[]>([]);
  const [premios, setPremios] = useState<ListItem[]>([]);
  const [residencias, setResidencias] = useState<ListItem[]>([]);
  const [exposIndividuais, setExposIndividuais] = useState<ListItem[]>([]);
  const [exposColetivas, setExposColetivas] = useState<ListItem[]>([]);
  const [publicacoes, setPublicacoes] = useState<ListItem[]>([]);

  useEffect(() => {
    supabase.from('artista').select('*').single().then(({ data }) => {
      if (data) {
        setForm(f => ({ ...f, ...data }));
        if (data.foto_url) setPhotoUrl(data.foto_url);
        if (data.instagrams) setInstagrams(data.instagrams);
        if (data.social_links) setSocialLinks(data.social_links);
        if (data.formacao) setFormacao(data.formacao);
        if (data.premios) setPremios(data.premios);
        if (data.residencias) setResidencias(data.residencias);
        if (data.expos_individuais) setExposIndividuais(data.expos_individuais);
        if (data.expos_coletivas) setExposColetivas(data.expos_coletivas);
        if (data.publicacoes) setPublicacoes(data.publicacoes);
      }
    });
  }, []);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    const file = e.target.files[0];
    setUploading(true);
    const ext = file.name.split('.').pop();
    const path = `perfil/foto.${ext}`;
    const { error } = await supabase.storage.from('perfil').upload(path, file, { upsert: true });
    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from('perfil').getPublicUrl(path);
      setPhotoUrl(publicUrl);
    }
    setUploading(false);
  };

  const handleGenerateBio = async () => {
    setGeneratingBio(true);
    const key = localStorage.getItem('sv_config') ? JSON.parse(localStorage.getItem('sv_config')!).geminiKey : '';
    if (!key) {
      alert('Configure a chave Gemini em Configurações primeiro.');
      setGeneratingBio(false);
      return;
    }
    try {
      const prompt = `Você é um curador de arte. Gere duas bios para a artista ${form.nome}, de ${form.nacionalidade}, cidade ${form.cidade}. Bio curta (até 120 palavras) e bio longa (3 parágrafos). Retorne JSON: {"short":"...", "long":"..."}`;
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      });
      const json = await res.json();
      const text = json.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        const data = JSON.parse(match[0]);
        setForm(f => ({ ...f, bioShort: data.short || f.bioShort, bioLong: data.long || f.bioLong }));
      }
    } catch { /* silently fail */ }
    setGeneratingBio(false);
  };

  const handleSave = async () => {
    setSaving(true);
    await supabase.from('artista').upsert({
      id: 1,
      ...form,
      foto_url: photoUrl,
      instagrams,
      social_links: socialLinks,
      formacao,
      premios,
      residencias,
      expos_individuais: exposIndividuais,
      expos_coletivas: exposColetivas,
      publicacoes,
      updated_at: new Date().toISOString(),
    });
    setSaving(false);
  };

  const set = (key: keyof typeof form, value: string) =>
    setForm(f => ({ ...f, [key]: value }));

  const wordCount = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;

  return (
    <div className="max-w-[900px] mx-auto pb-28 space-y-8">
      <div>
        <h1 className="text-3xl font-serif mb-1">Perfil da Artista</h1>
        <p className="text-text-muted">Seus dados são usados nos dossiês e portfólios exportados.</p>
      </div>

      {/* Identity + Digital Presence */}
      <section className="bg-white rounded-2xl shadow-float border border-gray-100 overflow-hidden">
        <div className="px-7 py-5 border-b border-gray-100">
          <h2 className="text-lg font-serif">Identidade</h2>
        </div>
        <div className="p-7">
          <div className="flex flex-col md:flex-row gap-8">
            {/* Left — Identity */}
            <div className="flex flex-col items-center md:items-start gap-6 md:w-1/2">
              {/* Photo */}
              <div className="flex flex-col items-center gap-2">
                <div className="relative w-[120px] h-[120px]">
                  <div className="w-[120px] h-[120px] rounded-full overflow-hidden bg-gray-100 border-2 border-accent/20 flex items-center justify-center">
                    {photoUrl ? (
                      <img src={photoUrl} alt="Foto" className="w-full h-full object-cover" />
                    ) : (
                      <Camera size={32} className="text-gray-400" />
                    )}
                  </div>
                  <button onClick={() => fileRef.current?.click()}
                    className="absolute bottom-1 right-1 w-8 h-8 bg-accent text-white rounded-full flex items-center justify-center shadow hover:bg-accent/90 transition-colors">
                    {uploading ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
                  </button>
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                </div>
                <p className="text-xs text-text-muted">Clique para alterar a foto</p>
              </div>

              <div className="w-full space-y-3">
                <div>
                  <label className="block text-sm font-bold text-text-muted mb-1">Nome completo</label>
                  <input value={form.nome} onChange={e => set('nome', e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:border-accent outline-none bg-bg" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-text-muted mb-1">Nome artístico</label>
                  <input value={form.nomeArtistico} onChange={e => set('nomeArtistico', e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:border-accent outline-none bg-bg" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-bold text-text-muted mb-1">Nacionalidade</label>
                    <input value={form.nacionalidade} onChange={e => set('nacionalidade', e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:border-accent outline-none bg-bg" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-text-muted mb-1">Cidade / Estado</label>
                    <input value={form.cidade} onChange={e => set('cidade', e.target.value)}
                      placeholder="Rio de Janeiro, RJ"
                      className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:border-accent outline-none bg-bg" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-text-muted mb-1">Nascimento</label>
                  <input type="date" value={form.nascimento} onChange={e => set('nascimento', e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:border-accent outline-none bg-bg" />
                </div>
              </div>
            </div>

            {/* Right — Digital Presence */}
            <div className="md:w-1/2 space-y-4">
              <div>
                <label className="block text-sm font-bold text-text-muted mb-1">Website</label>
                <input value={form.website} onChange={e => set('website', e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:border-accent outline-none bg-bg" />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-bold text-text-muted">Instagram</label>
                  <button onClick={() => setInstagrams(ig => [...ig, ''])}
                    className="text-accent text-xs font-bold hover:underline flex items-center gap-1">
                    <Plus size={12} /> Adicionar
                  </button>
                </div>
                <div className="space-y-2">
                  {instagrams.map((ig, i) => (
                    <div key={i} className="flex gap-2">
                      <input value={ig} onChange={e => {
                        const n = [...instagrams]; n[i] = e.target.value; setInstagrams(n);
                      }} className="flex-1 border border-gray-200 rounded-lg px-4 py-2 text-sm focus:border-accent outline-none bg-bg" />
                      <button onClick={() => setInstagrams(ig => ig.filter((_, j) => j !== i))}
                        className="text-gray-400 hover:text-red-500 px-2">
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-bold text-text-muted">Outros links</label>
                  <button onClick={() => setSocialLinks(s => [...s, { id: uid(), label: '', url: '' }])}
                    className="text-accent text-xs font-bold hover:underline flex items-center gap-1">
                    <Plus size={12} /> Adicionar campo
                  </button>
                </div>
                <div className="space-y-2">
                  {socialLinks.map(link => (
                    <div key={link.id} className="flex gap-2">
                      <input placeholder="LinkedIn" value={link.label}
                        onChange={e => setSocialLinks(s => s.map(l => l.id === link.id ? {...l, label: e.target.value} : l))}
                        className="w-28 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-accent outline-none bg-bg" />
                      <input placeholder="https://..." value={link.url}
                        onChange={e => setSocialLinks(s => s.map(l => l.id === link.id ? {...l, url: e.target.value} : l))}
                        className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-accent outline-none bg-bg" />
                      <button onClick={() => setSocialLinks(s => s.filter(l => l.id !== link.id))}
                        className="text-gray-400 hover:text-red-500 px-2">
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Bio */}
      <section className="bg-white rounded-2xl shadow-float border border-gray-100 overflow-hidden">
        <div className="px-7 py-5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-serif">Biografia</h2>
          <button onClick={handleGenerateBio}
            className="flex items-center gap-2 px-4 py-2 bg-accent/10 text-accent text-sm font-bold rounded-lg hover:bg-accent/20 transition-colors">
            {generatingBio ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            Gerar bio com IA
          </button>
        </div>
        <div className="p-7 space-y-5">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-bold text-text-muted">Bio Curta</label>
              <span className={`text-xs ${wordCount(form.bioShort) > 120 ? 'text-red-500' : 'text-gray-400'}`}>
                {wordCount(form.bioShort)}/120 palavras
              </span>
            </div>
            <textarea value={form.bioShort} onChange={e => set('bioShort', e.target.value)}
              placeholder="Usada na capa do dossiê..."
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-accent outline-none bg-bg h-28 resize-none" />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-bold text-text-muted">Bio Longa</label>
              <span className="text-xs text-gray-400">{wordCount(form.bioLong)} palavras</span>
            </div>
            <textarea value={form.bioLong} onChange={e => set('bioLong', e.target.value)}
              placeholder="Usada no portfólio PDF completo..."
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-accent outline-none bg-bg h-40 resize-none" />
          </div>
        </div>
      </section>

      {/* Formação e Trajetória */}
      <section className="bg-white rounded-2xl shadow-float border border-gray-100 overflow-hidden">
        <div className="px-7 py-5 border-b border-gray-100">
          <h2 className="text-lg font-serif">Formação e Trajetória</h2>
        </div>
        <div className="p-7 space-y-7">
          <AddList title="Educação" items={formacao} onChange={setFormacao} fields={[
            { key: 'curso', label: 'Curso' },
            { key: 'instituicao', label: 'Instituição' },
            { key: 'anoInicio', label: 'Ano início' },
            { key: 'anoFim', label: 'Ano fim' },
          ]} />
          <div className="border-t border-gray-100 pt-6">
            <AddList title="Prêmios e Distinções" items={premios} onChange={setPremios} fields={[
              { key: 'nome', label: 'Nome do prêmio' },
              { key: 'instituicao', label: 'Instituição' },
              { key: 'ano', label: 'Ano' },
            ]} />
          </div>
          <div className="border-t border-gray-100 pt-6">
            <AddList title="Residências Artísticas" items={residencias} onChange={setResidencias} fields={[
              { key: 'nome', label: 'Nome' },
              { key: 'local', label: 'Local' },
              { key: 'ano', label: 'Ano' },
            ]} />
          </div>
        </div>
      </section>

      {/* Exposições */}
      <section className="bg-white rounded-2xl shadow-float border border-gray-100 overflow-hidden">
        <div className="px-7 py-5 border-b border-gray-100">
          <h2 className="text-lg font-serif">Exposições</h2>
        </div>
        <div className="p-7 space-y-7">
          <AddList title="Individuais" items={exposIndividuais} onChange={setExposIndividuais} fields={[
            { key: 'titulo', label: 'Título' },
            { key: 'local', label: 'Galeria / Museu' },
            { key: 'cidade', label: 'Cidade' },
            { key: 'pais', label: 'País' },
            { key: 'ano', label: 'Ano' },
          ]} />
          <div className="border-t border-gray-100 pt-6">
            <AddList title="Coletivas" items={exposColetivas} onChange={setExposColetivas} fields={[
              { key: 'titulo', label: 'Título' },
              { key: 'local', label: 'Galeria / Museu' },
              { key: 'cidade', label: 'Cidade' },
              { key: 'pais', label: 'País' },
              { key: 'ano', label: 'Ano' },
            ]} />
          </div>
        </div>
      </section>

      {/* Publicações */}
      <section className="bg-white rounded-2xl shadow-float border border-gray-100 overflow-hidden">
        <div className="px-7 py-5 border-b border-gray-100">
          <h2 className="text-lg font-serif">Publicações</h2>
        </div>
        <div className="p-7">
          <AddList title="Publicações" items={publicacoes} onChange={setPublicacoes} fields={[
            { key: 'titulo', label: 'Título' },
            { key: 'editora', label: 'Editora / Veículo' },
            { key: 'ano', label: 'Ano' },
            { key: 'link', label: 'Link (opcional)' },
          ]} />
        </div>
      </section>

      {/* Fixed Save Button */}
      <div className="fixed bottom-0 left-[220px] right-0 bg-white/80 backdrop-blur-md border-t border-gray-100 p-4 flex justify-end z-20">
        <button onClick={handleSave}
          className="flex items-center gap-2 px-8 py-3 bg-accent text-white font-bold rounded-xl hover:bg-accent/90 transition-all shadow-lg">
          {saving ? <><Loader2 size={18} className="animate-spin" /> Salvando...</> : 'Salvar perfil'}
        </button>
      </div>
    </div>
  );
}
