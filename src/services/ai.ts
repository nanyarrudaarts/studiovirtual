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

export async function readPDFWithGemini(file: File, apiKey: string, prompt: string): Promise<string> {
  try {
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const res = reader.result as string;
        const b64 = res.split(',')[1];
        resolve(b64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                inlineData: {
                  mimeType: 'application/pdf',
                  data: base64
                }
              },
              { text: prompt }
            ]
          }
        ]
      })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err?.error?.message || response.statusText);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Erro ao ler o PDF. O arquivo pode estar protegido. (${message})`, { cause: error });
  }
}

export async function callAI(
  arg1: string,
  arg2?: string,
  arg3?: string,
  arg4?: string,
  arg5?: string
): Promise<string> {
  let provider: string;
  let apiKey: string;
  let prompt: string;
  const imageBase64 = arg4;
  const mediaType = arg5;

  if (arg3 !== undefined) {
    provider = arg1;
    apiKey = arg2 || '';
    prompt = arg3;
  } else {
    prompt = arg1;
    provider = arg2 || localStorage.getItem('ai_provider') || 'gemini';
    apiKey = localStorage.getItem(`${provider}_api_key`) || '';
  }

  if (!apiKey) {
    const envKey = (import.meta.env as Record<string, string>)[`VITE_${provider.toUpperCase()}_API_KEY`] || '';
    const fallbackKey = localStorage.getItem(`${provider}_api_key`) || 
                        localStorage.getItem('groq_api_key') ||
                        envKey;
    apiKey = fallbackKey || '';
  }

  if (!apiKey) {
    throw new Error(`Configure sua chave ${provider} em Configurações`);
  }

  if (provider === 'gemini') {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              ...(imageBase64 ? [{
                inlineData: {
                  mimeType: mediaType || 'image/jpeg',
                  data: imageBase64
                }
              }] : []),
              { text: prompt }
            ]
          }
        ]
      })
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(`Erro no Gemini: ${err?.error?.message || response.statusText}`);
    }
    const resData = await response.json();
    return resData.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }

  if (provider === 'openai') {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{
          role: 'user',
          content: imageBase64 ? [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: `data:${mediaType || 'image/jpeg'};base64,${imageBase64}` } }
          ] : prompt
        }]
      })
    });
    if (!response.ok) throw new Error(`Erro no OpenAI: ${response.statusText}`);
    const resData = await response.json();
    return resData.choices?.[0]?.message?.content || '';
  }

  if (provider === 'anthropic') {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'dangerously-allow-browser': 'true'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4096,
        messages: [{
          role: 'user',
          content: imageBase64 ? [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType || 'image/jpeg',
                data: imageBase64
              }
            },
            { type: 'text', text: prompt }
          ] : prompt
        }]
      })
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(`Erro no Anthropic: ${err?.error?.message || response.statusText}`);
    }
    const resData = await response.json();
    return resData.content?.[0]?.text || '';
  }

  if (provider === 'groq') {
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

  throw new Error(`Provedor ${provider} não suportado`);
}
