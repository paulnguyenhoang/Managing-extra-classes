import { useEffect, useState } from "react";

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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  addMonths,
  clampMonthToRange,
  currentMonthKey,
  formatMonthLabel,
  monthsInRange,
} from "@/lib/months";
import { getUnpaidMonthsForMembership } from "@/services/paymentApi";

type PauseStudentDialogProps = {
  open: boolean;
  studentName: string;
  membershipId: number | null;
  joinedMonth: string;
  classEndMonth: string;
  onOpenChange: (open: boolean) => void;
  onConfirm: (leftMonth: string) => Promise<void>;
};

export function PauseStudentDialog({
  open,
  studentName,
  membershipId,
  joinedMonth,
  classEndMonth,
  onOpenChange,
  onConfirm,
}: PauseStudentDialogProps) {
  // Tháng nghỉ là exclusive: học sinh không còn học từ tháng này. Cho phép tối đa
  // một tháng sau khi lớp kết thúc (nghĩa là học đến hết lớp).
  const maxLeftMonth = addMonths(classEndMonth, 1);
  const monthOptions = monthsInRange(joinedMonth, maxLeftMonth);
  const [leftMonth, setLeftMonth] = useState("");
  const [unpaidMonths, setUnpaidMonths] = useState<string[]>([]);
  const [isCheckingDebt, setIsCheckingDebt] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setLeftMonth(clampMonthToRange(currentMonthKey(), joinedMonth, maxLeftMonth));
      setUnpaidMonths([]);
      setErrorMessage("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, joinedMonth, classEndMonth]);

  useEffect(() => {
    if (!open || membershipId === null || !leftMonth) {
      return;
    }

    let cancelled = false;
    setIsCheckingDebt(true);

    getUnpaidMonthsForMembership(membershipId, leftMonth)
      .then((months) => {
        if (!cancelled) {
          setUnpaidMonths(months);
        }
      })
      .catch((error) => {
        console.warn("[pause-student] debt check failed", error);
        if (!cancelled) {
          setUnpaidMonths([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsCheckingDebt(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [open, membershipId, leftMonth]);

  async function handleConfirm() {
    if (!leftMonth) {
      setErrorMessage("Vui lòng chọn tháng bắt đầu nghỉ.");
      return;
    }

    setIsSaving(true);
    setErrorMessage("");

    try {
      await onConfirm(leftMonth);
      onOpenChange(false);
    } catch (error) {
      setErrorMessage(typeof error === "string" ? error : "Không lưu được trạng thái nghỉ.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cho học sinh nghỉ</DialogTitle>
          <DialogDescription>
            Tháng nghỉ là tháng đầu tiên học sinh không còn học lớp này.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2 rounded-lg bg-slate-50 p-4 text-sm">
          <div className="flex justify-between gap-3">
            <span className="text-muted-foreground">Học sinh</span>
            <span className="font-medium text-slate-950">{studentName}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-muted-foreground">Bắt đầu học</span>
            <span className="font-medium text-slate-950">{formatMonthLabel(joinedMonth)}</span>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pause-left-month">Tháng bắt đầu nghỉ</Label>
          <Select value={leftMonth} onValueChange={setLeftMonth}>
            <SelectTrigger id="pause-left-month" className="w-full bg-white">
              <SelectValue placeholder="Chọn tháng nghỉ" />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map((month) => (
                <SelectItem key={month} value={month}>
                  Tháng {formatMonthLabel(month)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {isCheckingDebt ? (
          <p className="text-sm text-slate-600">Đang kiểm tra học phí còn thiếu...</p>
        ) : unpaidMonths.length > 0 ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <p className="font-medium">Học sinh còn chưa đóng học phí các tháng:</p>
            <p className="mt-1">
              {unpaidMonths.map((month) => formatMonthLabel(month)).join(", ")}
            </p>
            <p className="mt-1">Vẫn xác nhận nghỉ?</p>
          </div>
        ) : null}
        {errorMessage && <p className="text-sm text-red-600">{errorMessage}</p>}
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={isSaving}>
              Hủy
            </Button>
          </DialogClose>
          <Button type="button" onClick={handleConfirm} disabled={isSaving || !leftMonth}>
            {isSaving ? "Đang lưu..." : "Xác nhận nghỉ"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
