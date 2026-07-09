import { useState } from "react";
import { CalendarCheck, CalendarRange, Flag } from "lucide-react";

import { Button } from "@/components/ui/button";
import { MonthPicker } from "@/components/common/MonthPicker";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  addMonths,
  clampMonthToRange,
  currentMonthKey,
  formatMonthLabel,
} from "@/lib/months";

function MonthSelect({
  id,
  value,
  onChange,
  minMonth,
  maxMonth,
}: {
  id: string;
  value: string;
  onChange: (month: string) => void;
  minMonth?: string;
  maxMonth?: string;
}) {
  return (
    <MonthPicker
      id={id}
      value={value}
      onChange={onChange}
      minMonth={minMonth}
      maxMonth={maxMonth}
    />
  );
}

export function EditClassMonthRangeDialog({
  startMonth,
  endMonth,
  minMonth,
  maxMonth,
  onSave,
}: {
  startMonth: string;
  endMonth: string;
  minMonth?: string;
  maxMonth?: string;
  onSave: (startMonth: string, endMonth: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [startDraft, setStartDraft] = useState(startMonth);
  const [endDraft, setEndDraft] = useState(endMonth);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);

    if (nextOpen) {
      setStartDraft(clampMonthToRange(startMonth, minMonth ?? startMonth, maxMonth ?? startMonth));
      setEndDraft(clampMonthToRange(endMonth, minMonth ?? endMonth, maxMonth ?? endMonth));
      setErrorMessage("");
    }
  }

  async function handleSave() {
    if (startDraft > endDraft) {
      setErrorMessage("Tháng bắt đầu phải trước hoặc bằng tháng kết thúc.");
      return;
    }

    setIsSaving(true);
    setErrorMessage("");

    try {
      await onSave(startDraft, endDraft);
      setOpen(false);
    } catch (error) {
      setErrorMessage(
        typeof error === "string" ? error : "Không lưu được thời gian học của lớp.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          className="h-6 w-6 shrink-0 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
        >
          <CalendarRange className="size-4" />
          <span className="sr-only">Cập nhật thời gian học</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cập nhật thời gian học</DialogTitle>
          <DialogDescription>
            Thời gian học quyết định các tháng học phí và điểm của lớp.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="range-start-month">Tháng bắt đầu</Label>
            <MonthSelect
              id="range-start-month"
              value={startDraft}
              onChange={setStartDraft}
              minMonth={minMonth}
              maxMonth={maxMonth}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="range-end-month">Tháng kết thúc</Label>
            <MonthSelect
              id="range-end-month"
              value={endDraft}
              onChange={setEndDraft}
              minMonth={minMonth}
              maxMonth={maxMonth}
            />
          </div>
        </div>
        {errorMessage && <p className="text-sm text-red-600">{errorMessage}</p>}
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={isSaving}>
              Hủy
            </Button>
          </DialogClose>
          <Button type="button" onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Đang lưu..." : "Lưu thời gian học"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function CompleteClassDialog({
  startMonth,
  endMonth,
  minMonth,
  maxMonth,
  onComplete,
}: {
  startMonth: string;
  endMonth: string;
  minMonth?: string;
  maxMonth?: string;
  onComplete: (endMonth: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [endDraft, setEndDraft] = useState(endMonth);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);

    if (nextOpen) {
      setEndDraft(
        clampMonthToRange(
          currentMonthKey(),
          maxMonth && startMonth > maxMonth ? maxMonth : startMonth,
          maxMonth ?? endMonth,
        ),
      );
      setErrorMessage("");
    }
  }

  async function handleComplete() {
    setIsSaving(true);
    setErrorMessage("");

    try {
      await onComplete(endDraft);
      setOpen(false);
    } catch (error) {
      setErrorMessage(typeof error === "string" ? error : "Không kết thúc được lớp học.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-2 border-amber-200 bg-amber-50 px-3 text-sm font-medium text-amber-900 shadow-sm hover:bg-amber-100 hover:text-amber-950"
        >
          <Flag className="size-4" />
          Kết thúc lớp
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Kết thúc lớp học</DialogTitle>
          <DialogDescription>
            Chọn tháng học cuối cùng thực tế của lớp. Lớp sẽ chuyển sang trạng thái đã kết thúc.
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
          <div className="flex items-start gap-2">
            <CalendarCheck className="mt-0.5 size-4 shrink-0" />
            <div className="space-y-1">
              <p className="font-medium">Xác nhận mốc kết thúc lớp</p>
              <p>
                Kỳ học hiện tại: {formatMonthLabel(startMonth)} - {formatMonthLabel(endMonth)}.
              </p>
              <p>
                Sau khi xác nhận, lớp được đánh dấu đã kết thúc và các tháng học phí/điểm danh
                sẽ theo mốc kết thúc mới.
              </p>
            </div>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="complete-end-month">Tháng kết thúc thực tế</Label>
          <MonthSelect
            id="complete-end-month"
            value={endDraft}
            onChange={setEndDraft}
            minMonth={startMonth}
            maxMonth={maxMonth}
          />
        </div>
        {errorMessage && <p className="text-sm text-red-600">{errorMessage}</p>}
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={isSaving}>
              Hủy
            </Button>
          </DialogClose>
          <Button type="button" onClick={handleComplete} disabled={isSaving}>
            {isSaving ? "Đang lưu..." : "Xác nhận kết thúc"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
