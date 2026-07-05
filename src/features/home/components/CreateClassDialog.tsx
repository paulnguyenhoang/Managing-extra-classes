import { FormEvent, useState } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { parseScheduleText } from "@/features/classes/utils/classSchedule";
import type { CreateClassInput } from "@/types/class";

type CreateClassDialogProps = {
  academicYearId: string;
  disabled?: boolean;
  onCreate: (input: CreateClassInput) => void | Promise<void>;
};

const initialForm = {
  name: "",
  grade: "",
  schedule: "",
  monthlyFee: "",
  note: "",
};

export function CreateClassDialog({
  academicYearId,
  disabled = false,
  onCreate,
}: CreateClassDialogProps) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updateField(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const name = form.name.trim();
    const monthlyFee = Number(form.monthlyFee);

    if (!name) {
      setErrorMessage("Vui lòng nhập tên lớp.");
      return;
    }

    if (!Number.isInteger(monthlyFee) || monthlyFee < 0) {
      setErrorMessage("Học phí tháng phải là số nguyên không âm.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      await onCreate({
        academicYearId,
        name,
        monthlyFee,
        note: form.note.trim() || undefined,
        scheduleItems: parseScheduleText(form.schedule),
      });

      setForm(initialForm);
      setOpen(false);
    } catch (error) {
      console.warn("[create-class] failed", error);
      setErrorMessage("Không lưu được lớp học mới. Thầy thử lại giúp em nhé.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button disabled={disabled} className="h-10 w-full gap-2 sm:w-auto">
          <Plus className="size-4" />
          <span className="hidden sm:inline">Tạo lớp mới</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Tạo lớp mới</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="class-name">Tên lớp</Label>
              <Input
                id="class-name"
                value={form.name}
                onChange={(event) => updateField("name", event.target.value)}
                placeholder="Ví dụ: Văn 9 - Ôn thi vào 10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="class-grade">Khối</Label>
              <Input
                id="class-grade"
                value={form.grade}
                onChange={(event) => updateField("grade", event.target.value)}
                placeholder="Khối 9"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="class-fee">Học phí tháng</Label>
              <Input
                id="class-fee"
                inputMode="numeric"
                value={form.monthlyFee}
                onChange={(event) => updateField("monthlyFee", event.target.value)}
                placeholder="700000"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="class-schedule">Lịch học</Label>
              <Input
                id="class-schedule"
                value={form.schedule}
                onChange={(event) => updateField("schedule", event.target.value)}
                placeholder="Thứ 3, Thứ 6 - 18:00"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="class-note">Ghi chú</Label>
              <Textarea
                id="class-note"
                value={form.note}
                onChange={(event) => updateField("note", event.target.value)}
                placeholder="Ghi chú thêm về lớp"
              />
            </div>
          </div>
          {errorMessage && (
            <p className="text-sm text-red-600">{errorMessage}</p>
          )}
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={isSubmitting}>
                Hủy
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Đang lưu..." : "Lưu lớp"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
