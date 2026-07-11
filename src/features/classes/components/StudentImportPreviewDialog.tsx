import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type {
  StudentImportAction,
  StudentImportPlan,
} from "@/features/classes/utils/studentListImport";

const actionConfig: Record<StudentImportAction, { label: string; className: string }> = {
  create: { label: "Thêm mới", className: "bg-emerald-100 text-emerald-900 hover:bg-emerald-100" },
  update: { label: "Cập nhật", className: "bg-sky-100 text-sky-900 hover:bg-sky-100" },
  skip: { label: "Bỏ qua", className: "bg-slate-200 text-slate-700 hover:bg-slate-200" },
  error: { label: "Lỗi", className: "bg-red-100 text-red-800 hover:bg-red-100" },
};

type StudentImportPreviewDialogProps = {
  plan: StudentImportPlan | null;
  className: string;
  isImporting: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
};

export function StudentImportPreviewDialog({
  plan,
  className,
  isImporting,
  onOpenChange,
  onConfirm,
}: StudentImportPreviewDialogProps) {
  const importableCount = plan ? plan.createCount + plan.updateCount : 0;
  const canConfirm = Boolean(plan && plan.errorCount === 0 && importableCount > 0);

  return (
    <Dialog
      open={Boolean(plan)}
      onOpenChange={(open) => {
        if (!isImporting) {
          onOpenChange(open);
        }
      }}
    >
      <DialogContent className="flex max-h-[85vh] w-[calc(100vw-2rem)] flex-col overflow-hidden sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Xem trước nhập danh sách học sinh</DialogTitle>
          <DialogDescription>
            Kiểm tra dữ liệu trước khi ghi vào lớp. Nhập Excel không xóa học sinh nào đang có
            trong lớp.
          </DialogDescription>
        </DialogHeader>

        {plan ? (
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
            <div className="grid gap-1.5 rounded-lg bg-slate-50 p-4 text-sm">
              <SummaryRow label="File" value={plan.fileName} />
              <SummaryRow label="Lớp" value={className} />
              <SummaryRow label="Thêm mới" value={String(plan.createCount)} />
              <SummaryRow label="Cập nhật" value={String(plan.updateCount)} />
              <SummaryRow label="Bỏ qua" value={String(plan.skipCount)} />
              <SummaryRow label="Lỗi" value={String(plan.errorCount)} />
              <SummaryRow label="Cảnh báo" value={String(plan.warningCount)} />
            </div>

            {plan.errorCount > 0 ? (
              <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                File có dòng bị lỗi. Vui lòng sửa file Excel rồi chọn lại; chưa có dữ liệu nào
                được ghi.
              </p>
            ) : null}
            {plan.errorCount === 0 && importableCount === 0 ? (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                Không có dòng nào cần thêm mới hoặc cập nhật.
              </p>
            ) : null}

            <ul className="space-y-2">
              {plan.rows.map((row) => {
                const config = actionConfig[row.action];

                return (
                  <li
                    key={row.excelRowNumber}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-muted-foreground">Dòng {row.excelRowNumber}</span>
                      <span className="min-w-0 flex-1 truncate font-medium text-slate-950">
                        {row.fullName}
                      </span>
                      <Badge className={config.className}>{config.label}</Badge>
                    </div>
                    {row.messages.length > 0 ? (
                      <ul className="mt-1 space-y-0.5">
                        {row.messages.map((message, index) => (
                          <li
                            key={index}
                            className={
                              row.action === "error" ? "text-red-700" : "text-amber-700"
                            }
                          >
                            {message}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={isImporting}>
              Hủy
            </Button>
          </DialogClose>
          <Button type="button" onClick={onConfirm} disabled={!canConfirm || isImporting}>
            {isImporting ? "Đang nhập..." : "Xác nhận nhập"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[112px_minmax(0,1fr)] gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="min-w-0 break-words font-medium text-slate-950">{value}</span>
    </div>
  );
}
