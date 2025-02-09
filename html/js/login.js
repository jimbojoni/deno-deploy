document.addEventListener("DOMContentLoaded", () => {
	// Check if user is already logged in
	const token = localStorage.getItem("jwt_token");
	if (token) {
		window.location.href = "/admin"; // Redirect if token exists
		return;
	}

	// Add login form event listener
	document.getElementById("login-form").addEventListener("submit", async (e) => {
		e.preventDefault();

		// Get form values
		const username = document.getElementById("username").value;
		const password = document.getElementById("password").value;

		// Clear previous messages
		document.getElementById("message").innerText = "";

		try {
			// Send login request
			const response = await fetch("/login", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ username, password })
			});

			// Handle response
			if (response.ok) {
				const data = await response.json();
				localStorage.setItem("jwt_token", data.token);
				document.getElementById("message").innerText = "✅ Login successful! Redirecting...";
				setTimeout(() => {
					window.location.href = "/admin";
				}, 1000);
			} else {
				const data = await response.json();
				document.getElementById("message").innerText = `❌ ${data.error || "Login failed"}`;
			}
		} catch (error) {
			document.getElementById("message").innerText = "❌ An error occurred. Please try again.";
			console.error("Login error:", error);
		}
	});
});