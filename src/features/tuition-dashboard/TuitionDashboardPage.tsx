import { WalletCards } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

const summaryCards = [
  { label: "Đã thu tháng này", value: "3.250.000 đ" },
  { label: "Chưa đóng", value: "1 học sinh" },
  { label: "Miễn giảm", value: "2 học sinh" },
  { label: "Số lớp theo dõi", value: "3 lớp" },
];

export function TuitionDashboardPage() {
  return (
    <div className="min-h-full min-w-0 space-y-4 pb-4">
      <section>
        <h2 className="text-2xl font-semibold text-slate-950 md:text-3xl">Tổng hợp học phí</h2>
        <p className="mt-2 text-muted-foreground">
          Dashboard tổng hợp học phí theo tháng sẽ được phát triển sau.
        </p>
      </section>

      <section className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3">
        {summaryCards.map((card) => (
          <Card key={card.label} className="rounded-lg border-slate-200 shadow-sm">
            <CardContent className="flex min-h-24 items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground">{card.label}</p>
                <p className="mt-1 truncate text-2xl font-semibold text-slate-950">
                  {card.value}
                </p>
              </div>
              <div className="hidden size-11 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 sm:flex">
                <WalletCards className="size-5" />
              </div>
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  );
}
