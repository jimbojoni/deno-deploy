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

async function getOrCreateFolder(drive: any, folderName: string) {
  try {
    console.log(`🔍 Checking for folder: ${folderName} in My Drive`);

    // Search for the folder inside "My Drive"
    const res = await drive.files.list({
      q: `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false and 'root' in parents`,
      fields: "files(id)",
    });

    if (res.data.files.length > 0) {
      console.log(`✅ Parent folder exists: ${folderName} (ID: ${res.data.files[0].id})`);
      return res.data.files[0].id;
    }

    // Create the "deno-deploy" folder inside My Drive (root)
    console.log(`📁 Creating folder: ${folderName} in My Drive`);
    const folder = await drive.files.create({
      requestBody: {
        name: folderName,
        mimeType: "application/vnd.google-apps.folder",
        parents: ["root"], // "root" is My Drive
      },
      fields: "id",
    });

    console.log(`✅ Parent folder created: ${folderName} (ID: ${folder.data.id})`);
    return folder.data.id;
  } catch (error) {
    console.error(`❌ Error finding/creating parent folder: ${error}`);
    return null;
  }
}

async function getOrCreateBackupFolder(drive: any) {
  const parentId = await getOrCreateFolder(drive, "deno-deploy");
  //const parentId = "17i6iD2eWSLatHgNwmMOaKt6gWkqqFraa"; // Your fixed parent folder ID
  const folderName = "db-backups";

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
      return null; // Return null on failure
    }

    console.log("📦 Preparing backup...");

    let backupData = "[\n";
    let first = true;

    /*for await (const entry of kv.list({ prefix: ["penduduk"] })) {
      const data = JSON.stringify({ key: entry.key, value: entry.value });
      backupData += first ? data : ",\n" + data;
      first = false;
    }
    backupData += "\n]";*/

    const fileName = `backup-${new Date().toISOString()}.json`;

    const uploadResponse = await drive.files.create({
      requestBody: {
        name: fileName,
        mimeType: "application/json",
        parents: [folderId],
      },
      media: {
        mimeType: "application/json",
        body: backupData,
      },
    });

    if (uploadResponse.data.id) {
      const fileId = uploadResponse.data.id;
      console.log(`✅ Backup uploaded successfully! File ID: ${fileId}`);
      return {fileId: fileId, folderId: folderId}; // Return the file ID
    } else {
      console.error("❌ Error: Backup upload failed.");
      return null; // Return null if upload failed
    }
  } catch (error) {
    console.error("❌ Backup process failed:", error);
    return null; // Return null on error
  }
}
