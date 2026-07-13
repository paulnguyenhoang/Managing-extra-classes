import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Search,
  Users,
  WalletCards,
  type LucideIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  formatPaymentMonthLabel,
  paymentFilterOptions,
  type PaymentFilter,
} from "@/features/classes/utils/payments";
import { getClassMonthOptionsForYear } from "@/features/classes/utils/classMonthOptions";
import { sortStudentsByVietnameseName } from "@/features/classes/utils/studentRoster";
import {
  formatCurrency,
  formatDate,
  formatPhoneNumber,
  formatVietnameseMoneyWords,
  paymentStatusLabel,
} from "@/lib/format";
import { clampMonthToRange, currentMonthKey } from "@/lib/months";
import { listTuitionDashboard } from "@/services/tuitionDashboardApi";
import type { AcademicYear } from "@/types/academic-year";
import type { ClassOverview } from "@/types/class";
import type { PaymentStatus } from "@/types/payment";
import type { TuitionDashboardDto } from "@/types/tuition";

type TuitionDashboardPageProps = {
  academicYears: AcademicYear[];
  selectedYearId: number | null;
  classOverviews: ClassOverview[];
  onYearChange: (yearId: number) => void | Promise<void>;
  onOpenClass: (classId: number) => void;
};

type GradeFilter = "all" | "8" | "9";
type SummaryCardItem = {
  label: string;
  value: string;
  helperText?: string;
  icon: LucideIcon;
};

const statusBadgeClasses: Record<PaymentStatus, string> = {
  paid: "bg-emerald-100 text-emerald-900 hover:bg-emerald-100",
  unpaid: "bg-amber-100 text-amber-900 hover:bg-amber-100",
  waived: "bg-violet-100 text-violet-900 hover:bg-violet-100",
};

