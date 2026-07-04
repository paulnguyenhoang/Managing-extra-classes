export type AttendanceStatus = "present" | "absent" | "makeup";

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
