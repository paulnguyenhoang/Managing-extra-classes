import { useEffect, useMemo, useState } from "react";
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
import { AddMakeupSessionDialog } from "@/features/classes/components/AddMakeupSessionDialog";
import {
  StudentMakeupDialog,
  type PendingStudentMakeup,
} from "@/features/classes/components/attendance/StudentMakeupDialog";
import { excelExportButtonClassName } from "@/features/classes/utils/excelButtonStyles";
import {
  addDays,
  formatDateRange,
  formatDayMonth,
  getWeekEnd,
  getWeekStart,
  isPastDate,
  isSameDay,
  parseLocalDate,
  startOfDay,
  toDateKey,
  weekdayLabel,
  type MakeupSessionInput,
  type WeeklySession,
} from "@/features/classes/utils/attendance";
import { sortStudentsByVietnameseName } from "@/features/classes/utils/studentRoster";
import { attendanceStatusLabel } from "@/lib/format";
import { currentMonthKey, isValidMonthKey } from "@/lib/months";
import {
  cancelAttendanceSession,
  createClassMakeupSession,
  createStudentMakeupRecord,
  getAttendanceWeek,
  listStudentMakeupOptions,
  markSessionPresent,
  removeClassMakeupSession,
  removeStudentMakeupRecord,
  restoreAttendanceSession,
  setAttendanceStatus as saveAttendanceStatus,
  setReceivingMakeupAttendanceStatus,
  toggleAttendanceLock,
} from "@/services/attendanceApi";
import type {
  AttendanceMakeupDetailDto,
  AttendanceReceivingMakeupRowDto,
  AttendanceStatus,
  AttendanceWeekDto,
} from "@/types/attendance";
import type { ClassOverview, ClassScheduleItem } from "@/types/class";
import type { ClassStudentRosterItem } from "@/types/student";

type AttendanceTabProps = {
  classId: number;
  className: string;
  scheduleItems: ClassScheduleItem[];
  availableClasses: ClassOverview[];
  classStartMonth: string;
  classEndMonth: string;
  onUpcomingMakeupSessionsChange?: (sessions: WeeklySession[]) => void;
};

type AttendanceCellStatus = AttendanceStatus | undefined;

const attendanceBadgeClasses: Record<AttendanceStatus, string> = {
  present: "bg-emerald-100 text-emerald-900 hover:bg-emerald-100",
  absent: "bg-red-100 text-red-900 hover:bg-red-100",
  makeup: "bg-violet-100 text-violet-900 hover:bg-violet-100",
};

const statusButtonActiveClasses: Record<AttendanceStatus, string> = {
  present: "border-emerald-400 bg-emerald-100 font-semibold text-emerald-900",
  absent: "border-red-400 bg-red-100 font-semibold text-red-900",
  makeup: "border-violet-400 bg-violet-100 font-semibold text-violet-900",
};

const miniCalendarWeekdays = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

function AttendanceStatusBadge({ status }: { status: AttendanceCellStatus }) {
  if (!status) {
    return <Badge className="bg-slate-100 text-slate-600 hover:bg-slate-100">Chưa điểm danh</Badge>;
  }

  return <Badge className={attendanceBadgeClasses[status]}>{attendanceStatusLabel(status)}</Badge>;
}

