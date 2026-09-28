export type Status = "waiting" | "collecting" | "closed";
export type Session = {
  id: string;
  code: string;
  title: string;
  song_title: string;
  artist: string;
  youtube_video_id: string;
  youtube_url?: string;
  teacher_message: string;
  status: Status;
  hidden_words: string[];
  expires_at: string;
};
export type StudentResponse = { words: string[]; reflection: string };
export type Frequency = { word: string; count: number };
export type Dashboard = {
  session: Session;
  participantCount: number;
  responseCount: number;
  frequencies: Frequency[];
  allWords: Frequency[];
  reflections: string[];
  review: string;
};
export const STATUS_LABEL: Record<Status, string> = {
  waiting: "감상 준비 중",
  collecting: "생각 모으는 중",
  closed: "응답 마감",
};
export const DEFAULT_MESSAGE =
  "음악을 들으며 떠오르는 느낌과 장면을 생각해보세요.";
