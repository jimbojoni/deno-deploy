/*const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_KEY = Deno.env.get("SUPABASE_ANON_KEY");
const SECRET_KEY = Deno.env.get("SECRET_KEY") || "";
const credentialsBase64 = Deno.env.get("GOOGLE_API_SIMOOL");

console.log("SUPABASE_URL:", SUPABASE_URL);
console.log("SUPABASE_ANON_KEY:", SUPABASE_KEY);
console.log("SECRET_KEY:", SECRET_KEY);
console.log("GOOGLE_API_SIMOOL:", credentialsBase64);*/

import { Hono } from "https://deno.land/x/hono/mod.ts";

const app = new Hono();

app.get('/', (c) => {
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
	const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const SECRET_KEY = Deno.env.get("SECRET_KEY");
  const credentialsBase64 = Deno.env.get("GOOGLE_API_SIMOOL");

  return c.html(`
    <html>
      <head>
        <title>Environment Variables</title>
      </head>
      <body>
        <h1>Environment Variables</h1>
        <ul>
          <li><strong>SUPABASE_URL:</strong> ${SUPABASE_URL}</li>
          <li><strong>SUPABASE_ANON_KEY:</strong> ${SUPABASE_KEY}</li>
          <li><strong>SECRET_KEY:</strong> ${SECRET_KEY}</li>
          <li><strong>GOOGLE_API_SIMOOL:</strong> ${credentialsBase64}</li>
        </ul>
      </body>
    </html>
  `);
});

export default app;