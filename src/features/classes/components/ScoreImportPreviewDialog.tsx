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
import type { ScoreImportPlan } from "@/features/classes/utils/scoreSheetImport";
import { formatMonthLabel } from "@/lib/months";

type ScoreImportPreviewDialogProps = {
  plan: ScoreImportPlan | null;
  isImporting: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
};

export function ScoreImportPreviewDialog({
  plan,
  isImporting,
  onOpenChange,
  onConfirm,
}: ScoreImportPreviewDialogProps) {
  const createdColumns = plan?.columns.filter((column) => column.action === "create") ?? [];
  const renamedColumns = plan?.columns.filter((column) => column.action === "rename") ?? [];
  const hasChanges = plan
    ? createdColumns.length > 0 ||
      renamedColumns.length > 0 ||
      plan.deletedColumns.length > 0 ||
      plan.changedValueCount > 0 ||
      plan.clearedValueCount > 0
    : false;
  const canConfirm = Boolean(plan && plan.errors.length === 0 && hasChanges);

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
          <DialogTitle>Xem trước nhập bảng điểm</DialogTitle>
          <DialogDescription>
            Kiểm tra dữ liệu trước khi ghi vào bảng điểm. Nhập Excel không thay đổi danh sách
            học sinh.
          </DialogDescription>
        </DialogHeader>

        {plan ? (
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
            <div className="grid gap-1.5 rounded-lg bg-slate-50 p-4 text-sm">
              <SummaryRow label="File" value={plan.fileName} />
              <SummaryRow label="Lớp" value={plan.className} />
              <SummaryRow label="Tháng" value={formatMonthLabel(plan.month)} />
              <SummaryRow label="Học sinh" value={String(plan.rows.length)} />
              <SummaryRow label="Cột điểm trong file" value={String(plan.columns.length)} />
              <SummaryRow label="Cột thêm mới" value={String(createdColumns.length)} />
              <SummaryRow label="Cột đổi tên" value={String(renamedColumns.length)} />
              <SummaryRow label="Cột bị xóa" value={String(plan.deletedColumns.length)} />
              <SummaryRow label="Điểm thay đổi" value={String(plan.changedValueCount)} />
              <SummaryRow label="Điểm bị xóa trắng" value={String(plan.clearedValueCount)} />
              <SummaryRow label="Lỗi" value={String(plan.errors.length)} />
            </div>

            {plan.deletedColumns.length > 0 ? (
              <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
                File Excel thiếu một số cột điểm đang có trong app. Nếu tiếp tục, các cột này và
                toàn bộ điểm trong cột sẽ bị xóa.
              </p>
            ) : null}
            {plan.errors.length > 0 ? (
              <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                File có lỗi. Vui lòng sửa file Excel rồi chọn lại; chưa có dữ liệu nào được ghi.
              </p>
            ) : null}
            {plan.errors.length === 0 && !hasChanges ? (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                File không có thay đổi so với bảng điểm hiện tại.
              </p>
            ) : null}

            {createdColumns.length > 0 ||
            renamedColumns.length > 0 ||
            plan.deletedColumns.length > 0 ? (
              <section className="space-y-2">
                <h3 className="text-sm font-semibold text-slate-950">Cột điểm</h3>
                <ul className="space-y-1.5 text-sm">
                  {createdColumns.map((column) => (
                    <li key={`create-${column.label}`} className="flex flex-wrap items-center gap-2">
                      <Badge className="bg-emerald-100 text-emerald-900 hover:bg-emerald-100">
                        Thêm mới
                      </Badge>
                      <span className="min-w-0 break-words">{column.label}</span>
                    </li>
                  ))}
                  {renamedColumns.map((column) => (
                    <li
                      key={`rename-${column.existingColumnId}`}
                      className="flex flex-wrap items-center gap-2"
                    >
                      <Badge className="bg-sky-100 text-sky-900 hover:bg-sky-100">Đổi tên</Badge>
                      <span className="min-w-0 break-words">
                        {column.previousLabel} → {column.label}
                      </span>
                    </li>
                  ))}
                  {plan.deletedColumns.map((column) => (
                    <li key={`delete-${column.id}`} className="flex flex-wrap items-center gap-2">
                      <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Xóa</Badge>
                      <span className="min-w-0 break-words">
                        Sẽ xóa cột điểm "{column.label}" và toàn bộ điểm trong cột này.
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {plan.errors.length > 0 ? (
              <section className="space-y-2">
                <h3 className="text-sm font-semibold text-slate-950">Lỗi</h3>
                <ul className="space-y-2">
                  {plan.errors.map((error, index) => (
                    <li
                      key={index}
                      className="rounded-lg border border-red-200 bg-red-50/60 px-3 py-2 text-sm"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-muted-foreground">
                          {error.excelRowNumber ? `Dòng ${error.excelRowNumber}` : "File"}
                        </span>
                        {error.fullName ? (
                          <span className="min-w-0 flex-1 truncate font-medium text-slate-950">
                            {error.fullName}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-0.5 text-red-700">{error.message}</p>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>
        ) : null}

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={isImporting}>
              Hủy
            </Button>
          </DialogClose>
          <Button
            type="button"
            variant={plan && plan.deletedColumns.length > 0 ? "destructive" : "default"}
            onClick={onConfirm}
            disabled={!canConfirm || isImporting}
          >
            {isImporting ? "Đang nhập..." : "Xác nhận nhập"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[148px_minmax(0,1fr)] gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="min-w-0 break-words font-medium text-slate-950">{value}</span>
    </div>
  );
}
