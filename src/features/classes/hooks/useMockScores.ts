import { useEffect, useState } from "react";
import {
  cloneScoreSheets,
  createInitialScoreSheets,
  createNewScoreColumn,
  getScoreStudentKey,
  normalizeScoreSheet,
  scoreMonths,
  type ScoreRosterStudent,
  validateScoreSheet,
  type MonthlyScoreSheets,
} from "@/features/classes/utils/scores";

export function useMockScores(classId: number, students: ScoreRosterStudent[]) {
  const [selectedMonth, setSelectedMonth] = useState(scoreMonths[2]);
  const [savedSheets, setSavedSheets] = useState<MonthlyScoreSheets>(() =>
    createInitialScoreSheets(classId, students),
  );
  const [draftSheets, setDraftSheets] = useState<MonthlyScoreSheets>(() =>
    cloneScoreSheets(savedSheets),
  );
  const [isEditing, setIsEditing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const activeSheet = draftSheets[selectedMonth];

  useEffect(() => {
    const initialSheets = createInitialScoreSheets(classId, students);
    setSavedSheets(initialSheets);
    setDraftSheets(cloneScoreSheets(initialSheets));
    setSelectedMonth(scoreMonths[2]);
    setIsEditing(false);
    setErrorMessage("");
  }, [classId, students]);

  function startEditing() {
    setDraftSheets(cloneScoreSheets(savedSheets));
    setIsEditing(true);
    setErrorMessage("");
  }

  function cancelEditing() {
    setDraftSheets(cloneScoreSheets(savedSheets));
    setIsEditing(false);
    setErrorMessage("");
  }

  function saveEditing() {
    const sheet = draftSheets[selectedMonth];
    if (!validateScoreSheet(sheet)) {
      setErrorMessage("Điểm phải là số từ 0 đến 10. Có thể để trống nếu chưa có điểm.");
      return;
    }

    setSavedSheets((current) => ({
      ...current,
      [selectedMonth]: normalizeScoreSheet(sheet),
    }));
    setDraftSheets((current) => ({
      ...current,
      [selectedMonth]: normalizeScoreSheet(sheet),
    }));
    setIsEditing(false);
    setErrorMessage("");
  }

  function changeMonth(month: string) {
    setSelectedMonth(month);
    setDraftSheets(cloneScoreSheets(savedSheets));
    setIsEditing(false);
    setErrorMessage("");
  }

  function addColumn() {
    const nextColumn = createNewScoreColumn();
    setDraftSheets((current) => ({
      ...current,
      [selectedMonth]: {
        ...current[selectedMonth],
        columns: [...current[selectedMonth].columns, nextColumn],
        valuesByStudentId: Object.fromEntries(
          students.map((student) => {
            const studentKey = getScoreStudentKey(student);

            return [
              studentKey,
              {
                ...(current[selectedMonth].valuesByStudentId[studentKey] ?? {}),
                [nextColumn.id]: "",
              },
            ];
          }),
        ),
      },
    }));
    setIsEditing(true);
    setErrorMessage("");
  }

  function updateColumnLabel(columnId: string, label: string) {
    setDraftSheets((current) => ({
      ...current,
      [selectedMonth]: {
        ...current[selectedMonth],
        columns: current[selectedMonth].columns.map((column) =>
          column.id === columnId ? { ...column, label } : column,
        ),
      },
    }));
  }

  function deleteColumn(columnId: string) {
    setDraftSheets((current) => ({
      ...current,
      [selectedMonth]: {
        ...current[selectedMonth],
        columns: current[selectedMonth].columns.filter((column) => column.id !== columnId),
        valuesByStudentId: Object.fromEntries(
          Object.entries(current[selectedMonth].valuesByStudentId).map(([studentId, values]) => {
            const { [columnId]: _deletedScore, ...remainingValues } = values;
            return [studentId, remainingValues];
          }),
        ),
      },
    }));
  }

  function updateScore(studentId: string, columnId: string, value: string) {
    setDraftSheets((current) => ({
      ...current,
      [selectedMonth]: {
        ...current[selectedMonth],
        valuesByStudentId: {
          ...current[selectedMonth].valuesByStudentId,
          [studentId]: {
            ...(current[selectedMonth].valuesByStudentId[studentId] ?? {}),
            [columnId]: value,
          },
        },
      },
    }));
  }

  return {
    activeSheet,
    errorMessage,
    isEditing,
    selectedMonth,
    students,
    addColumn,
    cancelEditing,
    changeMonth,
    deleteColumn,
    saveEditing,
    startEditing,
    updateColumnLabel,
    updateScore,
  };
}
