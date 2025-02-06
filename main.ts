import { Hono } from "https://deno.land/x/hono/mod.ts";
import * as eta from "https://deno.land/x/eta@v2.0.0/mod.ts";
import { sign, verify } from "https://deno.land/x/djwt/mod.ts";
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
const SECRET_KEY = Deno.env.get("SECRET_KEY");

// Authentication Middleware
const authMiddleware = async (c, next) => {
  const authHeader = c.req.header("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.text("⛔ Unauthorized", 401);
  }

  const token = authHeader.split(" ")[1];
  try {
    await verify(token, SECRET_KEY, "HS256");
    await next();
  } catch {
    return c.text("⛔ Invalid token", 401);
  }
};

// Login Route (Generates JWT Token)
app.post("/login", async (c) => {
  const body = await c.req.json();
  if (body.username === "admin" && body.password === "password") { // Replace with real authentication logic
    const token = await sign({ user: "admin" }, SECRET_KEY, "HS256");
    return c.json({ token });
  }
  return c.text("❌ Invalid credentials", 401);
});

// Public Routes
app.get("/", async (c) => {
  const html = await eta.renderFile("index.html", {});
  return c.html(html);
});

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

app.get("/style/drive.css", async (c) => {
  const css = await Deno.readTextFile("./html/style/drive.css");
  return c.text(css, 200, { "Content-Type": "text/css" });
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

// Start the server
console.log("Server running on http://localhost:8000");
Deno.serve(app.fetch);