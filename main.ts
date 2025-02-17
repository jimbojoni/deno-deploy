import { Hono } from "https://deno.land/x/hono@v4.3.11/mod.ts";
import * as eta from "https://deno.land/x/eta@v2.0.0/mod.ts";
import { encode } from "https://deno.land/std@0.224.0/encoding/base64url.ts";
import * as db from "./db_import_export.ts";
//import { importSupabaseData, clearDenoKv, getDatabaseSize, } from "./db_import_export.ts";
import * as google from "./google_utils.ts";
//import { backupDenoKvToDrive, listAllFiles, deleteFile, deleteAllFilesAndFolders, } from "./google_utils.ts";
import * as auth from "./auth.ts";
//import { authMiddleware, authLogin, role , logout } from "./auth.ts";
import * as article from "./article.ts";
//import { displayArticle, postArticle, displayAllArticles, renderEditArticle } from "./article.ts";
import { serveStatic } from "https://deno.land/x/hono@v4.3.11/middleware.ts";

// Trigger new Deployment

// Set up Eta (templating engine)
eta.configure({ views: "./html" });
const app = new Hono();

// Login Route (Generates JWT Token)
app.post("/login", auth.authLogin);
app.get("/login", auth.authMiddleware, async (c) => {
	return c.redirect("/admin");
});

app.post("/logout", auth.logout);

// Public Routes
/*app.get("/login", async (c) => {
  const html = await eta.renderFile("login.html", {});
  return c.html(html);
});*/

app.get("/", article.displayAllArticles);

// Apply authentication to all /db and /drive routes
app.use("/admin/*", auth.authMiddleware, auth.role("admin"));

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
  await db.importSupabaseData();
  return c.text("✅ Import Complete!");
});

app.post("/admin/db/clear", async (c) => {
  await db.clearDenoKv();
  return c.text("✅ Database Cleared!");
});

app.get("/admin/db/size", async (c) => {
  const count = await db.getDatabaseSize();
  return c.text(`📊 Total records in Deno KV: ${count}`);
});

app.get("/admin/db/backup-drive", async (c) => {
  const { fileId, folderId } = await google.backupDenoKvToDrive();
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
  const files = await google.listAllFiles();
  return c.json(files);
});

app.delete("/admin/drive/delete/:id", async (c) => {
  const id = c.req.param("id");
  const success = await google.deleteFile(id);
  return success ? c.text("File deleted successfully") : c.text("Failed to delete file", 500);
});

app.delete("/admin/drive/deleteAll", async (c) => {
  await google.deleteAllFilesAndFolders();
  return c.text("All files and folders deleted successfully");
});

// Article Section
app.get("/manage-article", async (c) => {
  const html = await eta.renderFile("manage-article.html", {});
  return c.html(html);
});
app.get("/article/:article_id", article.displayArticle);
app.get("/edit-article", article.renderEditArticle);
app.post("/edit-article", article.postArticle);

// Serve JS files
app.use("/js/*", serveStatic({
  root: "./html",  // Changed from "./html/js"
  pathRewrite: { '/js/': '/' }, // Rewrites /js/ to root of html/js
}));

// Serve CSS files
app.use("/style/*", serveStatic({
  root: "./html",  // Changed from "./html/style"
  pathRewrite: { '/style/': '/' },
  mimes: {
    css: "text/css",
    js: "text/javascript",
  }
}));

export default app;
//Deno.serve(app.fetch);