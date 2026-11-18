import { toNextJsHandler } from "better-auth/next-js";
import { ensureDatabase } from "@/db/client";
import { auth } from "@/lib/auth";

const handlers = toNextJsHandler(auth);

async function handle(
  request: Request,
  method: "GET" | "POST",
): Promise<Response> {
  await ensureDatabase();
  return handlers[method](request);
}

export const GET = (request: Request) => handle(request, "GET");
export const POST = (request: Request) => handle(request, "POST");
