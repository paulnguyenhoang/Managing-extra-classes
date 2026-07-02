export type AttendanceStatus = "present" | "absent" | "excused" | "late";

export type AttendanceSession = {
  id: string;
  classId: string;
  date: string;
};

export type AttendanceRecord = {
  id: string;
  sessionId: string;
  studentId: string;
  status: AttendanceStatus;
  note?: string;
};
