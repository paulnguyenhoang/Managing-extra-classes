import { BookOpenCheck, FolderOpen, Users, WalletCards } from "lucide-react";

import { EmptyState } from "@/components/common/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { ClassCard } from "@/features/home/components/ClassCard";
import { CreateClassDialog } from "@/features/home/components/CreateClassDialog";
import { YearSelector } from "@/features/home/components/YearSelector";
import type { AcademicYear } from "@/types/academic-year";
import type { ClassOverview, CreateClassInput } from "@/types/class";

type HomePageProps = {
  academicYears: AcademicYear[];
  selectedYearId: number | null;
  classOverviews: ClassOverview[];
  isLoading?: boolean;
  errorMessage?: string;
  onYearChange: (yearId: number) => void | Promise<void>;
  onOpenClass: (classId: number) => void;
  onCreateClass: (input: CreateClassInput) => void | Promise<void>;
};

const summaryCards = [
  { key: "totalClasses", label: "Tổng số lớp", icon: BookOpenCheck },
  { key: "totalStudents", label: "Tổng số học sinh", icon: Users },
  { key: "unpaidThisMonth", label: "Chưa đóng học phí tháng này", icon: WalletCards },
] as const;

export function HomePage({
  academicYears,
  selectedYearId,
  classOverviews,
  isLoading = false,
  errorMessage = "",
  onYearChange,
  onOpenClass,
  onCreateClass,
}: HomePageProps) {
  const visibleClassOverviews = classOverviews.filter(
    (classItem) => selectedYearId !== null && classItem.academicYearId === selectedYearId,
  );
  const summary = {
    totalClasses: visibleClassOverviews.length,
    totalStudents: visibleClassOverviews.reduce(
      (total, classItem) => total + classItem.studentCount,
      0,
    ),
    unpaidThisMonth: visibleClassOverviews.reduce(
      (total, classItem) => total + classItem.unpaidCount,
      0,
    ),
  };

  return (
    <div className="min-h-full min-w-0 space-y-4 pb-4">
      <section className="grid gap-3 2xl:grid-cols-[1fr_auto] 2xl:items-end">
        <div className="min-w-0">
          <p className="text-base text-muted-foreground">Xin chào thầy</p>
          <h2 className="mt-1 text-2xl font-semibold leading-tight tracking-normal text-slate-950 md:text-3xl">
            Hôm nay mình quản lý lớp nào?
          </h2>
        </div>
        <div className="flex min-w-0 flex-col items-stretch gap-3 sm:items-end">
          <YearSelector years={academicYears} value={selectedYearId} onChange={onYearChange} />
          <CreateClassDialog
            academicYearId={selectedYearId}
            onCreate={onCreateClass}
            disabled={selectedYearId === null}
          />
        </div>
      </section>

      {(isLoading || errorMessage) && (
        <div className="rounded-lg border bg-white px-4 py-3 text-sm text-slate-700 shadow-sm">
          {isLoading ? "Đang tải dữ liệu lớp học..." : errorMessage}
        </div>
      )}

      <section className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3">
        {summaryCards.map((item) => {
          const Icon = item.icon;

          return (
            <Card key={item.key} className="rounded-lg border-slate-200 shadow-sm">
              <CardContent className="flex min-h-24 items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="text-sm text-muted-foreground">{item.label}</p>
                  <p className="mt-1 text-3xl font-semibold text-slate-950">{summary[item.key]}</p>
                </div>
                <div className="hidden size-11 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 sm:flex">
                  <Icon className="size-5" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="text-xl font-semibold text-slate-950">Danh sách lớp học</h3>
          <p className="hidden text-sm text-muted-foreground md:block">
            Bấm vào lớp để xem chi tiết.
          </p>
        </div>
        {visibleClassOverviews.length > 0 ? (
          <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-3">
            {visibleClassOverviews.map((classItem) => (
              <ClassCard key={classItem.id} classItem={classItem} onOpen={onOpenClass} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={FolderOpen}
            title="Chưa có lớp học trong năm này"
            description="Thầy có thể tạo lớp mẫu để xem trước cách danh sách lớp sẽ hiển thị."
            action={
              <CreateClassDialog
                academicYearId={selectedYearId}
                onCreate={onCreateClass}
                disabled={selectedYearId === null}
              />
            }
          />
        )}
      </section>
    </div>
  );
}
