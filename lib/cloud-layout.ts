import type { Frequency } from "./types";

export type CloudPlacement = Frequency & {
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  rotated: boolean;
};

// Place measured text around the centre, reserving room for floating and hover.
export function packCloud(
  words: Frequency[],
  width: number,
  height: number,
  measure: (word: string, size: number) => number,
  scale = 1,
): CloudPlacement[] {
  const sorted = [...words].sort(
    (a, b) => b.count - a.count || a.word.localeCompare(b.word, "ko"),
  );
  const max = sorted[0]?.count || 1;
  for (let attempt = 0; attempt < 30; attempt++) {
    const factor = Math.pow(0.88, attempt);
    const placed: CloudPlacement[] = [];
    for (const [index, word] of sorted.entries()) {
      const fontSize =
        (15 + 47 * Math.pow(word.count / max, 0.8)) *
        Math.min(scale, width / 520) *
        factor;
      const rotated = index > 1 && index % 4 === 2 && word.word.length <= 8;
      const textWidth = measure(word.word, fontSize);
      const w = (rotated ? fontSize * 1.3 : textWidth) * 1.06 + 14;
      const h = (rotated ? textWidth : fontSize * 1.3) * 1.06 + 18;
      let found = false;
      for (let step = 0; step < 2200; step++) {
        const angle = step * 0.36;
        const radius = 4.2 * Math.sqrt(step);
        const x =
          width / 2 +
          Math.cos(angle) * radius * Math.max(1, width / height) -
          w / 2;
        const y = height / 2 + Math.sin(angle) * radius - h / 2;
        if (x < 10 || y < 10 || x + w > width - 10 || y + h > height - 10)
          continue;
        if (
          placed.some(
            (p) =>
              x < p.x + p.width &&
              x + w > p.x &&
              y < p.y + p.height &&
              y + h > p.y,
          )
        )
          continue;
        placed.push({ ...word, x, y, width: w, height: h, fontSize, rotated });
        found = true;
        break;
      }
      if (!found) break;
    }
    if (placed.length === sorted.length) return placed;
  }
  return [];
}
