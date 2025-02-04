import { google } from "https://esm.sh/googleapis@122.0.0";

export async function googleAuth(){
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
		"https://www.googleapis.com/auth/documents.readonly", // Google Docs API
		"https://www.googleapis.com/auth/drive.metadata.readonly", // Google Drive API
		"https://www.googleapis.com/auth/spreadsheets.readonly", // Google Sheets API
	],
	});
	return auth;
}

async function getOrCreateBackupFolder(drive: any) {
  const folderName = "denokv-backup";

  // Check if the folder already exists
  const res = await drive.files.list({
    q: `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: "files(id)",
  });

  if (res.data.files.length > 0) {
    return res.data.files[0].id; // Return existing folder ID
  }

  // Create the folder if it doesn't exist
  const folder = await drive.files.create({
    resource: {
      name: folderName,
      mimeType: "application/vnd.google-apps.folder",
    },
    fields: "id",
  });

  return folder.data.id;
}

export async function backupDenoKvToDrive() {
  const kv = await Deno.openKv();
  const drive = await googleAuth();
  const folderId = await getOrCreateBackupFolder(drive);
  const backupFilePath = "backup.json";

  // Create local backup file
  const backupFile = await Deno.open(backupFilePath, { write: true, create: true, truncate: true });
  const encoder = new TextEncoder();

  let first = true;
  await backupFile.write(encoder.encode("[\n"));

  for await (const entry of kv.list({ prefix: ["penduduk"] })) {
    const data = JSON.stringify({ key: entry.key, value: entry.value });
    await backupFile.write(encoder.encode(first ? data : ",\n" + data));
    first = false;
  }

  await backupFile.write(encoder.encode("\n]"));
  backupFile.close();

  // Read backup file to upload
  const fileContent = await Deno.readFile(backupFilePath);

  // Upload to Google Drive
  await drive.files.create({
    requestBody: {
      name: `backup-${new Date().toISOString()}.json`,
      mimeType: "application/json",
      parents: [folderId],
    },
    media: {
      mimeType: "application/json",
      body: fileContent,
    },
  });

  console.log("✅ Backup uploaded to Google Drive");
}