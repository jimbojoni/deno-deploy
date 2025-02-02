import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

serve((_req) => new Response("I'm testing git from termux now"), { port: 8000 });
