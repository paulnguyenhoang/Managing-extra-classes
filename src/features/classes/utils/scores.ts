import type { ClassStudentRosterItem, Student } from "@/types/student";

export type ScoreRosterStudent = Student | ClassStudentRosterItem;

export type MonthlyScoreColumn = {
  id: string;
  label: string;
};

export type MonthlyScoreSheet = {
  columns: MonthlyScoreColumn[];
  valuesByStudentId: Record<string, Record<string, string>>;
};

export type MonthlyScoreSheets = Record<string, MonthlyScoreSheet>;

export const scoreMonths = ["2026-05", "2026-06", "2026-07", "2026-08"];

export function formatScoreMonthLabel(month: string) {
  const [year, monthNumber] = month.split("-");
  return `Tháng ${monthNumber}/${year}`;
}

export function getScoreStudentKey(student: ScoreRosterStudent) {
  return String("membershipId" in student ? student.membershipId : student.id);
}

export function createEmptyScoreSheet(students: ScoreRosterStudent[]): MonthlyScoreSheet {
  return {
    columns: [],
    valuesByStudentId: createStudentValueMap(students),
  };
}

export function createInitialScoreSheets(
  classId: string | number,
  students: ScoreRosterStudent[],
): MonthlyScoreSheets {
  const emptySheets = scoreMonths.reduce<MonthlyScoreSheets>((result, month) => {
    result[month] = createEmptyScoreSheet(students);
    return result;
  }, {});

  if (String(classId) !== "van-9a") {
    return emptySheets;
  }

  return {
    ...emptySheets,
    "2026-05": createSheet(students, [
      { id: "score-2026-05-essay", label: "Bài văn số 1" },
      { id: "score-2026-05-reading", label: "Đọc hiểu" },
    ], {
      s1: { "score-2026-05-essay": "8", "score-2026-05-reading": "8.5" },
      s2: { "score-2026-05-essay": "7", "score-2026-05-reading": "7.5" },
      s3: { "score-2026-05-essay": "8.25", "score-2026-05-reading": "8" },
      s4: { "score-2026-05-essay": "", "score-2026-05-reading": "" },
    }),
    "2026-06": createSheet(students, [
      { id: "score-2026-06-social", label: "Nghị luận xã hội" },
      { id: "score-2026-06-monthly", label: "Bài kiểm tra tháng" },
    ], {
      s1: { "score-2026-06-social": "8.5", "score-2026-06-monthly": "9" },
      s2: { "score-2026-06-social": "7.5", "score-2026-06-monthly": "7" },
      s3: { "score-2026-06-social": "8", "score-2026-06-monthly": "8.25" },
      s4: { "score-2026-06-social": "", "score-2026-06-monthly": "6.5" },
    }),
    "2026-07": createSheet(students, [
      { id: "score-2026-07-essay", label: "Bài văn số 1" },
      { id: "score-2026-07-reading", label: "Đọc hiểu" },
      { id: "score-2026-07-social", label: "Nghị luận xã hội" },
    ], {
      s1: {
        "score-2026-07-essay": "8.5",
        "score-2026-07-reading": "9",
        "score-2026-07-social": "8",
      },
      s2: {
        "score-2026-07-essay": "7",
        "score-2026-07-reading": "7.5",
        "score-2026-07-social": "7",
      },
      s3: {
        "score-2026-07-essay": "8",
        "score-2026-07-reading": "8.5",
        "score-2026-07-social": "8.5",
      },
      s4: {
        "score-2026-07-essay": "",
        "score-2026-07-reading": "",
        "score-2026-07-social": "",
      },
    }),
  };
}

export function cloneScoreSheets(sheets: MonthlyScoreSheets): MonthlyScoreSheets {
  return Object.fromEntries(
    Object.entries(sheets).map(([month, sheet]) => [
      month,
      {
        columns: sheet.columns.map((column) => ({ ...column })),
        valuesByStudentId: cloneNestedRecord(sheet.valuesByStudentId),
      },
    ]),
  );
}

export function createNewScoreColumn(): MonthlyScoreColumn {
  return {
    id: `score-column-${Date.now()}`,
    label: "Bài kiểm tra mới",
  };
}

export function canUseScoreInput(value: string) {
  const normalizedValue = value.trim().replace(",", ".");
  return /^(?:10(?:\.0{0,2})?|[0-9](?:\.\d{0,2})?)?$/.test(normalizedValue);
}

export function validateScoreSheet(sheet: MonthlyScoreSheet) {
  for (const studentValues of Object.values(sheet.valuesByStudentId)) {
    for (const score of Object.values(studentValues)) {
      if (!isValidSavedScore(score)) {
        return false;
      }
    }
  }

  return true;
}

export function normalizeScoreSheet(sheet: MonthlyScoreSheet): MonthlyScoreSheet {
  return {
    columns: sheet.columns.map((column) => ({
      ...column,
      label: column.label.trim() || "Bài kiểm tra",
    })),
    valuesByStudentId: Object.fromEntries(
      Object.entries(sheet.valuesByStudentId).map(([studentId, values]) => [
        studentId,
        Object.fromEntries(
          Object.entries(values).map(([columnId, value]) => [columnId, normalizeScore(value)]),
        ),
      ]),
    ),
  };
}

function createSheet(
  students: ScoreRosterStudent[],
  columns: MonthlyScoreColumn[],
  values: Record<string, Record<string, string>>,
): MonthlyScoreSheet {
  return {
    columns,
    valuesByStudentId: Object.fromEntries(
      students.map((student) => {
        const studentKey = getScoreStudentKey(student);

        return [
          studentKey,
          Object.fromEntries(
            columns.map((column) => [column.id, values[studentKey]?.[column.id] ?? ""]),
          ),
        ];
      }),
    ),
  };
}

function createStudentValueMap(students: ScoreRosterStudent[]) {
  return Object.fromEntries(students.map((student) => [getScoreStudentKey(student), {}]));
}

function cloneNestedRecord(record: Record<string, Record<string, string>>) {
  return Object.fromEntries(
    Object.entries(record).map(([key, value]) => [key, { ...value }]),
  );
}

function isValidSavedScore(value: string) {
  const normalizedValue = value.trim().replace(",", ".");
  if (!normalizedValue) {
    return true;
  }

  if (!/^\d+(?:\.\d+)?$/.test(normalizedValue)) {
    return false;
  }

  const score = Number(normalizedValue);
  return Number.isFinite(score) && score >= 0 && score <= 10;
}

function normalizeScore(value: string) {
  const normalizedValue = value.trim().replace(",", ".");
  return normalizedValue ? String(Number(normalizedValue)) : "";
}
