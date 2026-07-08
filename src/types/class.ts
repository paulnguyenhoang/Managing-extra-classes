export type WeekdayIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type ClassScheduleItem = {
  weekday: WeekdayIndex;
  startTime: string;
  endTime: string;
};

export type ExtraClass = {
  id: string;
  academicYearId: string;
  name: string;
  grade: number;
  schedule: string;
  monthlyFee: number;
  room: string;
  note?: string;
};

export type ClassGrade = 8 | 9;

export const classGradeOptions: ClassGrade[] = [8, 9];

export type ClassStatus = "active" | "completed";

export type ClassOverview = Omit<ExtraClass, "id" | "academicYearId"> & {
  id: number;
  academicYearId: number;
  startMonth: string;
  endMonth: string;
  status: ClassStatus;
  scheduleItems: ClassScheduleItem[];
  studentCount: number;
  unpaidCount: number;
};

export type CreateClassInput = {
  academicYearId: number;
  name: string;
  grade: ClassGrade;
  startMonth: string;
  endMonth: string;
  monthlyFee: number;
  scheduleItems: ClassScheduleItem[];
};
