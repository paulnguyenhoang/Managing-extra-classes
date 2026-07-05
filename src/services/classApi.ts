import { invoke } from "@tauri-apps/api/core";

import type {
  ClassOverview,
  ClassScheduleItem,
  CreateClassInput,
} from "@/types/class";

export function listClassOverviewsByYear(academicYearId: string) {
  return invoke<ClassOverview[]>("list_class_overviews_by_year", {
    academicYearId,
  });
}

export function getClassDetail(classId: string) {
  return invoke<ClassOverview>("get_class_detail", { classId });
}

export function createClass(input: CreateClassInput) {
  return invoke<ClassOverview>("create_class", { request: input });
}

export function updateClassName(classId: string, name: string) {
  return invoke<ClassOverview>("update_class_name", {
    request: { classId, name },
  });
}

export function updateClassMonthlyFee(classId: string, monthlyFee: number) {
  return invoke<ClassOverview>("update_class_monthly_fee", {
    request: { classId, monthlyFee },
  });
}

export function updateClassSchedule(
  classId: string,
  scheduleItems: ClassScheduleItem[],
) {
  return invoke<ClassOverview>("update_class_schedule", {
    request: { classId, scheduleItems },
  });
}
