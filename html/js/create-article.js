document.addEventListener("DOMContentLoaded", function () {
  // Initialize TUI Editor
  const editor = new toastui.Editor({
    el: document.querySelector("#editor"),
    height: "300px",
    initialEditType: "markdown",
    previewStyle: "vertical"
  });

  // Handle multiple image uploads
  const input = document.querySelector('input[name="images"]');
  const previewContainer = document.createElement("div");
  previewContainer.id = "image-preview";
  input.parentNode.insertBefore(previewContainer, input.nextSibling);

  let selectedFiles = [];

  input.addEventListener("change", function (e) {
    previewContainer.innerHTML = ""; // Clear previous previews
    selectedFiles = Array.from(e.target.files).slice(0, 5); // Limit to 5 images

    selectedFiles.forEach((file, index) => {
      const img = document.createElement("img");
      img.src = URL.createObjectURL(file);
      img.dataset.index = index;
      img.style.cursor = "pointer";
      img.style.maxWidth = "100px";
      img.style.margin = "5px";
      img.onclick = () => openEditor(index, file);
      previewContainer.appendChild(img);
    });
  });

  // Function to open TUI Image Editor
  function openEditor(index, file) {
		const reader = new FileReader();
		reader.onload = function () {
			const container = document.createElement("div");
			container.id = "tui-editor-container";
			document.body.appendChild(container);

			const editorInstance = new tui.ImageEditor(container, {
				includeUI: {
					loadImage: {
						path: reader.result,
						name: file.name
					},
					theme: {}, // Required, even if empty
					menu: ['crop', 'flip', 'rotate', 'draw', 'shape', 'icon', 'text', 'mask', 'filter'],
					initMenu: 'filter',
					uiSize: {
						width: '700px',
						height: '500px'
					},
					menuBarPosition: 'bottom'
				},
				cssMaxWidth: 700,
				cssMaxHeight: 500,
				usageStatistics: false
			});

			const saveBtn = document.createElement("button");
			saveBtn.textContent = "Save Image";
			saveBtn.onclick = () => {
				editorInstance.toDataURL().then((dataUrl) => {
					selectedFiles[index] = dataURLtoFile(dataUrl, file.name);
					previewContainer.children[index].src = dataUrl;
					editorInstance.destroy();
					container.remove();
				});
			};
			container.appendChild(saveBtn);
		};
		reader.readAsDataURL(file);
	}

  // Convert data URL to file
  function dataURLtoFile(dataUrl, filename) {
    let arr = dataUrl.split(","),
      mime = arr[0].match(/:(.*?);/)[1],
      bstr = atob(arr[1]),
      n = bstr.length,
      u8arr = new Uint8Array(n);
    while (n--) u8arr[n] = bstr.charCodeAt(n);
    return new File([u8arr], filename, { type: mime });
  }

  // Handle form submission
  document.querySelector("form").addEventListener("submit", async function (e) {
    e.preventDefault();

    const formData = new FormData();
    formData.append("title", document.querySelector('input[name="title"]').value);
    formData.append("content", editor.getMarkdown());

    selectedFiles.forEach((file) => {
      formData.append("images", file);
    });

    const response = await fetch("/create-article", { method: "POST", body: formData });
    if (response.ok) window.location.href = "/";
  });
});