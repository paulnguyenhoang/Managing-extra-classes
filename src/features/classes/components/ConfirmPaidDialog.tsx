import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/format";

type ConfirmPaidDialogProps = {
  open: boolean;
  studentName: string;
  monthLabel: string;
  monthlyFee: number;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
};

export function ConfirmPaidDialog({
  open,
  studentName,
  monthLabel,
  monthlyFee,
  onOpenChange,
  onConfirm,
}: ConfirmPaidDialogProps) {
  const monthlyFeeText = formatCurrency(monthlyFee).replace("₫", "đ");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Xác nhận học phí</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-slate-700">
          Xác nhận {studentName} đã đóng học phí tháng {monthLabel} là{" "}
          <span className="font-semibold text-slate-950">{monthlyFeeText}</span>?
        </p>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Hủy
            </Button>
          </DialogClose>
          <Button type="button" onClick={onConfirm}>
            Xác nhận
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
