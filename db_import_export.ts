import { google } from "https://esm.sh/googleapis@122.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export async function clearDenoKv() {
  console.log("🗑 Clearing existing Deno KV data...");
  const kv = await Deno.openKv();
  const batchSize = 1000; // Process 1000 deletions at a time
  let count = 0;
  let batch = kv.atomic();

  for await (const entry of kv.list({ prefix: ["penduduk"] })) {
    batch.delete(entry.key);
    count++;

    // Commit batch when reaching batchSize
    if (count % batchSize === 0) {
      await batch.commit();
      console.log(`✅ Deleted ${count} records so far...`);
      batch = kv.atomic(); // Reset batch
    }
  }

  // Commit any remaining deletions
  if (count % batchSize !== 0) {
    await batch.commit();
  }

  console.log(`✅ Deno KV cleared. Deleted ${count} records.`);
}

export async function getDatabaseSize() {
  const kv = await Deno.openKv();
  let count = 0;

  // Iterate directly and count without storing in an array
  for await (const _entry of kv.list({ prefix: ["penduduk"] })) {
    count++;
  }

  console.log(`📊 Total records in Deno KV: ${count}`);
  return count;
}

export async function importSupabaseData() {
  const kv = await Deno.openKv();
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  console.log("🚀 Fetching data from Supabase...");
  let start = 0;
  const pageSize = 1000;

  while (true) {
    const { data, error } = await supabase
      .from("penduduk")
      .select("*")
      .range(start, start + pageSize - 1);

    if (error) {
      console.error("❌ Error fetching data from Supabase:", error.message);
      return;
    }

    if (!data.length) break;

    console.log(`✅ Processing ${data.length} records (Start: ${start})...`);

    // Process in batches of 1000 to avoid mutation limit
    for (let i = 0; i < data.length; i += 1000) {
      const batch = kv.atomic();
      const chunk = data.slice(i, i + 1000);

      for (const row of chunk) {
        batch.set(["penduduk", row.nik], JSON.stringify(row));
      }

      await batch.commit(); // Commit this batch
      console.log(`✅ Committed ${chunk.length} records.`);
    }

    start += pageSize;
  }

  console.log("✅ All data imported to Deno KV successfully!");
}

export async function backupDenoKv(filePath: string) {
  const kv = await Deno.openKv();
  const backupFile = await Deno.open(filePath, { write: true, create: true, truncate: true });
  const encoder = new TextEncoder();

  let first = true;
  await backupFile.write(encoder.encode("[\n"));

  for await (const entry of kv.list({ prefix: ["penduduk"] })) {
    const data = JSON.stringify({ key: entry.key, value: entry.value });
    await backupFile.write(encoder.encode(first ? data : ",\n" + data));
    first = false;
  }

  await backupFile.write(encoder.encode("\n]"));
  backupFile.close();
  console.log(`✅ Backup completed: ${filePath}`);
}

// Run backup if executed directly
if (import.meta.main) {
  await backupDenoKv("backup.json");
}

export async function restoreDenoKv(filePath: string) {
  const kv = await Deno.openKv();
  const data = JSON.parse(await Deno.readTextFile(filePath));
  const batchSize = 1000; // Deno KV mutation limit
  let batch = kv.atomic();
  let count = 0;

  for (const entry of data) {
    batch.set(entry.key, entry.value);
    count++;

    if (count % batchSize === 0) {
      await batch.commit();
      batch = kv.atomic();
      console.log(`✅ Restored ${count} records...`);
    }
  }

  if (count % batchSize !== 0) {
    await batch.commit();
  }

  console.log(`✅ Restore completed. Total records: ${count}`);
}

// Run restore if executed directly
if (import.meta.main) {
  await restoreDenoKv("backup.json");
}
