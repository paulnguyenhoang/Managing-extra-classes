import { invoke } from "@tauri-apps/api/core";

import type { AcademicYear } from "@/types/academic-year";

export function listAcademicYears() {
  return invoke<AcademicYear[]>("list_academic_years");
}

export function getCurrentAcademicYearId() {
  return invoke<string>("get_current_academic_year_id");
}

export function setCurrentAcademicYear(academicYearId: string) {
  return invoke<void>("set_current_academic_year", { academicYearId });
}
