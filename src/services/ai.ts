export async function readURLWithJina(url: string): Promise<string> {
  try {
    const response = await fetch(`https://r.jina.ai/${encodeURIComponent(url)}`);
    if (!response.ok) throw new Error('Não foi possível acessar esta página.');
    return await response.text();
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Erro de conexão. Verifique sua internet. (${message})`, { cause: error });
  }
}

export async function searchWithJina(query: string): Promise<string> {
  console.group(`[🔍 searchWithJina] Query: "${query.substring(0, 80)}..."`);
  try {
    const jinaKey =
      (import.meta.env as Record<string, string>)['VITE_JINA_API_KEY'] ||
      localStorage.getItem('jina_api_key') ||
      '';

    const headers: Record<string, string> = {
      'Accept': 'text/plain',
    };
    if (jinaKey && jinaKey.trim() !== '' && !jinaKey.includes('YOUR_')) {
      headers['Authorization'] = `Bearer ${jinaKey}`;
      console.log('[Jina] Usando API Key autenticada.');
    } else {
      console.warn('[Jina] Sem API Key — tentando sem autenticação primeiro.');
    }

    const primaryUrl = `https://s.jina.ai/${encodeURIComponent(query)}`;
    console.log('[Jina] URL de Busca (primária):', primaryUrl);

    const response = await fetch(primaryUrl, { headers });
    console.log(`[Jina] Status da resposta primária: ${response.status}`);

    if (response.ok) {
      const text = await response.text();
      console.log(`[Jina] ✅ Sucesso! ${text.length} caracteres recebidos.`);
      console.log('[Jina] Conteúdo Bruto da Web (primeiros 500 caracteres):', text.substring(0, 500));
      console.groupEnd();
      return text;
    } else {
      console.warn(`[Jina Search ${response.status}] Usando fallback DuckDuckGo...`);
    }
  } catch (error: unknown) {
    console.warn(`[Jina Search Primary Error]:`, error);
  }

  // Fallback gratuito via Jina Reader + DuckDuckGo
  try {
    const fallbackUrl = `https://r.jina.ai/https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    console.log('[Jina Fallback] URL de Busca (fallback DuckDuckGo):', fallbackUrl);

    const response = await fetch(fallbackUrl);
    console.log(`[Jina Fallback] Status: ${response.status}`);

    if (response.ok) {
      const text = await response.text();
      console.log(`[Jina Fallback] ✅ Sucesso! ${text.length} caracteres recebidos.`);
      console.log('[Jina Fallback] Conteúdo Bruto da Web (primeiros 500 caracteres):', text.substring(0, 500));
      console.groupEnd();
      return text;
    } else {
      console.error(`[Jina Fallback] ❌ Falhou com status ${response.status}`);
    }
  } catch (fallbackErr) {
    console.error(`[Jina Fallback Error]:`, fallbackErr);
  }

  console.warn('[searchWithJina] ⚠️ Nenhuma fonte retornou conteúdo. Retornando string vazia.');
  console.groupEnd();
  return '';
}

export function cleanTextForAI(text: string): string {
  if (!text) return '';
  return text
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/Page \d+ of \d+/gi, '')
    .replace(/Página \d+ de \d+/gi, '')
    .trim();
}

export function chunkTextForAI(text: string, maxChars: number = 10000): string {
  const cleaned = cleanTextForAI(text);
  if (cleaned.length <= maxChars) return cleaned;

  const head = cleaned.substring(0, Math.floor(maxChars * 0.7));
  const tail = cleaned.substring(cleaned.length - Math.floor(maxChars * 0.3));
  return `${head}\n\n[...conteúdo intermediário resumido para otimização de tokens...]\n\n${tail}`;
}

function getGroqKey(): string {
  const key =
    (import.meta.env as Record<string, string>)['VITE_GROQ_API_KEY'] ||
    localStorage.getItem('groq_api_key') ||
    '';
  if (!key) throw new Error('Chave Groq não encontrada. Configure VITE_GROQ_API_KEY no .env');
  return key;
}

async function groqRequest(
  messages: { role: string; content: string }[],
  apiKey?: string,
  maxRetries: number = 3
): Promise<string> {
  const key = apiKey || getGroqKey();

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          max_tokens: 4096,
          messages,
        }),
      });

      if (response.status === 429) {
        console.warn(`[Groq Rate Limit 429] Tentativa ${attempt} de ${maxRetries}. Aguardando 3 segundos...`);
        if (attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, 3000 * attempt));
          continue;
        }
      }

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        const errMsg = err?.error?.message || response.statusText;
        if (
          errMsg.toLowerCase().includes('rate') ||
          errMsg.toLowerCase().includes('tpm') ||
          errMsg.toLowerCase().includes('quota')
        ) {
          console.warn(`[Groq Rate Limit Error] ${errMsg}. Tentativa ${attempt} de ${maxRetries}. Aguardando 3s...`);
          if (attempt < maxRetries) {
            await new Promise((resolve) => setTimeout(resolve, 3000 * attempt));
            continue;
          }
        }
        throw new Error(`Erro no Groq (${response.status}): ${errMsg}`);
      }

      const data = await response.json();
      return data.choices?.[0]?.message?.content || '';
    } catch (error: unknown) {
      if (attempt === maxRetries) throw error;
      console.warn(`[Groq Request Attempt ${attempt}/${maxRetries} Failed]:`, error);
      await new Promise((resolve) => setTimeout(resolve, 3000 * attempt));
    }
  }

  throw new Error('Erro no Groq: Limite de requisições excedido. Tente novamente em instantes.');
}

const CONSOLIDATION_EDITOR_SYSTEM_PROMPT =
  'Você atua como um Editor de Consolidação de dados artísticos para o sistema StudioVirtual. Sua missão principal é consolidar fragmentos de múltiplos documentos (currículos, portfólios, sites), eliminando rigorosamente qualquer duplicata e organizando a trajetória cronologicamente.\n\n' +
  'REGRAS INEGOCIÁVEIS DE CONSOLIDAÇÃO:\n' +
  '1. NUNCA crie dois itens na mesma lista se se referirem à mesma entidade (mesmo título/evento/instituição), mesmo que a descrição varie levemente.\n' +
  '2. NUNCA crie dois itens com o mesmo Título e Ano na mesma lista.\n' +
  '3. MESCLE todas as informações disponíveis: se um documento possui o local/editora e outro possui o ano/curador, crie UM ÚNICO item consolidado contendo todos os dados.\n' +
  '4. Ordene os itens de trajetória cronologicamente do mais recente para o mais antigo.';

export async function callAI(prompt: string, systemPrompt?: string): Promise<string> {
  const messages: { role: string; content: string }[] = [];
  const sys = systemPrompt || CONSOLIDATION_EDITOR_SYSTEM_PROMPT;
  messages.push({ role: 'system', content: sys });
  messages.push({ role: 'user', content: prompt });
  return groqRequest(messages);
}

export async function callAIChat(
  messages: { role: string; content: string }[],
  apiKeyOverride?: string
): Promise<string> {
  return groqRequest(messages, apiKeyOverride);
}
