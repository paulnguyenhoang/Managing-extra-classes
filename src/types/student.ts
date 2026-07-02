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
