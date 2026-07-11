import { invoke } from "@tauri-apps/api/core";

import type { TuitionDashboardDto } from "@/types/tuition";

export function listTuitionDashboard(academicYearId: number, month: string) {
  return invoke<TuitionDashboardDto>("list_tuition_dashboard", { academicYearId, month });
}
