import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function test() {
  console.log("Testing storage upload...");
  const dummyFile = new Blob(['hello'], { type: 'text/plain' });
  const { error } = await supabase.storage.from('obras-images').upload('test/hello.txt', dummyFile, { upsert: true });
  console.log("Storage:", error || "Success");
}

test();
