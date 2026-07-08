import type { PaymentRow, PaymentStatus } from "@/types/payment";

export type PaymentFilter = "all" | PaymentStatus;

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

export function getPaymentSummary(rows: PaymentRow[]): PaymentSummary {
  return {
    totalStudents: rows.length,
    paid: rows.filter((row) => row.status === "paid").length,
    unpaid: rows.filter((row) => row.status === "unpaid").length,
    waived: rows.filter((row) => row.status === "waived").length,
    collected: rows
      .filter((row) => row.status === "paid" || row.status === "waived")
      .reduce((total, row) => total + row.amount, 0),
  };
}

export function filterPaymentRows(rows: PaymentRow[], filter: PaymentFilter) {
  return filter === "all" ? rows : rows.filter((row) => row.status === filter);
}

export function formatPaymentMonth(month: string) {
  const [year, monthNumber] = month.split("-");
  return `${monthNumber}/${year}`;
}

export function formatPaymentMonthLabel(month: string) {
  return `Tháng ${formatPaymentMonth(month)}`;
}

export function isValidWaivedAmount(amount: number, monthlyFee: number) {
  return Number.isInteger(amount) && amount >= 0 && amount <= monthlyFee;
}
