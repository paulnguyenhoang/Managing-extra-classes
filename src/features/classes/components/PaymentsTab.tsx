import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Download, LockKeyhole, Search, UnlockKeyhole } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ConfirmPaidDialog } from "@/features/classes/components/ConfirmPaidDialog";
import { TuitionWaiverDialog } from "@/features/classes/components/TuitionWaiverDialog";
import {
  filterPaymentRows,
  formatPaymentMonth,
  formatPaymentMonthLabel,
  getPaymentSummary,
  paymentFilterOptions,
  paymentSelectClasses,
  paymentStatusOptions,
  type PaymentFilter,
} from "@/features/classes/utils/payments";
import { formatCurrency, formatDate } from "@/lib/format";
import { clampMonthToRange, currentMonthKey, isValidMonthKey, monthsInRange } from "@/lib/months";
import {
  listPaymentsByClassMonth,
  setPaymentPaid,
  setPaymentUnpaid,
  setPaymentWaived,
  updatePaymentNote,
} from "@/services/paymentApi";
import type { PaymentRow, PaymentStatus } from "@/types/payment";

type PaymentsTabProps = {
  classId: number;
  classStartMonth: string;
  classEndMonth: string;
  monthlyFeeOverride?: number;
  onPaymentsChanged?: () => void | Promise<void>;
};

