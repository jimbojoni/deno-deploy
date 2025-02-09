document.addEventListener("DOMContentLoaded", async () => {
  const token = localStorage.getItem("jwt_token");

  if (token) {
    try {
      const response = await fetch("/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.ok && data.loggedIn) {
        window.location.href = "/admin";
        return; // Stop further execution
      } else {
        localStorage.removeItem("jwt_token"); // Remove invalid token
      }
    } catch (error) {
      console.error("Token validation error:", error);
    }
  }

  // Show login form only if not redirected
  document.getElementById("login-container").style.display = "block";

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
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem("jwt_token", data.token);
        window.location.href = "/admin"; // Redirect immediately
      } else {
        document.getElementById("message").innerText = `❌ ${data.error || "Login failed"}`;
      }
    } catch (error) {
      document.getElementById("message").innerText = "❌ An error occurred. Please try again.";
      console.error("Login error:", error);
    }
  });
});