# Diagnóstico Técnico — Studio Virtual

Este documento apresenta uma análise detalhada do estado atual do código-fonte do repositório **studiovirtual** para alinhar o desenvolvimento com os objetivos do MVP descritos no PRD.

> [!NOTE]
> **Sobre o PRD.md:**
> O arquivo `docs/PRD.md` não foi localizado fisicamente nos diretórios do repositório (`/Users/nanyarruda/Studio` ou `/Users/nanyarruda/Studio/studio-virtual`). A análise a seguir baseia-se na indicação do escopo do MVP fornecido no prompt: **catálogo/galeria estilo museu, sem pagamento/agendamento por enquanto**.

---

## 1. Estrutura Atual de Pastas e Arquivos

O projeto está estruturado em uma arquitetura padrão do **React + Vite + TypeScript**. Nota-se a existência de uma pasta duplicada do projeto no diretório raiz (`/Users/nanyarruda/Studio/studio-virtual`), sendo esta última a pasta ativa onde os arquivos estão sendo editados.

Abaixo, o resumo da estrutura relevante de pastas dentro de `studio-virtual/src`:

*   **`src/assets/`**: Imagens estáticas e SVGs locais.
*   **`src/components/`**: Componentes reutilizáveis do sistema:
    *   `layout/`: Estrutura do layout principal (Ex: [Shell.tsx](file:///Users/nanyarruda/Studio/studio-virtual/src/components/layout/Shell.tsx) que contém a barra lateral de navegação).
    *   `common/`: Modais, pré-visualizações e blocos comuns (Ex: [ErrorBoundary.tsx](file:///Users/nanyarruda/Studio/studio-virtual/src/components/common/ErrorBoundary.tsx), [CertificatePreview.tsx](file:///Users/nanyarruda/Studio/studio-virtual/src/components/common/CertificatePreview.tsx), [PortfolioPDF.tsx](file:///Users/nanyarruda/Studio/studio-virtual/src/components/common/PortfolioPDF.tsx)).
*   **`src/hooks/`**: Custom hooks (Ex: [useTheme.ts](file:///Users/nanyarruda/Studio/studio-virtual/src/hooks/useTheme.ts)).
*   **`src/i18n/`**: Tradução de idiomas para suporte multi-idiomas (Português, Inglês, Espanhol, Alemão).
*   **`src/lib/`**: Helpers utilitários complexos (Ex: [generateCertificate.ts](file:///Users/nanyarruda/Studio/studio-virtual/src/lib/generateCertificate.ts) para geração de certificados em PDF client-side).
*   **`src/screens/`**: Telas/Páginas principais da aplicação (onboarding, dashboard, galeria, perfil, etc.).
*   **`src/services/`**: Serviços e conexões com APIs externas:
    *   [supabase.ts](file:///Users/nanyarruda/Studio/studio-virtual/src/services/supabase.ts): CRUD de dados, autenticação e upload de imagens.
    *   [ai.ts](file:///Users/nanyarruda/Studio/studio-virtual/src/services/ai.ts): Integração com as APIs da Groq e Jina AI para inteligência curatorial.
*   **`src/types/`**: Interfaces de tipagem do TypeScript ([types/index.ts](file:///Users/nanyarruda/Studio/studio-virtual/src/types/index.ts)).
*   **Arquivos SQL na raiz**: Scripts de migração do Supabase (`supabase_correcoes.sql`, `supabase_rls_policies.sql`, `supabase_migration_multitenant.sql`).

---

## 2. Principais Dependências Instaladas (`package.json`)

As principais dependências do projeto e suas finalidades são:

*   **`react` (v19.2.6) e `react-dom` (v19.2.6)**: Biblioteca principal para construção da interface de usuário.
*   **`react-router-dom` (v7.15.1)**: Gerenciamento de rotas e navegação da SPA.
*   **`@supabase/supabase-js` (v2.105.4)**: Integração com o ecossistema Supabase para autenticação, consultas e armazenamento de arquivos.
*   **`@react-pdf/renderer` (v4.5.1)**: Biblioteca utilizada no lado do cliente para renderizar documentos PDF dinâmicos (Portfólios).
*   **`pdfjs-dist` (v3.11.174 / v6.0.227)**: Framework de leitura e processamento de arquivos PDF (usado na tela de perfil para extrair texto de currículos em PDF).
*   **`tailwindcss` (v4.3.0) e `@tailwindcss/vite`**: Framework CSS utilitário para design e estilização moderna da aplicação.
*   **`i18next` e `react-i18next` (v17.0.8)**: Sistema de localização e tradução da aplicação.
*   **`lucide-react` (v1.16.0)**: Biblioteca de ícones vetoriais.
*   **`date-fns` (v4.1.0)**: Biblioteca leve para formatação e manipulação de datas.
*   **`@vercel/analytics` e `@vercel/speed-insights`**: Ferramentas de análise de acessos e performance da Vercel integradas na aplicação.

---

## 3. O que já está implementado hoje

O sistema atual possui um conjunto avançado de funcionalidades voltadas para a auto-gestão artística:

*   **Fluxo de Onboarding ([Onboarding.tsx](file:///Users/nanyarruda/Studio/studio-virtual/src/screens/Onboarding.tsx))**: Um formulário passo a passo (wizard) de 5 etapas para preenchimento do perfil profissional da artista (Dados de Conta, Perfil Artístico, Trajetória/Exposições, Identidade Visual de Marca e Fotos de Trabalho).
*   **Controle de Login ([Login.tsx](file:///Users/nanyarruda/Studio/studio-virtual/src/screens/Login.tsx))**: Tela com formulário de login por e-mail e senha integrada à autenticação do Supabase.
*   **Dashboard ([Dashboard.tsx](file:///Users/nanyarruda/Studio/studio-virtual/src/screens/Dashboard.tsx))**: Painel que exibe a quantidade total de obras catalogadas, um índice de integridade de dados (Health Score), atalhos de criação e um carrossel de obras recentes.
*   **Gerenciador de Obras ([Obras.tsx](file:///Users/nanyarruda/Studio/studio-virtual/src/screens/Obras.tsx))**: Apresenta em abas as Obras Singulares, Séries e Coleções. Ao clicar em uma obra, abre-se um modal detalhado exibindo metadados, texto curatorial e opção de exclusão ou exportação de certificado.
*   **Cadastro de Obras ([Upload.tsx](file:///Users/nanyarruda/Studio/studio-virtual/src/screens/Upload.tsx))**: Tela para catalogar novos itens. Apresenta uma interface de chat integrada com IA (Groq) capaz de interpretar e converter descrições livres em metadados de ficha técnica de forma assistida.
*   **Perfil do Artista ([Perfil.tsx](file:///Users/nanyarruda/Studio/studio-virtual/src/screens/Perfil.tsx))**: Permite gerenciar as informações do artista. Inclui uma funcionalidade inovadora de importação inteligente de CV: o usuário faz upload de um PDF ou informa uma URL e a IA preenche o cadastro automaticamente.
*   **Emissor de Certificados ([Certificados.tsx](file:///Users/nanyarruda/Studio/studio-virtual/src/screens/Certificados.tsx))**: Emite o Certificado de Autenticidade (COA) das obras catalogadas. Permite visualizar e baixar os documentos em formato PDF diretamente pelo navegador.
*   **Dossiê Curatorial ([Dossie.tsx](file:///Users/nanyarruda/Studio/studio-virtual/src/screens/Dossie.tsx))**: Monta uma apresentação formal do artista e das obras selecionadas, otimizada para impressão física ou PDF (via layout A4 Standard).
*   **Gerador de Portfólios ([Portfolio.tsx](file:///Users/nanyarruda/Studio/studio-virtual/src/screens/Portfolio.tsx))**: Permite que a artista selecione as obras do acervo, escolha layouts pré-definidos (The Collector, The Gallery, The Chronological), ordene os itens por drag-and-drop e gere um portfólio profissional em PDF com legendas técnicas formatadas.

---

## 4. Dados Fake, Mocks e Hardcoded Identificados

Para que a plataforma funcione de maneira totalmente dinâmica e limpa, os seguintes pontos precisam de ajuste/limpeza:

1.  **Imagens Mocks de Acervo no Dashboard**:
    No arquivo [Dashboard.tsx](file:///Users/nanyarruda/Studio/studio-virtual/src/screens/Dashboard.tsx#L260-L284), se o banco estiver vazio, o sistema exibe 4 cards fixos com títulos ("Aura Emersa 1-4") e uma imagem mock padrão hospedada no Unsplash.
2.  **Valores Hardcoded de Nome de Artista**:
    No serviço [supabase.ts](file:///Users/nanyarruda/Studio/studio-virtual/src/services/supabase.ts#L98-L101), caso o usuário não informe os dados, o sistema força `"Nany Arruda"` como autor e detentor dos direitos autorais (`copyright_holder`).
3.  **Configurações Padrão de Marca D'água e E-mail**:
    Em [Configuracoes.tsx](file:///Users/nanyarruda/Studio/studio-virtual/src/screens/Configuracoes.tsx#L34-L35), o texto da marca d'água padrão está configurado como `"Nany Arruda — nanyarruda.com"`. O campo de e-mail da conta de usuário está como readonly e hardcoded para `"contato@nanyarruda.com"` na linha 313.
4.  **Avatar do Usuário**:
    No arquivo de layout [Shell.tsx](file:///Users/nanyarruda/Studio/studio-virtual/src/components/layout/Shell.tsx#L290), as iniciais `"NA"` e informações do menu suspenso do avatar estão inseridos manualmente ao invés de buscar os dados do usuário autenticado no Supabase.
5.  **Imagem de Selo/Carimbo do Certificado**:
    O certificado utiliza a imagem `/stamp.png` localizada na pasta `public` do projeto, que atua como assinatura institucional fictícia de autenticação.
6.  **Mapeamento de Alertas Curiosidades**:
    No [Dashboard.tsx](file:///Users/nanyarruda/Studio/studio-virtual/src/screens/Dashboard.tsx#L40), a variável `alertasMateriais` busca no banco de dados obras com status `available` (Disponível), o que parece ser um remanescente de nomenclatura de controle de materiais (estoque do ateliê).

---

## 5. Gaps Identificados (Funcionalidades Ausentes)

Analisando a proposta do MVP do PRD (**catálogo/galeria estilo museu**):

> [!IMPORTANT]
> **Ausência de Rota Pública de Galeria/Museu (O principal Gap do MVP)**
> Atualmente, **todas as rotas da aplicação são privadas** e exigem autenticação do usuário. Se uma pessoa não logada tentar acessar a aplicação, ela será redirecionada para `/login` (conforme [App.tsx:L109](file:///Users/nanyarruda/Studio/studio-virtual/src/App.tsx#L109)).
> Para entregar um "catálogo/galeria estilo museu", **é fundamental criar rotas públicas** (ex: `/galeria` ou `/artista/:username`) para que visitantes externos, curadores e colecionadores visualizem as coleções e obras expostas sem precisar de login e senha.

*   **Falta de Mecanismo de Compartilhamento**: Não há rotas ou botões para copiar links diretos e compartilháveis de obras específicas, coleções ou portfólios para redes sociais ou e-mails de compradores.
*   **Falta do arquivo PRD.md**: O arquivo de documentação de escopo não existe no repositório, o que dificulta o rastreamento preciso de requisitos secundários do sistema.

---

## 6. Riscos Técnicos e Status de Correção

*   **Políticas de RLS Inseguras**: ✅ **Corrigido**
    *   **Status anterior**: As políticas antigas continham regras inseguras ("collections/series write authed" sem checagem de dono, "artista insert/update single" travadas no id=1 e "artista select public" sem controle).
    *   **Solução aplicada diretamente no Supabase**:
        1. Removidas todas as políticas antigas permissivas de `collections`, `series`, `artworks_collections`, `artworks_series` e `artista`.
        2. Criadas políticas restritas garantindo que cada tabela só permite acesso (SELECT/INSERT/UPDATE/DELETE) aos dados pertencentes ao usuário autenticado via `user_id = auth.uid()` (diretamente ou via `EXISTS` através de `artista`/`artworks`).
        3. Validadas manualmente no app: o acesso a coleções e séries segue funcionando normalmente para a artista logada.
*   **Componentes Gigantes (Monólitos)**:
    Os componentes de tela [Perfil.tsx](file:///Users/nanyarruda/Studio/studio-virtual/src/screens/Perfil.tsx) (2248 linhas), [Onboarding.tsx](file:///Users/nanyarruda/Studio/studio-virtual/src/screens/Onboarding.tsx) (1767 linhas) e [Upload.tsx](file:///Users/nanyarruda/Studio/studio-virtual/src/screens/Upload.tsx) (1332 linhas) contêm lógica densa de processamento de imagens, parse de PDFs, chamadas de IA e controle de estado complexo acoplados no mesmo arquivo, o que reduz drasticamente a manutenibilidade.
*   **Arquivos Duplicados**:
    A presença de uma cópia idêntica da estrutura no nível raiz (`/Users/nanyarruda/Studio`) e outra em `studio-virtual/` pode gerar conflitos de build e erros onde o desenvolvedor altera um arquivo no diretório errado.
*   **Processamento de Imagem no Cliente**:
    A compressão e corte de imagem (`compressImage`, `compressAndCropImage`) ocorrem diretamente no navegador do usuário usando a API Canvas do HTML5. Dispositivos móveis antigos podem apresentar lentidão ou falhas silenciosas de memória ao processar imagens grandes e de alta definição (como fotos profissionais de obras).

---

## 7. Compatibilidade com Multi-Tenant

> [!NOTE]
> **Status de Multi-Tenancy: ✅ Corrigido**
> O schema do banco de dados e as políticas de isolamento no Supabase foram ajustados com sucesso.

*   **Resumo das alterações aplicadas diretamente no Supabase**:
    1. Adicionada a coluna `artist_id` (referenciando `artista.id`) nas tabelas `collections` e `series`, seguindo o padrão já utilizado em `artworks`.
    2. Realizado backfill associando todos os registros existentes de `collections` e `series` ao artista do usuário autenticado atual.
    3. Coluna `artist_id` alterada para `NOT NULL` após a conclusão do backfill.
    4. Aplicadas novas regras estritas de RLS garantindo o isolamento total dos dados por artista/usuário.
    5. Confirmado manualmente no aplicativo que as coleções e séries continuam visíveis e editáveis normalmente pela artista logada.

---

## 8. Diagnóstico — Bug "Tela Verde / App Trava no Primeiro Acesso"

> [!IMPORTANT]
> **Status:** Diagnosticado em 06/08/2026. Ainda não corrigido — aguardando aprovação.

### Pergunta 1 — A "Tela Verde"

**Identificada:** A cor verde que a usuária vê não é uma tela separada, e sim o **painel decorativo lateral esquerdo** do componente `Onboarding.tsx`, que aparece em `desktop (lg:)` em toda a duração do wizard de 5 etapas e também na tela de conclusão.

- **Arquivo:** [`src/screens/Onboarding.tsx`](file:///Users/nanyarruda/Studio/src/screens/Onboarding.tsx#L1652)
- **Linha:** 1652
- **Cor exata:** `bg-[#0f3421]` — verde escuro escuro (floresta/musgo), não é Tailwind `green-*`
- **Quando aparece:** Somente em telas `≥ 1024px` (`hidden lg:flex`), **sempre que `onboarding_completed = false`** após o login — o App.tsx força `/onboarding` em qualquer rota (linha 132), e essa tela possui um painel esquerdo totalmente verde escuro.
- **Em mobile:** A cor não aparece como fundo; a tela exibe `bg-[#F5F3EE]` (bege claro).
- **Outros verdes encontrados:** `Login.tsx` linha 136 exibe uma `div bg-emerald-50` (verde-claro) **apenas** no estado de `success` (pós-cadastro, antes de confirmar e-mail). Não é um fundo de tela inteiro.

---

### Pergunta 2 — Fluxo em App.tsx: usuária autenticada sem onboarding completo

**Fluxo atual em [`src/App.tsx`](file:///Users/nanyarruda/Studio/src/App.tsx):**

```
1. useEffect ([]) → supabase.auth.onAuthStateChange dispara
2. Se sessão existente → setSession(s) → chama getOnboardingStatus()
3. Se onboarding_completed = false → renderiza só /onboarding com redirect forçado (linha 132)
4. onComplete() chamado em handleFinish → setOnboardingDone(true) em App.tsx
```

**Bug potencial encontrado:**

```tsx
// App.tsx linhas 70-72
if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
  setLoading(true);  // ← reinicia loading a cada evento SIGNED_IN/INITIAL_SESSION
}
```

> [!WARNING]
> **Race condition / re-trigger:** O `onAuthStateChange` pode disparar `INITIAL_SESSION` **novamente** após o usuário voltar de outra aba/janela (especialmente em Safari mobile e algumas versões do Chrome). Quando isso ocorre, o código seta `loading = true` e aguarda `getOnboardingStatus()` — se essa chamada demorar ou falhar silenciosamente, a tela fica presa no `<LoadingScreen />` (fundo preto, spinner dourado). O fallback de 4 segundos (linha 48-53) resolve na primeira chamada, **mas não resolve re-triggers subsequentes**, pois o `fallbackTimer` é criado apenas na montagem do componente (`useEffect([], [])`).

---

### Pergunta 3 — useEffects problemáticos

| Arquivo | Linha | Tipo de problema |
|---|---|---|
| `App.tsx` | 55 | `onAuthStateChange` pode re-disparar `INITIAL_SESSION` ao voltar de outra aba — não há proteção para re-triggers após a montagem |
| `App.tsx` | 48 | O `fallbackTimer` de 4s é criado **uma só vez** na montagem — não protege re-triggers do onAuthStateChange |
| `Onboarding.tsx` | 1460 | `useEffect([], [])` carrega o perfil uma única vez — correto, sem loop |
| `Login.tsx` | — | Nenhum `useEffect` — correto |

**Nenhum `visibilitychange` ou `focus` listener encontrado.** O problema é no próprio `onAuthStateChange`, que em certos browsers re-emite sessão ao retornar à aba.

---

### Pergunta 4 — Cenário: usuária volta de outra aba/janela

**Sequência provável do travamento:**

```
1. Usuária está em /onboarding (onboardingDone = false)
2. Sai para outra aba/app
3. Ao voltar, browser re-emite INITIAL_SESSION via onAuthStateChange
4. App.tsx linha 71: setLoading(true) ← tela preta/spinner
5. getOnboardingStatus() é chamado novamente — se Supabase demorar ou retornar erro de rede:
   a. Sucesso: loading some após ~1-3s → ok
   b. Falha ou demora: setOnboardingDone(true) é setado pelo catch (linha 83),
      mas o loading persiste até o finally — se o finally não executar (ex: abort de rede),
      o fallbackTimer já expirou e não vai disparar novamente.
6. Resultado: tela travada em loading indefinidamente.
```

> [!CAUTION]
> O `fallbackTimer` de 4s (linha 48) **não resolve este cenário** porque foi criado na montagem do componente e já foi limpo com `clearTimeout` no primeiro evento bem-sucedido. Re-triggers do `onAuthStateChange` não criam um novo timer.

---

### Pergunta 5 — "Cadastrar novos usuários" no menu

**Confirmado:** O item "Cadastrar Novos Usuários" no menu inferior do Shell é de fato o componente [`CadastroUsuario.tsx`](file:///Users/nanyarruda/Studio/src/screens/CadastroUsuario.tsx).

- **Arquivo:** [`src/components/layout/Shell.tsx`](file:///Users/nanyarruda/Studio/src/components/layout/Shell.tsx#L43)
- **Linha:** 43: `{ path: '/cadastro-usuario', labelKey: 'nav.cadastroUsuario', icon: UserPlus }`
- **Rota:** [`src/App.tsx`](file:///Users/nanyarruda/Studio/src/App.tsx#L162) linha 162: `<Route path="cadastro-usuario" element={<CadastroUsuario />} />`
- **O que é:** É uma tela de **waitlist/lista de espera interna** — um formulário que coleta nome, e-mail, telefone, nome artístico, área de atuação e mensagem, e salva numa tabela `usuarios_futuros` do Supabase. **Não é o fluxo de cadastro real da plataforma.** Existe para capturar interesse de outras artistas antes de abrir o acesso.

---

### Correções sugeridas (não aplicadas ainda)

1. **Reiniciar o `fallbackTimer` a cada re-trigger do `onAuthStateChange`** — em vez de criá-lo uma só vez na montagem.
2. **Não setar `loading = true` para eventos `INITIAL_SESSION` se a sessão já foi carregada antes** — adicionar uma flag `firstLoad` para ignorar re-triggers.
3. **Adicionar timeout específico para `getOnboardingStatus()`** com `Promise.race` contra um timer de 5s.

---

## 9. Fluxo de Cadastro Planejado (ainda não implementado)

> [!NOTE]
> Esta seção é apenas para alinhamento e referência futura. **Nada aqui está implementado hoje.**

O fluxo desejado de cadastro e primeiro acesso é o seguinte:

### Etapas do fluxo:

1. **Cadastro inicial** — A artista preenche: nome completo, e-mail e senha. Esse formulário já existe em `Login.tsx` (aba "Cadastrar").

2. **Confirmação por e-mail** — Após o cadastro, a artista recebe um link de confirmação no e-mail. O acesso à plataforma só é liberado após clicar nesse link. Hoje o Supabase já envia esse e-mail se a confirmação estiver habilitada no projeto — o fluxo de UI para tratar o usuário "pendente de confirmação" precisa ser implementado.

3. **Wizard de primeiro acesso (Onboarding)** — Após a confirmação de e-mail, na primeira vez que a artista acessa a plataforma, o wizard de onboarding é ativado automaticamente (baseado em `onboarding_completed = false`). Esse wizard **só aparece uma vez**: após ser concluído, o campo `onboarding_completed` é setado como `true` e o wizard não aparece em nenhum acesso subsequente. O wizard atual tem 5 etapas e será estendido com o mini-wizard pós-onboarding.

4. **Autocomplete encadeado nos campos do wizard** — Alguns campos do wizard usam autocomplete que sugere opções conforme a artista digita (ex: cidade, técnica artística, material). Alguns campos têm encadeamento — a resposta de um campo influencia as opções disponíveis no próximo (ex: selecionar "Escultura" como técnica pode pré-sugerir materiais como "argila", "bronze", "resina"). Isso ainda não está implementado.

5. **Acesso à plataforma completa** — Somente após concluir o wizard (`onboarding_completed = true`), a artista tem acesso ao Dashboard, Acervo, Upload, etc. Isso já está implementado em `App.tsx` (linha 119: `if (onboardingDone === false)` força `/onboarding`).

### Estado atual vs. planejado:

| Etapa | Estado atual |
|---|---|
| Cadastro (nome, e-mail, senha) | ✅ Implementado em `Login.tsx` |
| Confirmação por e-mail | ⚠️ Supabase envia o e-mail, mas a UI não trata o estado "aguardando confirmação" adequadamente |
| Wizard de primeiro acesso (5 etapas) | ✅ Implementado em `Onboarding.tsx` |
| Wizard não reaparecer após completado | ✅ Implementado via `onboarding_completed` em `artista` |
| Autocomplete encadeado nos campos | ❌ Não implementado |
| Mini-wizard pós-onboarding (4 perguntas) | ❌ Não implementado — próxima construção planejada |
