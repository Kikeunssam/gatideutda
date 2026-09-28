import { chromium } from "playwright";
import assert from "node:assert/strict";
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const page = await browser.newPage({
    viewport: { width: 1100, height: 900 },
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(() => {
    window.ytPlayers = [];
    window.YT = {
      Player: class {
        constructor(frame, options) {
          this.frame = frame;
          this.events = options.events;
          window.ytPlayers.push(this);
          setTimeout(() => this.events.onReady(), 0);
        }
        destroy() {
          this.frame.remove();
          this.destroyed = true;
        }
      },
    };
  });
  await page.route("https://www.youtube-nocookie.com/**", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: "<html><body>Official player test fixture</body></html>",
    }),
  );
  let precheck = "runtime",
    created = 0;
  await page.route("**/api/youtube/check?*", (route) => {
    const videoId = new URL(route.request().url()).searchParams.get("videoId");
    return route.fulfill({
      json:
        precheck === "blocked"
          ? { videoId, status: "blocked", errorCode: 101, source: "data-api" }
          : {
              videoId,
              status: "checking",
              source: precheck,
              availableCandidate: precheck === "data-api",
            },
    });
  });
  await page.route("**/api/sessions", (route) => {
    created++;
    return route.fulfill({
      status: 503,
      json: { error: "테스트용 생성 요청 확인" },
    });
  });
  const base = process.env.TEST_APP_URL || "http://127.0.0.1:3000";
  const url = "https://youtu.be/dQw4w9WgXcQ?t=25&si=original";
  await page.goto(base + "/teacher/new");
  const input = page.getByPlaceholder("https://www.youtube.com/watch?v=…");
  await input.fill("https://example.com/no-video");
  await page
    .getByText("올바른 YouTube 링크를 입력해주세요.", { exact: true })
    .waitFor();
  await input.fill(url);
  await page
    .getByText("재생 버튼을 눌러 영상 재생 여부를 확인해주세요.")
    .waitFor();
  assert.equal(
    await page.getByText("✓ 같이듣다에서 재생할 수 있는 영상입니다.").count(),
    0,
  );
  await page.evaluate(() =>
    window.ytPlayers.at(-1).events.onStateChange({ data: 1 }),
  );
  await page.getByText("✓ 같이듣다에서 재생할 수 있는 영상입니다.").waitFor();
  await page.evaluate(() =>
    window.ytPlayers.at(-1).events.onError({ data: 101 }),
  );
  await page
    .getByText("이 영상은 외부 사이트에서 재생할 수 없습니다.", { exact: true })
    .waitFor();
  const link = page.getByRole("link", { name: "YouTube에서 열기" });
  assert.equal(await link.getAttribute("href"), url);
  assert.equal(await link.getAttribute("rel"), "noopener noreferrer");
  assert.equal(await page.locator("iframe").count(), 0);
  await page.getByPlaceholder("드뷔시 「달빛」 감상하기").fill("테스트 감상");
  await page.getByPlaceholder("Clair de Lune").fill("테스트 곡");
  await page
    .getByRole("button", { name: "감상방 만들기 →", exact: true })
    .click();
  await page.getByRole("dialog").waitFor();
  assert.equal(created, 0);
  await page
    .getByRole("button", { name: "다른 영상 선택", exact: true })
    .click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  await page
    .getByRole("button", { name: "감상방 만들기 →", exact: true })
    .click();
  await page
    .getByRole("button", { name: "그대로 감상방 만들기", exact: true })
    .click();
  await page.getByText("테스트용 생성 요청 확인").waitFor();
  assert.equal(created, 1);
  await page
    .locator(".youtube-fallback")
    .screenshot({ path: "output/qa/youtube-fallback.png" });
  for (const [code, text] of [
    [150, "이 영상은 외부 사이트에서 재생할 수 없습니다."],
    [100, "삭제되었거나 비공개 영상이라 재생할 수 없습니다."],
    [2, "올바르지 않은 YouTube 영상입니다."],
    [5, "이 영상은 현재 브라우저에서 재생할 수 없습니다."],
    [153, "현재 환경에서 YouTube Player 인증 정보를 확인할 수 없습니다."],
    [999, "영상을 재생할 수 없습니다. YouTube에서 직접 확인해주세요."],
  ]) {
    await input.fill("");
    await input.fill(url + code);
    await page
      .getByText("재생 버튼을 눌러 영상 재생 여부를 확인해주세요.")
      .waitFor();
    await page.evaluate(
      (code) => window.ytPlayers.at(-1).events.onError({ data: code }),
      code,
    );
    await page.getByText(text, { exact: true }).waitFor();
  }
  precheck = "blocked";
  await input.fill("");
  await input.fill("https://youtube.com/live/abcdefghijk");
  await page
    .getByText("이 영상은 외부 사이트에서 재생할 수 없습니다.", { exact: true })
    .waitFor();
  assert.equal(await page.locator("iframe").count(), 0);
  precheck = "data-api";
  await input.fill("https://youtube.com/shorts/abcdefghijk?si=new");
  await page
    .getByText("재생 버튼을 눌러 영상 재생 여부를 확인해주세요.")
    .waitFor();
  await page.evaluate(() =>
    window.ytPlayers.at(-1).events.onError({ data: 150 }),
  );
  await page
    .getByText("이 영상은 외부 사이트에서 재생할 수 없습니다.", { exact: true })
    .waitFor();
  await page.route("**/api/sessions/A7K3PM/responses", (route) =>
    route.fulfill({
      json: {
        session: {
          id: "youtube-test",
          code: "A7K3PM",
          title: "영상 제한 수업",
          song_title: "감상곡",
          artist: "",
          youtube_video_id: "dQw4w9WgXcQ",
          youtube_url: url,
          teacher_message: "음악을 듣고 생각을 나눠요.",
          status: "collecting",
          hidden_words: [],
          expires_at: new Date(Date.now() + 86400000).toISOString(),
        },
        participantCount: 1,
        responseCount: 1,
        frequencies: [{ word: "고요함", count: 1 }],
        allWords: [{ word: "고요함", count: 1 }],
        reflections: [],
        review: "고요한 느낌입니다.",
      },
    }),
  );
  precheck = "runtime";
  await page.goto(base + "/teacher/A7K3PM");
  await page
    .getByText("재생 버튼을 눌러 영상 재생 여부를 확인해주세요.")
    .waitFor();
  await page.evaluate(() =>
    window.ytPlayers.at(-1).events.onError({ data: 150 }),
  );
  await page.locator(".youtube-fallback").waitFor();
  assert.equal(
    await page
      .getByRole("link", { name: "YouTube에서 열기" })
      .getAttribute("href"),
    url,
  );
  assert.equal(
    await page.getByRole("heading", { name: "우리 반 감상구름" }).isVisible(),
    true,
  );
  assert.equal(
    await page.getByRole("button", { name: "감상 학습지 PDF" }).isEnabled(),
    true,
  );
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  );
  await page
    .locator(".youtube-fallback")
    .screenshot({ path: "output/qa/youtube-fallback-mobile.png" });
  assert.equal(errors.length, 0, errors.join("\n"));
  console.log(
    "YouTube browser checks passed: ready vs playing, all error events, original URL, optional precheck, confirmation and continuation.",
  );
} finally {
  await browser.close();
}
