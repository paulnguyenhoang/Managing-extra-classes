export type PaymentStatus = "paid" | "unpaid" | "waived";

export type Payment = {
  id: string;
  studentId: string;
  classId: string;
  month: string;
  status: PaymentStatus;
  amount: number;
  paidAt?: string;
  note?: string;
};

export type PaymentRow = {
  membershipId: number;
  studentId: number;
  classId: number;
  fullName: string;
  schoolClass: string;
  school: string;
  parentPhone: string;
  membershipStatus: "active" | "paused";
  paymentId: number | null;
  month: string;
  status: PaymentStatus;
  amount: number;
  paidAt: string | null;
  note: string | null;
};

export type PaymentActionInput = {
  membershipId: number;
  classId: number;
  studentId: number;
  month: string;
  amount?: number;
};

export type PaymentWaiverInput = {
  membershipId: number;
  classId: number;
  studentId: number;
  month: string;
  amount: number;
  note: string;
};

export type PaymentNoteInput = {
  membershipId: number;
  classId: number;
  studentId: number;
  month: string;
  note: string;
};
