import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
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
  currentMonthKey,
  filterPaymentRows,
  formatPaymentMonth,
  formatPaymentMonthLabel,
  generateMonthOptions,
  getPaymentSummary,
  paymentFilterOptions,
  paymentSelectClasses,
  paymentStatusOptions,
  type PaymentFilter,
} from "@/features/classes/utils/payments";
import { formatCurrency, formatDate } from "@/lib/format";
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
  monthlyFeeOverride?: number;
};

export function PaymentsTab({ classId, monthlyFeeOverride }: PaymentsTabProps) {
  const monthOptions = useMemo(() => generateMonthOptions(), []);
  const [selectedMonth, setSelectedMonth] = useState(() => currentMonthKey());
  const [filter, setFilter] = useState<PaymentFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [rows, setRows] = useState<PaymentRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [pendingPaidRow, setPendingPaidRow] = useState<PaymentRow | null>(null);
  const [pendingWaivedRow, setPendingWaivedRow] = useState<PaymentRow | null>(null);
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

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const visibleRows = filterPaymentRows(rows, filter).filter((row) =>
    normalizedQuery ? row.fullName.toLowerCase().includes(normalizedQuery) : true,
  );
  const summary = getPaymentSummary(rows);
  const selectedMonthLabel = formatPaymentMonth(selectedMonth);

  async function runPaymentAction(action: () => Promise<void>, failureMessage: string) {
    setIsSaving(true);
    setErrorMessage("");

    try {
      await action();
      await refreshRows();
    } catch (error) {
      console.warn("[payments] action failed", error);
      setErrorMessage(typeof error === "string" ? error : failureMessage);
    } finally {
      setIsSaving(false);
    }
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
