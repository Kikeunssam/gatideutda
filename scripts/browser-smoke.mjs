import { chromium } from "playwright";
import assert from "node:assert/strict";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
const failures = [];
page.on("pageerror", (e) => failures.push(e.message));
const base = process.env.TEST_APP_URL || "http://127.0.0.1:3000";
// Keep creation checks isolated from the configured live database.
await page.route("**/api/sessions", (route) =>
  route.fulfill({
    status: 503,
    json: { error: "감상방 연결 설정이 필요합니다." },
  }),
);
await page.goto(base);
await page.getByRole("link", { name: "교사로 시작하기" }).waitFor();
await page.screenshot({ path: "output/qa/home.png", fullPage: true });
await page.getByRole("link", { name: "교사로 시작하기" }).click();
await page.getByPlaceholder("드뷔시 「달빛」 감상하기").fill("달빛 감상");
await page.getByPlaceholder("Clair de Lune").fill("달빛");
await page
  .getByPlaceholder("https://www.youtube.com/watch?v=…")
  .fill("https://youtu.be/dQw4w9WgXcQ");
await page.getByRole("button", { name: "감상방 만들기" }).click();
await page.locator(".error[role=alert]").waitFor();
assert.match(await page.locator(".error[role=alert]").innerText(), /설정/);
let session = {
  id: "fake-test-room",
  code: "A7K3PM",
  title: "드뷔시 「달빛」 감상하기",
  song_title: "Clair de Lune",
  artist: "클로드 드뷔시",
  youtube_video_id: "dQw4w9WgXcQ",
  teacher_message: "음악을 들으며 떠오르는 느낌과 장면을 생각해보세요.",
  status: "collecting",
  hidden_words: [],
  expires_at: new Date(Date.now() + 86400000).toISOString(),
};
const words = [
  { word: "고요함", count: 12 },
  { word: "밤", count: 9 },
  { word: "신비로움", count: 8 },
  { word: "외로움", count: 6 },
  { word: "따뜻함", count: 4 },
  { word: "달빛", count: 4 },
  { word: "편안함", count: 3 },
  { word: "별빛", count: 2 },
  { word: "산책", count: 1 },
];
let saved = null,
  review =
    "우리 반 친구들은 이 음악을 들으며 고요함, 밤, 신비로움을 많이 떠올렸습니다. 조용한 밤을 생각한 친구들이 있었습니다. 외로운 느낌을 표현한 친구들도 있었습니다. 한편 따뜻하고 편안하다고 느낀 친구들도 있었습니다.";
await page.route("**/api/sessions/A7K3PM**", async (route) => {
  const r = route.request(),
    path = new URL(r.url()).pathname;
  let result = { ok: true };
  if (path.endsWith("/responses")) {
    if (r.method() === "GET")
      result = r.headers()["x-participant-id"]
        ? { response: saved }
        : {
            session,
            participantCount: 28,
            responseCount: 26,
            frequencies: words.filter(
              (w) => !session.hidden_words.includes(w.word),
            ),
            allWords: words,
            reflections: [
              "조용한 밤길을 걷는 것 같아요.",
              "따뜻하고 편안해요.",
            ],
            review,
          };
    else {
      saved = r.postDataJSON();
      result = { response: saved };
    }
  } else if (path.endsWith("/hidden-words"))
    session = { ...session, hidden_words: r.postDataJSON().words };
  else if (path.endsWith("/status"))
    session = { ...session, status: r.postDataJSON().status };
  else if (path.endsWith("/review")) {
    if (r.method() === "POST") result = { content: review };
    else review = r.postDataJSON().content;
  } else result = { session };
  await route.fulfill({ json: result });
});
await page.goto(base + "/teacher/A7K3PM");
await page.getByRole("heading", { name: "우리 반 감상구름" }).waitFor();
await page.screenshot({ path: "output/qa/teacher.png", fullPage: true });
assert.equal(
  await page.getByRole("link", { name: "개발자 문의" }).getAttribute("href"),
  "https://litt.ly/kikeunssam",
);
assert.equal(await page.locator(".invite strong").innerText(), "A7K3PM");
await page
  .getByRole("button", { name: "감상구름 전체화면", exact: true })
  .click();
