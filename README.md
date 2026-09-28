# 같이듣다

**함께 듣는 음악 감상실** · 개발용 이름 `gatideutda`

교사가 음악을 재생하고, 학생의 익명 핵심 단어와 한 줄 느낌을 모아 감상구름·AI 종합 감상평·비교 감상 학습지로 연결하는 Next.js 웹앱입니다.

## 주요 기능

- 6자리 참여코드와 QR, 교사 전용 YouTube 개인정보 보호 강화 임베드
- 이름·학번·이메일 없이 참여, 브라우저별 익명 UUID 사용
- 준비/응답 수집/마감 상태 및 2초 polling
- 학생당 단어 1~6개(각 20자), 6가지 감상 가이드, 음악에 담긴 이야기 상상하기(선택·200자), 제출 후 수정

기존 데이터베이스는 Supabase SQL Editor에서 `supabase/migrations/20260928_six_keywords.sql`을 한 번 실행해 저장 제한도 6개로 변경합니다. 기존 응답과 권한은 유지합니다.
- 중복 제출 차단, 트랜잭션 기반 단어 교체, 누적 참여 인원/응답 수 집계
- 빈도 기반 감상구름, TOP 10, 전체 단어 숨기기·복원
- Gemini 종합 감상평 생성/재생성, 교사 편집 및 최종 저장
- A4 세로 PDF 다운로드: 감상 기록과 비교 감상 필기 공간을 기본 2쪽으로 구성
- 24시간 감상방 만료

## 설치 및 실행

Node.js 20.9 이상과 npm이 필요합니다. 권장: 최신 Node.js LTS.

```bash
cd /Users/mysonrami/Documents/gatideutda
npm install
cp .env.local.example .env.local
npm run dev
```

