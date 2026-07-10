import { Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  formatDayMonth,
  getSessionOrderInWeek,
  weekdayLabel,
  type StudentMakeupSessionOption,
  type WeeklySession,
} from "@/features/classes/utils/attendance";
import type { ClassStudentRosterItem } from "@/types/student";

export type PendingStudentMakeup = {
  student: ClassStudentRosterItem;
  session: WeeklySession;
  options: StudentMakeupSessionOption[];
};

type StudentMakeupDialogProps = {
  pendingMakeup: PendingStudentMakeup | null;
  currentClassName: string;
  sessions: WeeklySession[];
  selectedSessionId: string;
  onOpenChange: (open: boolean) => void;
  onSelectSession: (sessionId: string) => void;
  onConfirm: () => void;
};

export function StudentMakeupDialog({
  pendingMakeup,
  currentClassName,
  sessions,
  selectedSessionId,
  onOpenChange,
  onSelectSession,
  onConfirm,
}: StudentMakeupDialogProps) {
  return (
    <Dialog open={Boolean(pendingMakeup)} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] overflow-hidden sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Chọn lớp học bù</DialogTitle>
        </DialogHeader>
        {pendingMakeup ? (
          <div className="min-w-0 space-y-4">
            <div className="grid gap-2 rounded-lg bg-slate-50 p-4 text-sm">
              <ReadonlyInfo label="Học sinh" value={pendingMakeup.student.fullName} />
              <ReadonlyInfo label="Lớp gốc" value={currentClassName} />
              <ReadonlyInfo
                label="Buổi gốc"
                value={`${weekdayLabel(pendingMakeup.session.date)} ${formatDayMonth(
                  pendingMakeup.session.date,
                )}`}
              />
              <ReadonlyInfo
                label="Thứ tự buổi"
                value={`Buổi ${getSessionOrderInWeek(pendingMakeup.session, sessions)} trong tuần`}
              />
            </div>

            {pendingMakeup.options.length > 0 ? (
              <div className="max-h-56 min-w-0 space-y-2 overflow-y-auto pr-1">
                {pendingMakeup.options.map((option) => {
                  const isSelected = option.sessionId === selectedSessionId;

                  return (
                    <button
                      key={option.sessionId}
                      type="button"
                      onClick={() => onSelectSession(option.sessionId)}
                      className={[
                        "w-full min-w-0 rounded-lg border px-3 py-2 text-left transition-colors",
                        "hover:border-emerald-200 hover:bg-emerald-50/60",
                        isSelected
                          ? "border-emerald-300 bg-emerald-50"
                          : "border-slate-200 bg-white",
                      ].join(" ")}
                    >
                      <span className="flex min-w-0 items-start justify-between gap-3">
                        <span className="min-w-0 truncate font-medium text-slate-950">
                          {option.className}
                        </span>
                        {isSelected ? (
                          <Check className="mt-0.5 size-4 shrink-0 text-emerald-700" />
                        ) : null}
                      </span>
                      <span className="mt-1 block min-w-0 text-sm text-slate-600">
                        {weekdayLabel(option.date)} {formatDayMonth(option.date)} -{" "}
                        {option.startTime} đến {option.endTime}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                Không có buổi học bù phù hợp.
              </p>
            )}
          </div>
        ) : null}
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Hủy
            </Button>
          </DialogClose>
          <Button type="button" onClick={onConfirm} disabled={!selectedSessionId}>
            Xác nhận
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ReadonlyInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[112px_minmax(0,1fr)] gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="min-w-0 break-words text-right font-medium text-slate-950">{value}</span>
    </div>
  );
}
