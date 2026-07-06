import { useCallback, useEffect, useState } from "react";

import { listStudentsByClass } from "@/services/studentApi";
import type { ClassStudentRosterItem } from "@/types/student";

export function useClassStudents(classId: number) {
  const [students, setStudents] = useState<ClassStudentRosterItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      setStudents(await listStudentsByClass(classId));
    } catch (error) {
      console.warn("[class-students] load failed", error);
      setStudents([]);
      setErrorMessage("Không tải được danh sách học sinh từ database.");
    } finally {
      setIsLoading(false);
    }
  }, [classId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    students,
    roster: students,
    isLoading,
    errorMessage,
    refresh,
  };
}
