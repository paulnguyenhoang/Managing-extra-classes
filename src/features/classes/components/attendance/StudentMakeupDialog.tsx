import { useEffect, useState, type ReactNode } from "react";
import { ArrowLeft, CalendarDays, Check, Repeat2 } from "lucide-react";

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
import type { StudentMakeupRecurrenceScope } from "@/types/attendance";

export type PendingStudentMakeup = {
  student: ClassStudentRosterItem;
  session: WeeklySession;
  hasFollowingSeries: boolean;
  options: StudentMakeupSessionOption[];
};

type StudentMakeupDialogProps = {
  pendingMakeup: PendingStudentMakeup | null;
  currentClassName: string;
  sessions: WeeklySession[];
  selectedSessionId: string;
  onOpenChange: (open: boolean) => void;
  onSelectSession: (sessionId: string) => void;
  onConfirm: (scope: StudentMakeupRecurrenceScope) => void;
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
  const [step, setStep] = useState<"session" | "recurrence">("session");
  const [recurrenceScope, setRecurrenceScope] =
    useState<StudentMakeupRecurrenceScope>("single");

  useEffect(() => {
    setStep("session");
    setRecurrenceScope("single");
  }, [pendingMakeup]);

  const selectedOption = pendingMakeup?.options.find(
    (option) => option.sessionId === selectedSessionId,
  );

  return (
    <Dialog open={Boolean(pendingMakeup)} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] overflow-hidden sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {step === "session" ? "Chọn lớp học bù" : "Chọn phạm vi áp dụng"}
          </DialogTitle>
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

            {step === "session" && pendingMakeup.options.length > 0 ? (
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
            ) : step === "session" ? (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                Không có buổi học bù phù hợp.
              </p>
            ) : selectedOption ? (
              <div className="space-y-3">
                <p className="text-sm text-slate-600">
                  Lịch đã chọn: <span className="font-medium text-slate-950">{selectedOption.className}</span>,{" "}
                  {weekdayLabel(selectedOption.date)} lúc {selectedOption.startTime}.
                </p>
                <ScopeOption
                  icon={<CalendarDays className="size-5" />}
                  title="Chỉ buổi này"
                  description="Chỉ áp dụng cho buổi gốc đang chọn."
                  selected={recurrenceScope === "single"}
                  onClick={() => setRecurrenceScope("single")}
                />
                <ScopeOption
                  icon={<Repeat2 className="size-5" />}
                  title="Buổi này và các tuần tiếp theo"
                  description="Lặp hằng tuần theo hai lịch học đã chọn, đến khi lớp hoặc thời gian học của học sinh kết thúc."
                  selected={recurrenceScope === "following"}
                  onClick={() => setRecurrenceScope("following")}
                  disabled={pendingMakeup.hasFollowingSeries}
                />
                {pendingMakeup.hasFollowingSeries ? (
                  <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                    Học sinh đã có lịch bù cố định cho các tuần sau. Tuần này chỉ có thể thêm
                    một buổi riêng lẻ để tránh tạo hai chuỗi trùng nhau.
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
        <DialogFooter>
          {step === "recurrence" ? (
            <Button type="button" variant="outline" onClick={() => setStep("session")}>
              <ArrowLeft className="size-4" />
              Quay lại
            </Button>
          ) : (
            <DialogClose asChild>
              <Button type="button" variant="outline">Hủy</Button>
            </DialogClose>
          )}
          {step === "session" ? (
            <Button
              type="button"
              onClick={() => setStep("recurrence")}
              disabled={!selectedSessionId}
            >
              Tiếp tục
            </Button>
          ) : (
            <Button type="button" onClick={() => onConfirm(recurrenceScope)}>
              Xác nhận
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ScopeOption({
  icon,
  title,
  description,
  selected,
  onClick,
  disabled = false,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  selected: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        "flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors",
        disabled
          ? "cursor-not-allowed border-slate-200 bg-slate-50 opacity-55"
          : selected
          ? "border-emerald-300 bg-emerald-50"
          : "border-slate-200 bg-white hover:border-emerald-200 hover:bg-emerald-50/60",
      ].join(" ")}
    >
      <span className="mt-0.5 text-emerald-700">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block font-medium text-slate-950">{title}</span>
        <span className="mt-0.5 block text-sm text-slate-600">{description}</span>
      </span>
      {selected ? <Check className="mt-0.5 size-4 shrink-0 text-emerald-700" /> : null}
    </button>
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
