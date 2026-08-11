import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://uynvrddufeyyikzcmxfw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5bnZyZGR1ZmV5eWlremNteGZ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg5NDExNjIsImV4cCI6MjA5NDUxNzE2Mn0.IjgHQyaMosVVo1O4NY3hmWP8SucJHyQaSodkh5yJIcQ'
);

// Tenta consultar a tabela artista via API normal do supabase
const { data, error } = await supabase.from('artista').select('*').limit(1);

console.log('Query em artista result:', { data, error });
