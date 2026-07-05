import { invoke } from "@tauri-apps/api/core";

import type {
  CreateStudentForClassInput,
  StudentListItem,
  StudentStatus,
  UpdateStudentInput,
} from "@/types/student";

export function listStudentsByClass(classId: number) {
  return invoke<StudentListItem[]>("list_students_by_class", { classId });
}

export function createStudentForClass(input: CreateStudentForClassInput) {
  return invoke<StudentListItem>("create_student_for_class", { request: input });
}

export function updateStudent(input: UpdateStudentInput) {
  return invoke<void>("update_student", { request: input });
}

export function updateClassMembershipStatus(membershipId: number, status: StudentStatus) {
  return invoke<void>("update_class_membership_status", {
    request: { membershipId, status },
  });
}
