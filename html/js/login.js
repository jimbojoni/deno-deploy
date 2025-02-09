document.addEventListener("DOMContentLoaded", async () => {
  try {
    // Check if user is already logged in
    const response = await fetch("/login", {
      method: "GET",
      credentials: "include", // Include cookies for authentication
    });

    if (response.redirected) {
      window.location.href = response.url; // Redirect if the server does
      return;
    }
  } catch (error) {
    console.error("Error checking authentication:", error);
  }

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
        window.location.href = response.url; // Redirect if the server does
        return;
      }

      const data = await response.json();

      if (response.ok) {
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