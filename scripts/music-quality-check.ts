import { mkdir, writeFile } from "node:fs/promises";
import { designMusic } from "../lib/music-plan";
import { generateMusic, musicPrompt } from "../lib/music";
async function main() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY required");
  const signal = AbortSignal.timeout(75000);
  const plan = await designMusic(
    key,
    musicPrompt(
      [
        { word: "고요함", count: 12 },
        { word: "따뜻함", count: 8 },
        { word: "신비로움", count: 4 },
      ],
      "조용한 밤, 따뜻하고 신비로운 풍경을 떠올렸어요.",
      [],
    ),
    signal,
  );
  console.log("Music plan:", JSON.stringify(plan));
  const wav = await generateMusic(key, plan.prompt, signal, undefined, plan);
  await mkdir("output/audio", { recursive: true });
  await writeFile("output/audio/class-music-improved.wav", wav);
  console.log(
    JSON.stringify({
      seconds: wav.readUInt32LE(40) / wav.readUInt32LE(28),
      rate: wav.readUInt32LE(24),
      bytes: wav.length,
    }),
  );
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
