import { invoke } from "@tauri-apps/api/core";

import type {
  PaymentActionInput,
  PaymentNoteInput,
  PaymentRow,
  PaymentWaiverInput,
} from "@/types/payment";

export function listPaymentsByClassMonth(classId: number, month: string) {
  return invoke<PaymentRow[]>("list_payments_by_class_month", { classId, month });
}

export function setPaymentPaid(input: PaymentActionInput) {
  return invoke<void>("set_payment_paid", { request: input });
}

export function setPaymentUnpaid(input: PaymentActionInput) {
  return invoke<void>("set_payment_unpaid", { request: input });
}

export function setPaymentWaived(input: PaymentWaiverInput) {
  return invoke<void>("set_payment_waived", { request: input });
}

export function updatePaymentNote(input: PaymentNoteInput) {
  return invoke<void>("update_payment_note", { request: input });
}
