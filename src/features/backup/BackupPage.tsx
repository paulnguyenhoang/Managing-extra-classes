import { FolderOpen, HardDriveDownload, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const actions = [
  { label: "Sao lưu dữ liệu", icon: HardDriveDownload },
  { label: "Khôi phục dữ liệu", icon: RotateCcw },
  { label: "Mở thư mục dữ liệu", icon: FolderOpen },
];

export function BackupPage() {
  return (
    <div className="min-h-full min-w-0 space-y-4 pb-4">
      <section>
        <h2 className="text-2xl font-semibold text-slate-950 md:text-3xl">Sao lưu dữ liệu</h2>
        <p className="mt-2 max-w-3xl text-muted-foreground">
          Dữ liệu sẽ được lưu trên máy tính. Nên sao lưu định kỳ để tránh mất dữ liệu.
        </p>
      </section>

      <Card className="rounded-lg border-slate-200 shadow-sm">
        <CardContent className="flex flex-wrap gap-3 p-4">
          {actions.map((action) => {
            const Icon = action.icon;

            return (
              <Button
                key={action.label}
                type="button"
                variant="outline"
                disabled
                className="h-10 gap-2 opacity-70"
              >
                <Icon className="size-4" />
                {action.label}
              </Button>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
