import { ArrowLeft, CalendarDays, Users, WalletCards } from "lucide-react";
import { Tabs as TabsPrimitive } from "radix-ui";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getClassById, getStudentsByClassId } from "@/data/mockData";
import { AttendanceTab } from "@/features/classes/components/AttendanceTab";
import { PaymentsTab } from "@/features/classes/components/PaymentsTab";
import { ScoresTab } from "@/features/classes/components/ScoresTab";
import { StudentListTab } from "@/features/classes/components/StudentListTab";
import { formatCurrency } from "@/lib/format";

type ClassDetailPageProps = {
  classId: string;
  onBack: () => void;
};

export function ClassDetailPage({ classId, onBack }: ClassDetailPageProps) {
  const classItem = getClassById(classId);
  const studentCount = getStudentsByClassId(classId).length;

  if (!classItem) {
    return (
      <div className="space-y-4">
        <Button variant="outline" onClick={onBack} className="gap-2">
          <ArrowLeft className="size-4" />
          Quay lại
        </Button>
        <Card className="rounded-lg border-slate-200">
          <CardContent className="p-6">
            <p className="text-slate-700">Không tìm thấy lớp học.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-full min-w-0 space-y-4 pb-4">
      <section className="rounded-lg border bg-white p-4 shadow-sm">
        <div className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_minmax(320px,420px)] 2xl:items-start">
          <div className="min-w-0">
            <Button variant="ghost" onClick={onBack} className="mb-3 gap-2 px-0">
              <ArrowLeft className="size-4" />
              <span className="hidden sm:inline">Quay lại danh sách lớp</span>
              <span className="sm:hidden">Quay lại</span>
            </Button>
            <h2 className="break-words text-2xl font-semibold leading-tight text-slate-950 md:text-3xl">
              {classItem.name}
            </h2>
            <p className="mt-2 flex items-center gap-2 text-base text-slate-600">
              <CalendarDays className="size-4 shrink-0 text-emerald-700" />
              <span className="min-w-0 truncate">{classItem.schedule}</span>
            </p>
          </div>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3">
            <div className="min-w-0 rounded-lg bg-slate-50 p-4">
              <p className="flex items-center gap-2 text-sm text-slate-500">
                <Users className="size-4 shrink-0" />
                Học sinh
              </p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{studentCount}</p>
            </div>
            <div className="min-w-0 rounded-lg bg-slate-50 p-4">
              <p className="flex items-center gap-2 text-sm text-slate-500">
                <WalletCards className="size-4 shrink-0" />
                <span className="truncate">Học phí tháng</span>
              </p>
              <p className="mt-2 truncate text-2xl font-semibold text-slate-950">
                {formatCurrency(classItem.monthlyFee)}
              </p>
            </div>
          </div>
        </div>
      </section>

      <TabsPrimitive.Root defaultValue="students" className="space-y-4">
        <TabsPrimitive.List className="grid h-12 w-full max-w-3xl grid-cols-4 items-center gap-1 rounded-lg border bg-white p-1 shadow-sm">
          <TabsPrimitive.Trigger
            value="students"
            className="flex h-10 min-w-0 items-center justify-center rounded-md px-3 text-center text-sm font-medium leading-none text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 data-active:bg-slate-900 data-active:text-white data-active:shadow-sm data-active:hover:bg-slate-900 data-active:hover:text-white md:text-base"
          >
            Danh sách học sinh
          </TabsPrimitive.Trigger>
          <TabsPrimitive.Trigger
            value="attendance"
            className="flex h-10 min-w-0 items-center justify-center rounded-md px-3 text-center text-sm font-medium leading-none text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 data-active:bg-slate-900 data-active:text-white data-active:shadow-sm data-active:hover:bg-slate-900 data-active:hover:text-white md:text-base"
          >
            Điểm danh
          </TabsPrimitive.Trigger>
          <TabsPrimitive.Trigger
            value="scores"
            className="flex h-10 min-w-0 items-center justify-center rounded-md px-3 text-center text-sm font-medium leading-none text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 data-active:bg-slate-900 data-active:text-white data-active:shadow-sm data-active:hover:bg-slate-900 data-active:hover:text-white md:text-base"
          >
            Nhập điểm
          </TabsPrimitive.Trigger>
          <TabsPrimitive.Trigger
            value="payments"
            className="flex h-10 min-w-0 items-center justify-center rounded-md px-3 text-center text-sm font-medium leading-none text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 data-active:bg-slate-900 data-active:text-white data-active:shadow-sm data-active:hover:bg-slate-900 data-active:hover:text-white md:text-base"
          >
            Học phí
          </TabsPrimitive.Trigger>
        </TabsPrimitive.List>
        <TabsPrimitive.Content value="students" className="outline-none">
          <StudentListTab classId={classId} />
        </TabsPrimitive.Content>
        <TabsPrimitive.Content value="attendance" className="outline-none">
          <AttendanceTab classId={classId} />
        </TabsPrimitive.Content>
        <TabsPrimitive.Content value="scores" className="outline-none">
          <ScoresTab classId={classId} />
        </TabsPrimitive.Content>
        <TabsPrimitive.Content value="payments" className="outline-none">
          <PaymentsTab classId={classId} />
        </TabsPrimitive.Content>
      </TabsPrimitive.Root>
    </div>
  );
}
