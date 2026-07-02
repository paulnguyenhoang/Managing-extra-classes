import { FormEvent, useState } from "react";
import { UserPlus } from "lucide-react";

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
import type { Student } from "@/types/student";

type AddStudentDialogProps = {
  classId: string;
  onAdd: (student: Student) => void;
};

const initialForm = {
  fullName: "",
  schoolClass: "",
  school: "",
  parentPhone: "",
};

export function AddStudentDialog({ classId, onAdd }: AddStudentDialogProps) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(initialForm);

  function updateField(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    onAdd({
      id: `mock-student-${Date.now()}`,
      classId,
      fullName: form.fullName || "Học sinh mới",
      schoolClass: form.schoolClass,
      school: form.school,
      parentPhone: form.parentPhone,
      status: "active",
    });

    setForm(initialForm);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <UserPlus className="size-4" />
          <span className="hidden sm:inline">Thêm học sinh</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Thêm học sinh</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="student-name">Họ tên</Label>
              <Input
                id="student-name"
                value={form.fullName}
                onChange={(event) => updateField("fullName", event.target.value)}
                placeholder="Nguyễn Văn A"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="student-class">Lớp ở trường</Label>
              <Input
                id="student-class"
                value={form.schoolClass}
                onChange={(event) => updateField("schoolClass", event.target.value)}
                placeholder="9A1"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="student-school">Trường</Label>
              <Input
                id="student-school"
                value={form.school}
                onChange={(event) => updateField("school", event.target.value)}
                placeholder="THCS Nguyễn Du"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="student-phone">SĐT phụ huynh</Label>
              <Input
                id="student-phone"
                value={form.parentPhone}
                onChange={(event) => updateField("parentPhone", event.target.value)}
                placeholder="0901 234 567"
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Hủy
              </Button>
            </DialogClose>
            <Button type="submit">Lưu học sinh</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
