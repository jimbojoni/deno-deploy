async function importData() {
	updateStatus("Importing...");
	fetch("/admin/db/import", { method: "POST" })
		.then(response => response.text())
		.then(result => updateStatus(result))
		.catch(error => updateStatus("❌ Import failed!"));
}

async function clearDatabase() {
	updateStatus("Clearing database...");
	fetch("/admin/db/clear", { method: "POST" })
		.then(response => response.text())
		.then(result => updateStatus(result))
		.catch(error => updateStatus("❌ Clear failed!"));
}

async function getDatabaseSize() {
	updateStatus("Getting database size...");
	fetch("/admin/db/size", { method: "GET" })
		.then(response => response.text())
		.then(result => updateStatus(result))
		.catch(error => updateStatus("❌ Failed to get database size!"));
}

async function backupToDrive() {
	updateStatus("Uploading backup...");
	fetch("/admin/db/backup-drive", { method: "GET" })
		.then(response => response.text())
		.then(result => updateStatus(result))
		.catch(error => updateStatus("❌ Backup failed!"));
}
	
function updateStatus(message) {
	document.getElementById("status").innerHTML = message; // Allow HTML (for link)
}