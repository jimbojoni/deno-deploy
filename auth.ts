import { create, getNumericDate, verify } from "https://deno.land/x/djwt@v3.0.2/mod.ts";

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
	const { username, password } = await c.req.json();
	if (!SECRET_KEY) return c.json({ error: "Server misconfiguration" }, 500);

	if (username === "admin" && password === "password") {
		const key = await importKey(["sign"]);
		const token = await create(
			{ alg: "HS256", typ: "JWT" },
			{ user: "admin", exp: getNumericDate(3600) },
			key
		);

		c.header("Set-Cookie", `jwt=${token}; HttpOnly; Secure; SameSite=Strict; Path=/`);
		return c.json({ message: "Login successful", token });
	}

	return c.json({ error: "Invalid credentials" }, 401);
}