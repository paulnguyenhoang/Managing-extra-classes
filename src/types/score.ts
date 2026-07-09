export type ScoreType =
  | "essay"
  | "short"
  | "oral"
  | "midterm"
  | "final"
  | "mock_exam"
  | "other";

export type ScoreColumn = {
  id: string;
  classId: string;
  label: string;
  type?: ScoreType;
  testDate?: string;
  weight?: number;
  note?: string;
};

export type ScoreRecord = {
  id: string;
  columnId: string;
  studentId: string;
  value: number | null;
  note?: string;
};

// ===== SQLite Phase 6 DTOs =====

export type ScoreColumnDto = {
  id: number;
  classId: number;
  month: string;
  label: string;
  sortOrder: number;
};

export type ScoreSheetRow = {
  membershipId: number;
  studentId: number;
  classId: number;
  fullName: string;
  schoolClass: string;
  school: string;
  parentPhone: string;
  membershipStatus: "active" | "paused";
  joinedMonth: string;
  leftMonth: string | null;
  valuesByColumnId: Record<string, number | null>;
};

export type ScoreSheetDto = {
  classId: number;
  month: string;
  columns: ScoreColumnDto[];
  rows: ScoreSheetRow[];
};

export type AddScoreColumnInput = {
  classId: number;
  month: string;
  label: string;
};

export type RenameScoreColumnInput = {
  columnId: number;
  label: string;
};

export type SaveScoreValueInput = {
  columnId: number;
  membershipId: number;
  studentId: number;
  value: number | null;
};

export type SaveScoreValuesInput = {
  classId: number;
  month: string;
  values: SaveScoreValueInput[];
};
