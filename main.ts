import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { importSupabaseData } from "./db_import_export.ts";

// Read index.html once (for better performance)
const html = await Deno.readTextFile("./html/db.html");

serve(async (req) => {
  const url = new URL(req.url);

  if (url.pathname === "/db" && req.method === "POST") {
    await importSupabaseData();
    return new Response("✅ Import Complete!", { status: 200 });
  }

  return new Response(html, {
    headers: { "Content-Type": "text/html" },
  });
});
