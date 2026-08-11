import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://uynvrddufeyyikzcmxfw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5bnZyZGR1ZmV5eWlremNteGZ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg5NDExNjIsImV4cCI6MjA5NDUxNzE2Mn0.IjgHQyaMosVVo1O4NY3hmWP8SucJHyQaSodkh5yJIcQ'
);

// Tenta verificar se o trigger/função afetou o fluxo ou se é consultável
const { data, error } = await supabase.rpc('handle_new_user');
console.log('Test rpc handle_new_user:', { data, error });
