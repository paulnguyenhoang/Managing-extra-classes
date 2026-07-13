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

const vietnameseDigits = [
  "không",
  "một",
  "hai",
  "ba",
  "bốn",
  "năm",
  "sáu",
  "bảy",
  "tám",
  "chín",
];

function readVietnameseThreeDigits(value: number, forceHundreds: boolean) {
  const hundred = Math.floor(value / 100);
  const ten = Math.floor((value % 100) / 10);
  const unit = value % 10;
  const words: string[] = [];

  if (hundred > 0) {
    words.push(vietnameseDigits[hundred], "trăm");
  } else if (forceHundreds && (ten > 0 || unit > 0)) {
    words.push("không", "trăm");
  }

  if (ten > 1) {
    words.push(vietnameseDigits[ten], "mươi");
    if (unit === 1) {
      words.push("mốt");
    } else if (unit === 5) {
      words.push("lăm");
    } else if (unit > 0) {
      words.push(vietnameseDigits[unit]);
    }
  } else if (ten === 1) {
    words.push("mười");
    if (unit === 5) {
      words.push("lăm");
    } else if (unit > 0) {
      words.push(vietnameseDigits[unit]);
    }
  } else if (unit > 0) {
    if (hundred > 0 || forceHundreds) {
      words.push("lẻ");
    }
    words.push(vietnameseDigits[unit]);
  }

  return words.join(" ");
}

export function formatVietnameseMoneyWords(amount: number) {
  const roundedAmount = Math.round(Math.abs(amount));

  if (roundedAmount === 0) {
    return "không";
  }

  const units = ["", "nghìn", "triệu", "tỷ", "nghìn tỷ", "triệu tỷ"];
  const groups: number[] = [];
  let remaining = roundedAmount;

  while (remaining > 0) {
    groups.push(remaining % 1000);
    remaining = Math.floor(remaining / 1000);
  }

  const parts: string[] = [];

  for (let index = groups.length - 1; index >= 0; index -= 1) {
    const group = groups[index];

    if (group === 0) {
      continue;
    }

    const isLowerGroup = index < groups.length - 1;
    const words = readVietnameseThreeDigits(group, isLowerGroup && group < 100);
    const unit = units[index] ?? "";
    parts.push([words, unit].filter(Boolean).join(" "));
  }

  return parts.join(" ").replace(/\s+/g, " ").trim();
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
