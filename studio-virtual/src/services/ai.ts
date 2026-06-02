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

export async function callAI(
  arg1: string,
  arg2?: string,
  arg3?: string
): Promise<string> {
  let apiKey: string;
  let prompt: string;

  if (arg3 !== undefined) {
    apiKey = arg2 || '';
    prompt = arg3;
  } else {
    prompt = arg1;
    apiKey = localStorage.getItem('groq_api_key') || '';
  }

  if (!apiKey) {
    const envKey = (import.meta.env as Record<string, string>)['VITE_GROQ_API_KEY'] || '';
    apiKey = envKey || '';
  }

  if (!apiKey) {
    throw new Error('Configure sua chave Groq em Configurações');
  }

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }]
    })
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(`Erro no Groq: ${err?.error?.message || response.statusText}`);
  }

  const resData = await response.json();
  return resData.choices?.[0]?.message?.content || '';
}

export async function callAIChat(
  messages: { role: string, content: string }[],
  apiKeyOverride?: string
): Promise<string> {
  let apiKey = apiKeyOverride || localStorage.getItem('groq_api_key') || '';

  if (!apiKey) {
    const envKey = (import.meta.env as Record<string, string>)['VITE_GROQ_API_KEY'] || '';
    apiKey = envKey || '';
  }

  if (!apiKey) {
    throw new Error('Configure sua chave Groq em Configurações');
  }

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: messages
    })
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(`Erro no Groq: ${err?.error?.message || response.statusText}`);
  }

  const resData = await response.json();
  return resData.choices?.[0]?.message?.content || '';
}
