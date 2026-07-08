import { invoke } from "@tauri-apps/api/core";

import type {
  ClassOverview,
  ClassScheduleItem,
  CreateClassInput,
} from "@/types/class";

export function listClassOverviewsByYear(academicYearId: number) {
  return invoke<ClassOverview[]>("list_class_overviews_by_year", {
    academicYearId,
  });
}

export function getClassDetail(classId: number) {
  return invoke<ClassOverview>("get_class_detail", { classId });
}

export function createClass(input: CreateClassInput) {
  return invoke<ClassOverview>("create_class", { request: input });
}

export function updateClassName(classId: number, name: string) {
  return invoke<ClassOverview>("update_class_name", {
    request: { classId, name },
  });
}

export function updateClassMonthlyFee(classId: number, monthlyFee: number) {
  return invoke<ClassOverview>("update_class_monthly_fee", {
    request: { classId, monthlyFee },
  });
}

export function updateClassSchedule(
  classId: number,
  scheduleItems: ClassScheduleItem[],
) {
  return invoke<ClassOverview>("update_class_schedule", {
    request: { classId, scheduleItems },
  });
}

export function updateClassMonthRange(
  classId: number,
  startMonth: string,
  endMonth: string,
) {
  return invoke<ClassOverview>("update_class_month_range", {
    request: { classId, startMonth, endMonth },
  });
}

export function completeClass(classId: number, endMonth: string) {
  return invoke<ClassOverview>("complete_class", {
    request: { classId, endMonth },
  });
}
