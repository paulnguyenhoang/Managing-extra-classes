export type StudentStatus = "active" | "paused";

export type Student = {
  id: string;
  classId: string;
  fullName: string;
  schoolClass: string;
  school: string;
  parentPhone: string;
  status: StudentStatus;
  note?: string;
};

export type ClassStudentRosterItem = {
  id: number;
  membershipId: number;
  studentId: number;
  classId: number;
  fullName: string;
  schoolClass: string;
  school: string;
  parentPhone: string;
  status: StudentStatus;
  note?: string;
};

export type StudentListItem = {
  id: number | string;
  membershipId: number | string;
  studentId: number | string;
  classId: number | string;
  fullName: string;
  schoolClass: string;
  school: string;
  parentPhone: string;
  status: StudentStatus;
  note?: string;
};

export type CreateStudentForClassInput = {
  classId: number;
  fullName: string;
  schoolClass: string;
  school: string;
  parentPhone: string;
  note?: string;
};

export type UpdateStudentInput = {
  studentId: number;
  fullName: string;
  schoolClass: string;
  school: string;
  parentPhone: string;
  note?: string;
};