export function PaymentsTab({
  classId,
  classStartMonth,
  classEndMonth,
  monthlyFeeOverride,
  onPaymentsChanged,
}: PaymentsTabProps) {
  const hasValidRange =
    isValidMonthKey(classStartMonth) &&
    isValidMonthKey(classEndMonth) &&
    classStartMonth <= classEndMonth;
  const monthOptions = useMemo(
    () =>
      hasValidRange
        ? monthsInRange(classStartMonth, classEndMonth)
        : [currentMonthKey()],
    [classEndMonth, classStartMonth, hasValidRange],
  );
  const [selectedMonth, setSelectedMonth] = useState(() =>
    hasValidRange
      ? clampMonthToRange(currentMonthKey(), classStartMonth, classEndMonth)
      : currentMonthKey(),
  );

  // Nếu thời gian học của lớp thay đổi làm tháng đang chọn rơi ra ngoài, kéo về tháng hợp lệ.
  useEffect(() => {
    if (hasValidRange && (selectedMonth < classStartMonth || selectedMonth > classEndMonth)) {
      setSelectedMonth(clampMonthToRange(currentMonthKey(), classStartMonth, classEndMonth));
    }
  }, [classEndMonth, classStartMonth, hasValidRange, selectedMonth]);
  const [filter, setFilter] = useState<PaymentFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [rows, setRows] = useState<PaymentRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [pendingPaidRow, setPendingPaidRow] = useState<PaymentRow | null>(null);
  const [pendingWaivedRow, setPendingWaivedRow] = useState<PaymentRow | null>(null);
  const [pendingUnlockRow, setPendingUnlockRow] = useState<PaymentRow | null>(null);
  const [unlockedPaymentKeys, setUnlockedPaymentKeys] = useState<Set<string>>(() => new Set());
  const [noteDrafts, setNoteDrafts] = useState<Record<number, string>>({});
  const monthlyFee = monthlyFeeOverride ?? 0;

  const refreshRows = useCallback(async () => {
    setErrorMessage("");

    try {
      const nextRows = await listPaymentsByClassMonth(classId, selectedMonth);
      setRows(nextRows);
      setNoteDrafts({});
    } catch (error) {
      console.warn("[payments] load failed", error);
      setRows([]);
      setErrorMessage("Không tải được dữ liệu học phí từ database.");
    }
  }, [classId, selectedMonth]);

  useEffect(() => {
    let cancelled = false;

    setIsLoading(true);
    refreshRows().finally(() => {
      if (!cancelled) {
        setIsLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [refreshRows]);

  useEffect(() => {
    setUnlockedPaymentKeys(new Set());
  }, [classId, selectedMonth]);

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const visibleRows = filterPaymentRows(rows, filter).filter((row) =>
    normalizedQuery ? row.fullName.toLowerCase().includes(normalizedQuery) : true,
  );
  const summary = getPaymentSummary(rows);
  const selectedMonthLabel = formatPaymentMonth(selectedMonth);
  const selectedMonthIndex = monthOptions.indexOf(selectedMonth);
  const canGoPreviousMonth = selectedMonthIndex > 0;
  const canGoNextMonth = selectedMonthIndex >= 0 && selectedMonthIndex < monthOptions.length - 1;

  async function runPaymentAction(action: () => Promise<void>, failureMessage: string) {
    setIsSaving(true);
    setErrorMessage("");

    try {
      await action();
      await refreshRows();
      void Promise.resolve(onPaymentsChanged?.()).catch((error) => {
        console.warn("[payments] refresh class overview failed", error);
      });
    } catch (error) {
      console.warn("[payments] action failed", error);
      setErrorMessage(typeof error === "string" ? error : failureMessage);
    } finally {
      setIsSaving(false);
    }
  }

  function paymentLockKey(row: PaymentRow) {
    return `${selectedMonth}:${row.membershipId}`;
  }

  function isPaymentLocked(row: PaymentRow) {
    return row.status !== "unpaid" && !unlockedPaymentKeys.has(paymentLockKey(row));
  }

  function getStatusLabel(status: PaymentStatus) {
    return paymentStatusOptions.find((option) => option.value === status)?.label ?? status;
  }

  function lockPaymentRow(row: PaymentRow) {
    const key = paymentLockKey(row);
    setUnlockedPaymentKeys((current) => {
      const next = new Set(current);
      next.delete(key);
      return next;
    });
  }

  function confirmUnlockPayment() {
    if (!pendingUnlockRow) {
      return;
    }

    const key = paymentLockKey(pendingUnlockRow);
    setUnlockedPaymentKeys((current) => {
      const next = new Set(current);
      next.add(key);
      return next;
    });
    setPendingUnlockRow(null);
  }

  function handleStatusChange(row: PaymentRow, status: PaymentStatus) {
    if (status === row.status) {
      return;
    }

    if (status === "paid") {
      setPendingPaidRow(row);
      return;
    }

    if (status === "waived") {
      setPendingWaivedRow(row);
      return;
    }

    void runPaymentAction(
      () =>
        setPaymentUnpaid({
          membershipId: row.membershipId,
          classId: row.classId,
          studentId: row.studentId,
          month: selectedMonth,
        }),
      "Không lưu được trạng thái chưa đóng.",
    );
  }

  function confirmPaid() {
    if (!pendingPaidRow) {
      return;
    }

    const row = pendingPaidRow;
    lockPaymentRow(row);
    setPendingPaidRow(null);
    void runPaymentAction(
      () =>
        setPaymentPaid({
          membershipId: row.membershipId,
          classId: row.classId,
          studentId: row.studentId,
          month: selectedMonth,
        }),
      "Không lưu được trạng thái đã đóng.",
    );
  }

  function saveWaiver(amount: number, note: string) {
    if (!pendingWaivedRow) {
      return;
    }

    const row = pendingWaivedRow;
    lockPaymentRow(row);
    setPendingWaivedRow(null);
    void runPaymentAction(
      () =>
        setPaymentWaived({
          membershipId: row.membershipId,
          classId: row.classId,
          studentId: row.studentId,
          month: selectedMonth,
          amount,
          note,
        }),
      "Không lưu được miễn giảm học phí.",
    );
  }

  function saveNoteIfChanged(row: PaymentRow) {
    const draft = noteDrafts[row.membershipId];

    if (draft === undefined || draft === (row.note ?? "")) {
      return;
    }

    void runPaymentAction(
      () =>
        updatePaymentNote({
          membershipId: row.membershipId,
          classId: row.classId,
          studentId: row.studentId,
          month: selectedMonth,
          note: draft,
        }),
      "Không lưu được ghi chú học phí.",
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative min-w-64 flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="h-9 bg-white pl-9"
            placeholder="Tìm nhanh tên học sinh..."
          />
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              className="h-9 w-9"
              disabled={!canGoPreviousMonth || isSaving}
              onClick={() => {
                if (canGoPreviousMonth) {
                  setSelectedMonth(monthOptions[selectedMonthIndex - 1]);
                }
              }}
            >
              <ChevronLeft className="size-4" />
              <span className="sr-only">Tháng trước</span>
            </Button>
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="h-9 min-w-44 bg-white">
                <SelectValue placeholder="Chọn tháng" />
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map((month) => (
                  <SelectItem key={month} value={month}>
                    {formatPaymentMonthLabel(month)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              className="h-9 w-9"
              disabled={!canGoNextMonth || isSaving}
              onClick={() => {
                if (canGoNextMonth) {
                  setSelectedMonth(monthOptions[selectedMonthIndex + 1]);
                }
              }}
            >
              <ChevronRight className="size-4" />
              <span className="sr-only">Tháng sau</span>
            </Button>
          </div>
          <Select value={filter} onValueChange={(value) => setFilter(value as PaymentFilter)}>
            <SelectTrigger className="h-9 min-w-36 bg-white">
              <SelectValue placeholder="Lọc trạng thái" />
            </SelectTrigger>
            <SelectContent>
              {paymentFilterOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" className="gap-2">
            <Download className="size-4" />
            <span className="hidden sm:inline">Xuất Excel</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3">
        <SummaryCard label="Đã đóng" value={summary.paid} />
        <SummaryCard label="Chưa đóng" value={summary.unpaid} />
        <SummaryCard label="Miễn giảm" value={summary.waived} />
        <SummaryCard label="Tổng đã thu" value={formatCurrency(summary.collected)} />
      </div>

      {errorMessage ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}

      <div className="min-w-0 rounded-lg border bg-white">
        <Table className="min-w-[900px]">
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead>STT</TableHead>
              <TableHead>Họ tên</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead>Số tiền</TableHead>
              <TableHead>Ngày đóng</TableHead>
              <TableHead>Ghi chú</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-slate-600">
                  Đang tải dữ liệu học phí...
                </TableCell>
              </TableRow>
            ) : null}
            {!isLoading && visibleRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-slate-600">
                  Không có học sinh phù hợp.
                </TableCell>
              </TableRow>
            ) : null}
            {!isLoading &&
              visibleRows.map((row, index) => (
                <TableRow key={row.membershipId}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell className="font-medium text-slate-950">{row.fullName}</TableCell>
                  <TableCell>
                    {isPaymentLocked(row) ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <div
                          className={[
                            "flex h-8 w-36 items-center justify-between rounded-md border px-3 text-sm font-medium",
                            paymentSelectClasses[row.status],
                          ].join(" ")}
                        >
                          <span>{getStatusLabel(row.status)}</span>
                          <LockKeyhole className="size-3.5 shrink-0" />
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={isSaving}
                          className="h-8 gap-1.5 px-2 text-xs"
                          onClick={() => setPendingUnlockRow(row)}
                        >
                          <UnlockKeyhole className="size-3.5" />
                          Mở khóa
                        </Button>
                      </div>
                    ) : (
                      <Select
                        value={row.status}
                        disabled={isSaving}
                        onValueChange={(value) => handleStatusChange(row, value as PaymentStatus)}
                      >
                        <SelectTrigger
                          className={[
                            "h-8 w-36 justify-between font-medium shadow-none",
                            paymentSelectClasses[row.status],
                          ].join(" ")}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {paymentStatusOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </TableCell>
                  <TableCell>{formatCurrency(row.amount)}</TableCell>
                  <TableCell>{formatDate(row.paidAt ?? undefined)}</TableCell>
                  <TableCell>
                    <Input
                      value={noteDrafts[row.membershipId] ?? row.note ?? ""}
                      disabled={isSaving}
                      onChange={(event) =>
                        setNoteDrafts((current) => ({
                          ...current,
                          [row.membershipId]: event.target.value,
                        }))
                      }
                      onBlur={() => saveNoteIfChanged(row)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.currentTarget.blur();
                        }
                      }}
                      className="h-8 min-w-56 bg-white"
                      placeholder="Thêm ghi chú"
                    />
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>

      <ConfirmPaidDialog
        open={Boolean(pendingPaidRow)}
        studentName={pendingPaidRow?.fullName ?? ""}
        monthLabel={selectedMonthLabel}
        monthlyFee={monthlyFee}
        onOpenChange={(open) => {
          if (!open) {
            setPendingPaidRow(null);
          }
        }}
        onConfirm={confirmPaid}
      />
      <TuitionWaiverDialog
        open={Boolean(pendingWaivedRow)}
        studentName={pendingWaivedRow?.fullName ?? ""}
        monthLabel={selectedMonthLabel}
        monthlyFee={monthlyFee}
        defaultAmount={pendingWaivedRow?.amount ?? 0}
        defaultNote={pendingWaivedRow?.note ?? ""}
        onOpenChange={(open) => {
          if (!open) {
            setPendingWaivedRow(null);
          }
        }}
        onSave={saveWaiver}
      />
      <Dialog
        open={Boolean(pendingUnlockRow)}
        onOpenChange={(open) => {
          if (!open) {
            setPendingUnlockRow(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Mở khóa trạng thái học phí</DialogTitle>
            <DialogDescription>
              Sau khi mở khóa, thầy có thể đổi lại trạng thái học phí của học sinh này.
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm text-slate-700">
            Mở khóa trạng thái học phí tháng {selectedMonthLabel} của{" "}
            <span className="font-semibold text-slate-950">
              {pendingUnlockRow?.fullName ?? ""}
            </span>
            ?
          </p>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Hủy
              </Button>
            </DialogClose>
            <Button type="button" onClick={confirmUnlockPayment}>
              Xác nhận mở khóa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border bg-white p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-2xl font-semibold text-slate-950">{value}</p>
    </div>
  );
}
