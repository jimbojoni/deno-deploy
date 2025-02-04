import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { importSupabaseData, clearDenoKv, getDatabaseSize, backupDenoKv, restoreDenoKv } from "./db_import_export.ts";

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
    if (url.pathname === "/db/restore") {
      const formData = await req.formData();
      const file = formData.get("backup");
      if (file && file instanceof File) {
        await Deno.writeFile("backup.json", new Uint8Array(await file.arrayBuffer()));
        await restoreDenoKv("backup.json");
        return new Response("✅ Database Restored!", { status: 200 });
      }
      return new Response("❌ No file uploaded!", { status: 400 });
    }
  }

  if (req.method === "GET") {
    if (url.pathname === "/db/size") {
      const count = await getDatabaseSize();
      return new Response(`📊 Total records in Deno KV: ${count}`, { status: 200 });
    }
    if (url.pathname === "/db/backup") {
      await backupDenoKv("backup.json");
      const file = await Deno.readFile("backup.json");
      return new Response(file, {
        headers: {
          "Content-Disposition": "attachment; filename=backup.json",
          "Content-Type": "application/json",
        },
      });
    }
  }

  return new Response(html, { headers: { "Content-Type": "text/html" } });
});
