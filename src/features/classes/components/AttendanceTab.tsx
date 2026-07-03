import { useMemo, useState } from "react";
import {
  CalendarDays,
  CalendarX,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  Download,
  Lock,
  Unlock,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getStudentsByClassId } from "@/data/mockData";
import { AddMakeupSessionDialog } from "@/features/classes/components/AddMakeupSessionDialog";
import { useMockAttendance } from "@/features/classes/hooks/useMockAttendance";
import {
  addDays,
  formatDateRange,
  formatDayMonth,
  getWeekEnd,
  getWeekStart,
  isPastDate,
  isSameDay,
  startOfDay,
  weekdayLabel,
  type WeeklySession,
} from "@/features/classes/utils/attendance";
import { attendanceStatusLabel } from "@/lib/format";
import type { AttendanceStatus } from "@/types/attendance";
import type { ClassScheduleItem } from "@/types/class";

type AttendanceTabProps = {
  classId: string;
  scheduleItems: ClassScheduleItem[];
};

type AttendanceCellStatus = AttendanceStatus | undefined;

const attendanceBadgeClasses: Record<AttendanceStatus, string> = {
  present: "bg-emerald-100 text-emerald-900 hover:bg-emerald-100",
  absent: "bg-red-100 text-red-900 hover:bg-red-100",
  excused: "bg-blue-100 text-blue-900 hover:bg-blue-100",
  makeup: "bg-violet-100 text-violet-900 hover:bg-violet-100",
};

const miniCalendarWeekdays = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

function AttendanceStatusBadge({ status }: { status: AttendanceCellStatus }) {
  if (!status) {
    return (
      <Badge className="bg-slate-100 text-slate-600 hover:bg-slate-100">
        Chưa điểm danh
      </Badge>
    );
  }

  return <Badge className={attendanceBadgeClasses[status]}>{attendanceStatusLabel(status)}</Badge>;
}

function SessionHeader({
  session,
  today,
  isCancelled,
  isUnlocked,
  onRequestCancelToggle,
  onToggleLock,
}: {
  session: WeeklySession;
  today: Date;
  isCancelled: boolean;
  isUnlocked: boolean;
  onRequestCancelToggle: () => void;
  onToggleLock: () => void;
}) {
  const past = isPastDate(session.date, today);

  return (
    <div className={["min-w-36 space-y-2", past ? "opacity-70" : ""].join(" ")}>
      <div className="flex flex-wrap items-center justify-center gap-1">
        <span className="font-semibold text-slate-950">{weekdayLabel(session.date)}</span>
        <Button
          type="button"
          size="icon-sm"
          variant={isCancelled ? "default" : "ghost"}
          className={[
            "h-6 w-6",
            isCancelled
              ? "bg-slate-900 text-white hover:bg-slate-800"
              : "text-slate-500 hover:bg-slate-100 hover:text-slate-950",
          ].join(" ")}
          onClick={onRequestCancelToggle}
          title={isCancelled ? "Hủy trạng thái nghỉ" : "Đánh dấu buổi này nghỉ"}
        >
          <CalendarX className="size-3.5" />
          <span className="sr-only">
            {isCancelled ? "Hủy trạng thái nghỉ" : "Đánh dấu buổi này nghỉ"}
          </span>
        </Button>
        {isSameDay(session.date, today) ? (
          <Badge className="bg-emerald-100 text-emerald-900 hover:bg-emerald-100">Hôm nay</Badge>
        ) : null}
        {session.isMakeup ? (
          <Badge className="bg-violet-100 text-violet-900 hover:bg-violet-100">Học bù</Badge>
        ) : null}
        {isCancelled ? (
          <Badge className="bg-slate-200 text-slate-700 hover:bg-slate-200">Nghỉ</Badge>
        ) : null}
      </div>
      <div className="text-center text-sm text-muted-foreground">{formatDayMonth(session.date)}</div>
      <div className="flex justify-center gap-1">
        <Button
          type="button"
          size="xs"
          variant={isUnlocked ? "default" : "ghost"}
          className="h-6 gap-1 px-2 text-xs"
          onClick={onToggleLock}
        >
          {isUnlocked ? <Lock className="size-3" /> : <Unlock className="size-3" />}
          {isUnlocked ? "Khóa" : "Mở khóa"}
        </Button>
      </div>
    </div>
  );
}

