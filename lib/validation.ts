export class AppError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export function text(
  value: unknown,
  name: string,
  max: number,
  required = false,
): string {
  if (value == null && !required) return "";
  if (typeof value !== "string") throw new AppError(`${name}을 확인해주세요.`);
  const result = value.normalize("NFC").trim().replace(/\s+/g, " ");
  if ((required && !result) || result.length > max)
    throw new AppError(
      `${name}은 ${required ? "1~" : "최대 "}${max}자로 입력해주세요.`,
    );
  return result;
}
export { extractYouTubeVideoId as youtubeId } from "./youtube";
export function validCode(code: string) {
  if (!/^[A-HJKMNP-Z2-9]{6}$/.test(code))
    throw new AppError("6자리 참여코드를 확인해주세요.");
  return code;
}
export function participant(value: unknown) {
  if (
    typeof value !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    )
  )
    throw new AppError("참여 정보를 확인해주세요. 다시 입장해주세요.");
  return value;
}
export function responseInput(body: Record<string, unknown>) {
  if (
    !Array.isArray(body.words) ||
    body.words.length < 1 ||
    body.words.length > 6
  )
    throw new AppError("핵심 단어를 1~6개 입력해주세요.");
  const words = body.words.map((w) => text(w, "핵심 단어", 20, true));
  if (new Set(words.map((w) => w.toLocaleLowerCase())).size !== words.length)
    throw new AppError("같은 단어는 한 번만 입력해주세요.");
  return { words, reflection: text(body.reflection, "상상 이야기", 200) };
}
export function frequencies(words: string[], hidden: string[] = []) {
  const counts = new Map<string, number>();
  for (const word of words)
    if (!hidden.includes(word)) counts.set(word, (counts.get(word) ?? 0) + 1);
  return [...counts]
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count || a.word.localeCompare(b.word, "ko"));
}
