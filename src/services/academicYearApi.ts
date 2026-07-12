import { invoke } from "@tauri-apps/api/core";

import type {
  AcademicYear,
  CreateAcademicYearInput,
  UpdateAcademicYearInput,
} from "@/types/academic-year";

export function listAcademicYears() {
  return invoke<AcademicYear[]>("list_academic_years");
}

export function getCurrentAcademicYearId() {
  return invoke<number>("get_current_academic_year_id");
}

export function setCurrentAcademicYear(academicYearId: number) {
  return invoke<void>("set_current_academic_year", { academicYearId });
}

export function createAcademicYear(input: CreateAcademicYearInput) {
  return invoke<AcademicYear>("create_academic_year", { request: input });
}

export function updateAcademicYear(input: UpdateAcademicYearInput) {
  return invoke<AcademicYear>("update_academic_year", { request: input });
}
