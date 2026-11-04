import { handleCheckout } from "../_shared/handlers.ts";
import { makeDeps } from "../_shared/deno.ts";
Deno.serve((req) => handleCheckout(req, makeDeps()));
