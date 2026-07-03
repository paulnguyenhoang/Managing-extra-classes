import { useEffect, useState } from "react";
import { ArrowLeft, Pencil, Save, WalletCards, X } from "lucide-react";
import { Tabs as TabsPrimitive } from "radix-ui";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { ClassOverview } from "@/data/mockData";
import { AttendanceTab } from "@/features/classes/components/AttendanceTab";
import { EditClassScheduleDialog } from "@/features/classes/components/EditClassScheduleDialog";
import { PaymentsTab } from "@/features/classes/components/PaymentsTab";
import { ScoresTab } from "@/features/classes/components/ScoresTab";
import { StudentListTab } from "@/features/classes/components/StudentListTab";
import {
  formatScheduleLines,
  parseScheduleText,
} from "@/features/classes/utils/classSchedule";
import { formatCurrency } from "@/lib/format";

type ClassDetailPageProps = {
  classItem: ClassOverview;
  onBack: () => void;
  onClassUpdate: (classId: string, updates: Partial<ClassOverview>) => void;
};

export function ClassDetailPage({ classItem, onBack, onClassUpdate }: ClassDetailPageProps) {
  const classId = classItem.id;
  const [className, setClassName] = useState(() => classItem?.name ?? "");
  const [classNameDraft, setClassNameDraft] = useState(() => classItem?.name ?? "");
  const [isEditingClassName, setIsEditingClassName] = useState(false);
  const [monthlyFee, setMonthlyFee] = useState(() => classItem?.monthlyFee ?? 0);
  const [feeDraft, setFeeDraft] = useState(() => String(classItem?.monthlyFee ?? 0));
  const [isEditingFee, setIsEditingFee] = useState(false);
  const [scheduleItems, setScheduleItems] = useState(() =>
    parseScheduleText(classItem?.schedule ?? ""),
  );
  const scheduleLines = formatScheduleLines(scheduleItems);

  useEffect(() => {
    setClassName(classItem?.name ?? "");
    setClassNameDraft(classItem?.name ?? "");
    setIsEditingClassName(false);
    setMonthlyFee(classItem?.monthlyFee ?? 0);
    setFeeDraft(String(classItem?.monthlyFee ?? 0));
    setIsEditingFee(false);
    setScheduleItems(parseScheduleText(classItem?.schedule ?? ""));
  }, [classItem]);

  function saveClassName() {
    const nextName = classNameDraft.trim();
    if (!nextName) {
      setClassNameDraft(className);
      setIsEditingClassName(false);
      return;
    }

    setClassName(nextName);
    setClassNameDraft(nextName);
    setIsEditingClassName(false);
    onClassUpdate(classId, { name: nextName });
  }

  function saveMonthlyFee() {
    const nextFee = Number(feeDraft);
    if (!Number.isFinite(nextFee) || nextFee < 0) {
      setFeeDraft(String(monthlyFee));
      setIsEditingFee(false);
      return;
    }

    setMonthlyFee(nextFee);
    setFeeDraft(String(nextFee));
    setIsEditingFee(false);
    onClassUpdate(classId, { monthlyFee: nextFee });
  }

  function saveSchedule(nextScheduleItems: typeof scheduleItems) {
    const nextSchedule = formatScheduleLines(nextScheduleItems).join(" / ");
    setScheduleItems(nextScheduleItems);
    onClassUpdate(classId, { schedule: nextSchedule });
  }

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
            {isEditingClassName ? (
              <div className="flex max-w-2xl items-center gap-2">
                <Input
                  value={classNameDraft}
                  className="h-11 bg-white text-xl font-semibold text-slate-950 md:text-2xl"
                  onChange={(event) => setClassNameDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      saveClassName();
                    }
                  }}
                />
                <Button type="button" size="icon-sm" onClick={saveClassName}>
                  <Save className="size-4" />
                  <span className="sr-only">Lưu tên lớp</span>
                </Button>
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  onClick={() => {
                    setClassNameDraft(className);
                    setIsEditingClassName(false);
                  }}
                >
                  <X className="size-4" />
                  <span className="sr-only">Hủy sửa tên lớp</span>
                </Button>
              </div>
            ) : (
              <div className="flex min-w-0 items-start gap-2">
                <h2 className="break-words text-2xl font-semibold leading-tight text-slate-950 md:text-3xl">
                  {className}
                </h2>
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  className="mt-1 shrink-0"
                  onClick={() => setIsEditingClassName(true)}
                >
                  <Pencil className="size-4" />
                  <span className="sr-only">Cập nhật tên lớp</span>
                </Button>
              </div>
            )}
            <div className="mt-2 flex items-start gap-2 text-base leading-6 text-slate-600">
              <EditClassScheduleDialog
                scheduleItems={scheduleItems}
                onSave={saveSchedule}
              />
              <div className="min-w-0 space-y-0.5">
                {scheduleLines.map((line) => (
                  <p key={line} className="break-words">
                    {line}
                  </p>
                ))}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3">
            <div className="min-w-0 rounded-lg bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="flex min-w-0 items-center gap-2 text-sm text-slate-500">
                  <WalletCards className="size-4 shrink-0" />
                  <span className="truncate">Học phí tháng</span>
                </p>
                {isEditingFee ? (
                  <div className="flex shrink-0 gap-1">
                    <Button type="button" size="icon-sm" onClick={saveMonthlyFee}>
                      <Save className="size-4" />
                      <span className="sr-only">Lưu học phí</span>
                    </Button>
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      onClick={() => {
                        setFeeDraft(String(monthlyFee));
                        setIsEditingFee(false);
                      }}
                    >
                      <X className="size-4" />
                      <span className="sr-only">Hủy sửa học phí</span>
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    onClick={() => setIsEditingFee(true)}
                  >
                    <Pencil className="size-4" />
                    <span className="sr-only">Cập nhật học phí</span>
                  </Button>
                )}
              </div>
              {isEditingFee ? (
                <Input
                  value={feeDraft}
                  inputMode="numeric"
                  className="mt-2 h-9 bg-white text-lg font-semibold text-slate-950"
                  onChange={(event) => setFeeDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      saveMonthlyFee();
                    }
                  }}
                />
              ) : (
                <p className="mt-2 truncate text-2xl font-semibold text-slate-950">
                  {formatCurrency(monthlyFee)}
                </p>
              )}
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
          <AttendanceTab classId={classId} scheduleItems={scheduleItems} />
        </TabsPrimitive.Content>
        <TabsPrimitive.Content value="scores" className="outline-none">
          <ScoresTab classId={classId} />
        </TabsPrimitive.Content>
        <TabsPrimitive.Content value="payments" className="outline-none">
          <PaymentsTab classId={classId} monthlyFeeOverride={monthlyFee} />
        </TabsPrimitive.Content>
      </TabsPrimitive.Root>
    </div>
  );
}
