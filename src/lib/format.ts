import type { AttendanceStatus } from "@/types/attendance";
import type { PaymentStatus } from "@/types/payment";
import type { StudentStatus } from "@/types/student";

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function normalizePhoneNumber(value: string) {
  return value.replace(/\D/g, "").slice(0, 10);
}

export function formatPhoneNumber(value: string) {
  const digits = normalizePhoneNumber(value);

  if (digits.length <= 4) {
    return digits;
  }

  if (digits.length <= 7) {
    return `${digits.slice(0, 4)} ${digits.slice(4)}`;
  }

  return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
}

export function formatShortDate(date: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
  }).format(new Date(date));
}

export function formatDate(date?: string) {
  if (!date) {
    return "-";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(date));
}

export function studentStatusLabel(status: StudentStatus) {
  return status === "active" ? "Đang học" : "Tạm nghỉ";
}

export function paymentStatusLabel(status: PaymentStatus) {
  const labels: Record<PaymentStatus, string> = {
    paid: "Đã đóng",
    unpaid: "Chưa đóng",
    waived: "Miễn giảm",
  };

  return labels[status];
}

export function attendanceStatusLabel(status?: AttendanceStatus) {
  const labels: Record<AttendanceStatus, string> = {
    present: "Học",
    absent: "Nghỉ",
    makeup: "Học bù",
  };

  return status ? labels[status] : "-";
}
