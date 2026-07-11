import { useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency } from "@/lib/format";
import {
  clampMonthToRange,
  currentMonthKey,
  formatMonthLabel,
  isValidMonthKey,
  monthsInRange,
} from "@/lib/months";
import { listGlobalScheduleMonth } from "@/services/scheduleApi";
import type { AcademicYear } from "@/types/academic-year";
import type { ClassOverview } from "@/types/class";
import type { GlobalScheduleEventDto, GlobalScheduleMonthDto } from "@/types/schedule";

type SchedulePageProps = {
  academicYears: AcademicYear[];
  selectedYearId: number | null;
  classOverviews: ClassOverview[];
  onYearChange: (yearId: number) => void | Promise<void>;
  onOpenClass: (classId: number) => void;
};

type GradeFilter = "all" | "8" | "9";

type TypeFilter = "all" | "regular" | "class_makeup" | "cancelled";

type CalendarCell = {
  date: string;
  dayNumber: number;
  inMonth: boolean;
  isToday: boolean;
};

const WEEKDAY_LABELS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

const VIETNAMESE_WEEKDAYS = [
  "Chủ nhật",
  "Thứ 2",
  "Thứ 3",
  "Thứ 4",
  "Thứ 5",
  "Thứ 6",
  "Thứ 7",
];

const typeFilterOptions: Array<{ value: TypeFilter; label: string }> = [
  { value: "all", label: "Tất cả buổi" },
  { value: "regular", label: "Buổi thường" },
  { value: "class_makeup", label: "Học bù cả lớp" },
  { value: "cancelled", label: "Buổi nghỉ" },
];

