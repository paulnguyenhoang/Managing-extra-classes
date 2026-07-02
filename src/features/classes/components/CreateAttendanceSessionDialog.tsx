import { FormEvent, useState } from "react";
import { ClipboardPlus } from "lucide-react";

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
import type { AttendanceSession } from "@/types/attendance";

type CreateAttendanceSessionDialogProps = {
  classId: string;
  onCreate: (session: AttendanceSession) => void;
};

const initialForm = {
  date: "",
  content: "",
  note: "",
};

export function CreateAttendanceSessionDialog({
  classId,
  onCreate,
}: CreateAttendanceSessionDialogProps) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(initialForm);

  function updateField(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    onCreate({
      id: `mock-attendance-${Date.now()}`,
      classId,
      date: form.date || new Date().toISOString(),
      content: form.content,
      note: form.note,
    });

    setForm(initialForm);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <ClipboardPlus className="size-4" />
          <span className="hidden sm:inline">Tạo buổi học</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Tạo buổi học</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="session-date">Ngày học</Label>
            <Input
              id="session-date"
              type="date"
              value={form.date}
              onChange={(event) => updateField("date", event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="session-content">Nội dung buổi học</Label>
            <Input
              id="session-content"
              value={form.content}
              onChange={(event) => updateField("content", event.target.value)}
              placeholder="Luyện viết đoạn văn nghị luận"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="session-note">Ghi chú</Label>
            <Textarea
              id="session-note"
              value={form.note}
              onChange={(event) => updateField("note", event.target.value)}
              placeholder="Ghi chú về buổi học"
            />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Hủy
              </Button>
            </DialogClose>
            <Button type="submit">Lưu buổi học</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
