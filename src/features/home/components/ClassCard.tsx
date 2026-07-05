import { CalendarDays, Users, WalletCards } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  formatScheduleLines,
  parseScheduleText,
} from "@/features/classes/utils/classSchedule";
import { formatCurrency } from "@/lib/format";
import type { ClassOverview } from "@/types/class";

type ClassCardProps = {
  classItem: ClassOverview;
  onOpen: (classId: string) => void;
};

export function ClassCard({ classItem, onOpen }: ClassCardProps) {
  const scheduleLines = formatScheduleLines(
    classItem.scheduleItems?.length
      ? classItem.scheduleItems
      : parseScheduleText(classItem.schedule),
  );

  return (
    <button
      type="button"
      onClick={() => onOpen(classItem.id)}
      className="min-w-0 rounded-lg border bg-white p-4 text-left shadow-sm transition hover:border-emerald-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-emerald-200"
    >
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="break-words text-lg font-semibold leading-snug text-slate-950">
            {classItem.name}
          </h3>
          <div className="mt-2 flex min-w-0 items-start gap-2 text-sm leading-5 text-slate-600">
            <CalendarDays className="size-4 shrink-0 text-emerald-700" />
            <div className="min-w-0 space-y-0.5">
              {scheduleLines.map((line) => (
                <p key={line} className="break-words">
                  {line}
                </p>
              ))}
            </div>
          </div>
        </div>
        {classItem.unpaidCount > 0 ? (
          <Badge className="shrink-0 bg-amber-100 text-amber-900 hover:bg-amber-100">
            {classItem.unpaidCount} chưa đóng
          </Badge>
        ) : (
          <Badge className="shrink-0 bg-emerald-100 text-emerald-900 hover:bg-emerald-100">
            Đủ học phí
          </Badge>
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div className="min-w-0 rounded-lg bg-slate-50 p-3">
          <p className="flex items-center gap-2 text-slate-500">
            <Users className="size-4 shrink-0" />
            Học sinh
          </p>
          <p className="mt-1 text-lg font-semibold text-slate-950">{classItem.studentCount}</p>
        </div>
        <div className="min-w-0 rounded-lg bg-slate-50 p-3">
          <p className="flex items-center gap-2 text-slate-500">
            <WalletCards className="size-4 shrink-0" />
            Học phí
          </p>
          <p className="mt-1 truncate text-lg font-semibold text-slate-950">
            {formatCurrency(classItem.monthlyFee)}
          </p>
        </div>
      </div>
    </button>
  );
}
