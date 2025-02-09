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

	// Fullscreen functionality
	const overlay = document.getElementById("fullscreen-overlay");
	const fullscreenImg = document.getElementById("fullscreen-img");
	const fullscreenPrevBtn = document.getElementById("fullscreen-prev");
	const fullscreenNextBtn = document.getElementById("fullscreen-next");

	function openFullscreen(img) {
		currentIndex = [...images].indexOf(img); // Find index of clicked image
		updateFullscreenImage();
		overlay.style.display = "flex";
	}

	function closeFullscreen() {
		overlay.style.display = "none";
	}

	function updateFullscreenImage() {
		fullscreenImg.src = images[currentIndex].src;
	}

	fullscreenPrevBtn.addEventListener("click", function () {
		currentIndex = (currentIndex - 1 + images.length) % images.length;
		updateFullscreenImage();
	});

	fullscreenNextBtn.addEventListener("click", function () {
		currentIndex = (currentIndex + 1) % images.length;
		updateFullscreenImage();
	});

	// Touch swipe functionality
	let touchStartX = 0;
	let touchEndX = 0;

	overlay.addEventListener("touchstart", (e) => {
		touchStartX = e.touches[0].clientX;
	});

	overlay.addEventListener("touchend", (e) => {
		touchEndX = e.changedTouches[0].clientX;
		handleSwipe();
	});

	function handleSwipe() {
		const swipeThreshold = 50; // Minimum swipe distance to register
		if (touchStartX - touchEndX > swipeThreshold) {
			// Swipe left (next image)
			currentIndex = (currentIndex + 1) % images.length;
		} else if (touchEndX - touchStartX > swipeThreshold) {
			// Swipe right (previous image)
			currentIndex = (currentIndex - 1 + images.length) % images.length;
		}
		updateFullscreenImage();
	}

	window.openFullscreen = openFullscreen;
	window.closeFullscreen = closeFullscreen;
});