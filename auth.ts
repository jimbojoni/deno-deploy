import { create, getNumericDate, verify } from "https://deno.land/x/djwt@v3.0.2/mod.ts";
import * as eta from "https://deno.land/x/eta@v2.0.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as envVar from "./env.ts";
import { setCookie, getCookie } from "https://deno.land/x/hono@v4.3.11/helper.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || envVar.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || envVar.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

eta.configure({ views: "./html" });

const SECRET_KEY = Deno.env.get("SECRET_KEY") || envVar.SECRET_KEY;
//if (SECRET_KEY.length < 32) {
	//console.warn("Warning: SECRET_KEY is too short! Consider using a longer key.");
//}

/*const keyArray = new Uint8Array(32);
crypto.getRandomValues(keyArray);
const SECRET_KEY = btoa(String.fromCharCode(...keyArray));*/

export const JWT_SECRET_KEY = await crypto.subtle.importKey(
  "raw",
  new TextEncoder().encode(SECRET_KEY),
  { name: "HMAC", hash: "SHA-256" },
  false,
  ["sign", "verify"]
);

export const authMiddleware = async (c, next) => {
  try {
    // Get token from cookies
    const cookies = getCookie(c);
    const token = cookies.token;
    if (!token) {
      return c.html(await eta.renderFile("login.html", { error: "Login required" }));
    }

    // Verify JWT
    const payload = await verify(token, JWT_SECRET_KEY);
    if (!payload.nik || !payload.roles) {
      throw new Error("Invalid JWT");
    }

    // Set user in context
    c.set("user", payload);
    await next();
  } catch (error) {
    console.error("JWT Error:", error);
    return c.html(await eta.renderFile("login.html", { error: "Invalid Token" }));
  }
};

export const authLogin = async (c) => {
  // Handle POST (Login attempt)
  const body = await c.req.parseBody();
	const nik = body.nik as string;
	const password = body.password as string;
	
  if (!JWT_SECRET_KEY) {
    return c.json({ error: "Server misconfiguration" }, 500);
  }

  const { data: user, error } = await supabase
    .from("profiles")
    .select("nik, roles")
    .eq("nik", nik)
    .eq("password", password)  // Plain text comparison (only for testing)
    .single();
		
  if (error || !user) {
    const html = await eta.renderFile("login.html", { error: "Invalid credentials" });
    return c.html(html, 401);
  }

  const jwt = await create(
		{ alg: "HS256", typ: "JWT" },
		{
			nik,
			roles: user.roles,
			exp: getNumericDate(60 * 60 * 24),
		},
		JWT_SECRET_KEY
	);

	// Set JWT Cookie
	setCookie(c, "token", jwt, {
		httpOnly: true,
		secure: true,
		sameSite: "Strict",
		path: "/",
		maxAge: 60 * 60 * 24,
	});

  return c.redirect("/admin");
};

export const role = (...allowedRoles) => async (c, next) => {
  const user = c.get("user");
	//console.log(user.roles);
  if (!user || !user.roles || !user.roles.some(role => allowedRoles.includes(role))) {
    return c.json({ success: false, error: "Forbidden" }, 403);
  }
  await next();
};

export async function logout(c) {
  setCookie(c, "token", "", {
    httpOnly: true,
    secure: true,
    sameSite: "Strict",
    path: "/",
    expires: new Date(0),
  });

  return c.redirect("/");
}