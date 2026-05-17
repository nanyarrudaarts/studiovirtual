const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

export async function readURLWithJina(url: string): Promise<string> {
  const response = await fetch(`https://r.jina.ai/${url}`);
  if (!response.ok) throw new Error('Falha ao ler URL com Jina AI');
  return await response.text();
}

export async function readPDFWithGemini(file: File, prompt: string): Promise<string> {
  const base64 = await fileToBase64(file);
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [
          {
            inlineData: {
              mimeType: "application/pdf",
              data: base64
            }
          },
          {
            text: prompt
          }
        ]
      }]
    })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Erro no Gemini: ${error.error?.message || response.statusText}`);
  }
  
  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = error => reject(error);
  });
}

export async function callAI(prompt: string, provider: 'gemini' | 'openai' | 'anthropic' = 'gemini'): Promise<string> {
  if (provider === 'gemini') {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });
    if (!response.ok) throw new Error(`Erro no Gemini: ${response.statusText}`);
    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }
  
  if (provider === 'openai') {
    const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }]
      })
    });
    if (!response.ok) throw new Error(`Erro no OpenAI: ${response.statusText}`);
    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  }
  
  throw new Error(`Provedor ${provider} não implementado`);
}
