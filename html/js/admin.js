document.getElementById("logoutBtn").addEventListener("click", async () => {
	// Make a POST request to the logout route
	try {
		const response = await fetch("/logout", {
			method: "POST",
			headers: {
				"Authorization": `Bearer ${localStorage.getItem("jwt_token")}` // Include JWT token if needed
			}
		});

		if (response.ok) {
			localStorage.removeItem("jwt_token");
			window.location.href = "/";
		} else {
			console.error("Logout failed");
		}
	} catch (error) {
		console.error("Request failed:", error);
	}
});