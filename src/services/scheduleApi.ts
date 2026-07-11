import { invoke } from "@tauri-apps/api/core";

import type { GlobalScheduleMonthDto } from "@/types/schedule";

export function listGlobalScheduleMonth(academicYearId: number, month: string) {
  return invoke<GlobalScheduleMonthDto>("list_global_schedule_month", {
    academicYearId,
    month,
  });
}
