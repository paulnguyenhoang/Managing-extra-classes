import type { PaymentStatus } from "@/types/payment";

export type TuitionDashboardRowDto = {
  classId: number;
  className: string;
  grade: number;
  membershipId: number;
  studentId: number;
  fullName: string;
  schoolClass: string;
  school: string;
  parentPhone: string;
  status: PaymentStatus;
  amount: number;
  paidAt: string | null;
  note: string | null;
  monthlyFee: number;
  paymentId: number | null;
};

export type TuitionDashboardSummaryDto = {
  totalStudents: number;
  paidCount: number;
  unpaidCount: number;
  waivedCount: number;
  totalCollected: number;
};

export type TuitionDashboardDto = {
  academicYearId: number;
  month: string;
  rows: TuitionDashboardRowDto[];
  summary: TuitionDashboardSummaryDto;
};
