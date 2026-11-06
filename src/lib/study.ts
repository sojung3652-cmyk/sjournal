import type { Database } from "@/types/database";

export type StudyStatus = Database["public"]["Enums"]["study_status"];

export const STUDY_STATUSES: { key: StudyStatus; label: string }[] = [
  { key: "backlog", label: "앞으로 할 것" },
  { key: "today", label: "오늘" },
  { key: "in_progress", label: "진행 중" },
  { key: "done", label: "완료" },
];

export function isStudyStatus(v: string): v is StudyStatus {
  return STUDY_STATUSES.some((s) => s.key === v);
}

export const STUDY_TITLE_MAX = 200;

/** Newer = smaller position = shown first (columns are ordered by position asc). */
export function topPosition(): number {
  return -Date.now() / 1000;
}
