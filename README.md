# Studio Virtual — Sistema de Gestão Curatorial & Acervo Artístico

Plataforma completa para gestão, catalogação, inteligência curatorial e proveniência blockchain de obras e acervos de arte contemporânea.

## 🚀 Tecnologias

- **Frontend**: React 18, TypeScript, Tailwind CSS, Vite
- **Navegação & Roteamento**: React Router DOM v6
- **Backend & Database**: Supabase (PostgreSQL, Storage, Auth)
- **AI Engine**: Google Gemini API, Jina AI Reader
- **PDF & Documentos**: PDF.js, PDF-lib (Geração de COA & Dossiês)
- **i18n**: react-i18next (PT, EN, ES, DE)

---

## 🛠️ Estrutura do Projeto

```
src/
├── components/
│   ├── common/        # Componentes globais reusáveis (TagInput, etc)
│   ├── perfil/        # Componentes modulares da tela de Perfil (SmartImport, AddList, Tabs)
│   ├── upload/        # Componentes do fluxo de cadastro de Obras (ChatPanel, PhotoSlots, Form)
│   ├── onboarding/    # Passos do wizard de entrada (CropperModal, Steps)
│   └── ui/            # UI Primitives e modais de trajetória
├── lib/               # Utilitários puros (imageUtils, helpers)
├── screens/           # Telas principais (Perfil, Upload, Onboarding, Obras, Dashboard)
├── services/          # Integrações (Supabase, AI, Jina, PDF)
├── i18n/              # Dicionários de internacionalização
└── data/              # Presets de trajetórias, museus e glossários
```

---

## ⚙️ Como Executar

```bash
# Instalar dependências
npm install

# Iniciar servidor de desenvolvimento
npm run dev

# Checar tipos TypeScript
npx tsc --noEmit

# Build de produção
npm run build
```
