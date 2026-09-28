import { endpoint, room, body, db, checked } from "@/lib/server";
import { participant } from "@/lib/validation";
export const POST = endpoint(async (req, code) => {
  const s = await room(code);
  const b = await body(req);
  const { error } = await db()
    .from("participants")
    .upsert(
      { session_id: s.id, participant_id: participant(b.participant_id) },
      { onConflict: "session_id,participant_id", ignoreDuplicates: true },
    );
  checked(error);
  return { ok: true };
});
