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
  return status === "paid" ? "Đã đóng" : "Chưa đóng";
}

export function attendanceStatusLabel(status?: AttendanceStatus) {
  const labels: Record<AttendanceStatus, string> = {
    present: "Có mặt",
    absent: "Vắng",
    excused: "Có phép",
    late: "Đi muộn",
  };

  return status ? labels[status] : "-";
}
