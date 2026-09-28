import { endpoint, room, publicSession } from "@/lib/server";
export const GET = endpoint(async (_req, code) => ({
  session: publicSession(await room(code)),
}));
