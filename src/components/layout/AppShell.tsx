import type { ReactNode } from "react";

import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";

type AppShellProps = {
  children: ReactNode;
  onLogout: () => void;
};

export function AppShell({ children, onLogout }: AppShellProps) {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-slate-50 text-slate-950">
      <Header onLogout={onLogout} />
      <div className="flex min-h-0 flex-1">
        <Sidebar />
        <main className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 md:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
