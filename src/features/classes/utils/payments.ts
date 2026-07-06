import type { Payment, PaymentStatus } from "@/types/payment";
import type { ClassStudentRosterItem, Student } from "@/types/student";

export type PaymentFilter = "all" | PaymentStatus;

export type PaymentRow = {
  student: PaymentRosterStudent;
  payment: Payment;
};

export type PaymentRosterStudent = Student | ClassStudentRosterItem;

export type PaymentSummary = {
  totalStudents: number;
  paid: number;
  unpaid: number;
  waived: number;
  collected: number;
};

export const paymentStatusOptions: Array<{ value: PaymentStatus; label: string }> = [
  { value: "unpaid", label: "Chưa đóng" },
  { value: "paid", label: "Đã đóng" },
  { value: "waived", label: "Miễn giảm" },
];

export const paymentFilterOptions: Array<{ value: PaymentFilter; label: string }> = [
  { value: "all", label: "Tất cả" },
  ...paymentStatusOptions,
];

export const paymentSelectClasses: Record<PaymentStatus, string> = {
  paid:
    "!border-emerald-200 !bg-emerald-50 !text-emerald-900 hover:!bg-emerald-100 [&_svg]:!text-emerald-800",
  unpaid:
    "!border-amber-200 !bg-amber-50 !text-amber-900 hover:!bg-amber-100 [&_svg]:!text-amber-800",
  waived:
    "!border-violet-200 !bg-violet-50 !text-violet-900 hover:!bg-violet-100 [&_svg]:!text-violet-800",
};

export function getPaymentStudentKey(student: PaymentRosterStudent) {
  return String("membershipId" in student ? student.membershipId : student.id);
}

export function getPaymentRows(
  students: PaymentRosterStudent[],
  payments: Payment[],
  classId: string | number,
  month: string,
) {
  return students.map<PaymentRow>((student) => {
    const studentKey = getPaymentStudentKey(student);
    const payment =
      payments.find((item) => item.studentId === studentKey) ??
      createUnpaidPayment(studentKey, String(classId), month);

    return { student, payment };
  });
}

export function createUnpaidPayment(studentId: string, classId: string, month: string): Payment {
  return {
    id: `mock-payment-${month}-${studentId}`,
    studentId,
    classId,
    month,
    status: "unpaid",
    amount: 0,
  };
}

export function getPaymentSummary(rows: PaymentRow[]): PaymentSummary {
  return {
    totalStudents: rows.length,
    paid: rows.filter((row) => row.payment.status === "paid").length,
    unpaid: rows.filter((row) => row.payment.status === "unpaid").length,
    waived: rows.filter((row) => row.payment.status === "waived").length,
    collected: rows
      .filter((row) => row.payment.status === "paid" || row.payment.status === "waived")
      .reduce((total, row) => total + row.payment.amount, 0),
  };
}

export function filterPaymentRows(rows: PaymentRow[], filter: PaymentFilter) {
  return filter === "all" ? rows : rows.filter((row) => row.payment.status === filter);
}

export function formatPaymentMonth(month: string) {
  const [year, monthNumber] = month.split("-");
  return `${monthNumber}/${year}`;
}

export function formatPaymentMonthLabel(month: string) {
  return `Tháng ${formatPaymentMonth(month)}`;
}

export function todayDateKey() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function upsertPayment(payments: Payment[], nextPayment: Payment) {
  const exists = payments.some((payment) => payment.studentId === nextPayment.studentId);

  return exists
    ? payments.map((payment) =>
        payment.studentId === nextPayment.studentId ? nextPayment : payment,
      )
    : [...payments, nextPayment];
}

export function isValidWaivedAmount(amount: number, monthlyFee: number) {
  return amount >= 0 && amount <= monthlyFee;
}
