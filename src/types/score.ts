export type ScoreColumn = {
  id: string;
  classId: string;
  label: string;
};

export type ScoreRecord = {
  id: string;
  columnId: string;
  studentId: string;
  value: number | null;
  note?: string;
};
