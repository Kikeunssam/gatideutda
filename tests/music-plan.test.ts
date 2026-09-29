import test from "node:test";
import assert from "node:assert/strict";
import { designMusic, parseMusicPlan } from "../lib/music-plan";
const plan = {
  prompt:
    "A warm acoustic piano melody with soft strings and a clear repeating motif.",
  bpm: 76,
  density: 0.3,
  brightness: 0.4,
  muteDrums: true,
};
const successfulPlan = () =>
  Response.json({
    candidates: [{ content: { parts: [{ text: JSON.stringify(plan) }] } }],
  });
test("planner retries temporary failure once and returns a valid plan", async () => {
  let calls = 0;
  const request = (async () =>
    ++calls === 1
      ? new Response(null, { status: 503 })
      : successfulPlan()) as typeof fetch;
  assert.deepEqual(
    await designMusic(
      "test",
      "analysis",
      new AbortController().signal,
      request,
    ),
    plan,
  );
  assert.equal(calls, 2);
});
test("planner separates permanent errors without retrying", async () => {
  for (const [status, message] of [
    [400, /요청 설정/],
    [403, /접근 권한/],
    [404, /모델/],
    [429, /사용 한도/],
  ] as const) {
    let calls = 0;
    await assert.rejects(
      designMusic(
        "test",
        "analysis",
        new AbortController().signal,
        (async () => {
          calls++;
          return new Response(null, { status });
        }) as typeof fetch,
      ),
      message,
    );
    assert.equal(calls, 1);
  }
});
test("planner bounds timeout retries and reports timeout distinctly", async () => {
  let calls = 0;
  await assert.rejects(
    designMusic("test", "analysis", new AbortController().signal, (async () => {
      calls++;
      throw new DOMException("timeout", "TimeoutError");
    }) as typeof fetch),
    /응답이 늦어/,
  );
  assert.equal(calls, 2);
});
test("cancelling planner backoff prevents another request", async () => {
  const controller = new AbortController();
  let calls = 0;
  const pending = designMusic(
    "test",
    "analysis",
    controller.signal,
    (async () => {
      calls++;
      setTimeout(() => controller.abort(), 10);
      return new Response(null, { status: 503 });
    }) as typeof fetch,
  );
  await assert.rejects(pending, /취소/);
  assert.equal(calls, 1);
});
test("reject malformed and out-of-range music plans", () => {
  assert.deepEqual(parseMusicPlan(plan), plan);
  for (const bad of [
    null,
    {},
    { ...plan, bpm: 300 },
    { ...plan, density: NaN },
    { ...plan, muteDrums: "false" },
  ]) {
    assert.throws(() => parseMusicPlan(bad), /음악 설계/);
  }
});
test("planner parses structured output and ignores thinking text", async () => {
  const request = (async () =>
    Response.json({
      candidates: [
        {
          content: {
            parts: [
              { thought: true, text: "internal" },
              { text: JSON.stringify(plan) },
            ],
          },
        },
      ],
    })) as typeof fetch;
  assert.deepEqual(
    await designMusic(
      "test",
      "class analysis",
      new AbortController().signal,
      request,
    ),
    plan,
  );
  await assert.rejects(
    designMusic(
      "test",
      "analysis",
      new AbortController().signal,
      (async () => new Response("", { status: 429 })) as typeof fetch,
    ),
    /사용 한도/,
  );
});
