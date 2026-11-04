import { handleSync } from "../_shared/handlers.ts";
import { makeDeps } from "../_shared/deno.ts";
Deno.serve((req) => handleSync(req, makeDeps()));
