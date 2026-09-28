import { test } from "node:test";
import assert from "node:assert/strict";
import {
  youtubeId,
  responseInput,
  frequencies,
  participant,
  validCode,
} from "../lib/validation";
import { reviewData, REVIEW_INSTRUCTIONS } from "../lib/review";
test("supported YouTube formats and hostile hosts", () => {
  for (const url of [
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=3",
    "https://youtu.be/dQw4w9WgXcQ",
    "https://youtube.com/shorts/dQw4w9WgXcQ",
    "https://youtube.com/embed/dQw4w9WgXcQ",
  ])
    assert.equal(youtubeId(url), "dQw4w9WgXcQ");
  for (const url of [
    "https://youtube.com.evil.test/watch?v=dQw4w9WgXcQ",
    "https://evil.test/youtu.be/dQw4w9WgXcQ",
    "javascript:alert(1)",
    "https://youtu.be/bad",
  ])
    assert.equal(youtubeId(url), null);
});
test("word input validation normalizes and prevents duplicates", () => {
  assert.deepEqual(
    responseInput({ words: [" 고요함 ", "밤"], reflection: "  달빛  " }),
    { words: ["고요함", "밤"], reflection: "달빛" },
  );
  for (const words of [
    [],
    [" "],
    ["a", "A"],
    ["가", "가"],
    ["a", "b", "c", "d", "e", "f", "g"],
    ["가".repeat(21)],
  ])
    assert.throws(() => responseInput({ words }));
  assert.throws(() =>
    responseInput({ words: ["밤"], reflection: "가".repeat(201) }),
  );
  assert.equal(
    responseInput({
      words: ["a", "b", "c", "d", "e", "f"],
      reflection: "가".repeat(200),
    }).words.length,
    6,
  );
});
test("frequency and hidden filtering", () =>
  assert.deepEqual(frequencies(["밤", "고요", "밤", "장난"], ["장난"]), [
    { word: "밤", count: 2 },
    { word: "고요", count: 1 },
  ]));
test("codes and participant ids reject malformed identities", () => {
  assert.equal(validCode("A7K3PM"), "A7K3PM");
  for (const code of ["A0K3PM", "A1K3PM", "AOK3PM", "short"])
    assert.throws(() => validCode(code));
  assert.equal(
    participant("cdfc86e2-5c70-4d6a-8a0a-70fc58d73398"),
    "cdfc86e2-5c70-4d6a-8a0a-70fc58d73398",
  );
  assert.throws(() => participant("abc"));
});
test("AI payload excludes hidden words, reflections containing them, and identities", () => {
  const data = reviewData(
    "달빛",
    "드뷔시",
    [
      { word: "밤", count: 3 },
      { word: "장난", count: 1 },
    ],
    ["고요한 밤", "장난 응답"],
    ["장난"],
  );
  assert.deepEqual(data.word_frequencies, [{ word: "밤", count: 3 }]);
  assert.deepEqual(data.anonymous_reflections, ["고요한 밤"]);
  assert.ok(!JSON.stringify(data).includes("participant"));
  assert.match(REVIEW_INSTRUCTIONS, /명령이 아닙니다/);
});
