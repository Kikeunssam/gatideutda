import { endpoint, room, teacher, body, db, checked } from "@/lib/server";
import { AppError } from "@/lib/validation";
export const POST = endpoint(async (req, code) => {
  const s = await room(code);
  await teacher(s);
  const b = await body(req);
  if (!["waiting", "collecting", "closed"].includes(String(b.status)))
    throw new AppError("진행 상태를 확인해주세요.");
  const { error } = await db()
    .from("sessions")
    .update({ status: b.status })
    .eq("id", s.id);
  checked(error);
  return { ok: true };
});
