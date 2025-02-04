import { google } from "https://esm.sh/googleapis@122.0.0";

export async function googleAuth() {
  const credentialsBase64 = Deno.env.get("GOOGLE_API_CREDENTIALS");

  if (!credentialsBase64) {
    console.error("Error: GOOGLE_API_CREDENTIALS environment variable is not set.");
    Deno.exit(1);
  }

  // Decode Base64 credentials
  const credentialsJson = JSON.parse(atob(credentialsBase64));
  console.log("✅ GOOGLE_API_CREDENTIALS loaded successfully.");

  // Authenticate with Google
  const auth = new google.auth.GoogleAuth({
    credentials: credentialsJson,
    scopes: [
      "https://www.googleapis.com/auth/drive.file",      // Read & write access to Drive files
      "https://www.googleapis.com/auth/spreadsheets",   // Full access to Google Sheets
      "https://www.googleapis.com/auth/documents",      // Full access to Google Docs
    ],
  });

  const authClient = await auth.getClient();

  // Create API clients
  const drive = google.drive({ version: "v3", auth: authClient });
  const sheets = google.sheets({ version: "v4", auth: authClient });
  const docs = google.docs({ version: "v1", auth: authClient });

  return { drive, sheets, docs };
}

async function getOrCreateBackupFolder(drive: any) {
  const folderPath = ["deno-deploy", "backups"];
  let parentId = "root"; // Start from My Drive

  for (const folderName of folderPath) {
    // Check if the folder exists in the current parent
    const res = await drive.files.list({
      q: `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false and '${parentId}' in parents`,
      fields: "files(id)",
    });

    if (res.data.files.length > 0) {
      parentId = res.data.files[0].id; // Use existing folder
    } else {
      // Create the folder if it doesn't exist
      const folder = await drive.files.create({
        requestBody: {
          name: folderName,
          mimeType: "application/vnd.google-apps.folder",
          parents: [parentId], // Set parent folder
        },
        fields: "id",
      });
      parentId = folder.data.id;
    }
  }

  return parentId;
}

export async function backupDenoKvToDrive() {
  const kv = await Deno.openKv();
  const { drive } = await googleAuth();
  const folderId = await getOrCreateBackupFolder(drive);

  // Store backup data in memory
  let backupData = "[\n";
  let first = true;

  for await (const entry of kv.list({ prefix: ["penduduk"] })) {
    const data = JSON.stringify({ key: entry.key, value: entry.value });
    backupData += first ? data : ",\n" + data;
    first = false;
  }
  backupData += "\n]";

  // Convert string to readable stream
  const backupStream = new Blob([backupData], { type: "application/json" }).stream();

  // Upload backup directly to Google Drive
  await drive.files.create({
    requestBody: {
      name: `backup-${new Date().toISOString()}.json`,
      mimeType: "application/json",
      parents: [folderId],
    },
    media: {
      mimeType: "application/json",
      body: backupStream,
    },
  });

  console.log("✅ Backup uploaded to Google Drive in 'My Drive/deno-deploy/backups/'");
}