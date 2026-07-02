import { Plus, Users, WalletCards, BookOpenCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  academicYears,
  getClassOverviewsByYear,
  getHomeSummary,
} from "@/data/mockData";
import { ClassCard } from "@/features/home/components/ClassCard";
import { YearSelector } from "@/features/home/components/YearSelector";

type HomePageProps = {
  selectedYearId: string;
  onYearChange: (yearId: string) => void;
  onOpenClass: (classId: string) => void;
};

const summaryCards = [
  { key: "totalClasses", label: "Tổng số lớp", icon: BookOpenCheck },
  { key: "totalStudents", label: "Tổng số học sinh", icon: Users },
  { key: "unpaidThisMonth", label: "Chưa đóng học phí tháng này", icon: WalletCards },
] as const;

export function HomePage({ selectedYearId, onYearChange, onOpenClass }: HomePageProps) {
  const classOverviews = getClassOverviewsByYear(selectedYearId);
  const summary = getHomeSummary(selectedYearId);

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
          <Button className="h-10 w-full gap-2 sm:w-auto">
            <Plus className="size-4" />
            <span className="hidden sm:inline">Tạo lớp mới</span>
          </Button>
        </div>
      </section>

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
        <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-3">
          {classOverviews.map((classItem) => (
            <ClassCard key={classItem.id} classItem={classItem} onOpen={onOpenClass} />
          ))}
        </div>
      </section>
    </div>
  );
}
