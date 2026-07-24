import { useState, type ReactNode } from "react";

import { Header } from "@/components/layout/Header";
import { Sidebar, type SidebarScreen } from "@/components/layout/Sidebar";

type AppShellProps = {
  children: ReactNode;
  activeScreen: SidebarScreen;
  onNavigate: (screen: SidebarScreen) => void;
  onLogout: () => void;
};

export function AppShell({ children, activeScreen, onNavigate, onLogout }: AppShellProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);

  function toggleSidebar() {
    setIsSidebarCollapsed((currentValue) => !currentValue);
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-slate-50 text-slate-950">
      <Header onLogout={onLogout} />
      <div className="flex min-h-0 flex-1">
        <Sidebar
          activeScreen={activeScreen}
          isCollapsed={isSidebarCollapsed}
          onNavigate={onNavigate}
          onToggle={toggleSidebar}
        />
        <main className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 md:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
