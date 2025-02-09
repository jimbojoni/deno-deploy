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
        return;
      } else {
        localStorage.removeItem("jwt_token");
      }
    } catch (error) {
      console.error("Token validation error:", error);
    }
  }

  // Attach event listener only if not redirected
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
        document.getElementById("message").innerText = "✅ Login successful! Redirecting...";
        setTimeout(() => {
          window.location.href = "/admin";
        }, 1000);
      } else {
        document.getElementById("message").innerText = `❌ ${data.error || "Login failed"}`;
      }
    } catch (error) {
      document.getElementById("message").innerText = "❌ An error occurred. Please try again.";
      console.error("Login error:", error);
    }
  });
});