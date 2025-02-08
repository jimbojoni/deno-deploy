import { Hono } from "https://deno.land/x/hono/mod.ts";
import * as eta from "https://deno.land/x/eta@v2.0.0/mod.ts";
import { encode } from "https://deno.land/std@0.224.0/encoding/base64url.ts";
import { importSupabaseData, clearDenoKv, getDatabaseSize, } from "./db_import_export.ts";
import { backupDenoKvToDrive, listAllFiles, deleteFile, deleteAllFilesAndFolders, } from "./google_utils.ts";
import { authMiddleware, authLogin, } from "./auth.ts";
import { displayArticle, postArticle, displayAllArticles } from "./article.ts";
import { serveStatic } from "https://deno.land/x/hono/middleware.ts";

// Trigger new Deployment

// Set up Eta (templating engine)
eta.configure({ views: "./html" });
const app = new Hono();

// Login Route (Generates JWT Token)
app.post("/login", authLogin);

app.post("/logout", (c) => {
	// Clear the JWT cookie by setting it to expire immediately
	c.header("Set-Cookie", `jwt=; HttpOnly; Secure; SameSite=Strict; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT`);
	return c.json({ message: "Logged out successfully" });
});

// Public Routes
app.get("/login", async (c) => {
  const html = await eta.renderFile("login.html", {});
  return c.html(html);
});

app.get("/", displayAllArticles);

// Apply authentication to all /db and /drive routes
app.use("/admin/*", authMiddleware);

app.get("/admin", async (c) => {
  const html = await eta.renderFile("admin.html", {});
  return c.html(html);
});

// Protected Routes
app.get("/admin/db", async (c) => {
  const html = await eta.renderFile("db.html", {});
  return c.html(html);
});

app.post("/admin/db/import", async (c) => {
  await importSupabaseData();
  return c.text("✅ Import Complete!");
});

app.post("/admin/db/clear", async (c) => {
  await clearDenoKv();
  return c.text("✅ Database Cleared!");
});

app.get("/admin/db/size", async (c) => {
  const count = await getDatabaseSize();
  return c.text(`📊 Total records in Deno KV: ${count}`);
});

app.get("/admin/db/backup-drive", async (c) => {
  const { fileId, folderId } = await backupDenoKvToDrive();
  if (fileId) {
    const fileLink = `https://drive.google.com/file/d/${fileId}/view`;
    const folderLink = `https://drive.google.com/drive/folders/${folderId}`;
    return c.html(`✅ Backup uploaded! <a href="${fileLink}" target="_blank">View File</a>, <a href="${folderLink}" target="_blank">Open backup folder</a>`);
  }
  return c.text("❌ Backup failed!", 500);
});

app.get("/admin/drive", async (c) => {
  const html = await eta.renderFile("drive.html", {});
  return c.html(html);
});

app.get("/admin/drive/list", async (c) => {
  const files = await listAllFiles();
  return c.json(files);
});

app.delete("/admin/drive/delete/:id", async (c) => {
  const id = c.req.param("id");
  const success = await deleteFile(id);
  return success ? c.text("File deleted successfully") : c.text("Failed to delete file", 500);
});

app.delete("/admin/drive/deleteAll", async (c) => {
  await deleteAllFilesAndFolders();
  return c.text("All files and folders deleted successfully");
});

// Article Section
app.get("/article/:article_id", displayArticle);
// Serve the article creation form
app.get("/create-article", async (c) => {
  const html = await eta.renderFile("create-article.html");
  return c.html(html);
});
// Handle article submission
app.post("/create-article", postArticle);

// Style CSS & Script Js
// Serve static files from the 'public' folder
app.use("/js/*", serveStatic({ root: "./html/js" }));
app.use("/style/*", serveStatic({ root: "./html/style" }));

export default app;