import test from "node:test";
import assert from "node:assert/strict";
import { extractYouTubeVideoId, youtubeError } from "../lib/youtube";
import { checkYouTube } from "../lib/youtube-check";
const id = "dQw4w9WgXcQ";
test("YouTube URLs accept supported paths and reject hostile or malformed inputs", () => {
  for (const url of [
    `https://www.youtube.com/watch?v=${id}&t=5`,
    `https://youtu.be/${id}?si=abc`,
    `https://youtube.com/embed/${id}`,
    `https://youtube.com/shorts/${id}?feature=share`,
    `https://youtube.com/live/${id}?si=xyz`,
  ])
    assert.equal(extractYouTubeVideoId(url), id);
  for (const url of [
    "javascript:alert(1)",
    "https://youtube.com.evil.test/watch?v=" + id,
    `https://user@youtube.com/watch?v=${id}`,
    `https://youtu.be/${id}/extra`,
    "https://youtube.com/watch?v=bad",
    "https://youtube.com:444/watch?v=" + id,
  ])
    assert.equal(extractYouTubeVideoId(url), null);
});
test("all documented runtime errors have the intended status", () => {
  for (const code of [101, 150])
    assert.equal(youtubeError(id, code).status, "blocked");
  assert.equal(youtubeError(id, 100).status, "unavailable");
  for (const code of [2, 5, 153, 999])
    assert.equal(youtubeError(id, code).status, "error");
  assert.match(youtubeError(id, 153).reason!, /인증 정보/);
});
test("no API key means runtime-only and zero external calls", async () => {
  const result = await checkYouTube(id, undefined, (async () => {
    throw new Error("must not call");
  }) as typeof fetch);
  assert.deepEqual(result, {
    videoId: id,
    status: "checking",
    source: "runtime",
  });
});
test("Data API distinguishes blocked, missing, candidate, and API failure", async () => {
  const mock = (items: unknown[]) =>
    (async (url: string | URL | Request) => {
      const parsed = new URL(String(url));
      assert.equal(parsed.searchParams.get("part"), "status,snippet");
      assert.equal(parsed.searchParams.get("id"), id);
      return Response.json({ items });
    }) as typeof fetch;
  assert.equal(
    (await checkYouTube(id, "test", mock([{ status: { embeddable: false } }])))
      .status,
    "blocked",
  );
  assert.equal(
    (await checkYouTube(id, "test", mock([]))).status,
    "unavailable",
  );
  const candidate = await checkYouTube(
    id,
    "test",
    mock([{ status: { embeddable: true } }]),
  );
  assert.equal(candidate.status, "checking");
  assert.equal(candidate.availableCandidate, true);
  const failure = await checkYouTube(
    id,
    "test",
    (async () => new Response("", { status: 403 })) as typeof fetch,
  );
  assert.equal(failure.source, "runtime");
  assert.ok(!JSON.stringify(candidate).includes("test"));
});
