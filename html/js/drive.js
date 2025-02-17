document.addEventListener("DOMContentLoaded", () => {
	const loadButton = document.getElementById("loadFilesButton");
	const deleteAllButton = document.getElementById("deleteAllButton");
	const fileList = document.getElementById("fileList");

	// Load files from server
	async function loadFiles() {
		fileList.innerHTML = "<p>Loading...</p>";
		try {
			const response = await fetch("/admin/drive/list");
			if (!response.ok) throw new Error("Failed to fetch files.");
			const files = await response.json();
			displayFiles(files);
		} catch (error) {
			fileList.innerHTML = `<p style="color:red;">Error: ${error.message}</p>`;
		}
	}

	// Display file list
	function displayFiles(files) {
		fileList.innerHTML = "";
		if (files.length === 0) {
			fileList.innerHTML = "<p>No files found.</p>";
			return;
		}

		files.forEach(file => {
			const div = document.createElement("div");
			div.classList.add("file-item");
			
			let icon = document.createElement("span");
			icon.textContent = file.mimeType === "application/vnd.google-apps.folder" ? "📁" : "📄";

			const nameSpan = document.createElement("span");
			nameSpan.textContent = file.name;
			nameSpan.classList.add("name");

			const deleteButton = document.createElement("button");
			deleteButton.textContent = "Delete";
			deleteButton.classList.add("btn-delete");
			deleteButton.onclick = () => deleteFile(file.id, deleteButton);
			
			div.appendChild(icon);
			div.appendChild(nameSpan);
			div.appendChild(deleteButton);
			fileList.appendChild(div);
		});
	}

	// Delete individual file
	async function deleteFile(fileId, button) {
		if (!confirm("Are you sure you want to delete this file?")) return;

		button.disabled = true;
		try {
			const response = await fetch(`/admin/drive/delete/${fileId}`, { method: "DELETE" });
			if (!response.ok) throw new Error("Failed to delete file.");
			alert("File deleted successfully!");
			loadFiles(); // Reload file list
		} catch (error) {
			alert(`Error: ${error.message}`);
		}
		button.disabled = false;
	}

	// Delete all files/folders
	async function deleteAllFiles() {
		if (!confirm("Are you sure you want to delete all files and folders?")) return;

		deleteAllButton.disabled = true;
		try {
			const response = await fetch("/admin/drive/deleteAll", { method: "DELETE" });
			if (!response.ok) throw new Error("Failed to delete all files.");
			alert("All files and folders deleted successfully!");
			loadFiles();
		} catch (error) {
			alert(`Error: ${error.message}`);
		}
		deleteAllButton.disabled = false;
	}

	// Attach event listeners
	loadButton.addEventListener("click", loadFiles);
	deleteAllButton.addEventListener("click", deleteAllFiles);

	// Load files initially
	loadFiles();
});