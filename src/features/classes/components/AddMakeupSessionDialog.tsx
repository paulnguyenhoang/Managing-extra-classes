import { FormEvent, useMemo, useState } from "react";
import { CalendarPlus } from "lucide-react";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  formatDayMonth,
  toDateKey,
  weekdayLabel,
  type MakeupSessionInput,
  type WeeklySession,
} from "@/features/classes/utils/attendance";

type AddMakeupSessionDialogProps = {
  sessions: WeeklySession[];
  onAdd: (session: MakeupSessionInput) => void;
};

const initialForm = {
  date: "",
  time: "18:00",
  makeupForSessionId: "",
};

export function AddMakeupSessionDialog({ sessions, onAdd }: AddMakeupSessionDialogProps) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const regularSessions = useMemo(
    () => sessions.filter((session) => !session.isMakeup),
    [sessions],
  );

  function updateField(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    onAdd({
      date: form.date || toDateKey(new Date()),
      time: form.time || "18:00",
      makeupForSessionId: form.makeupForSessionId || regularSessions[0]?.id || "",
    });

    setForm(initialForm);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <CalendarPlus className="size-4" />
          <span className="hidden sm:inline">Thêm buổi học bù</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Thêm buổi học bù</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="makeup-date">Ngày học bù</Label>
              <Input
                id="makeup-date"
                type="date"
                value={form.date}
                onChange={(event) => updateField("date", event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="makeup-time">Giờ học bù</Label>
              <Input
                id="makeup-time"
                type="time"
                value={form.time}
                onChange={(event) => updateField("time", event.target.value)}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Bù cho buổi nào</Label>
              <Select
                value={form.makeupForSessionId}
                onValueChange={(value) => updateField("makeupForSessionId", value)}
              >
                <SelectTrigger className="w-full bg-white">
                  <SelectValue placeholder="Chọn buổi cần học bù" />
                </SelectTrigger>
                <SelectContent>
                  {regularSessions.map((session) => (
                    <SelectItem key={session.id} value={session.id}>
                      {weekdayLabel(session.date)} - {formatDayMonth(session.date)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Hủy
              </Button>
            </DialogClose>
            <Button type="submit">Lưu buổi bù</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
