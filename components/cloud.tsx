import type { Frequency } from "@/lib/types";
export function Cloud({
  words,
  scale = 1,
}: {
  words: Frequency[];
  scale?: number;
}) {
  const max = words[0]?.count || 1;
  return (
    <div className="cloud" aria-label="단어 빈도에 따른 우리 반 감상구름">
      {words.length ? (
        words.map((x, i) => (
          <span
            key={x.word}
            className={`cloud-word color-${i % 6}`}
            style={{
              fontSize: `${(18 + 32 * Math.sqrt(x.count / max)) * scale}px`,
            }}
            title={`${x.count}번 나온 생각`}
          >
            <span className="cloud-word-label">{x.word}</span>
          </span>
        ))
      ) : (
        <div className="cloud-empty">
          <span>☁</span>
          <p>우리 반의 생각을 기다리고 있어요.</p>
          <small>학생들의 단어가 모이면 감상구름이 피어납니다.</small>
        </div>
      )}
    </div>
  );
}
