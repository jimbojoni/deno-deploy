/*const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_KEY = Deno.env.get("SUPABASE_ANON_KEY");
const SECRET_KEY = Deno.env.get("SECRET_KEY") || "";
const credentialsBase64 = Deno.env.get("GOOGLE_API_SIMOOL");

console.log("SUPABASE_URL:", SUPABASE_URL);
console.log("SUPABASE_ANON_KEY:", SUPABASE_KEY);
console.log("SECRET_KEY:", SECRET_KEY);
console.log("GOOGLE_API_SIMOOL:", credentialsBase64);*/

const testEnvVar = Deno.env.get("SUPABASE_URL");

if (!testEnvVar) {
  console.log("SUPABASE_URL is not set.");
} else {
  console.log("SUPABASE_URL is:", testEnvVar);
}
