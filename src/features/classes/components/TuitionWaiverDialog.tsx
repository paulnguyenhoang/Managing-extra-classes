import { FormEvent, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/format";
import { isValidWaivedAmount } from "@/features/classes/utils/payments";

type TuitionWaiverDialogProps = {
  open: boolean;
  studentName: string;
  monthLabel: string;
  monthlyFee: number;
  defaultAmount: number;
  defaultNote: string;
  onOpenChange: (open: boolean) => void;
  onSave: (amount: number, note: string) => void;
};

export function TuitionWaiverDialog({
  open,
  studentName,
  monthLabel,
  monthlyFee,
  defaultAmount,
  defaultNote,
  onOpenChange,
  onSave,
}: TuitionWaiverDialogProps) {
  const [amount, setAmount] = useState(String(defaultAmount || 0));
  const [note, setNote] = useState(defaultNote);

  useEffect(() => {
    if (open) {
      setAmount(String(defaultAmount || 0));
      setNote(defaultNote);
    }
  }, [defaultAmount, defaultNote, open]);

  const numericAmount = Number(amount);
  const hasValidAmount = isValidWaivedAmount(numericAmount, monthlyFee);
  const hasNote = note.trim().length > 0;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!hasValidAmount || !hasNote) {
      return;
    }

    onSave(numericAmount, note.trim());
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Cập nhật miễn giảm học phí</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid gap-3 rounded-lg bg-slate-50 p-4 text-sm">
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Học sinh</span>
              <span className="font-medium text-slate-950">{studentName}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Tháng</span>
              <span className="font-medium text-slate-950">{monthLabel}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Học phí lớp</span>
              <span className="font-medium text-slate-950">{formatCurrency(monthlyFee)}</span>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="waived-amount">Số tiền thực thu</Label>
            <Input
              id="waived-amount"
              inputMode="numeric"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="0"
            />
            {!hasValidAmount ? (
              <p className="text-sm text-red-600">
                Số tiền phải từ 0 đến {formatCurrency(monthlyFee)}.
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="waived-note">Ghi chú</Label>
            <Input
              id="waived-note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Ví dụ: Giảm còn 300.000"
            />
            {!hasNote ? (
              <p className="text-sm text-amber-700">Miễn giảm học phí cần có ghi chú lý do.</p>
            ) : null}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Hủy
              </Button>
            </DialogClose>
            <Button type="submit" disabled={!hasValidAmount || !hasNote}>
              Lưu
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