function WeekPicker({
  visibleMonth,
  selectedWeekStart,
  today,
  onMonthChange,
  onSelectWeek,
}: {
  visibleMonth: Date;
  selectedWeekStart: Date;
  today: Date;
  onMonthChange: (date: Date) => void;
  onSelectWeek: (weekStart: Date) => void;
}) {
  const calendarWeeks = getCalendarWeeks(visibleMonth);
  const monthLabel = new Intl.DateTimeFormat("vi-VN", {
    month: "2-digit",
    year: "numeric",
  }).format(visibleMonth);

  return (
    <div className="absolute top-full left-0 z-40 mt-2 w-[320px] rounded-lg border bg-white p-3 shadow-lg">
      <div className="mb-3 flex items-center justify-between gap-2">
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          onClick={() => onMonthChange(addMonths(visibleMonth, -1))}
        >
          <ChevronLeft className="size-4" />
          <span className="sr-only">Tháng trước</span>
        </Button>
        <p className="font-semibold text-slate-950">Tháng {monthLabel}</p>
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          onClick={() => onMonthChange(addMonths(visibleMonth, 1))}
        >
          <ChevronRight className="size-4" />
          <span className="sr-only">Tháng sau</span>
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-1 px-1 pb-1 text-center text-xs font-medium text-slate-500">
        {miniCalendarWeekdays.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>
      <div className="space-y-1">
        {calendarWeeks.map((week) => {
          const weekStartDate = week[0];
          const selected = isSameDay(weekStartDate, selectedWeekStart);

          return (
            <button
              key={weekStartDate.toISOString()}
              type="button"
              className={[
                "grid w-full grid-cols-7 gap-1 rounded-lg p-1 text-center text-sm transition",
                selected
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-700 hover:bg-emerald-50 hover:text-emerald-950",
              ].join(" ")}
              onClick={() => onSelectWeek(weekStartDate)}
            >
              {week.map((date) => {
                const outsideMonth = date.getMonth() !== visibleMonth.getMonth();
                const isToday = isSameDay(date, today);

                return (
                  <span
                    key={date.toISOString()}
                    className={[
                      "flex h-7 items-center justify-center rounded-md",
                      outsideMonth && !selected ? "text-slate-300" : "",
                      isToday && !selected ? "bg-emerald-100 font-semibold text-emerald-900" : "",
                      isToday && selected ? "bg-white/20 font-semibold" : "",
                    ].join(" ")}
                  >
                    {date.getDate()}
                  </span>
                );
              })}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function addMonths(date: Date, months: number) {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

function getCalendarWeeks(monthDate: Date) {
  const firstDayOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const lastDayOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
  const firstVisibleWeekStart = getWeekStart(firstDayOfMonth);
  const lastVisibleWeekStart = getWeekStart(lastDayOfMonth);
  const weeks: Date[][] = [];
  let currentWeekStart = firstVisibleWeekStart;

  while (currentWeekStart.getTime() <= lastVisibleWeekStart.getTime()) {
    weeks.push(Array.from({ length: 7 }, (_, index) => addDays(currentWeekStart, index)));
    currentWeekStart = addDays(currentWeekStart, 7);
  }

  return weeks;
}

export function AttendanceTab({ classId, scheduleItems }: AttendanceTabProps) {
  const today = useMemo(() => startOfDay(new Date()), []);
  const [weekStart, setWeekStart] = useState(() => getWeekStart(today));
  const [weekPickerOpen, setWeekPickerOpen] = useState(false);
  const [visibleCalendarMonth, setVisibleCalendarMonth] = useState(() => weekStart);
  const [pendingCancelSession, setPendingCancelSession] = useState<WeeklySession | null>(null);
  const students = getStudentsByClassId(classId);
  const {
    sessions,
    cancelledSessionIds,
    unlockedSessionIds,
    getStatus,
    cycleStatus,
    markSessionForStudents,
    cancelSession,
    restoreCancelledSession,
    toggleSessionLock,
    addMakeupSession,
  } = useMockAttendance(weekStart, scheduleItems);
  const todaySession = sessions.find((session) => isSameDay(session.date, today));
  const canMarkTodayPresent = Boolean(todaySession);

  function goToPreviousWeek() {
    setWeekStart((current) => addDays(current, -7));
    setWeekPickerOpen(false);
  }

  function goToNextWeek() {
    setWeekStart((current) => addDays(current, 7));
    setWeekPickerOpen(false);
  }

  function confirmCancelToggle() {
    if (!pendingCancelSession) {
      return;
    }

    const isCancelled = cancelledSessionIds.includes(pendingCancelSession.id);
    if (isCancelled) {
      restoreCancelledSession(pendingCancelSession.id);
    } else {
      cancelSession(pendingCancelSession.id);
    }

    setPendingCancelSession(null);
  }

  function markTodayPresent() {
    if (!todaySession) {
      return;
    }

    markSessionForStudents(
      todaySession.id,
      students.map((student) => student.id),
      "present",
    );
  }

  function openWeekPicker() {
    setVisibleCalendarMonth(weekStart);
    setWeekPickerOpen((current) => !current);
  }

  function selectWeek(nextWeekStart: Date) {
    setWeekStart(startOfDay(nextWeekStart));
    setWeekPickerOpen(false);
  }

  return (
    <div className="space-y-4">
      <section className="rounded-lg border bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button variant="outline" className="gap-2" onClick={goToPreviousWeek}>
              <ChevronLeft className="size-4" />
              Tuần trước
            </Button>
            <div className="relative">
              <Button
                type="button"
                variant="outline"
                className="h-10 gap-2 bg-slate-50 px-4 text-base font-semibold text-slate-950"
                onClick={openWeekPicker}
              >
                <CalendarDays className="size-4 text-emerald-700" />
                {formatDateRange(weekStart, getWeekEnd(weekStart))}
              </Button>
              {weekPickerOpen ? (
                <WeekPicker
                  visibleMonth={visibleCalendarMonth}
                  selectedWeekStart={weekStart}
                  today={today}
                  onMonthChange={setVisibleCalendarMonth}
                  onSelectWeek={selectWeek}
                />
              ) : null}
            </div>
            <Button variant="outline" className="gap-2" onClick={goToNextWeek}>
              Tuần sau
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      </section>

      <section className="flex justify-end">
        <div className="flex flex-wrap justify-end gap-2">
          <AddMakeupSessionDialog sessions={sessions} onAdd={addMakeupSession} />
          <Button
            type="button"
            variant="outline"
            className="gap-2"
            disabled={!canMarkTodayPresent}
            onClick={markTodayPresent}
            title={
              canMarkTodayPresent
                ? "Đánh dấu tất cả học sinh có mặt trong buổi hôm nay"
                : "Hôm nay không có buổi học trong tuần đang xem"
            }
          >
            <CheckCheck className="size-4" />
            <span className="hidden sm:inline">Đánh dấu cả lớp đi học</span>
          </Button>
          <Button variant="outline" className="gap-2">
            <Download className="size-4" />
            <span className="hidden sm:inline">Xuất Excel</span>
          </Button>
        </div>
      </section>

      <div className="min-w-0 rounded-lg border bg-white">
        <Table className="min-w-[900px]">
          <TableHeader>
            <TableRow className="bg-slate-50 align-top">
              <TableHead className="w-16">STT</TableHead>
              <TableHead className="w-64">Họ tên</TableHead>
              {sessions.map((session) => (
                <TableHead key={session.id} className="text-center">
                  <SessionHeader
                    session={session}
                    today={today}
                    isCancelled={cancelledSessionIds.includes(session.id)}
                    isUnlocked={unlockedSessionIds.includes(session.id)}
                    onRequestCancelToggle={() => setPendingCancelSession(session)}
                    onToggleLock={() => toggleSessionLock(session.id)}
                  />
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {students.map((student, index) => (
              <TableRow key={student.id}>
                <TableCell>{index + 1}</TableCell>
                <TableCell className="font-medium text-slate-950">{student.fullName}</TableCell>
                {sessions.map((session) => {
                  const isCancelled = cancelledSessionIds.includes(session.id);
                  const isUnlocked = unlockedSessionIds.includes(session.id);
                  const status = getStatus(session.id, student.id);

                  return (
                    <TableCell key={session.id} className="text-center">
                      {isCancelled ? (
                        <Badge className="bg-slate-200 text-slate-700 hover:bg-slate-200">
                          Nghỉ
                        </Badge>
                      ) : (
                        <button
                          type="button"
                          disabled={!isUnlocked}
                          className={[
                            "rounded-md outline-none transition focus-visible:ring-3 focus-visible:ring-ring/50",
                            isUnlocked
                              ? "hover:scale-[1.02]"
                              : "cursor-not-allowed opacity-75",
                          ].join(" ")}
                          onClick={() => cycleStatus(session.id, student.id)}
                          title={
                            isUnlocked
                              ? "Bấm để đổi trạng thái điểm danh"
                              : "Bấm Mở khóa để chỉnh sửa buổi này"
                          }
                        >
                          <AttendanceStatusBadge status={status} />
                        </button>
                      )}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog
        open={Boolean(pendingCancelSession)}
        onOpenChange={(open) => {
          if (!open) {
            setPendingCancelSession(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {pendingCancelSession &&
              cancelledSessionIds.includes(pendingCancelSession.id)
                ? "Hủy trạng thái nghỉ?"
                : "Xác nhận lớp nghỉ?"}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {pendingCancelSession &&
            cancelledSessionIds.includes(pendingCancelSession.id)
              ? `Hủy nghỉ buổi ${weekdayLabel(pendingCancelSession.date)} ${formatDayMonth(
                  pendingCancelSession.date,
                )}? Buổi học sẽ trở lại bình thường và được mở khóa để chỉnh sửa.`
              : pendingCancelSession
                ? `Lớp học buổi ${weekdayLabel(pendingCancelSession.date)} ${formatDayMonth(
                    pendingCancelSession.date,
                  )} nghỉ? Dữ liệu điểm danh đã nhập sẽ được giữ lại và buổi học sẽ bị khóa.`
                : ""}
          </p>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Hủy
              </Button>
            </DialogClose>
            <Button type="button" onClick={confirmCancelToggle}>
              Xác nhận
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
