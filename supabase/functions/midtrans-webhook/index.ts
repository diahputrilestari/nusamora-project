import { handleWebhook } from "../_shared/handlers.ts";
import { makeDeps } from "../_shared/deno.ts";
Deno.serve((req) => handleWebhook(req, makeDeps()));
