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
