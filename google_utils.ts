import { google } from "https://esm.sh/googleapis@122.0.0";
//import { Readable } from "node:stream"; // Use this if running in Node.js
//import { Readable } from "https://deno.land/std@0.224.0/node/stream.ts"; // Use this if running in Deno


export async function googleAuth() {
  const credentialsBase64 = Deno.env.get("GOOGLE_API_CREDENTIALS");

  if (!credentialsBase64) {
    console.error("❌ Error: GOOGLE_API_CREDENTIALS environment variable is not set.");
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
  const parentId = "17i6iD2eWSLatHgNwmMOaKt6gWkqqFraa"; // Your fixed parent folder ID
  const folderName = "backups";

  try {
    console.log(`🔍 Checking for folder: ${folderName} in parent: ${parentId}`);
    
    // Check if the folder exists
    const res = await drive.files.list({
      q: `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false and '${parentId}' in parents`,
      fields: "files(id)",
    });

    if (res.data.files.length > 0) {
      console.log(`✅ Folder already exists: ${folderName} (ID: ${res.data.files[0].id})`);
      return res.data.files[0].id;
    }

    // Create the "backups" folder inside the given parent ID
    console.log(`📁 Creating folder: ${folderName}`);
    const folder = await drive.files.create({
      requestBody: {
        name: folderName,
        mimeType: "application/vnd.google-apps.folder",
        parents: [parentId], // Set parent folder
      },
      fields: "id",
    });

    console.log(`✅ Folder created: ${folderName} (ID: ${folder.data.id})`);
    return folder.data.id;
  } catch (error) {
    console.error(`❌ Error creating folder: ${error}`);
    return null;
  }
}

export async function backupDenoKvToDrive() {
  try {
    const kv = await Deno.openKv();
    const { drive } = await googleAuth();
    const folderId = await getOrCreateBackupFolder(drive);

    if (!folderId) {
      console.error("❌ Error: Could not find or create backup folder.");
      return;
    }

    console.log("📦 Preparing backup...");

    // Fetch only one record from Deno KV
    let backupData = "";
    let found = false;

    for await (const entry of kv.list({ prefix: ["penduduk"] })) {
      const data = JSON.stringify({ key: entry.key, value: entry.value }, null, 2);
      console.log("📝 Record to backup:", data); // Log the record

      backupData = "[\n" + data + "\n]";
      found = true;
      break; // Stop after the first record
    }

    if (!found) {
      console.warn("⚠️ No records found in Deno KV. Skipping backup.");
      return;
    }

    console.log("📤 Creating Blob for upload...");

    // Convert the backup data into a Blob (works in Deno Deploy)
    const backupBlob = new Blob([backupData], { type: "application/json" });

    console.log("✅ Blob created, proceeding with upload...");

    // Upload backup directly to Google Drive
    const uploadResponse = await drive.files.create({
      requestBody: {
        name: `backup-${new Date().toISOString()}.json`,
        mimeType: "application/json",
        parents: [folderId],
      },
      media: {
        mimeType: "application/json",
        //body: backupBlob.stream(), // Use Blob stream
				body: backupData,
      },
    });

    if (uploadResponse.data.id) {
      console.log(`✅ Backup uploaded successfully! File ID: ${uploadResponse.data.id}`);
    } else {
      console.error("❌ Error: Backup upload failed.");
    }
  } catch (error) {
    console.error("❌ Backup process failed:", error);
  }
}