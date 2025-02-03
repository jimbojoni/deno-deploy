import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Initialize Deno KV
const kv = await Deno.openKv();

// Function to fetch and import data from Supabase to Deno KV
export async function importSupabaseData() {
  console.log("🚀 Fetching data from Supabase...");
  const { data, error } = await supabase.from("penduduk").select("*");

  if (error) {
    console.error("❌ Error fetching data from Supabase:", error.message);
    return;
  }

  console.log(`✅ Fetched ${data.length} records from Supabase.`);

  const batch = kv.atomic();
  for (const row of data) {
    batch.set(["penduduk", row.nik], JSON.stringify(row));
  }

  await batch.commit();
  console.log("✅ Data imported to Deno KV successfully!");
}
