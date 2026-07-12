import {
  currentMonthKey,
  isValidMonthKey,
  monthsInRange,
} from "@/lib/months";
import type { AcademicYear } from "@/types/academic-year";
import type { ClassOverview } from "@/types/class";

export function getClassMonthOptionsForYear(
  academicYear: AcademicYear | null,
  classOverviews: ClassOverview[],
) {
  const fallbackStartMonth = academicYear?.startsAt.slice(0, 7) ?? currentMonthKey();
  const fallbackEndMonth = academicYear?.endsAt.slice(0, 7) ?? currentMonthKey();
  const classesInYear = academicYear
    ? classOverviews.filter((classItem) => classItem.academicYearId === academicYear.id)
    : classOverviews;

  const classStartMonths = classesInYear
    .map((classItem) => classItem.startMonth)
    .filter(isValidMonthKey)
    .sort();
  const classEndMonths = classesInYear
    .map((classItem) => classItem.endMonth)
    .filter(isValidMonthKey)
    .sort();

  const startMonth = classStartMonths[0] ?? fallbackStartMonth;
  const endMonth = classEndMonths[classEndMonths.length - 1] ?? fallbackEndMonth;

  if (!isValidMonthKey(startMonth) || !isValidMonthKey(endMonth) || startMonth > endMonth) {
    return [currentMonthKey()];
  }

  return monthsInRange(startMonth, endMonth);
}