export function TuitionDashboardPage({
  academicYears,
  selectedYearId,
  classOverviews,
  onYearChange,
  onOpenClass,
}: TuitionDashboardPageProps) {
  const selectedYear = academicYears.find((year) => year.id === selectedYearId) ?? null;
  const monthOptions = useMemo(
    () => getClassMonthOptionsForYear(selectedYear, classOverviews),
    [classOverviews, selectedYear],
  );

  const [selectedMonth, setSelectedMonth] = useState(() => currentMonthKey());
  const [dashboard, setDashboard] = useState<TuitionDashboardDto | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [gradeFilter, setGradeFilter] = useState<GradeFilter>("all");
  const [classFilter, setClassFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<PaymentFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");

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
    if (selectedYearId === null || !monthOptions.includes(selectedMonth)) {
      setDashboard(null);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setErrorMessage("");

    listTuitionDashboard(selectedYearId, selectedMonth)
      .then((data) => {
        if (!cancelled) {
          setDashboard(data);
        }
      })
      .catch((error) => {
        console.warn("[tuition-dashboard] load failed", error);
        if (!cancelled) {
          setDashboard(null);
          setErrorMessage(
            typeof error === "string" ? error : "Không tải được dữ liệu tổng hợp học phí.",
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
      classOverviews
        .filter(
          (classItem) =>
            selectedYearId === null || classItem.academicYearId === selectedYearId,
        )
        .map((classItem) => ({
          id: classItem.id,
          name: classItem.name,
          grade: classItem.grade ?? 9,
        }))
        .sort(
          (first, second) =>
            first.grade - second.grade || first.name.localeCompare(second.name, "vi"),
        ),
    [classOverviews, selectedYearId],
  );

  const filteredClassOptions = useMemo(
    () =>
      classOptions.filter(
        (classItem) => gradeFilter === "all" || String(classItem.grade) === gradeFilter,
      ),
    [classOptions, gradeFilter],
  );

  useEffect(() => {
    if (
      classFilter !== "all" &&
      !filteredClassOptions.some((classItem) => String(classItem.id) === classFilter)
    ) {
      setClassFilter("all");
    }
  }, [classFilter, filteredClassOptions]);

  const visibleRows = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const filtered = (dashboard?.rows ?? []).filter((row) => {
      if (gradeFilter !== "all" && String(row.grade) !== gradeFilter) {
        return false;
      }
      if (classFilter !== "all" && String(row.classId) !== classFilter) {
        return false;
      }
      if (statusFilter !== "all" && row.status !== statusFilter) {
        return false;
      }
      if (!normalizedQuery) {
        return true;
      }

      return [
        row.fullName,
        row.schoolClass,
        row.school,
        row.parentPhone,
        formatPhoneNumber(row.parentPhone),
        row.className,
        row.note ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery);
    });

    // Sort ổn định: tên tiếng Việt trước, rồi khối/lớp — giữ thứ tự tên trong cùng lớp.
    const byName = sortStudentsByVietnameseName(filtered);
    return [...byName].sort(
      (first, second) =>
        first.grade - second.grade || first.className.localeCompare(second.className, "vi"),
    );
  }, [classFilter, dashboard, gradeFilter, searchQuery, statusFilter]);

  const visibleSummary = useMemo(
    () => ({
      totalStudents: visibleRows.length,
      paid: visibleRows.filter((row) => row.status === "paid").length,
      unpaid: visibleRows.filter((row) => row.status === "unpaid").length,
      waived: visibleRows.filter((row) => row.status === "waived").length,
      collected: visibleRows
        .filter((row) => row.status === "paid" || row.status === "waived")
        .reduce((total, row) => total + row.amount, 0),
    }),
    [visibleRows],
  );

  const selectedMonthIndex = monthOptions.indexOf(selectedMonth);
  const canGoPreviousMonth = selectedMonthIndex > 0;
  const canGoNextMonth = selectedMonthIndex >= 0 && selectedMonthIndex < monthOptions.length - 1;

  const summaryCards: SummaryCardItem[] = [
    {
      label: "Tổng đã thu",
      value: formatCurrency(visibleSummary.collected),
      helperText: formatVietnameseMoneyWords(visibleSummary.collected),
      icon: WalletCards,
    },
    { label: "Chưa đóng", value: `${visibleSummary.unpaid} `, icon: Users },
    { label: "Đã đóng", value: `${visibleSummary.paid} `, icon: Users },
    { label: "Miễn giảm", value: `${visibleSummary.waived} `, icon: Users },
    { label: "Số học sinh", value: String(visibleSummary.totalStudents), icon: Users },
  ];

  return (
    <div className="min-h-full min-w-0 space-y-4 pb-4">
      <section>
        <h2 className="text-2xl font-semibold text-slate-950 md:text-3xl">Tổng hợp học phí</h2>
        <p className="mt-2 max-w-3xl text-muted-foreground">
          Theo dõi học phí theo tháng trên toàn bộ các lớp.
        </p>
      </section>

      <div className="flex flex-wrap items-center gap-2">
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
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="h-9 min-w-40 bg-white">
              <SelectValue placeholder="Chọn tháng" />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map((month) => (
                <SelectItem key={month} value={month}>
                  {formatPaymentMonthLabel(month)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
        </div>

        <Select value={gradeFilter} onValueChange={(value) => setGradeFilter(value as GradeFilter)}>
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
            {filteredClassOptions.map((classItem) => (
              <SelectItem key={classItem.id} value={String(classItem.id)}>
                {classItem.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={statusFilter}
          onValueChange={(value) => setStatusFilter(value as PaymentFilter)}
        >
          <SelectTrigger className="h-9 min-w-32 bg-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {paymentFilterOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="relative min-w-56 flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="h-9 bg-white pl-9"
            placeholder="Tìm học sinh, lớp, SĐT..."
          />
        </div>
      </div>

      <section className="space-y-2">
        <p className="text-sm text-muted-foreground">Tổng hợp theo danh sách đang hiển thị</p>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3">
          {summaryCards.map((card) => {
            const Icon = card.icon;

            return (
              <Card key={card.label} className="rounded-lg border-slate-200 shadow-sm">
                <CardContent className="flex min-h-24 items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="text-sm text-muted-foreground">{card.label}</p>
                    <p
                      title={card.value}
                      className="mt-1 truncate text-2xl font-semibold text-slate-950"
                    >
                      {card.value}
                    </p>
                    {card.helperText ? (
                      <p
                        title={card.helperText}
                        className="mt-1 text-xs leading-snug text-muted-foreground"
                      >
                        {card.helperText}
                      </p>
                    ) : null}
                  </div>
                  <div className="hidden size-11 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 sm:flex">
                    <Icon className="size-5" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {errorMessage ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </p>
      ) : null}
      {isLoading ? (
        <p className="rounded-lg border bg-white px-4 py-3 text-sm text-slate-600">
          Đang tải dữ liệu học phí...
        </p>
      ) : null}
      {!isLoading && !errorMessage && visibleRows.length === 0 ? (
        <p className="rounded-lg border bg-white px-4 py-3 text-sm text-slate-600">
          {dashboard && dashboard.rows.length > 0
            ? "Không có học sinh nào khớp với bộ lọc/tìm kiếm hiện tại."
            : "Tháng này chưa có lớp nào hoạt động hoặc chưa có học sinh thuộc lớp."}
        </p>
      ) : null}

      {!isLoading && visibleRows.length > 0 ? (
        <div className="min-w-0 rounded-lg border bg-white">
          <Table className="min-w-[1080px]">
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="w-16">STT</TableHead>
                <TableHead>Học sinh</TableHead>
                <TableHead>Lớp</TableHead>
                <TableHead>Khối</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Học phí tháng</TableHead>
                <TableHead>Số tiền đã thu</TableHead>
                <TableHead>Ngày đóng</TableHead>
                <TableHead>Ghi chú</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleRows.map((row, index) => (
                <TableRow key={row.membershipId}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>
                    <p className="font-medium text-slate-950">{row.fullName}</p>
                    <p className="text-xs text-muted-foreground">
                      {[row.schoolClass, row.school].filter(Boolean).join(" - ") || "-"}
                    </p>
                  </TableCell>
                  <TableCell className="text-slate-700">{row.className}</TableCell>
                  <TableCell className="text-slate-700">Khối {row.grade}</TableCell>
                  <TableCell>
                    <Badge className={statusBadgeClasses[row.status]}>
                      {paymentStatusLabel(row.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-slate-700">
                    {formatCurrency(row.monthlyFee)}
                  </TableCell>
                  <TableCell className="font-medium text-slate-950">
                    {formatCurrency(row.status === "unpaid" ? 0 : row.amount)}
                  </TableCell>
                  <TableCell className="text-slate-700">
                    {row.paidAt ? formatDate(row.paidAt) : "-"}
                  </TableCell>
                  <TableCell className="max-w-52 whitespace-normal text-slate-700">
                    {row.note?.trim() || "-"}
                  </TableCell>
                  <TableCell>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="gap-1.5 text-slate-700"
                      onClick={() => onOpenClass(row.classId)}
                    >
                      <ExternalLink className="size-4" />
                      Mở lớp
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : null}
    </div>
  );
}
