import { useState } from "react";
import { CalendarRange, Flag } from "lucide-react";

import { Button } from "@/components/ui/button";
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

function MonthSelect({
  id,
  value,
  options,
  onChange,
}: {
  id: string;
  value: string;
  options: string[];
  onChange: (month: string) => void;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger id={id} className="w-full bg-white">
        <SelectValue placeholder="Chọn tháng" />
      </SelectTrigger>
      <SelectContent>
        {options.map((month) => (
          <SelectItem key={month} value={month}>
            Tháng {formatMonthLabel(month)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function EditClassMonthRangeDialog({
  startMonth,
  endMonth,
  onSave,
}: {
  startMonth: string;
  endMonth: string;
  onSave: (startMonth: string, endMonth: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [startDraft, setStartDraft] = useState(startMonth);
  const [endDraft, setEndDraft] = useState(endMonth);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const monthOptions = monthsInRange(addMonths(startMonth, -12), addMonths(endMonth, 12));

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);

    if (nextOpen) {
      setStartDraft(startMonth);
      setEndDraft(endMonth);
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
              options={monthOptions}
              onChange={setStartDraft}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="range-end-month">Tháng kết thúc</Label>
            <MonthSelect
              id="range-end-month"
              value={endDraft}
              options={monthOptions}
              onChange={setEndDraft}
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
  onComplete,
}: {
  startMonth: string;
  endMonth: string;
  onComplete: (endMonth: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [endDraft, setEndDraft] = useState(endMonth);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const monthOptions = monthsInRange(startMonth, addMonths(endMonth, 6));

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);

    if (nextOpen) {
      setEndDraft(clampMonthToRange(currentMonthKey(), startMonth, endMonth));
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
          variant="ghost"
          size="xs"
          className="h-6 gap-1 px-2 text-xs text-slate-600 hover:bg-slate-100 hover:text-slate-900"
        >
          <Flag className="size-3" />
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
        <div className="space-y-1.5">
          <Label htmlFor="complete-end-month">Tháng kết thúc thực tế</Label>
          <MonthSelect
            id="complete-end-month"
            value={endDraft}
            options={monthOptions}
            onChange={setEndDraft}
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
