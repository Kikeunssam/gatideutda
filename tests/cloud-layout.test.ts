import test from "node:test";
import assert from "node:assert/strict";
import { packCloud } from "../lib/cloud-layout";

test("cloud packs varied words inside mobile and presentation bounds without collisions", () => {
  const words = [
    "달빛",
    "잔잔함",
    "피아노",
    "호수",
    "고요함",
    "달",
    "느림",
    "클래식",
    "행복",
    "신비로움",
    "아주 긴 감상 단어도 들어가요",
  ].map((word, i) => ({ word, count: 12 - i }));
  for (const [width, height] of [
    [280, 320],
    [620, 360],
    [1400, 800],
  ]) {
    const result = packCloud(
      words,
      width,
      height,
      (word, size) => [...word].length * size,
    );
    assert.equal(result.length, words.length);
    assert.ok(result.some((p) => p.rotated));
    for (const [i, p] of result.entries()) {
      assert.ok(
        p.x >= 0 &&
          p.y >= 0 &&
          p.x + p.width <= width &&
          p.y + p.height <= height,
      );
      assert.ok(
        result
          .slice(i + 1)
          .every(
            (q) =>
              p.x + p.width <= q.x ||
              q.x + q.width <= p.x ||
              p.y + p.height <= q.y ||
              q.y + q.height <= p.y,
          ),
      );
    }
    assert.deepEqual(
      result,
      packCloud(
        [...words].reverse(),
        width,
        height,
        (word, size) => [...word].length * size,
      ),
    );
  }
});
