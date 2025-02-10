document.addEventListener("DOMContentLoaded", async () => {
  // Attach login event listener only if not redirected
  document.getElementById("login-form").addEventListener("submit", async (e) => {
    e.preventDefault();

    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;
    document.getElementById("message").innerText = "";

    try {
      const response = await fetch("/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
        credentials: "include", // Ensure cookies are sent
      });
			
			if (response.redirected) {
        window.location.href = response.url; // Follow the redirect
        return;
      }
			
      const data = await response.json();

    } catch (error) {
      document.getElementById("message").innerText = "An error occurred. Please try again.";
      console.error("Login error:", error);
    }
  });
});