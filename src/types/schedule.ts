import type { AttendanceSessionStatus, AttendanceSessionType } from "@/types/attendance";
import type { ClassStatus } from "@/types/class";

export type GlobalScheduleEventDto = {
  id: string;
  source: "schedule" | "attendance_session";
  sessionId: number | null;
  classId: number;
  className: string;
  grade: number;
  date: string;
  weekday: number;
  startTime: string;
  endTime: string;
  sessionIndexInWeek: number;
  type: AttendanceSessionType;
  status: AttendanceSessionStatus;
  isLocked: boolean | null;
  makeupForSessionId: number | null;
  classStartMonth: string;
  classEndMonth: string;
  classStatus: ClassStatus;
  monthlyFee: number;
  studentCount: number;
  note: string | null;
};

export type GlobalScheduleMonthDto = {
  academicYearId: number;
  month: string;
  events: GlobalScheduleEventDto[];
};
