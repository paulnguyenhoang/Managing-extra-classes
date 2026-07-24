import {
  CalendarCheck,
  GraduationCap,
  HardDriveDownload,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  WalletCards,
} from "lucide-react";

const navigationItems = [
  { id: "home", label: "Tổng quan", icon: GraduationCap },
  { id: "schedule", label: "Lịch học", icon: CalendarCheck },
  { id: "tuition-dashboard", label: "Học phí", icon: WalletCards },
  { id: "backup", label: "Sao lưu dữ liệu", icon: HardDriveDownload },
  { id: "settings", label: "Cài đặt", icon: Settings },
] as const;

export type SidebarScreen = (typeof navigationItems)[number]["id"];

type SidebarProps = {
  activeScreen: SidebarScreen;
  isCollapsed: boolean;
  onNavigate: (screen: SidebarScreen) => void;
  onToggle: () => void;
};

export function Sidebar({ activeScreen, isCollapsed, onNavigate, onToggle }: SidebarProps) {
  return (
    <aside
      className={[
        "shrink-0 border-r bg-white px-2 py-4 transition-[width] duration-200",
        isCollapsed ? "w-16" : "w-64 px-4",
      ].join(" ")}
    >
      <div className={isCollapsed ? "mb-4 flex justify-center" : "mb-4 flex justify-end"}>
        <button
          type="button"
          title={isCollapsed ? "Mở thanh điều hướng" : "Thu gọn thanh điều hướng"}
          aria-label={isCollapsed ? "Mở thanh điều hướng" : "Thu gọn thanh điều hướng"}
          onClick={onToggle}
          className="flex size-9 items-center justify-center rounded-lg border text-slate-600 hover:bg-slate-100 hover:text-slate-950"
        >
          {isCollapsed ? (
            <PanelLeftOpen className="size-4" />
          ) : (
            <PanelLeftClose className="size-4" />
          )}
        </button>
      </div>

      {!isCollapsed ? (
        <div className="mb-5 rounded-lg border border-emerald-100 bg-emerald-50 p-4">
          <p className="text-sm font-medium text-emerald-950">Sổ lớp của thầy</p>
          <p className="mt-1 text-sm text-emerald-800">Dữ liệu lưu trên máy tính này.</p>
        </div>
      ) : null}

      <nav className="space-y-2">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeScreen === item.id;

          return (
            <button
              key={item.id}
              type="button"
              title={item.label}
              onClick={() => onNavigate(item.id)}
              className={[
                "flex h-11 w-full items-center gap-3 rounded-lg text-left text-sm font-medium",
                isCollapsed ? "justify-center" : "justify-start px-3",
                isActive
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-950",
              ].join(" ")}
            >
              <Icon className="size-4" />
              {!isCollapsed ? <span>{item.label}</span> : null}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
