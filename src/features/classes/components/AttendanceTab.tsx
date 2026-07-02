import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Download } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

type AttendanceTabProps = {
  classId: string;
};

type AttendanceCellStatus = AttendanceStatus | undefined;

const attendanceBadgeClasses: Record<AttendanceStatus, string> = {
  present: "bg-emerald-100 text-emerald-900 hover:bg-emerald-100",
  absent: "bg-red-100 text-red-900 hover:bg-red-100",
  excused: "bg-blue-100 text-blue-900 hover:bg-blue-100",
  makeup: "bg-violet-100 text-violet-900 hover:bg-violet-100",
};

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
  onCancel,
  onUnlock,
}: {
  session: WeeklySession;
  today: Date;
  isCancelled: boolean;
  onCancel: () => void;
  onUnlock: () => void;
}) {
  const past = isPastDate(session.date, today);

  return (
    <div className={["min-w-36 space-y-2", past ? "opacity-70" : ""].join(" ")}>
      <div className="flex flex-wrap items-center justify-center gap-1">
        <span className="font-semibold text-slate-950">{weekdayLabel(session.date)}</span>
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
          variant="outline"
          className="h-6 px-2 text-xs"
          onClick={onCancel}
        >
          Nghỉ
        </Button>
        <Button
          type="button"
          size="xs"
          variant="ghost"
          className="h-6 px-2 text-xs"
          onClick={onUnlock}
        >
          Mở khóa
        </Button>
      </div>
    </div>
  );
}

export function AttendanceTab({ classId }: AttendanceTabProps) {
  const today = useMemo(() => startOfDay(new Date()), []);
  const [weekStart, setWeekStart] = useState(() => getWeekStart(today));
  const students = getStudentsByClassId(classId);
  const {
    sessions,
    cancelledSessionIds,
    getStatus,
    cycleStatus,
    cancelSession,
    unlockSession,
    addMakeupSession,
  } = useMockAttendance(weekStart);

  function goToPreviousWeek() {
    setWeekStart((current) => addDays(current, -7));
  }

  function goToNextWeek() {
    setWeekStart((current) => addDays(current, 7));
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
            <div className="rounded-lg border bg-slate-50 px-4 py-2 text-base font-semibold text-slate-950">
              {formatDateRange(weekStart, getWeekEnd(weekStart))}
            </div>
            <Button variant="outline" className="gap-2" onClick={goToNextWeek}>
              Tuần sau
              <ChevronRight className="size-4" />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Lịch cố định: Thứ 3 và Thứ 5 lúc 18:00
          </p>
        </div>
      </section>

      <section className="flex justify-end">
        <div className="flex flex-wrap justify-end gap-2">
          <AddMakeupSessionDialog sessions={sessions} onAdd={addMakeupSession} />
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
                    onCancel={() => cancelSession(session.id)}
                    onUnlock={() => unlockSession(session.id)}
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
                          className="rounded-md outline-none transition hover:scale-[1.02] focus-visible:ring-3 focus-visible:ring-ring/50"
                          onClick={() => cycleStatus(session.id, student.id)}
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
    </div>
  );
}
