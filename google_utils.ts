import { google } from "https://esm.sh/googleapis@122.0.0";

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

async function getOrCreateFolder(
  drive: any,
  folderName?: string,
  parentId?: string,
) {
  const defaultName = `Backup_${Date.now()}`;
  const actualName = folderName || defaultName;
  const skipCheck = !folderName; // Skip check only when name isn't provided

  try {
    if (!skipCheck) {
      // Build dynamic query based on parentId existence
      const queryParts = [
        `name='${actualName}'`,
        "mimeType='application/vnd.google-apps.folder'",
        "trashed=false",
      ];
      
      if (parentId) {
        queryParts.push(`'${parentId}' in parents`);
      }

      console.log(`🔍 Checking for existing folder: ${actualName} in ${parentId || "root"}`);
      const res = await drive.files.list({
        q: queryParts.join(" and "),
        fields: "files(id)",
      });

      if (res.data.files.length > 0) {
        console.log(`✅ Found existing folder: ${res.data.files[0].id}`);
        return res.data.files[0].id;
      }
    }

    // Folder creation parameters
    const requestBody: any = {
      name: actualName,
      mimeType: "application/vnd.google-apps.folder",
			permissions: [{
        type: 'user',
        role: 'writer',
        emailAddress: 'agung.listiy@gmail.com' // Set explicit access
      }],
    };

    if (parentId) {
      requestBody.parents = [parentId];
    }

    console.log(`📁 Creating folder: ${actualName} in ${parentId || "root"}`);
    const folder = await drive.files.create({
      requestBody,
      fields: "id",
    });

    console.log(`✅ Successfully created folder: ${folder.data.id}`);
    return folder.data.id;
  } catch (error) {
    console.error(`❌ Critical error: ${error.message}`);
    return null;
  }
}

export async function backupDenoKvToDrive() {
  try {
    //const kv = await Deno.openKv();
    const { drive } = await googleAuth();
    const folderId = await getOrCreateFolder(drive, "database-backups");

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