function AttendanceStatusButtons({
  status,
  allowMakeup,
  onSelect,
}: {
  status: AttendanceCellStatus;
  allowMakeup: boolean;
  onSelect: (next: AttendanceCellStatus) => void;
}) {
  const options: Array<{ value: AttendanceStatus; label: string }> = [
    { value: "present", label: "Học" },
    { value: "absent", label: "Nghỉ" },
    ...(allowMakeup ? [{ value: "makeup" as const, label: "Học bù" }] : []),
  ];

  return (
    <div className="flex flex-wrap items-center justify-center gap-1">
      {options.map((option) => {
        const isActive = status === option.value;

        return (
          <button
            key={option.value}
            type="button"
            className={[
              "rounded-full border px-2 py-0.5 text-xs transition outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
              isActive
                ? statusButtonActiveClasses[option.value]
                : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-900",
            ].join(" ")}
            onClick={() => onSelect(isActive ? undefined : option.value)}
            title={isActive ? "Bấm để bỏ trạng thái này" : `Đánh dấu ${option.label}`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function SessionHeader({
  session,
  today,
  isCancelled,
  isUnlocked,
  onRequestCancelToggle,
  onRequestRemoveMakeup,
  onToggleLock,
}: {
  session: WeeklySession;
  today: Date;
  isCancelled: boolean;
  isUnlocked: boolean;
  onRequestCancelToggle: () => void;
  onRequestRemoveMakeup: () => void;
  onToggleLock: () => void;
}) {
  const past = isPastDate(session.date, today);
  const current = isSameDay(session.date, today);

  return (
    <div className={["min-w-36 space-y-2", past ? "opacity-70" : ""].join(" ")}>
      <div className="flex flex-wrap items-center justify-center gap-1">
        <span className="font-semibold text-slate-950">{weekdayLabel(session.date)}</span>
        {!session.isMakeup ? (
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
        ) : null}
        {current ? (
          <Badge className="bg-emerald-100 text-emerald-900 hover:bg-emerald-100">Hôm nay</Badge>
        ) : null}
        {session.isMakeup ? (
          <Badge className="bg-violet-100 text-violet-900 hover:bg-violet-100">Học bù cả lớp</Badge>
        ) : null}
        {isCancelled ? (
          <Badge className="bg-red-100 text-red-900 hover:bg-red-100">Nghỉ</Badge>
        ) : null}
      </div>
      <div
        className={[
          "mx-auto w-fit rounded-full px-2 py-0.5 text-center text-sm font-medium",
          getSessionDateToneClass(session.date, today),
        ].join(" ")}
      >
        {formatDayMonth(session.date)}
      </div>
      <div className="flex flex-wrap justify-center gap-1">
        {!isCancelled ? (
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
        ) : null}
        {session.isMakeup ? (
          <Button
            type="button"
            size="xs"
            variant="ghost"
            className="h-6 gap-1 px-2 text-xs text-red-600 hover:bg-red-50 hover:text-red-700"
            onClick={onRequestRemoveMakeup}
          >
            <CalendarX className="size-3" />
            Hủy buổi bù
          </Button>
        ) : null}
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
  const currentWeekStart = getWeekStart(today);

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
      <div className="mb-2 flex items-center gap-2 rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-900">
        <span className="size-2 rounded-full bg-emerald-500" />
        Tuần hiện tại
      </div>
      <div className="space-y-1">
        {calendarWeeks.map((week) => {
          const weekStartDate = week[0];
          const selected = isSameDay(weekStartDate, selectedWeekStart);
          const currentWeek = isSameDay(weekStartDate, currentWeekStart);

          return (
            <button
              key={weekStartDate.toISOString()}
              type="button"
              className={[
                "grid w-full grid-cols-7 gap-1 rounded-lg p-1 text-center text-sm transition",
                selected
                  ? "bg-slate-900 text-white shadow-sm"
                  : currentWeek
                    ? "bg-emerald-50 text-emerald-950 ring-1 ring-emerald-200 hover:bg-emerald-100"
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

export function AttendanceTab({
  classId,
  className,
  scheduleItems,
  availableClasses,
  classStartMonth,
  classEndMonth,
  onUpcomingMakeupSessionsChange,
}: AttendanceTabProps) {
  const today = useMemo(() => startOfDay(new Date()), []);
  const firstAllowedWeekStart = useMemo(
    () => getWeekStart(parseMonthStart(classStartMonth) ?? today),
    [classStartMonth, today],
  );
  const lastAllowedWeekStart = useMemo(
    () => getWeekStart(parseMonthEnd(classEndMonth) ?? today),
    [classEndMonth, today],
  );
  const hasValidClassRange =
    isValidMonthKey(classStartMonth) &&
    isValidMonthKey(classEndMonth) &&
    classStartMonth <= classEndMonth;
  const [weekStart, setWeekStart] = useState(() => {
    const currentWeek = getWeekStart(today);
    return hasValidClassRange
      ? clampWeekStart(currentWeek, firstAllowedWeekStart, lastAllowedWeekStart)
      : currentWeek;
  });
  const [weekPickerOpen, setWeekPickerOpen] = useState(false);
  const [visibleCalendarMonth, setVisibleCalendarMonth] = useState(() => weekStart);
  const [pendingCancelSession, setPendingCancelSession] = useState<WeeklySession | null>(null);
  const [pendingRemoveMakeupSession, setPendingRemoveMakeupSession] =
    useState<WeeklySession | null>(null);
  const [pendingStudentMakeup, setPendingStudentMakeup] = useState<PendingStudentMakeup | null>(
    null,
  );
  const [selectedStudentMakeupSessionId, setSelectedStudentMakeupSessionId] = useState("");
  const [pendingRemoveStudentMakeup, setPendingRemoveStudentMakeup] = useState<{
    student: ClassStudentRosterItem;
    session: WeeklySession;
  } | null>(null);
  const [attendanceWeek, setAttendanceWeek] = useState<AttendanceWeekDto | null>(null);
  const [isLoadingAttendance, setIsLoadingAttendance] = useState(false);
  const [attendanceErrorMessage, setAttendanceErrorMessage] = useState<string | null>(null);
  const [actionErrorMessage, setActionErrorMessage] = useState<string | null>(null);
  const currentClassName = className;
  const scheduleKey = useMemo(
    () =>
      scheduleItems.map((item) => `${item.weekday}:${item.startTime}-${item.endTime}`).join("|"),
    [scheduleItems],
  );
  const dbSessions = useMemo(
    () => (attendanceWeek?.sessions ?? []).map(mapAttendanceSessionDtoToWeeklySession),
    [attendanceWeek],
  );
  const sessions = useMemo(
    () =>
      [...dbSessions].sort((first, second) => {
        const dateDiff = first.date.getTime() - second.date.getTime();
        return dateDiff || first.startTime.localeCompare(second.startTime);
      }),
    [dbSessions],
  );
  const students = useMemo(
    () => attendanceWeek?.officialRows.map(mapAttendanceRowToRosterItem) ?? [],
    [attendanceWeek],
  );
  const todaySessions = sessions.filter((session) => isSameDay(session.date, today));
  const todaySession =
    todaySessions.find((session) => !isSessionCancelled(session) && isSessionUnlocked(session)) ??
    todaySessions.find((session) => !isSessionCancelled(session)) ??
    todaySessions[0];
  const isSelectedWeekCurrent = isSameDay(weekStart, getWeekStart(today));
  const isTodaySessionCancelled = todaySession ? isSessionCancelled(todaySession) : false;
  const isTodaySessionUnlocked = todaySession ? isSessionUnlocked(todaySession) : false;
  const hasEligibleStudentToday = todaySession
    ? students.some((student) => isStudentEligibleForSession(student, todaySession))
    : false;
  const canMarkTodayPresent =
    Boolean(todaySession) &&
    !isTodaySessionCancelled &&
    isTodaySessionUnlocked &&
    hasEligibleStudentToday;
  const visibleStudents = useMemo(
    () =>
      sortStudentsByVietnameseName(
        students.filter((student) =>
          sessions.some((session) => isStudentEligibleForSession(student, session)),
        ),
      ),
    [sessions, students],
  );
  const receivingMakeupRows = useMemo(
    () =>
      sortStudentsByVietnameseName(attendanceWeek?.receivingMakeupRows ?? [], {
        getMembershipId: (row) => row.makeupRecordId,
        getStudentId: (row) => row.studentId,
      }),
    [attendanceWeek],
  );
  // Chi tiết học bù của học sinh chính thức: key "originalSessionId:membershipId".
  const makeupDetailByKey = useMemo(() => {
    const map = new Map<string, AttendanceMakeupDetailDto>();
    for (const detail of attendanceWeek?.makeupDetails ?? []) {
      map.set(`${detail.originalSessionId}:${detail.originalMembershipId}`, detail);
    }
    return map;
  }, [attendanceWeek]);
  const upcomingMakeupSessions = useMemo(
    () =>
      (attendanceWeek?.upcomingMakeupSessions ?? [])
        .map(mapAttendanceSessionDtoToWeeklySession)
        .filter((session) => getSessionEndDateTime(session).getTime() >= Date.now())
        .sort((first, second) => first.date.getTime() - second.date.getTime()),
    [attendanceWeek],
  );

  useEffect(() => {
    onUpcomingMakeupSessionsChange?.(upcomingMakeupSessions);
  }, [onUpcomingMakeupSessionsChange, upcomingMakeupSessions]);

  useEffect(() => {
    let cancelled = false;

    async function loadAttendanceWeek() {
      setIsLoadingAttendance(true);
      setAttendanceErrorMessage(null);

      try {
        const week = await getAttendanceWeek(classId, toDateKey(weekStart));
        if (!cancelled) {
          setAttendanceWeek(week);
        }
      } catch (error) {
        if (!cancelled) {
          setAttendanceErrorMessage(getErrorMessage(error, "Không tải được dữ liệu điểm danh."));
          setAttendanceWeek(null);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingAttendance(false);
        }
      }
    }

    void loadAttendanceWeek();

    return () => {
      cancelled = true;
    };
  }, [classId, scheduleKey, weekStart]);

  useEffect(() => {
    if (!hasValidClassRange) {
      return;
    }

    setWeekStart((current) => clampWeekStart(current, firstAllowedWeekStart, lastAllowedWeekStart));
    setVisibleCalendarMonth((current) =>
      clampWeekStart(current, firstAllowedWeekStart, lastAllowedWeekStart),
    );
  }, [firstAllowedWeekStart, hasValidClassRange, lastAllowedWeekStart]);

  const canGoPreviousWeek =
    !hasValidClassRange || addDays(weekStart, -7).getTime() >= firstAllowedWeekStart.getTime();
  const canGoNextWeek =
    !hasValidClassRange || addDays(weekStart, 7).getTime() <= lastAllowedWeekStart.getTime();

  async function refreshAttendanceWeek() {
    const week = await getAttendanceWeek(classId, toDateKey(weekStart));
    setAttendanceWeek(week);
  }

  function goToPreviousWeek() {
    setWeekStart((current) => {
      const nextWeek = addDays(current, -7);
      return hasValidClassRange
        ? clampWeekStart(nextWeek, firstAllowedWeekStart, lastAllowedWeekStart)
        : nextWeek;
    });
    setWeekPickerOpen(false);
  }

  function goToNextWeek() {
    setWeekStart((current) => {
      const nextWeek = addDays(current, 7);
      return hasValidClassRange
        ? clampWeekStart(nextWeek, firstAllowedWeekStart, lastAllowedWeekStart)
        : nextWeek;
    });
    setWeekPickerOpen(false);
  }

  async function confirmCancelToggle() {
    if (!pendingCancelSession?.dbId) {
      return;
    }

    setActionErrorMessage(null);
    try {
      if (isSessionCancelled(pendingCancelSession)) {
        await restoreAttendanceSession(pendingCancelSession.dbId);
      } else {
        await cancelAttendanceSession(pendingCancelSession.dbId);
      }
      await refreshAttendanceWeek();
      setPendingCancelSession(null);
    } catch (error) {
      setActionErrorMessage(getErrorMessage(error, "Không cập nhật được trạng thái buổi học."));
    }
  }

  async function confirmRemoveMakeupSession() {
    if (!pendingRemoveMakeupSession?.dbId) {
      return;
    }

    setActionErrorMessage(null);
    try {
      await removeClassMakeupSession(pendingRemoveMakeupSession.dbId);
      await refreshAttendanceWeek();
      setPendingRemoveMakeupSession(null);
    } catch (error) {
      setActionErrorMessage(getErrorMessage(error, "Không hủy được buổi học bù."));
    }
  }

  async function markTodayPresent() {
    if (!todaySession || isTodaySessionCancelled || !todaySession.dbId) {
      return;
    }

    setActionErrorMessage(null);

    try {
      await markSessionPresent(todaySession.dbId);
      await refreshAttendanceWeek();
    } catch (error) {
      setActionErrorMessage(getErrorMessage(error, "Không đánh dấu được cả lớp đi học."));
    }
  }

  function openWeekPicker() {
    setVisibleCalendarMonth(weekStart);
    setWeekPickerOpen((current) => !current);
  }

  function selectWeek(nextWeekStart: Date) {
    const normalizedWeek = startOfDay(nextWeekStart);
    setWeekStart(
      hasValidClassRange
        ? clampWeekStart(normalizedWeek, firstAllowedWeekStart, lastAllowedWeekStart)
        : normalizedWeek,
    );
    setWeekPickerOpen(false);
  }

  async function tryAddMakeupSession(input: MakeupSessionInput): Promise<string | null> {
    const originalSession = sessions.find((session) => session.id === input.makeupForSessionId);
    if (!originalSession?.dbId) {
      return "Không tìm thấy buổi học gốc.";
    }

    setActionErrorMessage(null);
    try {
      await createClassMakeupSession({
        classId,
        originalSessionId: originalSession.dbId,
        makeupDate: input.date,
        startTime: input.startTime,
        endTime: input.endTime,
      });
      await refreshAttendanceWeek();
      return null;
    } catch (error) {
      return getErrorMessage(error, "Không tạo được buổi học bù.");
    }
  }

  async function handleOfficialStatusSelect(
    student: ClassStudentRosterItem,
    session: WeeklySession,
    nextStatus: AttendanceCellStatus,
  ) {
    if (!session.dbId) {
      return;
    }

    const currentStatus = getAttendanceCellStatus(student, session);

    if (nextStatus === "makeup") {
      // Mở dialog chọn buổi nhận học bù; chưa đổi trạng thái cho đến khi xác nhận.
      setActionErrorMessage(null);

      try {
        const result = await listStudentMakeupOptions({
          classId,
          originalSessionId: session.dbId,
          membershipId: student.membershipId,
          studentId: student.studentId,
        });
        const options = result.options.map((option) => ({
          sessionId: String(option.receivingSessionId),
          classId: String(option.receivingClassId),
          className: option.receivingClassName,
          date: parseLocalDate(option.receivingSessionDate),
          startTime: option.startTime,
          endTime: option.endTime,
        }));

        setPendingStudentMakeup({ student, session, options });
        setSelectedStudentMakeupSessionId(options[0]?.sessionId ?? "");
      } catch (error) {
        setActionErrorMessage(getErrorMessage(error, "Không tải được danh sách buổi học bù."));
      }
      return;
    }

    // Bấm lại nút Học bù đang chọn: xác nhận trước khi hủy liên kết học bù.
    if (currentStatus === "makeup" && nextStatus === undefined) {
      setPendingRemoveStudentMakeup({ student, session });
      return;
    }

    setActionErrorMessage(null);

    try {
      // Backend tự gỡ liên kết học bù cũ khi đổi trạng thái trực tiếp.
      await saveAttendanceStatus({
        sessionId: session.dbId,
        membershipId: student.membershipId,
        studentId: student.studentId,
        status: nextStatus === "present" || nextStatus === "absent" ? nextStatus : null,
      });
      await refreshAttendanceWeek();
    } catch (error) {
      setActionErrorMessage(getErrorMessage(error, "Không lưu được điểm danh."));
    }
  }

  async function confirmStudentMakeup() {
    if (!pendingStudentMakeup?.session.dbId) {
      return;
    }

    const selectedOption = pendingStudentMakeup.options.find(
      (option) => option.sessionId === selectedStudentMakeupSessionId,
    );

    if (!selectedOption) {
      return;
    }

    setActionErrorMessage(null);

    try {
      await createStudentMakeupRecord({
        studentId: pendingStudentMakeup.student.studentId,
        originalMembershipId: pendingStudentMakeup.student.membershipId,
        originalSessionId: pendingStudentMakeup.session.dbId,
        receivingSessionId: Number(selectedOption.sessionId),
      });
      await refreshAttendanceWeek();
      setPendingStudentMakeup(null);
      setSelectedStudentMakeupSessionId("");
    } catch (error) {
      setActionErrorMessage(getErrorMessage(error, "Không lưu được học bù cho học sinh."));
    }
  }

  async function confirmRemoveStudentMakeup() {
    if (!pendingRemoveStudentMakeup?.session.dbId) {
      return;
    }

    setActionErrorMessage(null);

    try {
      await removeStudentMakeupRecord({
        originalSessionId: pendingRemoveStudentMakeup.session.dbId,
        originalMembershipId: pendingRemoveStudentMakeup.student.membershipId,
      });
      await refreshAttendanceWeek();
      setPendingRemoveStudentMakeup(null);
    } catch (error) {
      setActionErrorMessage(getErrorMessage(error, "Không hủy được học bù của học sinh."));
    }
  }

  async function handleReceivingStatusSelect(
    row: AttendanceReceivingMakeupRowDto,
    nextStatus: AttendanceCellStatus,
  ) {
    setActionErrorMessage(null);

    try {
      await setReceivingMakeupAttendanceStatus({
        makeupRecordId: row.makeupRecordId,
        status: nextStatus === "present" || nextStatus === "absent" ? nextStatus : null,
      });
      await refreshAttendanceWeek();
    } catch (error) {
      setActionErrorMessage(getErrorMessage(error, "Không lưu được điểm danh học sinh học bù."));
    }
  }

  function getMakeupDetail(student: ClassStudentRosterItem, session: WeeklySession) {
    if (!session.dbId) {
      return undefined;
    }

    return makeupDetailByKey.get(`${session.dbId}:${student.membershipId}`);
  }

  async function handleToggleSessionLock(session: WeeklySession) {
    setActionErrorMessage(null);

    if (!session.dbId) {
      setActionErrorMessage("Không tìm thấy buổi học.");
      return;
    }

    try {
      await toggleAttendanceLock(session.dbId, !session.isLocked);
      await refreshAttendanceWeek();
    } catch (error) {
      setActionErrorMessage(getErrorMessage(error, "Không cập nhật được khóa điểm danh."));
    }
  }

  return (
    <div className="space-y-4">
      <section className="rounded-lg border bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="gap-2"
              onClick={goToPreviousWeek}
              disabled={!canGoPreviousWeek}
            >
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
            {isSelectedWeekCurrent ? (
              <Badge className="bg-emerald-100 text-emerald-900 hover:bg-emerald-100">
                Tuần hiện tại
              </Badge>
            ) : null}
            <Button
              variant="outline"
              className="gap-2"
              onClick={goToNextWeek}
              disabled={!canGoNextWeek}
            >
              Tuần sau
              <ChevronRight className="size-4" />
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-slate-500">Màu ngày:</span>
            <DateToneLegendItem className="bg-slate-100 text-slate-500" label="Quá khứ" />
            <DateToneLegendItem className="bg-emerald-100 text-emerald-900" label="Hôm nay" />
            <DateToneLegendItem className="bg-sky-50 text-sky-800" label="Tương lai" />
          </div>
        </div>
      </section>

      <section className="flex justify-end">
        <div className="flex flex-wrap justify-end gap-2">
          <AddMakeupSessionDialog
            classId={classId}
            sessions={sessions}
            existingClasses={availableClasses}
            onAdd={tryAddMakeupSession}
          />
          <Button
            type="button"
            variant="outline"
            className="gap-2"
            disabled={!canMarkTodayPresent}
            onClick={markTodayPresent}
            title={
              canMarkTodayPresent
                ? "Đánh dấu tất cả học sinh có mặt trong buổi hôm nay"
                : isTodaySessionCancelled
                  ? "Buổi học hôm nay đã nghỉ"
                  : "Hôm nay không có buổi học trong tuần đang xem"
            }
          >
            <CheckCheck className="size-4" />
            <span className="hidden sm:inline">Đánh dấu cả lớp đi học</span>
          </Button>
        </div>
      </section>

      {actionErrorMessage ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {actionErrorMessage}
        </p>
      ) : null}
      {isLoadingAttendance ? (
        <p className="rounded-lg border bg-white px-4 py-3 text-sm text-slate-600">
          Đang tải dữ liệu điểm danh...
        </p>
      ) : null}
      {attendanceErrorMessage ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {attendanceErrorMessage}
        </p>
      ) : null}
      {!isLoadingAttendance && !attendanceErrorMessage && students.length === 0 ? (
        <p className="rounded-lg border bg-white px-4 py-3 text-sm text-slate-600">
          Lớp này chưa có học sinh.
        </p>
      ) : null}
      {!isLoadingAttendance &&
      !attendanceErrorMessage &&
      students.length > 0 &&
      visibleStudents.length === 0 ? (
        <p className="rounded-lg border bg-white px-4 py-3 text-sm text-slate-600">
          Không có học sinh trong thời gian này.
        </p>
      ) : null}

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
                    isCancelled={isSessionCancelled(session)}
                    isUnlocked={isSessionUnlocked(session)}
                    onRequestCancelToggle={() => setPendingCancelSession(session)}
                    onRequestRemoveMakeup={() => setPendingRemoveMakeupSession(session)}
                    onToggleLock={() => void handleToggleSessionLock(session)}
                  />
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleStudents.map((student, index) => {
              const studentKey = getRosterStudentKey(student);

              return (
                <TableRow key={studentKey}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell className="font-medium text-slate-950">{student.fullName}</TableCell>
                  {sessions.map((session) => {
                    const isEligible = isStudentEligibleForSession(student, session);
                    const isCancelled = isSessionCancelled(session);
                    const isUnlocked = isSessionUnlocked(session);
                    const status = getAttendanceCellStatus(student, session);
                    const makeupDetailDto =
                      status === "makeup" ? getMakeupDetail(student, session) : undefined;
                    const makeupDetail = makeupDetailDto
                      ? `Học bù tại ${makeupDetailDto.receivingClassName} - ${formatDayMonth(
                          parseLocalDate(makeupDetailDto.receivingSessionDate),
                        )}`
                      : "";
                    const receivingStatusNote = makeupDetailDto?.receivingAttendanceStatus
                      ? `Lớp nhận: ${attendanceStatusLabel(
                          makeupDetailDto.receivingAttendanceStatus,
                        )}`
                      : "";

                    return (
                      <TableCell key={session.id} className="text-center">
                        {!isEligible ? (
                          <span className="text-slate-300">-</span>
                        ) : isCancelled ? (
                          <Badge className="bg-red-100 text-red-900 hover:bg-red-100">Nghỉ</Badge>
                        ) : isUnlocked ? (
                          <div className="flex flex-col items-center gap-1">
                            <AttendanceStatusButtons
                              status={status}
                              allowMakeup={session.type === "regular"}
                              onSelect={(nextStatus) =>
                                handleOfficialStatusSelect(student, session, nextStatus)
                              }
                            />
                            {makeupDetail ? (
                              <span className="max-w-40 text-xs font-normal text-slate-500">
                                {makeupDetail}
                                {receivingStatusNote ? (
                                  <>
                                    <br />
                                    {receivingStatusNote}
                                  </>
                                ) : null}
                              </span>
                            ) : null}
                          </div>
                        ) : (
                          <span
                            className="flex flex-col items-center gap-1"
                            title="Bấm Mở khóa để chỉnh sửa buổi này"
                          >
                            <AttendanceStatusBadge status={status} />
                            {makeupDetail ? (
                              <span className="max-w-40 text-xs font-normal text-slate-500">
                                {makeupDetail}
                              </span>
                            ) : null}
                          </span>
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              );
            })}
            {receivingMakeupRows.length > 0 ? (
              <>
                <TableRow className="bg-violet-50/70">
                  <TableCell
                    colSpan={2 + sessions.length}
                    className="font-semibold text-violet-950"
                  >
                    Học sinh học bù
                  </TableCell>
                </TableRow>
                {receivingMakeupRows.map((row, receivingIndex) => {
                  return (
                    <TableRow key={row.makeupRecordId}>
                      <TableCell>{`HB${receivingIndex + 1}`}</TableCell>
                      <TableCell className="font-medium text-slate-950">
                        {row.fullName}
                        <div className="text-xs font-normal text-slate-500">
                          Từ {row.originalClassName} -{" "}
                          {formatDayMonth(parseLocalDate(row.originalSessionDate))}
                        </div>
                      </TableCell>
                      {sessions.map((session) => {
                        const isTargetSession = session.dbId === row.receivingSessionId;
                        const isCancelled = isSessionCancelled(session);
                        const isUnlocked = isSessionUnlocked(session);
                        const status = row.receivingAttendanceStatus ?? undefined;

                        return (
                          <TableCell key={session.id} className="text-center">
                            {isTargetSession ? (
                              isCancelled ? (
                                <Badge className="bg-red-100 text-red-900 hover:bg-red-100">
                                  Nghỉ
                                </Badge>
                              ) : isUnlocked ? (
                                <AttendanceStatusButtons
                                  status={status}
                                  allowMakeup={false}
                                  onSelect={(nextStatus) =>
                                    void handleReceivingStatusSelect(row, nextStatus)
                                  }
                                />
                              ) : (
                                <span title="Bấm Mở khóa để chỉnh sửa buổi này">
                                  <AttendanceStatusBadge status={status} />
                                </span>
                              )
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  );
                })}
              </>
            ) : null}
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
              {pendingCancelSession && isSessionCancelled(pendingCancelSession)
                ? "Hủy trạng thái nghỉ?"
                : "Xác nhận lớp nghỉ?"}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {pendingCancelSession && isSessionCancelled(pendingCancelSession)
              ? `Hủy nghỉ buổi ${weekdayLabel(pendingCancelSession.date)} ${formatDayMonth(
                  pendingCancelSession.date,
                )}? Buổi học sẽ trở lại bình thường và được mở khóa; trạng thái Nghỉ của học sinh được giữ nguyên để thầy chỉnh lại từng em.`
              : pendingCancelSession
                ? `Lớp học buổi ${weekdayLabel(pendingCancelSession.date)} ${formatDayMonth(
                    pendingCancelSession.date,
                  )} nghỉ? Tất cả học sinh trong buổi này sẽ được đánh dấu Nghỉ và buổi học sẽ bị khóa.`
                : ""}
          </p>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Hủy
              </Button>
            </DialogClose>
            <Button type="button" onClick={() => void confirmCancelToggle()}>
              Xác nhận
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(pendingRemoveMakeupSession)}
        onOpenChange={(open) => {
          if (!open) {
            setPendingRemoveMakeupSession(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Hủy buổi học bù này?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {pendingRemoveMakeupSession
              ? `Hủy buổi học bù ${weekdayLabel(pendingRemoveMakeupSession.date)} ${formatDayMonth(
                  pendingRemoveMakeupSession.date,
                )}? Buổi gốc sẽ được mở lại như buổi học bình thường. Điểm danh Nghỉ đã ghi ở buổi gốc vẫn được giữ để thầy kiểm tra và chỉnh lại.`
              : ""}
          </p>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Không
              </Button>
            </DialogClose>
            <Button type="button" onClick={() => void confirmRemoveMakeupSession()}>
              Xác nhận hủy
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <StudentMakeupDialog
        pendingMakeup={pendingStudentMakeup}
        currentClassName={currentClassName}
        sessions={sessions}
        selectedSessionId={selectedStudentMakeupSessionId}
        onOpenChange={(open) => {
          if (!open) {
            setPendingStudentMakeup(null);
            setSelectedStudentMakeupSessionId("");
          }
        }}
        onSelectSession={setSelectedStudentMakeupSessionId}
        onConfirm={() => void confirmStudentMakeup()}
      />

      <Dialog
        open={Boolean(pendingRemoveStudentMakeup)}
        onOpenChange={(open) => {
          if (!open) {
            setPendingRemoveStudentMakeup(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Hủy học bù cho học sinh này?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {pendingRemoveStudentMakeup
              ? `Hủy học bù của ${pendingRemoveStudentMakeup.student.fullName} cho buổi ${weekdayLabel(
                  pendingRemoveStudentMakeup.session.date,
                )} ${formatDayMonth(
                  pendingRemoveStudentMakeup.session.date,
                )}? Trạng thái buổi gốc sẽ trở về Chưa điểm danh và dòng học bù ở lớp nhận sẽ bị gỡ.`
              : ""}
          </p>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Không
              </Button>
            </DialogClose>
            <Button type="button" onClick={() => void confirmRemoveStudentMakeup()}>
              Xác nhận hủy
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DateToneLegendItem({ className, label }: { className: string; label: string }) {
  return (
    <span className={["rounded-full px-2 py-0.5 font-medium", className].join(" ")}>{label}</span>
  );
}

function getRosterStudentKey(student: ClassStudentRosterItem) {
  return String(student.membershipId);
}

function getErrorMessage(error: unknown, fallback: string) {
  if (typeof error === "string") {
    return error;
  }

  return error instanceof Error ? error.message : fallback;
}

function mapAttendanceSessionDtoToWeeklySession(
  session: AttendanceWeekDto["sessions"][number],
): WeeklySession {
  return {
    id: String(session.id),
    dbId: session.id,
    classId: String(session.classId),
    date: parseLocalDate(session.sessionDate),
    startTime: session.startTime,
    endTime: session.endTime,
    sessionIndexInWeek: session.sessionIndexInWeek,
    type: session.type,
    status: session.status,
    isLocked: session.isLocked,
    isMakeup: session.type === "class_makeup",
    makeupForSessionId: session.makeupForSessionId ? String(session.makeupForSessionId) : undefined,
  };
}

function mapAttendanceRowToRosterItem(
  row: AttendanceWeekDto["officialRows"][number],
): ClassStudentRosterItem {
  return {
    id: row.id,
    membershipId: row.membershipId,
    studentId: row.studentId,
    classId: row.classId,
    fullName: row.fullName,
    schoolClass: row.schoolClass,
    school: row.school,
    parentPhone: row.parentPhone,
    status: row.status,
    joinedMonth: row.joinedMonth,
    leftMonth: row.leftMonth,
    note: row.note,
    attendanceBySessionId: row.attendanceBySessionId,
  } as ClassStudentRosterItem & {
    attendanceBySessionId: AttendanceWeekDto["officialRows"][number]["attendanceBySessionId"];
  };
}

function getAttendanceCellStatus(
  student: ClassStudentRosterItem,
  session: WeeklySession,
): AttendanceCellStatus {
  const row = student as ClassStudentRosterItem & {
    attendanceBySessionId?: AttendanceWeekDto["officialRows"][number]["attendanceBySessionId"];
  };

  if (session.dbId) {
    return row.attendanceBySessionId?.[String(session.dbId)] ?? undefined;
  }

  return undefined;
}

function isSessionCancelled(session: WeeklySession) {
  return session.status === "cancelled";
}

function isSessionUnlocked(session: WeeklySession) {
  return Boolean(session.dbId) && !session.isLocked;
}

function isStudentEligibleForSession(student: ClassStudentRosterItem, session: WeeklySession) {
  const sessionMonth = currentMonthKey(session.date);

  return (
    student.joinedMonth <= sessionMonth &&
    (student.leftMonth === null || sessionMonth < student.leftMonth)
  );
}

function parseMonthStart(month: string) {
  if (!isValidMonthKey(month)) {
    return null;
  }

  const [year, monthNumber] = month.split("-").map(Number);
  return new Date(year, monthNumber - 1, 1);
}

function parseMonthEnd(month: string) {
  if (!isValidMonthKey(month)) {
    return null;
  }

  const [year, monthNumber] = month.split("-").map(Number);
  return new Date(year, monthNumber, 0);
}

function clampWeekStart(weekStart: Date, minWeekStart: Date, maxWeekStart: Date) {
  if (weekStart.getTime() < minWeekStart.getTime()) {
    return minWeekStart;
  }

  if (weekStart.getTime() > maxWeekStart.getTime()) {
    return maxWeekStart;
  }

  return weekStart;
}

function getSessionDateToneClass(date: Date, today: Date) {
  if (isSameDay(date, today)) {
    return "bg-emerald-100 text-emerald-900";
  }

  if (isPastDate(date, today)) {
    return "bg-slate-100 text-slate-500";
  }

  return "bg-sky-50 text-sky-800";
}

function getSessionEndDateTime(session: WeeklySession) {
  const [hour, minute] = session.endTime.split(":").map(Number);
  const result = new Date(session.date);
  result.setHours(Number.isFinite(hour) ? hour : 23, Number.isFinite(minute) ? minute : 59, 0, 0);
  return result;
}
