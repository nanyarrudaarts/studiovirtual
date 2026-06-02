import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function test() {
  const coll = await supabase.from('collections').select('*').limit(1);
  console.log("Collections:", coll.data ? Object.keys(coll.data[0] || {}) : coll.error);
  
  const ser = await supabase.from('series').select('*').limit(1);
  console.log("Series:", ser.data ? Object.keys(ser.data[0] || {}) : ser.error);

  const art = await supabase.from('artworks').select('*').limit(1);
  console.log("Artworks:", art.data ? Object.keys(art.data[0] || {}) : art.error);
}
test();
