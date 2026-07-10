export type AttendanceStatus = "present" | "absent" | "makeup";

export type PersistedAttendanceStatus = Exclude<AttendanceStatus, "makeup">;

export type AttendanceSessionType = "regular" | "class_makeup";

export type AttendanceSessionStatus = "active" | "cancelled";

export type AttendanceSession = {
  id: string;
  classId: string;
  date: string;
  content?: string;
  note?: string;
};

export type AttendanceRecord = {
  id: string;
  sessionId: string;
  studentId: string;
  status: AttendanceStatus;
  note?: string;
};

export type AttendanceSessionDto = {
  id: number;
  classId: number;
  sessionDate: string;
  startTime: string;
  endTime: string;
  sessionIndexInWeek: number;
  type: AttendanceSessionType;
  status: AttendanceSessionStatus;
  isLocked: boolean;
  makeupForSessionId: number | null;
};

export type AttendanceOfficialRowDto = {
  id: number;
  membershipId: number;
  studentId: number;
  classId: number;
  fullName: string;
  schoolClass: string;
  school: string;
  parentPhone: string;
  status: "active" | "paused";
  joinedMonth: string;
  leftMonth: string | null;
  note?: string;
  attendanceBySessionId: Record<string, PersistedAttendanceStatus | null>;
};

export type AttendanceWeekDto = {
  classId: number;
  weekStart: string;
  sessions: AttendanceSessionDto[];
  upcomingMakeupSessions: AttendanceSessionDto[];
  officialRows: AttendanceOfficialRowDto[];
};

export type SetAttendanceStatusInput = {
  sessionId: number;
  membershipId: number;
  studentId: number;
  status: PersistedAttendanceStatus | null;
};

export type CreateClassMakeupSessionInput = {
  classId: number;
  originalSessionId: number;
  makeupDate: string;
  startTime: string;
  endTime: string;
  note?: string;
};
