import { useEffect, useState } from "react";
import { CalendarDays } from "lucide-react";

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
import { ScheduleItemsEditor } from "@/features/classes/components/ScheduleItemsEditor";
import type { ClassScheduleItem } from "@/types/class";

type EditClassScheduleDialogProps = {
  scheduleItems: ClassScheduleItem[];
  onSave: (scheduleItems: ClassScheduleItem[]) => void | Promise<void>;
};

export function EditClassScheduleDialog({
  scheduleItems,
  onSave,
}: EditClassScheduleDialogProps) {
  const [open, setOpen] = useState(false);
  const [draftItems, setDraftItems] = useState<ClassScheduleItem[]>(scheduleItems);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setDraftItems(scheduleItems);
      setErrorMessage("");
    }
  }, [open, scheduleItems]);

  async function handleSave() {
    setIsSaving(true);
    setErrorMessage("");

    try {
      await onSave(draftItems);
      setOpen(false);
    } catch {
      setErrorMessage("Không lưu được lịch học. Thầy thử lại giúp em nhé.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          className="h-6 w-6 shrink-0 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
        >
          <CalendarDays className="size-4" />
          <span className="sr-only">Cập nhật lịch học</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="flex max-h-[calc(100vh-2rem)] w-[min(94vw,600px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="px-4 pt-4 pb-3">
          <DialogTitle>Cập nhật lịch học</DialogTitle>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
          <ScheduleItemsEditor
            items={draftItems}
            onChange={setDraftItems}
            idPrefix="edit-schedule"
          />

          {errorMessage && (
            <p className="mt-3 text-sm text-red-600">{errorMessage}</p>
          )}
        </div>

        <DialogFooter className="mx-0 mb-0 shrink-0 rounded-none px-4 py-3">
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={isSaving}>
              Hủy
            </Button>
          </DialogClose>
          <Button
            type="button"
            disabled={draftItems.length === 0 || isSaving}
            onClick={handleSave}
          >
            {isSaving ? "Đang lưu..." : "Lưu lịch học"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