await page.getByRole("dialog").waitFor();
assert.ok(
  await page
    .getByRole("dialog")
    .getByText("고요함", { exact: true })
    .isVisible(),
);
await page.screenshot({ path: "output/qa/cloud-fullscreen.png" });
await page.getByRole("button", { name: "전체화면 닫기 · Esc" }).click();
await page.getByRole("dialog").waitFor({ state: "hidden" });
await page
  .getByRole("button", { name: "감상구름 전체화면", exact: true })
  .click();
await page.keyboard.press("Escape");
await page.getByRole("dialog").waitFor({ state: "hidden" });
await page
  .getByRole("button", { name: "고요함 감상구름에서 숨기기", exact: true })
  .click();
await page.waitForFunction(
  () => !document.querySelector(".cloud-card")?.textContent.includes("고요함"),
);
await page.getByText("전체 단어 관리").click();
await page.getByRole("button", { name: "고요함 · 12 복원" }).click();
await page.waitForFunction(() =>
  document.querySelector(".cloud-card")?.textContent.includes("고요함"),
);
await page.getByRole("button", { name: "QR 코드 보기" }).click();
await page.getByAltText("학생 감상방 참여 QR 코드").waitFor();
await page
  .getByLabel("선생님이 다듬는 감상평")
  .fill(review + " 서로의 생각을 나눠봅시다.");
await page.getByRole("button", { name: "저장", exact: true }).click();
await page.route("**/api/sessions/A7K3PM/music", (route) =>
  route.fulfill({
    status: 429,
    json: {
      error: "최근 AI 작업을 요청했어요. 1분 후 다시 음악을 만들어주세요.",
    },
  }),
);
await page
  .getByRole("button", { name: "♫ 우리반 분석 결과로 음악만들기", exact: true })
  .click();
await page.locator(".class-music [role=alert]").waitFor();
await page.route("**/api/sessions/A7K3PM/music", async (route) => {
  const { pcmToWav } = await import("../lib/music.ts");
  await route.fulfill({
    status: 200,
    contentType: "audio/wav",
    body: pcmToWav(Buffer.alloc(48000 * 4), 48000),
  });
});
await page
  .getByRole("button", { name: "♫ 우리반 분석 결과로 음악만들기", exact: true })
  .click();
await page.getByRole("link", { name: "↓ 음악 WAV 내려받기" }).waitFor();
await page.waitForFunction(
  () => document.querySelector(".class-music audio")?.readyState >= 1,
);
assert.equal(
  await page.locator(".class-music audio").evaluate((audio) => audio.duration),
  1,
);
const musicDownload = page.waitForEvent("download");
await page.getByRole("link", { name: "↓ 음악 WAV 내려받기" }).click();
assert.match((await musicDownload).suggestedFilename(), /\.wav$/);
await page
  .locator(".class-music")
  .screenshot({ path: "output/qa/class-music.png" });
await page.evaluate(() => {
  const el = document.querySelector(".worksheet-stack");
  el.style.left = "0";
  el.style.zIndex = "100";
});
await page
  .locator("[data-pdf-page]")
  .nth(1)
  .screenshot({ path: "output/qa/worksheet-dom.png" });
