import { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Download,
  Pencil,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";

import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useClassStudents } from "@/features/classes/hooks/useClassStudents";
import { useMockScores } from "@/features/classes/hooks/useMockScores";
import {
  canUseScoreInput,
  formatScoreMonthLabel,
  getScoreStudentKey,
  type MonthlyScoreColumn,
} from "@/features/classes/utils/scores";

type ScoresTabProps = {
  classId: number;
  classStartMonth: string;
  classEndMonth: string;
};

export function ScoresTab({ classId, classStartMonth, classEndMonth }: ScoresTabProps) {
  const [pendingDeleteColumn, setPendingDeleteColumn] = useState<MonthlyScoreColumn | null>(null);
  const {
    students,
    isLoading: isLoadingStudents,
    errorMessage: studentsErrorMessage,
  } = useClassStudents(classId);
  const {
    activeSheet,
    availableMonths,
    errorMessage,
    isEditing,
    selectedMonth,
    addColumn,
    cancelEditing,
    changeMonth,
    deleteColumn,
    saveEditing,
    startEditing,
    updateColumnLabel,
    updateScore,
  } = useMockScores(classId, students, classStartMonth, classEndMonth);
  const hasColumns = activeSheet.columns.length > 0;
  const selectedMonthIndex = availableMonths.indexOf(selectedMonth);
  const canGoPreviousMonth = selectedMonthIndex > 0;
  const canGoNextMonth =
    selectedMonthIndex >= 0 && selectedMonthIndex < availableMonths.length - 1;

  function confirmDeleteColumn() {
    if (!pendingDeleteColumn) {
      return;
    }

    deleteColumn(pendingDeleteColumn.id);
    setPendingDeleteColumn(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            className="h-9 w-9"
            disabled={!canGoPreviousMonth}
            onClick={() => {
              if (canGoPreviousMonth) {
                changeMonth(availableMonths[selectedMonthIndex - 1]);
              }
            }}
          >
            <ChevronLeft className="size-4" />
            <span className="sr-only">Tháng trước</span>
          </Button>
          <Select value={selectedMonth} onValueChange={changeMonth}>
            <SelectTrigger className="h-9 min-w-44 bg-white">
              <SelectValue placeholder="Chọn tháng" />
            </SelectTrigger>
            <SelectContent>
              {availableMonths.map((month) => (
                <SelectItem key={month} value={month}>
                  {formatScoreMonthLabel(month)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            className="h-9 w-9"
            disabled={!canGoNextMonth}
            onClick={() => {
              if (canGoNextMonth) {
                changeMonth(availableMonths[selectedMonthIndex + 1]);
              }
            }}
          >
            <ChevronRight className="size-4" />
            <span className="sr-only">Tháng sau</span>
          </Button>
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          {isEditing ? (
            <>
              <Button className="gap-2" onClick={saveEditing}>
                <Save className="size-4" />
                <span className="hidden sm:inline">Lưu thay đổi</span>
              </Button>
              <Button variant="outline" className="gap-2" onClick={cancelEditing}>
                <X className="size-4" />
                <span className="hidden sm:inline">Hủy</span>
              </Button>
            </>
          ) : (
            <>
              <Button className="gap-2" onClick={addColumn}>
                <Plus className="size-4" />
                <span className="hidden sm:inline">Thêm bài kiểm tra</span>
              </Button>
              <Button variant="outline" className="gap-2" onClick={startEditing}>
                <Pencil className="size-4" />
                <span className="hidden sm:inline">Cập nhật</span>
              </Button>
              <Button variant="outline" className="gap-2">
                <Download className="size-4" />
                <span className="hidden sm:inline">Xuất bảng điểm</span>
              </Button>
            </>
          )}
        </div>
      </div>

      {errorMessage ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
          {errorMessage}
        </div>
      ) : null}
      {isLoadingStudents ? (
        <p className="rounded-lg border bg-white px-4 py-3 text-sm text-slate-600">
          Đang tải danh sách học sinh...
        </p>
      ) : null}
      {studentsErrorMessage ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {studentsErrorMessage}
        </p>
      ) : null}
      {!isLoadingStudents && !studentsErrorMessage && students.length === 0 ? (
        <p className="rounded-lg border bg-white px-4 py-3 text-sm text-slate-600">
          Lớp này chưa có học sinh trong database.
        </p>
      ) : null}

      {!hasColumns ? (
        <EmptyState
          icon={ClipboardList}
          title="Tháng này chưa có bài kiểm tra nào."
          description="Thầy có thể thêm bài kiểm tra đầu tiên cho tháng đang chọn."
          action={
            <Button className="gap-2" onClick={addColumn}>
              <Plus className="size-4" />
              Thêm bài kiểm tra
            </Button>
          }
        />
      ) : (
        <div className="min-w-0 rounded-lg border bg-white">
          <Table className="min-w-[760px]">
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="w-16">STT</TableHead>
                <TableHead className="min-w-52">Họ tên</TableHead>
                {activeSheet.columns.map((column) => (
                  <TableHead key={column.id} className="min-w-40">
                    {isEditing ? (
                      <div className="flex items-center gap-2">
                        <Input
                          value={column.label}
                          onChange={(event) => updateColumnLabel(column.id, event.target.value)}
                          className="h-8 min-w-36 bg-white font-medium"
                          aria-label="Tên bài kiểm tra"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          className="text-red-700 hover:bg-red-50 hover:text-red-800"
                          onClick={() => setPendingDeleteColumn(column)}
                        >
                          <Trash2 className="size-4" />
                          <span className="sr-only">Xóa cột điểm</span>
                        </Button>
                      </div>
                    ) : (
                      column.label
                    )}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((student, index) => {
                const studentKey = getScoreStudentKey(student);

                return (
                  <TableRow key={studentKey}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell className="font-medium text-slate-950">
                      {student.fullName}
                    </TableCell>
                    {activeSheet.columns.map((column) => {
                    const score = activeSheet.valuesByStudentId[studentKey]?.[column.id] ?? "";

                    return (
                      <TableCell key={column.id}>
                        {isEditing ? (
                          <Input
                            value={score}
                            inputMode="decimal"
                            onChange={(event) => {
                              const nextValue = event.target.value;
                              if (canUseScoreInput(nextValue)) {
                                updateScore(studentKey, column.id, nextValue);
                              }
                            }}
                            className="h-8 w-24 bg-white"
                            placeholder="-"
                            aria-label={`Điểm ${column.label} của ${student.fullName}`}
                          />
                        ) : (
                          score || "-"
                        )}
                      </TableCell>
                    );
                    })}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog
        open={Boolean(pendingDeleteColumn)}
        onOpenChange={(open) => {
          if (!open) {
            setPendingDeleteColumn(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Xóa cột điểm</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Bạn có chắc muốn xóa cột điểm này? Toàn bộ điểm trong cột sẽ bị xóa.
          </p>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Hủy
              </Button>
            </DialogClose>
            <Button type="button" variant="destructive" onClick={confirmDeleteColumn}>
              Xóa cột điểm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
