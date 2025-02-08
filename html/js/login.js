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
			// Store the JWT token in localStorage
			localStorage.setItem("jwt_token", data.token);
			document.getElementById("message").innerText = "✅ Login successful! Redirecting...";
			setTimeout(() => {
				window.location.href = "/admin"; // Redirect to the admin page
			}, 1000);
		} else {
			// Handle error response
			const data = await response.json();
			document.getElementById("message").innerText = `❌ ${data.error || "Login failed"}`;
		}
	} catch (error) {
		// Handle network or JSON parsing errors
		document.getElementById("message").innerText = "❌ An error occurred. Please try again.";
		console.error("Login error:", error);
	}
});