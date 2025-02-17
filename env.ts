import { load } from "jsr:@std/dotenv";
import { fromFileUrl } from "https://deno.land/std@v0.224.0/path/mod.ts";


const __dirname = fromFileUrl(new URL(".", import.meta.url));
const conf = await load({
  envPath: `/${__dirname}/.env_prod`,
  export: true,
});

export const SECRET_KEY = Deno.env.get("SECRET_KEY");
export const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
export const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
export const GOOGLE_API_SIMOOL = Deno.env.get("GOOGLE_API_SIMOOL");