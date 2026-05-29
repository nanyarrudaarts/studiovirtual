async function fetchSchema() {
  const res = await fetch(`https://uynvrddufeyyikzcmxfw.supabase.co/rest/v1/?apikey=${process.env.VITE_SUPABASE_ANON_KEY}`);
  const json = await res.json();
  const tables = ['collections', 'series', 'artworks'];
  for (const table of tables) {
    console.log(`\nTable ${table} schema:`);
    console.log(json.definitions[table]?.properties);
  }
}

fetchSchema();
