import { invoke } from "@tauri-apps/api/core";

import type {
  ClassStudentRosterItem,
  CreateStudentForClassInput,
  StudentStatus,
  UpdateStudentInput,
} from "@/types/student";

export function listStudentsByClass(classId: number) {
  return invoke<ClassStudentRosterItem[]>("list_students_by_class", { classId });
}

export function createStudentForClass(input: CreateStudentForClassInput) {
  return invoke<ClassStudentRosterItem>("create_student_for_class", { request: input });
}

export function updateStudent(input: UpdateStudentInput) {
  return invoke<void>("update_student", { request: input });
}

export function updateClassMembershipStatus(membershipId: number, status: StudentStatus) {
  return invoke<void>("update_class_membership_status", {
    request: { membershipId, status },
  });
}

export function pauseStudentMembership(membershipId: number, leftMonth: string) {
  return invoke<void>("pause_student_membership", {
    request: { membershipId, leftMonth },
  });
}

export function reactivateStudentMembership(membershipId: number) {
  return invoke<void>("reactivate_student_membership", {
    request: { membershipId },
  });
}
