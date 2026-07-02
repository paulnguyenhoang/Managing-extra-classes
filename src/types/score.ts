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
