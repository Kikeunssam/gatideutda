"use client";
import { useEffect, useRef, useState } from "react";
import type { Frequency } from "@/lib/types";
import { packCloud, type CloudPlacement } from "@/lib/cloud-layout";
export function Cloud({
  words,
  scale = 1,
  packed = true,
}: {
  words: Frequency[];
  scale?: number;
  packed?: boolean;
}) {
  const container = useRef<HTMLDivElement>(null);
  const [positions, setPositions] = useState<CloudPlacement[]>([]);
  const signature = JSON.stringify(words);
  useEffect(() => {
    if (!packed || !container.current) return;
    const element = container.current;
    let active = true;
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) return;
    const update = () => {
      if (!active) return;
      if (element.clientWidth < 40 || element.clientHeight < 40) {
        setPositions([]);
        return;
      }
      const family = getComputedStyle(element).fontFamily;
      setPositions(
        packCloud(
          JSON.parse(signature),
          element.clientWidth,
          element.clientHeight,
          (word, size) => {
            context.font = `750 ${size}px ${family}`;
            return context.measureText(word).width;
          },
          scale,
        ),
      );
    };
    const observer = new ResizeObserver(update);
    observer.observe(element);
    void document.fonts.ready.then(update);
    return () => {
      active = false;
      observer.disconnect();
    };
  }, [signature, scale, packed]);
  const max = words[0]?.count || 1;
  return (
    <div
      ref={container}
      className={`cloud${packed && positions.length ? " cloud-packed" : ""}`}
      aria-label="단어 빈도에 따른 우리 반 감상구름"
    >
      {words.length ? (
        packed && positions.length ? (
          positions.map((x, i) => (
            <span
              key={x.word}
              className={`cloud-position color-${i % 6}`}
              style={{
                left: x.x,
                top: x.y,
                width: x.width,
                height: x.height,
                fontSize: x.fontSize,
              }}
              title={`${x.count}번 나온 생각`}
            >
              <span className="cloud-word">
                <span
                  className={
                    x.rotated
                      ? "cloud-orientation cloud-vertical"
                      : "cloud-orientation"
                  }
                >
                  <span className="cloud-word-label">{x.word}</span>
                </span>
              </span>
            </span>
          ))
        ) : (
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
        )
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
