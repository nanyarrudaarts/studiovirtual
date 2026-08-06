import { createClient } from '@supabase/supabase-js';

const supabase = createClient('https://uynvrddufeyyikzcmxfw.supabase.co', 'sb_publishable_QHaUWXZPaorwZGU1IsqaRA_IpQwOjny');

async function test() {
  console.log("Testing createCollection...");
  const coll = await supabase.from('collections').insert({
    collection_name: 'Test Collection',
    visibility_status: 'private',
    total_items: 0
  }).select();
  console.log("Collection:", coll.error || "Success");

  console.log("Testing createSerie...");
  const ser = await supabase.from('series').insert({
    series_title: 'Test Serie',
    display_order: 0,
    cor: '#6B5CE7'
  }).select();
  console.log("Serie:", ser.error || "Success");

  console.log("Testing saveArtwork...");
  const art = await supabase.from('artworks').insert({
    artwork_title: 'Test Artwork',
    dimensions_unit: 'cm',
    classification: 'singular',
    sale_status: 'available',
    certificate_of_authenticity: false,
    exposed: false,
    sustainable_materials: false,
    visibility_status: 'private',
    display_order: 0,
    copyright_holder: 'Nany Arruda'
  }).select();
  console.log("Artwork:", art.error || "Success");
}

test();
