import { BookMarked, CalendarCheck, GraduationCap, WalletCards } from "lucide-react";

const navigationItems = [
  { label: "Tổng quan", icon: GraduationCap, isActive: true },
  { label: "Lịch học", icon: CalendarCheck, isActive: false },
  { label: "Học sinh", icon: BookMarked, isActive: false },
  { label: "Học phí", icon: WalletCards, isActive: false },
];

export function Sidebar() {
  return (
    <aside className="w-16 shrink-0 border-r bg-white px-2 py-4 lg:w-64 lg:px-4 lg:py-6">
      <div className="mb-5 hidden rounded-lg border border-emerald-100 bg-emerald-50 p-4 lg:block">
        <p className="text-sm font-medium text-emerald-950">Sổ lớp của thầy</p>
        <p className="mt-1 text-sm text-emerald-800">Dữ liệu mẫu cho bản thử nghiệm.</p>
      </div>

      <nav className="space-y-2">
        {navigationItems.map((item) => {
          const Icon = item.icon;

          return (
            <button
              key={item.label}
              type="button"
              title={item.label}
              className={[
                "flex h-11 w-full items-center justify-center gap-3 rounded-lg text-left text-sm font-medium lg:justify-start lg:px-3",
                item.isActive
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-950",
              ].join(" ")}
            >
              <Icon className="size-4" />
              <span className="hidden lg:inline">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