await page.evaluate(() => {
  const el = document.querySelector(".worksheet-stack");
  el.style.left = "-12000px";
  el.style.zIndex = "";
});
const downloadPromise = page.waitForEvent("download");
const writingAreas = await page.locator(".writing-lines").evaluateAll((nodes) =>
  nodes.map((node) => ({
    width: node.getBoundingClientRect().width,
    height: node.getBoundingClientRect().height,
  })),
);
assert.equal(writingAreas.length, 4);
assert.ok(
  writingAreas.every((area) => area.width === 698 && area.height === 126),
);
assert.equal(
  await page
    .locator("[data-pdf-page]")
    .nth(1)
    .evaluate((node) => node.scrollHeight),
  1123,
);
assert.ok(
  !(await page.locator(".worksheet-stack").innerText()).includes("6학년"),
);
await page.getByRole("button", { name: "감상 학습지 PDF" }).click();
const download = await downloadPromise;
await download.saveAs("output/qa/worksheet.pdf");
assert.equal(
  await page
    .locator("[data-pdf-page]")
    .nth(1)
    .locator(".sheet-identity")
    .count(),
  0,
);
assert.equal(
  await page.locator("[data-youtube-qr]").getAttribute("data-youtube-qr"),
  `https://www.youtube.com/watch?v=${session.youtube_video_id}`,
);
assert.match(
  await page.locator("[data-youtube-qr]").getAttribute("src"),
  /^data:image\/png/,
);
await page.getByRole("button", { name: "응답 마감", exact: true }).click();
assert.equal(session.status, "closed");
await page.setViewportSize({ width: 390, height: 844 });
await page.goto(base + "/");
await page.screenshot({ path: "output/qa/home-mobile.png", fullPage: true });
assert.ok(
  await page.evaluate(
    () => document.documentElement.scrollWidth <= window.innerWidth,
  ),
);
session.status = "waiting";
await page.goto(base + "/join/A7K3PM");
await page.getByText("음악을 귀 기울여 들어보세요.").waitFor();
assert.equal(await page.locator("iframe").count(), 0);
session.status = "collecting";
await page.getByRole("button", { name: "내 생각 보내기" }).waitFor();
await page.getByLabel("핵심 단어").fill("고요함");
await page.getByRole("button", { name: "추가", exact: true }).click();
await page
  .getByLabel("음악에 담긴 이야기 상상하기")
  .fill("고양이가 조용한 밤길을 걸어요.");
for (const word of ["피아노", "느림", "작아짐", "숲", "신비로움"]) {
  await page.getByLabel("핵심 단어").fill(word);
  await page.getByRole("button", { name: "추가", exact: true }).click();
}
assert.equal(await page.getByLabel("핵심 단어").isDisabled(), true);
assert.equal(await page.locator(".listening-guide dt").count(), 6);
assert.ok(
  await page.evaluate(
    () => document.documentElement.scrollWidth <= window.innerWidth,
  ),
);
await page.screenshot({ path: "output/qa/student-mobile.png", fullPage: true });
await page.setViewportSize({ width: 1280, height: 1000 });
const guideBox = await page.locator(".listening-guide").boundingBox();
const fieldsBox = await page.locator(".student-response-fields").boundingBox();
assert.ok(guideBox && fieldsBox && fieldsBox.x >= guideBox.x + guideBox.width);
assert.ok(Math.abs(guideBox.y - fieldsBox.y) < 8);
await page.screenshot({
  path: "output/qa/student-desktop.png",
  fullPage: true,
});
await page.setViewportSize({ width: 390, height: 844 });
await page.getByRole("button", { name: "내 생각 보내기" }).click();
await page.getByText("내 생각이 구름에 더해졌어요!").waitFor();
await page.getByRole("button", { name: "수정하기" }).click();
await page.getByRole("button", { name: "숲 삭제", exact: true }).click();
await page.getByLabel("핵심 단어").fill("밤");
await page.getByRole("button", { name: "추가", exact: true }).click();
await page.getByRole("button", { name: "수정한 생각 보내기" }).click();
await page.getByText("내 생각이 구름에 더해졌어요!").waitFor();
assert.deepEqual(saved.words, [
  "고요함",
  "피아노",
  "느림",
  "작아짐",
  "신비로움",
  "밤",
]);
assert.equal(saved.reflection, "고양이가 조용한 밤길을 걸어요.");
assert.equal(failures.length, 0, failures.join("\n"));
await browser.close();
console.log(
  "Browser smoke passed: home, setup error, teacher moderation, QR, review save, PDF download, mobile waiting/submission/edit. Room APIs mocked; no external services called.",
);
