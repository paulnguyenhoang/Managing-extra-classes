import { useMemo, useState } from "react";
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
import {
  currentPaymentMonth,
  getClassById,
  getPaymentsForClassMonth,
  getStudentsByClassId,
  paymentMonths,
} from "@/data/mockData";
import { ConfirmPaidDialog } from "@/features/classes/components/ConfirmPaidDialog";
import { TuitionWaiverDialog } from "@/features/classes/components/TuitionWaiverDialog";
import {
  filterPaymentRows,
  formatPaymentMonth,
  formatPaymentMonthLabel,
  getPaymentRows,
  getPaymentSummary,
  paymentFilterOptions,
  paymentSelectClasses,
  paymentStatusOptions,
  todayDateKey,
  upsertPayment,
  type PaymentFilter,
  type PaymentRow,
} from "@/features/classes/utils/payments";
import { formatCurrency, formatDate } from "@/lib/format";
import type { Payment, PaymentStatus } from "@/types/payment";

type PaymentsTabProps = {
  classId: string;
  monthlyFeeOverride?: number;
};

type PaymentsByMonth = Record<string, Payment[]>;

export function PaymentsTab({ classId, monthlyFeeOverride }: PaymentsTabProps) {
  const [selectedMonth, setSelectedMonth] = useState(currentPaymentMonth);
  const [filter, setFilter] = useState<PaymentFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [pendingPaidRow, setPendingPaidRow] = useState<PaymentRow | null>(null);
  const [pendingWaivedRow, setPendingWaivedRow] = useState<PaymentRow | null>(null);
  const students = getStudentsByClassId(classId);
  const classItem = getClassById(classId);
  const monthlyFee = monthlyFeeOverride ?? classItem?.monthlyFee ?? 0;
  const [paymentsByMonth, setPaymentsByMonth] = useState<PaymentsByMonth>(() =>
    paymentMonths.reduce<PaymentsByMonth>((result, month) => {
      result[month] = getPaymentsForClassMonth(classId, month);
      return result;
    }, {}),
  );

  const currentPayments = paymentsByMonth[selectedMonth] ?? [];
  const rows = useMemo(
    () => getPaymentRows(students, currentPayments, classId, selectedMonth),
    [classId, currentPayments, selectedMonth, students],
  );
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const visibleRows = filterPaymentRows(rows, filter).filter((row) =>
    normalizedQuery ? row.student.fullName.toLowerCase().includes(normalizedQuery) : true,
  );
  const summary = getPaymentSummary(rows);
  const selectedMonthLabel = formatPaymentMonth(selectedMonth);

  function updatePayment(nextPayment: Payment) {
    setPaymentsByMonth((current) => ({
      ...current,
      [selectedMonth]: upsertPayment(current[selectedMonth] ?? [], nextPayment),
    }));
  }

  function handleStatusChange(row: PaymentRow, status: PaymentStatus) {
    if (status === "paid") {
      setPendingPaidRow(row);
      return;
    }

    if (status === "waived") {
      setPendingWaivedRow(row);
      return;
    }

    updatePayment({
      ...row.payment,
      status: "unpaid",
      amount: 0,
      paidAt: undefined,
    });
  }

  function confirmPaid() {
    if (!pendingPaidRow) {
      return;
    }

    updatePayment({
      ...pendingPaidRow.payment,
      status: "paid",
      amount: monthlyFee,
      paidAt: todayDateKey(),
    });
    setPendingPaidRow(null);
  }

  function saveWaiver(amount: number, note: string) {
    if (!pendingWaivedRow) {
      return;
    }

    updatePayment({
      ...pendingWaivedRow.payment,
      status: "waived",
      amount,
      note,
      paidAt: amount > 0 ? todayDateKey() : undefined,
    });
    setPendingWaivedRow(null);
  }

  function updateNote(row: PaymentRow, note: string) {
    updatePayment({
      ...row.payment,
      note,
    });
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
              {paymentMonths.map((month) => (
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
            {visibleRows.map((row, index) => (
              <TableRow key={row.student.id}>
                <TableCell>{index + 1}</TableCell>
                <TableCell className="font-medium text-slate-950">{row.student.fullName}</TableCell>
                <TableCell>
                  <Select
                    value={row.payment.status}
                    onValueChange={(value) => handleStatusChange(row, value as PaymentStatus)}
                  >
                    <SelectTrigger
                      className={[
                        "h-8 w-36 justify-between font-medium shadow-none",
                        paymentSelectClasses[row.payment.status],
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
                <TableCell>{formatCurrency(row.payment.amount)}</TableCell>
                <TableCell>{formatDate(row.payment.paidAt)}</TableCell>
                <TableCell>
                  <Input
                    value={row.payment.note ?? ""}
                    onChange={(event) => updateNote(row, event.target.value)}
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
        studentName={pendingPaidRow?.student.fullName ?? ""}
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
        studentName={pendingWaivedRow?.student.fullName ?? ""}
        monthLabel={selectedMonthLabel}
        monthlyFee={monthlyFee}
        defaultAmount={pendingWaivedRow?.payment.amount ?? 0}
        defaultNote={pendingWaivedRow?.payment.note ?? ""}
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
