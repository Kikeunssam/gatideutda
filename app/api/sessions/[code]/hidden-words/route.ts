import { endpoint, room, teacher, body, db, checked } from "@/lib/server";
import { AppError, text } from "@/lib/validation";
export const POST = endpoint(async (req, code) => {
  const s = await room(code);
  await teacher(s);
  const b = await body(req);
  if (!Array.isArray(b.words) || b.words.length > 500)
    throw new AppError("숨길 단어를 확인해주세요.");
  const words = [...new Set(b.words.map((w) => text(w, "단어", 20, true)))];
  const { error } = await db()
    .from("sessions")
    .update({ hidden_words: words })
    .eq("id", s.id);
  checked(error);
  return { ok: true };
});
