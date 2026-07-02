import { LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";

type HeaderProps = {
  onLogout: () => void;
};

export function Header({ onLogout }: HeaderProps) {
  return (
    <header className="flex h-12 shrink-0 items-center justify-end border-b bg-white px-4 md:px-6 lg:px-8">
      <Button variant="outline" onClick={onLogout} className="h-8 gap-2">
        <LogOut className="size-4" />
        <span className="hidden sm:inline">Đăng xuất</span>
      </Button>
    </header>
  );
}
