import { create, getNumericDate, verify } from "https://deno.land/x/djwt@v3.0.2/mod.ts";
//import { getCookie } from "https://deno.land/x/hono@v4.3.11/helper.ts";

const SECRET_KEY = Deno.env.get("SECRET_KEY") || "";
if (SECRET_KEY.length < 32) {
	console.warn("Warning: SECRET_KEY is too short! Consider using a longer key.");
}

async function importKey(usage: KeyUsage[]) {
	if (!SECRET_KEY) throw new Error("Secret key not set");
	return await crypto.subtle.importKey(
		"raw",
		new TextEncoder().encode(SECRET_KEY),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		usage
	);
}

async function verifyJwt(token: string) {
	const key = await importKey(["verify"]);
	return await verify(token, key);
}

export async function authMiddleware(c: any, next: any) {
	let token = c.req.header("Authorization")?.split(" ")[1] ||
		c.req.header("Cookie")?.split(";").find(c => c.trim().startsWith("jwt="))?.split("=")[1];

	if (!token) {
		return c.json({ error: "Authentication required" }, 401);
	}

	try {
		const payload = await verifyJwt(token);
		c.set("user", payload.user); // Set only the `user`
		await next();
	} catch {
		return c.json({ error: "Invalid token" }, 401);
	}
}

export async function authLogin(c) {
  if (c.req.method === "GET") {
    // Check if user is already logged in (JWT in cookies)
    const jwt = c.req.header("Cookie")?.match(/jwt=([^;]+)/)?.[1];

    if (jwt) {
      try {
        const key = await importKey(["verify"]);
        await verify(jwt, key);
        return c.redirect("/admin"); // If valid, redirect to admin
      } catch {
        // Token invalid/expired → Fall through to render login page
      }
    }

    // Render login page instead of redirecting again
    return c.html(await Deno.readTextFile("./html/login.html"));
  }

  // Handle POST (Login attempt)
  const { username, password } = await c.req.json();
  if (!SECRET_KEY) return c.json({ error: "Server misconfiguration" }, 500);

  const users = [
    { username: "admin", password: "My*Admin*Password*000", name: "Just Admin", role: "administrator" },
    { username: "writer", password: "My*Writer*Password*001", name: "Adam Writer", role: "content-creator" },
  ];

  const user = users.find((u) => u.username === username && u.password === password);

  if (user) {
    const key = await importKey(["sign"]);
    const token = await create(
      { alg: "HS256", typ: "JWT" },
      { user: user.username, name: user.name, role: user.role, exp: getNumericDate(3600) },
      key
    );

    // Set the JWT as a cookie
    c.header("Set-Cookie", `jwt=${token}; HttpOnly; Secure; SameSite=Strict; Path=/`);

    return c.redirect("/admin"); // Redirect after successful login
  }

  return c.html(await Deno.readTextFile("./public/login.html")); // Show login page on failed login
}