import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { kv } from "https://deno.land/x/kv/mod.ts"; // Deno KV

// Supabase credentials from environment variables
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Function to fetch and import data from Supabase to Deno KV
export async function importSupabaseData() {
  const { data, error } = await supabase.from("your_table").select("*");

  if (error) {
    console.error("❌ Error fetching data from Supabase:", error.message);
    return;
  }

  for (const row of data) {
    await kv.set(["your_table", row.id], row);
  }

  console.log("✅ Data imported to Deno KV successfully!");
}
