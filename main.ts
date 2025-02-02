import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

serve((_req) => new Response("Hello from Deno Deploy!, I'm testing git now"), { port: 8000 });
