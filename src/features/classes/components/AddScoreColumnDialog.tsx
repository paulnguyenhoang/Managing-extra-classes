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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { ScoreColumn, ScoreType } from "@/types/score";

type AddScoreColumnDialogProps = {
  classId: string;
  onAdd: (column: ScoreColumn) => void;
};

const scoreTypes: Array<{ value: ScoreType; label: string }> = [
  { value: "essay", label: "Bài viết" },
  { value: "short", label: "15 phút" },
  { value: "oral", label: "Miệng" },
  { value: "midterm", label: "Giữa kỳ" },
  { value: "final", label: "Cuối kỳ" },
  { value: "mock_exam", label: "Thi thử" },
  { value: "other", label: "Khác" },
];

const initialForm = {
  label: "",
  type: "essay" as ScoreType,
  testDate: "",
  weight: "1",
  note: "",
};

export function AddScoreColumnDialog({ classId, onAdd }: AddScoreColumnDialogProps) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(initialForm);

  function updateField(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    onAdd({
      id: `mock-score-${Date.now()}`,
      classId,
      label: form.label || "Cột điểm mới",
      type: form.type,
      testDate: form.testDate,
      weight: Number(form.weight) || 1,
      note: form.note,
    });

    setForm(initialForm);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="size-4" />
          <span className="hidden sm:inline">Thêm cột điểm</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Thêm cột điểm</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="score-label">Tên cột điểm</Label>
              <Input
                id="score-label"
                value={form.label}
                onChange={(event) => updateField("label", event.target.value)}
                placeholder="Bài viết số 2"
              />
            </div>
            <div className="space-y-2">
              <Label>Loại điểm</Label>
              <Select value={form.type} onValueChange={(value) => updateField("type", value)}>
                <SelectTrigger className="w-full bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {scoreTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="score-weight">Hệ số</Label>
              <Input
                id="score-weight"
                inputMode="decimal"
                value={form.weight}
                onChange={(event) => updateField("weight", event.target.value)}
                placeholder="1"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="score-date">Ngày kiểm tra</Label>
              <Input
                id="score-date"
                type="date"
                value={form.testDate}
                onChange={(event) => updateField("testDate", event.target.value)}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="score-note">Ghi chú</Label>
              <Textarea
                id="score-note"
                value={form.note}
                onChange={(event) => updateField("note", event.target.value)}
                placeholder="Ghi chú về cột điểm"
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Hủy
              </Button>
            </DialogClose>
            <Button type="submit">Lưu cột điểm</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
