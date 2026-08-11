import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://uynvrddufeyyikzcmxfw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5bnZyZGR1ZmV5eWlremNteGZ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg5NDExNjIsImV4cCI6MjA5NDUxNzE2Mn0.IjgHQyaMosVVo1O4NY3hmWP8SucJHyQaSodkh5yJIcQ'
);

// Verifica constraints UNIQUE e PRIMARY KEY na tabela artista via information_schema
// (não usa pg_constraint direto, que exige acesso privilegiado)
const { data, error } = await supabase
  .from('information_schema.table_constraints')
  .select('constraint_name, constraint_type')
  .eq('table_schema', 'public')
  .eq('table_name', 'artista')
  .in('constraint_type', ['UNIQUE', 'PRIMARY KEY']);

if (error) {
  console.log('Erro na query de constraints:', error.message);
  console.log('Tentando abordagem alternativa...');

  // Fallback: tenta inserir uma linha duplicada e observa o erro
  // para inferir se há constraint UNIQUE
  const { data: row1 } = await supabase
    .from('artista')
    .select('id, user_id')
    .limit(1)
    .maybeSingle();

  console.log('Amostra de artista (para inspecionar estrutura):', row1);
} else {
  console.log('Constraints encontradas em public.artista:');
  console.log(JSON.stringify(data, null, 2));
}

// Tenta também via key_column_usage para ver quais colunas estão envolvidas
const { data: cols, error: colsErr } = await supabase
  .from('information_schema.key_column_usage')
  .select('constraint_name, column_name, ordinal_position')
  .eq('table_schema', 'public')
  .eq('table_name', 'artista');

if (!colsErr) {
  console.log('\nColunas nas constraints de artista:');
  console.log(JSON.stringify(cols, null, 2));
} else {
  console.log('Erro em key_column_usage:', colsErr.message);
}
