<script>
  document.addEventListener("DOMContentLoaded", function () {
    const editor = new toastui.Editor({
      el: document.querySelector("#editor"),
      height: "300px",
      initialEditType: "markdown",
      previewStyle: "vertical"
    });

    // Update hidden textarea before form submission
    document.querySelector("form").addEventListener("submit", function () {
      document.querySelector("#content-input").value = editor.getMarkdown();
    });
  });
</script>
