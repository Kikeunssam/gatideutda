import test from "node:test";
import assert from "node:assert/strict";
import { generateMusic, musicPrompt, pcmToWav } from "../lib/music";

test("music excludes hidden words and reviews containing hidden words", () => {
  const prompt = musicPrompt(
    [
      { word: "차분함", count: 3 },
      { word: "숨김", count: 2 },
    ],
    "숨김 내용",
    ["숨김"],
  );
  assert.ok(prompt.includes("차분함"));
  assert.ok(!prompt.includes("숨김"));
});
test("WAV header preserves stereo PCM duration with faded edges", () => {
  const pcm = Buffer.alloc(48000 * 4 * 20);
  for (let i = 0; i < pcm.length; i += 2) pcm.writeInt16LE(1000, i);
  const wav = pcmToWav(pcm, 48000);
  assert.equal(wav.toString("ascii", 0, 4), "RIFF");
  assert.equal(wav.readUInt32LE(40), pcm.length);
  assert.equal(wav.readUInt32LE(24), 48000);
  assert.equal(wav.readUInt16LE(22), 2);
  assert.equal(wav.readInt16LE(44), 0);
  assert.equal(wav.readInt16LE(wav.length - 2), 0);
  assert.equal(wav.readInt16LE(44 + 48000 * 4 * 2), 1000);
});
class Socket {
  readyState = 1;
  onopen?: () => void;
  onmessage?: (event: { data: string }) => void;
  onclose?: () => void;
  onerror?: () => void;
  sent: Record<string, unknown>[] = [];
  closed = false;
  send(raw: string) {
    this.sent.push(JSON.parse(raw));
  }
  close() {
    this.closed = true;
  }
  message(value: unknown) {
    this.onmessage?.({ data: JSON.stringify(value) });
  }
}
test("music stops after 20 seconds and rejects an interrupted stream", async () => {
  const socket = new Socket();
  const controller = new AbortController();
  const pending = generateMusic(
    "test",
    "piano",
    controller.signal,
    () => socket as unknown as WebSocket,
  );
  socket.onopen?.();
  socket.message({ setupComplete: {} });
  socket.message({
    serverContent: {
      audioChunks: [
        {
          mimeType: "audio/pcm;rate=48000",
          data: Buffer.alloc(48000 * 4 * 21).toString("base64"),
        },
      ],
    },
  });
  const wav = await pending;
  assert.equal(wav.length, 44 + 48000 * 4 * 20);
  assert.ok(socket.closed);
  assert.ok(socket.sent.some((m) => m.playbackControl === "STOP"));
  const interrupted = new Socket();
  const failure = generateMusic(
    "test",
    "piano",
    controller.signal,
    () => interrupted as unknown as WebSocket,
  );
  interrupted.onclose?.();
  await assert.rejects(failure, /연결이 종료/);
});
test("cancellation closes the music connection", async () => {
  const controller = new AbortController();
  const socket = new Socket();
  const pending = generateMusic(
    "test",
    "piano",
    controller.signal,
    () => socket as unknown as WebSocket,
  );
  controller.abort();
  await assert.rejects(pending, /취소/);
  assert.ok(socket.closed);
});
