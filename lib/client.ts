class ClientError extends Error {}
export async function api<T>(
  url: string,
  method = "GET",
  data?: unknown,
  participant?: string,
): Promise<T> {
  try {
    const response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(participant ? { "x-participant-id": participant } : {}),
      },
      ...(data ? { body: JSON.stringify(data) } : {}),
      cache: "no-store",
      signal: AbortSignal.timeout(60000),
    });
    const result = await response.json();
    if (!response.ok)
      throw new ClientError(result.error || "잠시 후 다시 시도해주세요.");
    return result as T;
  } catch (e) {
    if (e instanceof ClientError) throw e;
    throw new ClientError(
      "연결이 잠시 끊겼어요. 인터넷 연결을 확인하고 다시 시도해주세요.",
    );
  }
}
export function participantId() {
  try {
    const key = "gatideutda-participant";
    let id = localStorage.getItem(key);
    if (!id) {
      // getRandomValues also works on a classroom LAN using HTTP.
      const bytes = crypto.getRandomValues(new Uint8Array(16));
      bytes[6] = (bytes[6] & 15) | 64;
      bytes[8] = (bytes[8] & 63) | 128;
      const hex = Array.from(bytes, (b) =>
        b.toString(16).padStart(2, "0"),
      ).join("");
      id = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
      localStorage.setItem(key, id);
    }
    return id;
  } catch {
    throw new ClientError(
      "브라우저 저장 공간을 사용할 수 없어요. 일반 브라우저에서 다시 입장해주세요.",
    );
  }
}
export const messageOf = (e: unknown) =>
  e instanceof Error && /[가-힣]/.test(e.message)
    ? e.message
    : "요청을 처리하지 못했어요. 잠시 후 다시 시도해주세요.";
