import { Hono } from "https://deno.land/x/hono/mod.ts";
import * as eta from "https://deno.land/x/eta@v2.0.0/mod.ts";
import {
  importSupabaseData,
  clearDenoKv,
  getDatabaseSize,
} from "./db_import_export.ts";
import {
  backupDenoKvToDrive,
  listAllFiles,
  deleteFile,
  deleteAllFilesAndFolders,
} from "./google_utils.ts";

// Set up Eta (templating engine)
eta.configure({ views: "./html" });

const app = new Hono();

// Route for the main page (index.html)
app.get("/", async (c) => {
  const html = await eta.renderFile("index.html", {});
  return c.html(html);
});

// Route for the DB page (db.html)
app.get("/db", async (c) => {
  const html = await eta.renderFile("db.html", {});
  return c.html(html);
});

// Route to import data from Supabase
app.post("/db/import", async (c) => {
  await importSupabaseData();
  return c.text("✅ Import Complete!");
});

// Route to clear Deno KV
app.post("/db/clear", async (c) => {
  await clearDenoKv();
  return c.text("✅ Database Cleared!");
});

// Route to get the database size
app.get("/db/size", async (c) => {
  const count = await getDatabaseSize();
  return c.text(`📊 Total records in Deno KV: ${count}`);
});

// Route to back up data to Google Drive
app.get("/db/backup-drive", async (c) => {
  const { fileId, folderId } = await backupDenoKvToDrive();

  if (fileId) {
    const fileLink = `https://drive.google.com/file/d/${fileId}/view`;
    const folderLink = `https://drive.google.com/drive/folders/${folderId}`;
    return c.html(
      `✅ Backup uploaded! <a href="${fileLink}" target="_blank">View File</a>, <a href="${folderLink}" target="_blank">Open backup folder</a>`
    );
  }
  return c.text("❌ Backup failed!", 500);
});

// Routes under /drive/
app.get("/drive", async (c) => {
  const html = await eta.renderFile("drive.html", {});
  return c.html(html);
});

app.get("/style/drive.css", async (c) => {
  const css = await Deno.readTextFile("./html/style/drive.css");
  return c.text(css, 200, { "Content-Type": "text/css" });
});

app.get("/drive/list", async (c) => {
  const files = await listAllFiles();
  return c.json(files);
});

app.delete("/drive/delete/:id", async (c) => {
  const id = c.req.param("id");
  const success = await deleteFile(id);
  return success ? c.text("File deleted successfully") : c.text("Failed to delete file", 500);
});

app.delete("/drive/deleteAll", async (c) => {
  await deleteAllFilesAndFolders();
  return c.text("All files and folders deleted successfully");
});

// Start the server
console.log("Server running on http://localhost:8000");
Deno.serve(app.fetch);