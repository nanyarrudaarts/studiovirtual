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
