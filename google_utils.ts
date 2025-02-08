import { google } from "https://esm.sh/googleapis@122.0.0";
const { drive } = await googleAuth();

export async function googleAuth() {
  const credentialsBase64 = Deno.env.get("GOOGLE_API_SIMOOL");

  if (!credentialsBase64) {
    console.error("❌ Error: GOOGLE_API environment variable is not set.");
    Deno.exit(1);
  }

  // Decode Base64 credentials
  const credentialsJson = JSON.parse(atob(credentialsBase64));
  console.log("✅ GOOGLE_API loaded successfully.");

  // Authenticate with Google
  const auth = new google.auth.GoogleAuth({
    credentials: credentialsJson,
    scopes: [
      "https://www.googleapis.com/auth/drive",      // Read & write access to Drive files
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

async function getOrCreateBackupFolder(drive: any, folderName: string) {
  const parentId = "1vV2F88iWUoEkG177npCrpLTbcFXhVnIk"; // Your fixed parent folder ID
  //const folderName = folderName;

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
    //const kv = await Deno.openKv();
    const folderId = await getOrCreateBackupFolder(drive, "database-backups");

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

    const options = {
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit',
			hour12: false,
			timeZone: 'Asia/Jakarta' // Use Jakarta time zone
		};

		const formattedDate = new Date().toLocaleString('id-ID', options).replace(/[^a-zA-Z0-9]/g, '-');
		const fileName = `backup-${formattedDate}.json`;

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

export async function listAllFiles() {
  try {
    const res = await drive.files.list({
      q: "'me' in owners and trashed = false", // Fetch all files owned by the service account
      fields: "files(id, name, mimeType)",
    });
    return res.data.files;
  } catch (error) {
    console.error("Error listing files:", error);
    return [];
  }
}

// Delete a specific file by ID
export async function deleteFile(fileId: string) {
  try {
    await drive.files.delete({ fileId });
    console.log(`✅ File with ID: ${fileId} deleted`);
    return true;
  } catch (error) {
    if (error.code === 403) {
      console.error(`❌ Insufficient permissions to delete file with ID: ${fileId}`);
    } else {
      console.error(`❌ Failed to delete file with ID: ${fileId}`, error);
    }
    return false;
  }
}

// Recursively delete all files and folders
export async function deleteAllFilesAndFolders() {
  const files = await listAllFiles();

  if (!files.length) {
    console.log("❌ No files found to delete.");
    return;
  }

  for (const file of files) {
    if (file.mimeType === "application/vnd.google-apps.folder") {
      // Recursively delete folder contents before deleting the folder itself
      await deleteFolder(drive, file.id);
    } else {
      // Delete file
      await deleteFile(file.id);
    }
  }
}

// Recursively delete a folder and its contents
async function deleteFolder(drive: any, folderId: string) {
  try {
    const res = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`, // List files inside the folder
      fields: "files(id, mimeType)",
    });

    const files = res.data.files;

    for (const file of files) {
      if (file.mimeType === "application/vnd.google-apps.folder") {
        // Recursively delete subfolders
        await deleteFolder(drive, file.id);
      } else {
        // Delete file
        await deleteFile(file.id);
      }
    }

    // After deleting contents, delete the folder itself
    await deleteFile(folderId);
    console.log(`✅ Folder with ID: ${folderId} deleted`);
  } catch (error) {
    console.error(`❌ Error deleting folder with ID: ${folderId}`, error);
  }
}