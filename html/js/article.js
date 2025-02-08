document.addEventListener("DOMContentLoaded", function () {
	const images = document.querySelectorAll(".gallery-image");
	let currentIndex = 0;

	function showImage(index) {
		images.forEach((img, i) => {
			img.classList.toggle("active", i === index);
		});
	}

	document.querySelector(".prev-btn")?.addEventListener("click", function () {
		currentIndex = (currentIndex - 1 + images.length) % images.length;
		showImage(currentIndex);
	});

	document.querySelector(".next-btn")?.addEventListener("click", function () {
		currentIndex = (currentIndex + 1) % images.length;
		showImage(currentIndex);
	});

	showImage(currentIndex);
});

function openFullscreen(img) {
	const overlay = document.getElementById("fullscreen-overlay");
	const fullscreenImg = document.getElementById("fullscreen-img");

	fullscreenImg.src = img.src;
	overlay.style.display = "flex";
}

function closeFullscreen() {
	document.getElementById("fullscreen-overlay").style.display = "none";
}