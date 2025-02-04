import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { importSupabaseData, clearDenoKv, getDatabaseSize, } from "./db_import_export.ts";
import { backupDenoKvToDrive, } from "./google_utils.ts";

// Read HTML once
const html = await Deno.readTextFile("./html/db.html");

serve(async (req) => {
  const url = new URL(req.url);

  if (req.method === "POST") {
    if (url.pathname === "/db/import") {
      await importSupabaseData();
      return new Response("✅ Import Complete!", { status: 200 });
    }
    if (url.pathname === "/db/clear") {
      await clearDenoKv();
      return new Response("✅ Database Cleared!", { status: 200 });
    }
  }

  if (req.method === "GET") {
    if (url.pathname === "/db/size") {
      const count = await getDatabaseSize();
      return new Response(`📊 Total records in Deno KV: ${count}`, { status: 200 });
    }
  }
	
	if (req.method === "GET" && url.pathname === "/db/backup-drive") {
		await backupDenoKvToDrive();
		return new Response("✅ Backup uploaded to Google Drive!", { status: 200 });
	}

  return new Response(html, { headers: { "Content-Type": "text/html" } });
});
