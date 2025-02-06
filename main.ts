import { Application, Router } from "https://deno.land/x/oak/mod.ts";
import * as eta from "https://deno.land/x/eta@v2.0.0/mod.ts";
import { importSupabaseData, clearDenoKv, getDatabaseSize } from "./db_import_export.ts";
import { backupDenoKvToDrive } from "./google_utils.ts";

// Set up Eta (templating engine)
eta.configure({ views: "./html" });

// Create a new Oak application
const app = new Application();
const router = new Router();

// Route for the main page (index.html)
router.get("/", async (context) => {
  const html = await eta.renderFile("index.eta", {});
  context.response.body = html;
  context.response.type = "text/html";
});

// Route for the DB page (db.html)
router.get("/db", async (context) => {
  const html = await eta.renderAsync("db.html", {});
  context.response.body = html;
  context.response.type = "text/html";
});

// Route to import data from Supabase
router.post("/db/import", async (context) => {
  await importSupabaseData();
  context.response.body = "✅ Import Complete!";
  context.response.status = 200;
});

// Route to clear Deno KV
router.post("/db/clear", async (context) => {
  await clearDenoKv();
  context.response.body = "✅ Database Cleared!";
  context.response.status = 200;
});

// Route to get the database size
router.get("/db/size", async (context) => {
  const count = await getDatabaseSize();
  context.response.body = `📊 Total records in Deno KV: ${count}`;
  context.response.status = 200;
});

// Route to back up data to Google Drive
router.get("/db/backup-drive", async (context) => {
  const { fileId, folderId } = await backupDenoKvToDrive();

  if (fileId) {
    const fileLink = `https://drive.google.com/file/d/${fileId}/view`;
    const folderLink = `https://drive.google.com/drive/folders/${folderId}`;
    context.response.body = `✅ Backup uploaded! <a href="${fileLink}" target="_blank">View File</a>, <a href="${folderLink}" target="_blank">Open backup folder</a>`;
    context.response.status = 200;
    context.response.type = "text/html";
  } else {
    context.response.body = "❌ Backup failed!";
    context.response.status = 500;
  }
});

// Add routes to the Oak application
app.use(router.routes());
app.use(router.allowedMethods());

// Start the server
console.log("Server running on http://localhost:8000");
await app.listen({ port: 8000 });