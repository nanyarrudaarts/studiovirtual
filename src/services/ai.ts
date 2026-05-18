export async function readURLWithJina(url: string): Promise<string> {
  const response = await fetch(`https://r.jina.ai/${url}`);
  if (!response.ok) throw new Error('Falha ao ler URL com Jina AI');
  return await response.text();
export async function callAI(prompt: string, provider: 'groq' | 'gemini' | 'openai' | 'anthropic' = 'groq'): Promise<string> {
  if (provider === 'gemini' || provider === 'groq') {
    const GROQ_API_KEY = localStorage.getItem('groq_api_key') || import.meta.env.VITE_GROQ_API_KEY;
    if (!GROQ_API_KEY) throw new Error('Chave API Groq não encontrada. Configure nas Configurações.');

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }]
      })
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Erro no Groq: ${errorData.error?.message || response.statusText}`);
    }
    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
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
