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
