import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://uynvrddufeyyikzcmxfw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5bnZyZGR1ZmV5eWlremNteGZ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg5NDExNjIsImV4cCI6MjA5NDUxNzE2Mn0.IjgHQyaMosVVo1O4NY3hmWP8SucJHyQaSodkh5yJIcQ';

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log('Querying table artista...');
  const { data, error } = await supabase
    .from('artista')
    .select('*')
    .eq('id', 1)
    .maybeSingle();

  if (error) {
    console.error('Error querying artista:', error);
  } else {
    console.log('Success! Data:', data);
  }
}

check();