[로컬 앱](http://localhost:3000)을 엽니다. 환경변수를 바꾸면 서버를 재시작하세요. Webpack 빌드는 내부 소켓 사용이 제한된 개발 환경에서도 동작하도록 선택했습니다.

```bash
npm run lint
npm test
npm run build
npm start
```

이 Codex 작업 환경은 일반 PATH에 Node/npm이 없어서 번들 Node와 프로젝트 내부 `.tools/npm`으로 검증했습니다. 일반 Node.js 설치 환경에서는 위 명령을 그대로 사용합니다. 이 환경에서만 필요한 실행 예:

```bash
export PATH="/Users/mysonrami/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH"
node .tools/npm/package/bin/npm-cli.js run dev
```

## Supabase 설정

1. Supabase에서 새 프로젝트를 만듭니다.
2. SQL Editor에서 `supabase/schema.sql` 전체를 **한 번** 실행합니다. 스키마를 이미 실행한 DB에 재실행하지 않습니다.
3. Project Settings의 API 설정에서 Project URL과 서버 전용 `service_role` 키를 확인합니다.
4. `.env.local`의 `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`에 입력합니다.

테이블은 `sessions`, `participants`, `responses`, `response_words`, `ai_reviews`입니다. 모든 테이블에 RLS가 활성화되어 있으며 `anon`·`authenticated`의 직접 접근을 차단합니다. 모든 읽기/쓰기는 Next.js 서버를 경유합니다. `save_response` 함수는 응답과 단어를 한 트랜잭션에서 저장하고 방 상태를 잠금 안에서 재검증합니다. Supabase Realtime 설정은 필요하지 않습니다.

`participants`는 접속 중인 인원이 아니라 해당 방에 입장한 **누적 익명 참여자**를 셉니다. 브라우저 저장소를 지우거나 다른 기기를 쓰면 다른 참여자로 취급됩니다.

## 환경변수

```env
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVER_SERVICE_ROLE_KEY
GEMINI_API_KEY=YOUR_GEMINI_API_KEY
GEMINI_MODEL=gemini-3.5-flash-lite
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

- 비밀키를 `NEXT_PUBLIC_` 변수로 바꾸거나 Git에 올리지 마세요.
- Supabase 미설정 시 첫 화면과 폼은 실행되고 방 관련 요청에 한국어 설정 안내가 표시됩니다.
- Gemini 미설정 시 AI 생성 요청에 `Gemini API 설정이 필요합니다.`가 표시됩니다. 직접 감상평을 작성·저장할 수 있습니다.
- `GEMINI_MODEL`을 비우면 `gemini-3.5-flash-lite`를 사용합니다. 무료 티어 제공 여부와 한도는 Google AI Studio에서 확인하세요.
- 교실 스마트폰에서는 `localhost`로 교사 PC에 접근할 수 없습니다. 운영 시 HTTPS 주소를 `NEXT_PUBLIC_APP_URL`에 넣으세요. 로컬 네트워크 시험 시 서버의 LAN 주소로 접속하세요. 학생 UUID는 crypto.getRandomValues를 사용해 HTTP LAN에서도 생성됩니다. 주소 복사는 브라우저에서 HTTPS를 요구할 수 있으므로 QR 코드 또는 표시된 참여 주소를 이용하세요.

## 교사 인증 / 운영

감상방 생성 시 32바이트 난수 토큰을 만들고 DB에 SHA-256 해시만 저장합니다. 원문은 해당 방 API 경로에 한정한 HttpOnly·SameSite=Strict 쿠키에 24시간 보관합니다. HTTPS에서는 Secure 쿠키를 사용합니다. 다른 브라우저로 옮기거나 쿠키를 삭제하면 교사 권한 복구는 V1에서 제공하지 않습니다. 토큰은 URL이나 학생 응답에 포함되지 않습니다.

학생 화면에는 YouTube 플레이어가 없습니다. 서버는 YouTube 영상·음원 파일을 다운로드하거나 보관하지 않습니다. 임베드가 차단된 영상은 다른 재생 가능한 영상으로 새 감상방을 만들어주세요.

모든 방 조회/쓰기 요청은 만료 여부를 검사합니다. 만료 방을 자동 삭제하지는 않으며, 향후 스케줄러에서 sessions를 삭제하면 연결 데이터도 cascade 삭제됩니다.

## Gemini API 설정 및 데이터

Gemini는 서버에서만 호출합니다. 기본 모델은 `gemini-3.5-flash-lite`이며 45초 타임아웃과 방당 30초 재요청 제한을 적용했습니다. 학생 입력을 명령이 아닌 신뢰할 수 없는 데이터로 다루며 도구는 제공하지 않습니다. 입력은 곡명·작곡가·단어 빈도·익명 감상만 포함하고 participant UUID는 보내지 않습니다. 숨긴 단어 및 해당 단어를 입력한 학생의 한 줄 감상, 숨긴 단어를 포함하는 한 줄 감상도 AI 입력에서 제외합니다. Gemini 무료 티어의 입력은 Google 제품 개선에 사용될 수 있으므로, 수업 전 학교 개인정보 기준을 확인하세요.

학생에게 개인정보를 쓰지 않도록 안내하지만 자유 입력 자체를 완전히 익명화하는 개인정보 탐지 기능은 없습니다. 교사는 AI 생성 전에 한 줄 감상과 단어를 확인해야 합니다. AI 출력은 자동 저장하지 않으며 선생님이 검토한 후 저장합니다. 숨김 변경 후 기존 저장 감상평은 자동 변경되지 않으므로 필요하면 다시 생성·저장하세요.

## PDF 학습지

`html-to-image`와 `jsPDF`를 사용해 브라우저가 렌더링한 한글을 고해상도 이미지로 담습니다. 별도 외부 폰트 요청 없이 기기의 한글 글꼴을 사용합니다. 이미지형 PDF이므로 텍스트 검색/선택은 지원하지 않습니다. 기본 2쪽이며 구름이나 감상평이 길면 페이지가 늘어납니다. 영상·음원은 포함하지 않습니다. 학년·반·번호·이름은 학생이 직접 적는 빈칸입니다. 파스텔 로고와 구역별 색상을 사용하며 비교 감상 네 문항의 필기 공간은 각각 698×126px를 유지합니다. 저장하지 않은 감상평이 있으면 먼저 저장해야 다운로드할 수 있습니다.

## API

| 메서드 / 경로                               | 용도 / 권한                                             |
| ------------------------------------------- | ------------------------------------------------------- |
| POST `/api/sessions`                        | 방 생성, 교사 쿠키 발급                                 |
| GET `/api/sessions/[code]`                  | 학생용 방 정보                                          |
| POST `/api/sessions/[code]/participants`    | 익명 입장 등록                                          |
| POST `/api/sessions/[code]/status`          | 교사 상태 변경                                          |
| GET `/api/sessions/[code]/responses`        | 교사 대시보드, 또는 `x-participant-id`로 본인 응답 조회 |
| POST / PUT `/api/sessions/[code]/responses` | 익명 응답 생성/수정, `x-participant-id` 필수            |
| POST `/api/sessions/[code]/hidden-words`    | 교사 단어 숨김/복원                                     |
| POST / PUT `/api/sessions/[code]/review`    | 교사 AI 초안 생성 / 최종 감상평 저장                    |

## 구조 및 검증

### YouTube 재생 확인

YouTube URL 입력 후 공식 IFrame Player API로 미리보기를 표시합니다. `onReady`는 준비 완료일 뿐이며, 재생 버튼을 눌러 `PLAYING` 상태가 확인되면 재생 가능으로 표시합니다. 오류 101/150은 외부 재생 차단, 100은 삭제·비공개, 2/5/153 및 나머지 오류는 별도의 재생 안내 카드로 전환합니다. 자동 재생이나 숨겨진 플레이어 검사는 하지 않습니다. 오류가 확인된 영상도 교사가 확인 대화상자에서 선택하면 감상방을 만들 수 있습니다. 관리자 화면에서도 오류를 계속 감지하며, 학생 화면에는 플레이어나 검사 요청을 추가하지 않습니다. 외부 열기 버튼은 DB에 저장된 원본 URL을 사용합니다. 기존 DB 스키마 변경은 필요 없습니다.

`YOUTUBE_API_KEY`는 선택 사항입니다. 없어도 플레이어의 실제 오류 이벤트로 동작합니다. 사전 확인이 필요하면 Google Cloud에서 **YouTube Data API v3**를 사용 설정하고 API 키를 발급한 뒤, 서버의 `.env.local` 또는 배포 환경변수에 `YOUTUBE_API_KEY=발급한키`를 추가하고 서버를 재시작하세요. 키의 API 제한을 YouTube Data API v3로 설정하고, 서버 고정 IP가 있다면 IP 제한도 적용할 수 있습니다. `NEXT_PUBLIC_` 접두사는 사용하지 않습니다.

서버 `GET /api/youtube/check?videoId=...`가 `videos.list(part=status,snippet)`로 `status.embeddable`을 확인합니다. true는 재생 가능 후보일 뿐, 최종 재생 성공이 아닙니다. 키 없음·한도 초과·네트워크 오류는 런타임 검사로 이어집니다. API 키는 브라우저에 전달하지 않으며, 영상/음원을 추출하거나 서버에 저장하지 않습니다.

YouTube 단위 검증은 `npm test`, 이벤트 기반 화면 검증은 개발 서버 실행 후 `node scripts/youtube-browser-test.mjs`로 실행합니다. 화면 검증은 공식 API의 이벤트를 모의 처리하므로 실제 영상의 국가·계정·브라우저별 재생 가능성을 보장하지 않습니다.

`app/` 화면 및 API, `components/` 화면 구성, `lib/` 입력 검증·클라이언트·서버 인증·AI·PDF 모듈, `supabase/schema.sql` DB 구성, `tests/` 자동 검증.

`npm test`는 URL·응답 검증·단어 집계·AI 데이터 필터와 PGlite PostgreSQL 엔진에서 실제 SQL 스키마/제출/수정/마감/만료/접근 권한을 검사합니다. 실제 Supabase와 Gemini 연결은 본인의 키 설정 후 별도 확인이 필요합니다.

수업 전 확인: 교사 방 생성 → 다른 브라우저에서 QR 입장 → 응답 시작 → 학생 제출/수정 → 감상구름과 인원 확인 → 숨김/복원 → 마감 → 감상평 생성/편집/저장 → PDF 다운로드.

## V1 범위와 V2 확장

V1은 교실에서 함께 듣는 단일 활동에 집중합니다. 계정·수업 영구 보관·이미지 생성은 없습니다.

교사 화면의 ‘우리반 분석 결과로 음악만들기’는 기존 `GEMINI_API_KEY`로 Gemini 음악 설계와 Lyria RealTime 실험 모델을 차례로 호출합니다. 숨긴 단어를 제외한 빈도와 저장된 감상평을 영문 악기·선율·분위기 설명 및 BPM·밀도·밝기 설정으로 변환한 뒤 20초 연주곡을 생성합니다. 악기 수를 제한하고 시작과 끝에 1.5초 페이드를 적용합니다. WAV 재생·다운로드를 지원하며 새로고침 후에는 유지되지 않습니다. 설계는 최대 15초, 오디오 생성은 최대 45초이며 생성 중지를 지원합니다. 음악 요청은 기존 `review_requested_at`을 활용해 방별 60초 AI 요청 간격을 검사하므로 감상평 생성 직후에도 잠시 기다려야 합니다. DB 마이그레이션은 필요 없습니다. Node.js 22 이상과 최대 90초 실행 가능한 서버 환경이 필요합니다. 실제 호출 성공은 확인했으나 무료 여부와 한도는 Google 프로젝트의 요금제·사용량에서 확인해야 하며, 유료 모델로 자동 전환하지 않습니다.

V2: 교사 계정/수업 목록/여러 차시, AI 음악·이미지 생성, 단어 의미군 묶기/유사어 통합, 감상 전후 비교, 미술 감상, 원곡과 AI 음악 비교, 학급 공동 창작. AI는 `lib/review.ts`, 미디어는 교사 음악 영역, 방 수명은 `lib/server.ts`와 sessions 테이블을 확장하도록 분리했습니다.

브라우저 회귀 검증: 서버 실행 후 `npm run test:browser` (Google Chrome 필요). 화면 테스트는 방 API를 모의 응답으로 대체하고 실제 키나 비용을 사용하지 않습니다. Supabase가 설정된 환경에서는 설정 오류 확인 단계가 달라질 수 있으므로 이 스크립트는 환경변수 없는 개발 서버에서 실행하세요.
