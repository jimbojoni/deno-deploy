import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

serve((_req) => new Response("Hello from Deno Deploy!"), { port: 8000 });
