import type { Database } from "@/types/database";

export type StudyStatus = Database["public"]["Enums"]["study_status"];

/** Labels live in messages: status.<key>. */
export const STUDY_STATUSES: { key: StudyStatus }[] = [{ key: "backlog" }, { key: "today" }, { key: "in_progress" }, { key: "done" }];

export function isStudyStatus(v: string): v is StudyStatus {
  return STUDY_STATUSES.some((s) => s.key === v);
}

export const STUDY_TITLE_MAX = 200;

/** Newer = smaller position = shown first (columns are ordered by position asc). */
export function topPosition(): number {
  return -Date.now() / 1000;
}