export function SchedulePage({
  academicYears,
  selectedYearId,
  classOverviews,
  onYearChange,
  onOpenClass,
}: SchedulePageProps) {
  const selectedYear = academicYears.find((year) => year.id === selectedYearId) ?? null;
  const monthOptions = useMemo(() => {
    if (!selectedYear) {
      return [currentMonthKey()];
    }

    const startMonth = selectedYear.startsAt.slice(0, 7);
    const endMonth = selectedYear.endsAt.slice(0, 7);
    if (!isValidMonthKey(startMonth) || !isValidMonthKey(endMonth) || startMonth > endMonth) {
      return [currentMonthKey()];
    }

    return monthsInRange(startMonth, endMonth);
  }, [selectedYear]);

  const [selectedMonth, setSelectedMonth] = useState(() => currentMonthKey());
  const [scheduleMonth, setScheduleMonth] = useState<GlobalScheduleMonthDto | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [gradeFilter, setGradeFilter] = useState<GradeFilter>("all");
  const [classFilter, setClassFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<GlobalScheduleEventDto | null>(null);

  // Kéo tháng đang chọn về trong khoảng của năm học khi đổi năm.
  useEffect(() => {
    if (monthOptions.length > 0 && !monthOptions.includes(selectedMonth)) {
      setSelectedMonth(
        clampMonthToRange(currentMonthKey(), monthOptions[0], monthOptions[monthOptions.length - 1]),
      );
    }
  }, [monthOptions, selectedMonth]);

  useEffect(() => {
    setClassFilter("all");
  }, [selectedYearId]);

  useEffect(() => {
    setSelectedDate(null);
  }, [selectedMonth, selectedYearId]);

  useEffect(() => {
    if (selectedYearId === null || !monthOptions.includes(selectedMonth)) {
      setScheduleMonth(null);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setErrorMessage("");

    listGlobalScheduleMonth(selectedYearId, selectedMonth)
      .then((data) => {
        if (!cancelled) {
          setScheduleMonth(data);
        }
      })
      .catch((error) => {
        console.warn("[schedule] load failed", error);
        if (!cancelled) {
          setScheduleMonth(null);
          setErrorMessage(
            typeof error === "string" ? error : "Không thể tải lịch học. Vui lòng thử lại.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [monthOptions, selectedMonth, selectedYearId]);

  const classOptions = useMemo(
    () =>
      [...classOverviews].sort(
        (first, second) =>
          (first.grade ?? 9) - (second.grade ?? 9) ||
          first.name.localeCompare(second.name, "vi"),
      ),
    [classOverviews],
  );

  const visibleEvents = useMemo(
    () =>
      (scheduleMonth?.events ?? []).filter((event) => {
        if (gradeFilter !== "all" && String(event.grade) !== gradeFilter) {
          return false;
        }
        if (classFilter !== "all" && String(event.classId) !== classFilter) {
          return false;
        }
        if (typeFilter === "regular") {
          return event.type === "regular" && event.status === "active";
        }
        if (typeFilter === "class_makeup") {
          return event.type === "class_makeup" && event.status === "active";
        }
        if (typeFilter === "cancelled") {
          return event.status === "cancelled";
        }

        return true;
      }),
    [classFilter, gradeFilter, scheduleMonth, typeFilter],
  );

  const eventsByDate = useMemo(() => {
    const grouped = new Map<string, GlobalScheduleEventDto[]>();
    visibleEvents.forEach((event) => {
      const events = grouped.get(event.date) ?? [];
      events.push(event);
      grouped.set(event.date, events);
    });

    return grouped;
  }, [visibleEvents]);

  const calendarWeeks = useMemo(() => buildMonthGrid(selectedMonth), [selectedMonth]);
  const selectedDateEvents = selectedDate ? eventsByDate.get(selectedDate) ?? [] : [];

  const selectedMonthIndex = monthOptions.indexOf(selectedMonth);
  const canGoPreviousMonth = selectedMonthIndex > 0;
  const canGoNextMonth = selectedMonthIndex >= 0 && selectedMonthIndex < monthOptions.length - 1;

  function goToCurrentMonth() {
    if (monthOptions.length > 0) {
      setSelectedMonth(
        clampMonthToRange(currentMonthKey(), monthOptions[0], monthOptions[monthOptions.length - 1]),
      );
    }
  }

  return (
    <div className="min-h-full min-w-0 space-y-4 pb-4">
      <section>
        <h2 className="text-2xl font-semibold text-slate-950 md:text-3xl">Lịch học</h2>
        <p className="mt-2 max-w-3xl text-muted-foreground">
          Lịch tổng hợp các lớp theo tháng.
        </p>
      </section>

      <Card className="rounded-lg border-slate-200 shadow-sm">
        <CardContent className="flex flex-wrap items-center gap-2 p-4">
          <Select
            value={selectedYearId !== null ? String(selectedYearId) : ""}
            onValueChange={(value) => {
              void onYearChange(Number(value));
            }}
          >
            <SelectTrigger className="h-9 min-w-44 bg-white">
              <SelectValue placeholder="Chọn năm học" />
            </SelectTrigger>
            <SelectContent>
              {academicYears.map((year) => (
                <SelectItem key={year.id} value={String(year.id)}>
                  {year.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              className="h-9 w-9"
              disabled={!canGoPreviousMonth || isLoading}
              onClick={() => {
                if (canGoPreviousMonth) {
                  setSelectedMonth(monthOptions[selectedMonthIndex - 1]);
                }
              }}
            >
              <ChevronLeft className="size-4" />
              <span className="sr-only">Tháng trước</span>
            </Button>
            <p className="min-w-32 text-center text-sm font-semibold text-slate-950">
              Tháng {formatMonthLabel(selectedMonth)}
            </p>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              className="h-9 w-9"
              disabled={!canGoNextMonth || isLoading}
              onClick={() => {
                if (canGoNextMonth) {
                  setSelectedMonth(monthOptions[selectedMonthIndex + 1]);
                }
              }}
            >
              <ChevronRight className="size-4" />
              <span className="sr-only">Tháng sau</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-9 gap-2"
              onClick={goToCurrentMonth}
              disabled={isLoading}
            >
              <CalendarDays className="size-4" />
              Hôm nay
            </Button>
          </div>

          <Select
            value={gradeFilter}
            onValueChange={(value) => setGradeFilter(value as GradeFilter)}
          >
            <SelectTrigger className="h-9 min-w-28 bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả khối</SelectItem>
              <SelectItem value="8">Khối 8</SelectItem>
              <SelectItem value="9">Khối 9</SelectItem>
            </SelectContent>
          </Select>

          <Select value={classFilter} onValueChange={setClassFilter}>
            <SelectTrigger className="h-9 min-w-40 bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả lớp</SelectItem>
              {classOptions.map((classItem) => (
                <SelectItem key={classItem.id} value={String(classItem.id)}>
                  {classItem.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as TypeFilter)}>
            <SelectTrigger className="h-9 min-w-36 bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {typeFilterOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {errorMessage ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </p>
      ) : null}
      {isLoading ? (
        <p className="rounded-lg border bg-white px-4 py-3 text-sm text-slate-600">
          Đang tải lịch học...
        </p>
      ) : null}
      {!isLoading && !errorMessage && classOverviews.length === 0 ? (
        <p className="rounded-lg border bg-white px-4 py-3 text-sm text-slate-600">
          Năm học này chưa có lớp.
        </p>
      ) : null}
      {!isLoading && !errorMessage && classOverviews.length > 0 && visibleEvents.length === 0 ? (
        <p className="rounded-lg border bg-white px-4 py-3 text-sm text-slate-600">
          Không có buổi học nào trong tháng này.
        </p>
      ) : null}

      {!isLoading ? (
        <Card className="rounded-lg border-slate-200 shadow-sm">
          <CardContent className="p-3">
            <div className="grid grid-cols-7 gap-px rounded-t-md bg-slate-200 text-center">
              {WEEKDAY_LABELS.map((label) => (
                <div
                  key={label}
                  className="bg-slate-50 py-2 text-sm font-semibold text-slate-700"
                >
                  {label}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-px bg-slate-200">
              {calendarWeeks.flat().map((cell) => {
                const cellEvents = cell.inMonth ? eventsByDate.get(cell.date) ?? [] : [];
                const hiddenCount = Math.max(0, cellEvents.length - 3);
                const isSelected = selectedDate === cell.date;

                return (
                  <button
                    key={cell.date}
                    type="button"
                    onClick={() => {
                      if (cell.inMonth) {
                        setSelectedDate((current) => (current === cell.date ? null : cell.date));
                      }
                    }}
                    className={[
                      "flex min-h-28 flex-col gap-1 p-1.5 text-left align-top transition-colors",
                      cell.inMonth ? "bg-white hover:bg-slate-50" : "bg-slate-50/70",
                      isSelected ? "ring-2 ring-inset ring-emerald-400" : "",
                    ].join(" ")}
                  >
                    <span
                      className={[
                        "inline-flex size-6 items-center justify-center rounded-full text-sm",
                        cell.inMonth ? "text-slate-950" : "text-slate-400",
                        cell.isToday ? "bg-emerald-600 font-semibold text-white" : "",
                      ].join(" ")}
                    >
                      {cell.dayNumber}
                    </span>
                    <span className="flex min-w-0 flex-col gap-1">
                      {cellEvents.slice(0, 3).map((event) => (
                        <EventBadge
                          key={event.id}
                          event={event}
                          onClick={() => setSelectedEvent(event)}
                        />
                      ))}
                      {hiddenCount > 0 ? (
                        <span className="px-1 text-xs font-medium text-slate-500">
                          +{hiddenCount} buổi nữa
                        </span>
                      ) : null}
                    </span>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {selectedDate ? (
        <Card className="rounded-lg border-slate-200 shadow-sm">
          <CardContent className="space-y-2 p-4">
            <p className="text-sm font-semibold text-slate-950">
              Buổi học ngày {formatFullDateLabel(selectedDate)}
            </p>
            {selectedDateEvents.length > 0 ? (
              <div className="space-y-1.5">
                {selectedDateEvents.map((event) => (
                  <button
                    key={event.id}
                    type="button"
                    onClick={() => setSelectedEvent(event)}
                    className="flex w-full flex-wrap items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-left text-sm hover:bg-slate-50"
                  >
                    <span className="font-medium text-slate-950">
                      {event.startTime} - {event.endTime}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-slate-700">
                      {event.className}
                    </span>
                    <EventStatusBadge event={event} />
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Ngày này không có buổi học nào.</p>
            )}
          </CardContent>
        </Card>
      ) : null}

      <Dialog
        open={Boolean(selectedEvent)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedEvent(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedEvent?.className}</DialogTitle>
          </DialogHeader>
          {selectedEvent ? (
            <div className="space-y-3">
              {selectedEvent.status === "cancelled" ? (
                <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  Buổi này đang được đánh dấu nghỉ.
                </p>
              ) : null}
              {selectedEvent.type === "class_makeup" ? (
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  Buổi học bù cả lớp
                  {selectedEvent.makeupForSessionId ? " (bù cho một buổi đã nghỉ)." : "."}
                </p>
              ) : null}

              <div className="grid gap-2 rounded-lg bg-slate-50 p-4 text-sm">
                <InfoRow
                  label="Loại buổi"
                  value={selectedEvent.type === "class_makeup" ? "Học bù cả lớp" : "Buổi thường"}
                />
                <InfoRow
                  label="Trạng thái"
                  value={selectedEvent.status === "cancelled" ? "Nghỉ" : "Đang học"}
                />
                <InfoRow label="Ngày học" value={formatFullDateLabel(selectedEvent.date)} />
                <InfoRow
                  label="Giờ học"
                  value={`${selectedEvent.startTime} - ${selectedEvent.endTime}`}
                />
                <InfoRow label="Khối" value={`Khối ${selectedEvent.grade}`} />
                <InfoRow
                  label="Thời gian lớp"
                  value={`${formatMonthLabel(selectedEvent.classStartMonth)} - ${formatMonthLabel(
                    selectedEvent.classEndMonth,
                  )}`}
                />
                <InfoRow label="Học phí tháng" value={formatCurrency(selectedEvent.monthlyFee)} />
                <InfoRow label="Số học sinh" value={String(selectedEvent.studentCount)} />
                {selectedEvent.note?.trim() ? (
                  <InfoRow label="Ghi chú" value={selectedEvent.note} />
                ) : null}
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Đóng
              </Button>
            </DialogClose>
            <Button
              type="button"
              onClick={() => {
                if (selectedEvent) {
                  onOpenClass(selectedEvent.classId);
                }
              }}
            >
              Mở lớp
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EventBadge({
  event,
  onClick,
}: {
  event: GlobalScheduleEventDto;
  onClick: () => void;
}) {
  const isCancelled = event.status === "cancelled";
  const isMakeup = event.type === "class_makeup";
  const prefix = isCancelled ? "Nghỉ · " : isMakeup ? "Bù · " : "";
  const badgeClass = isCancelled
    ? "border-red-200 bg-red-50 text-red-700"
    : isMakeup
      ? "border-amber-200 bg-amber-50 text-amber-900"
      : "border-sky-200 bg-sky-50 text-sky-900";

  return (
    <span
      role="button"
      tabIndex={0}
      title={`${event.startTime} - ${event.endTime} ${event.className}`}
      onClick={(clickEvent) => {
        clickEvent.stopPropagation();
        onClick();
      }}
      onKeyDown={(keyEvent) => {
        if (keyEvent.key === "Enter" || keyEvent.key === " ") {
          keyEvent.preventDefault();
          keyEvent.stopPropagation();
          onClick();
        }
      }}
      className={`block w-full cursor-pointer truncate rounded border px-1.5 py-0.5 text-xs font-medium hover:opacity-80 ${badgeClass}`}
    >
      {prefix}
      {event.startTime} {event.className}
    </span>
  );
}

function EventStatusBadge({ event }: { event: GlobalScheduleEventDto }) {
  if (event.status === "cancelled") {
    return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Nghỉ</Badge>;
  }

  if (event.type === "class_makeup") {
    return <Badge className="bg-amber-100 text-amber-900 hover:bg-amber-100">Học bù</Badge>;
  }

  return <Badge className="bg-sky-100 text-sky-900 hover:bg-sky-100">Buổi thường</Badge>;
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[128px_minmax(0,1fr)] gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="min-w-0 break-words font-medium text-slate-950">{value}</span>
    </div>
  );
}

/// Lưới tháng bắt đầu Thứ 2; ngày kề tháng hiển thị mờ, không gắn sự kiện.
function buildMonthGrid(month: string): CalendarCell[][] {
  const year = Number(month.slice(0, 4));
  const monthIndex = Number(month.slice(5, 7)) - 1;
  const firstOfMonth = new Date(year, monthIndex, 1);
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const leadingDays = (firstOfMonth.getDay() + 6) % 7;
  const totalCells = Math.ceil((leadingDays + daysInMonth) / 7) * 7;
  const todayKey = formatLocalDate(new Date());

  const weeks: CalendarCell[][] = [];
  let currentWeek: CalendarCell[] = [];

  for (let cellIndex = 0; cellIndex < totalCells; cellIndex += 1) {
    const cellDate = new Date(year, monthIndex, 1 - leadingDays + cellIndex);
    const dateKey = formatLocalDate(cellDate);

    currentWeek.push({
      date: dateKey,
      dayNumber: cellDate.getDate(),
      inMonth: cellDate.getMonth() === monthIndex,
      isToday: dateKey === todayKey,
    });

    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }

  return weeks;
}

function formatLocalDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatFullDateLabel(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  const weekday = VIETNAMESE_WEEKDAYS[new Date(year, month - 1, day).getDay()];
  return `${weekday}, ${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year}`;
}
