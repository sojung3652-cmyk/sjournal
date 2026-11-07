import type { Database } from "@/types/database";

export type StudyStatus = Database["public"]["Enums"]["study_status"];

export const STUDY_STATUSES: { key: StudyStatus; label: string }[] = [
  { key: "backlog", label: "Backlog" },
  { key: "today", label: "Today" },
  { key: "in_progress", label: "In progress" },
  { key: "done", label: "Done" },
];

export function isStudyStatus(v: string): v is StudyStatus {
  return STUDY_STATUSES.some((s) => s.key === v);
}

export const STUDY_TITLE_MAX = 200;

/** Newer = smaller position = shown first (columns are ordered by position asc). */
export function topPosition(): number {
  return -Date.now() / 1000;
}
