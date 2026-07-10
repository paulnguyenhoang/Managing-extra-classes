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
  attendanceBySessionId: Record<string, AttendanceStatus | null>;
};

export type AttendanceReceivingMakeupRowDto = {
  makeupRecordId: number;
  studentId: number;
  originalMembershipId: number;
  originalClassId: number;
  originalClassName: string;
  originalSessionId: number;
  originalSessionDate: string;
  receivingClassId: number;
  receivingSessionId: number;
  sessionIndexInWeek: number;
  fullName: string;
  schoolClass: string;
  school: string;
  parentPhone: string;
  receivingAttendanceStatus: PersistedAttendanceStatus | null;
  note: string | null;
};

export type AttendanceMakeupDetailDto = {
  makeupRecordId: number;
  originalMembershipId: number;
  originalSessionId: number;
  receivingClassId: number;
  receivingClassName: string;
  receivingSessionId: number;
  receivingSessionDate: string;
  receivingStartTime: string;
  receivingEndTime: string;
  receivingAttendanceStatus: PersistedAttendanceStatus | null;
};

export type AttendanceWeekDto = {
  classId: number;
  weekStart: string;
  sessions: AttendanceSessionDto[];
  upcomingMakeupSessions: AttendanceSessionDto[];
  officialRows: AttendanceOfficialRowDto[];
  receivingMakeupRows: AttendanceReceivingMakeupRowDto[];
  makeupDetails: AttendanceMakeupDetailDto[];
};

export type SetAttendanceStatusInput = {
  sessionId: number;
  membershipId: number;
  studentId: number;
  status: PersistedAttendanceStatus | null;
};

export type StudentMakeupOptionDto = {
  receivingClassId: number;
  receivingClassName: string;
  receivingSessionId: number;
  receivingSessionDate: string;
  startTime: string;
  endTime: string;
  sessionIndexInWeek: number;
  type: AttendanceSessionType;
  status: AttendanceSessionStatus;
  isLocked: boolean;
};

export type StudentMakeupOptionsDto = {
  studentId: number;
  membershipId: number;
  originalClassId: number;
  originalClassName: string;
  originalSessionId: number;
  originalSessionDate: string;
  sessionIndexInWeek: number;
  options: StudentMakeupOptionDto[];
};

export type ListStudentMakeupOptionsInput = {
  classId: number;
  originalSessionId: number;
  membershipId: number;
  studentId: number;
};

export type CreateStudentMakeupRecordInput = {
  studentId: number;
  originalMembershipId: number;
  originalSessionId: number;
  receivingSessionId: number;
  note?: string;
};

export type RemoveStudentMakeupRecordInput = {
  originalSessionId: number;
  originalMembershipId: number;
};

export type SetReceivingMakeupStatusInput = {
  makeupRecordId: number;
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
