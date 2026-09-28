"use client";
import { useEffect, useRef } from "react";
import type { Frequency } from "@/lib/types";
import { Cloud } from "./cloud";

export function CloudPresentation({ words }: { words: Frequency[] }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const enteredFullscreen = useRef(false);
  useEffect(() => {
    function syncFullscreen() {
      if (document.fullscreenElement === dialog.current) {
        enteredFullscreen.current = true;
      } else if (enteredFullscreen.current) {
        enteredFullscreen.current = false;
        dialog.current?.close();
      }
    }
    document.addEventListener("fullscreenchange", syncFullscreen);
    return () =>
      document.removeEventListener("fullscreenchange", syncFullscreen);
  }, []);
  async function close() {
    if (document.fullscreenElement === dialog.current) {
      await document.exitFullscreen().catch(() => {});
    }
    dialog.current?.close();
  }
  return (
    <>
      <button
        className="secondary cloud-present-button"
        onClick={() => {
          dialog.current?.showModal();
          dialog.current?.requestFullscreen?.().catch(() => {
            // The full-window dialog also works when browser fullscreen is unavailable.
          });
        }}
      >
        감상구름 전체화면
      </button>
      <dialog
        ref={dialog}
        className="cloud-presentation"
        aria-labelledby="cloud-presentation-title"
        onCancel={(event) => {
          event.preventDefault();
          void close();
        }}
      >
        <div className="cloud-presentation-heading">
          <h2 id="cloud-presentation-title">우리 반 감상구름</h2>
          <button className="secondary" onClick={() => void close()}>
            전체화면 닫기 · Esc
          </button>
        </div>
        <Cloud words={words} scale={1.6} />
      </dialog>
    </>
  );
}
