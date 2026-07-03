import { CalendarDays, Clock } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

const upcomingSessions = [
  { id: "s1", className: "Văn 9 - Ôn thi vào 10", time: "Thứ 3, 18:00 - 20:00" },
  { id: "s2", className: "Văn 8 - Nâng cao", time: "Thứ 5, 17:30 - 19:30" },
  { id: "s3", className: "Văn 7 - Cơ bản", time: "Chủ nhật, 19:00 - 21:00" },
];

export function SchedulePage() {
  return (
    <div className="min-h-full min-w-0 space-y-4 pb-4">
      <section>
        <h2 className="text-2xl font-semibold text-slate-950 md:text-3xl">Lịch học</h2>
        <p className="mt-2 text-muted-foreground">
          Lịch tổng hợp các lớp theo tháng/tuần sẽ được phát triển sau.
        </p>
      </section>

      <Card className="rounded-lg border-slate-200 shadow-sm">
        <CardContent className="p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-600">
            <CalendarDays className="size-4 text-emerald-700" />
            Buổi học sắp tới
          </div>
          <div className="space-y-2">
            {upcomingSessions.map((session) => (
              <div
                key={session.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-slate-50 px-4 py-3"
              >
                <p className="font-medium text-slate-950">{session.className}</p>
                <p className="flex items-center gap-2 text-sm text-slate-600">
                  <Clock className="size-4" />
                  {session.time}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
