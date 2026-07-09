import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Pencil,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";

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
import {
  canUseScoreInput,
  formatScoreMonthLabel,
  formatScoreValue,
  isScoreStudentEligibleForMonth,
  isValidScoreText,
  parseScoreText,
} from "@/features/classes/utils/scores";
import { sortStudentsByVietnameseName } from "@/features/classes/utils/studentRoster";
import { clampMonthToRange, currentMonthKey, isValidMonthKey, monthsInRange } from "@/lib/months";
import {
  addScoreColumn,
  deleteScoreColumn,
  listScoreSheet,
  renameScoreColumn,
  saveScoreValues,
} from "@/services/scoreApi";
import type { SaveScoreValueInput, ScoreColumnDto, ScoreSheetDto } from "@/types/score";

type ScoresTabProps = {
  classId: number;
  classStartMonth: string;
  classEndMonth: string;
};

const NEW_COLUMN_LABEL = "Bài kiểm tra mới";

export function ScoresTab({ classId, classStartMonth, classEndMonth }: ScoresTabProps) {
  const hasValidRange =
    isValidMonthKey(classStartMonth) &&
    isValidMonthKey(classEndMonth) &&
    classStartMonth <= classEndMonth;
  const availableMonths = useMemo(
    () => (hasValidRange ? monthsInRange(classStartMonth, classEndMonth) : [currentMonthKey()]),
    [classEndMonth, classStartMonth, hasValidRange],
  );
  const [selectedMonth, setSelectedMonth] = useState(() =>
    hasValidRange
      ? clampMonthToRange(currentMonthKey(), classStartMonth, classEndMonth)
      : currentMonthKey(),
  );
  const [sheet, setSheet] = useState<ScoreSheetDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  // Draft thưa: chỉ giữ các ô/tên cột đã sửa; hiển thị = draft ?? giá trị DB.
  const [draftLabels, setDraftLabels] = useState<Record<number, string>>({});
  const [draftValues, setDraftValues] = useState<Record<number, Record<number, string>>>({});
  const [pendingDeleteColumn, setPendingDeleteColumn] = useState<ScoreColumnDto | null>(null);

  // Nếu thời gian học của lớp thay đổi làm tháng đang chọn rơi ra ngoài, kéo về tháng hợp lệ.
  useEffect(() => {
    if (hasValidRange && (selectedMonth < classStartMonth || selectedMonth > classEndMonth)) {
      setSelectedMonth(clampMonthToRange(currentMonthKey(), classStartMonth, classEndMonth));
    }
  }, [classEndMonth, classStartMonth, hasValidRange, selectedMonth]);

  const refreshSheet = useCallback(async () => {
    setErrorMessage("");

    try {
      setSheet(await listScoreSheet(classId, selectedMonth));
    } catch (error) {
      console.warn("[scores] load failed", error);
      setSheet(null);
      setErrorMessage(
        typeof error === "string" ? error : "Không tải được bảng điểm từ database.",
      );
    }
  }, [classId, selectedMonth]);

  useEffect(() => {
    let cancelled = false;

    setIsLoading(true);
    setIsEditing(false);
    setDraftLabels({});
    setDraftValues({});
    refreshSheet().finally(() => {
      if (!cancelled) {
        setIsLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [refreshSheet]);

  const columns = sheet?.columns ?? [];
  const sortedRows = useMemo(() => {
    const rowsInSelectedMonth = (sheet?.rows ?? []).filter((row) =>
      isScoreStudentEligibleForMonth(row, selectedMonth),
    );

    return sortStudentsByVietnameseName(rowsInSelectedMonth);
  }, [selectedMonth, sheet]);
  const hasColumns = columns.length > 0;
  const selectedMonthIndex = availableMonths.indexOf(selectedMonth);
  const canGoPreviousMonth = selectedMonthIndex > 0;
  const canGoNextMonth =
    selectedMonthIndex >= 0 && selectedMonthIndex < availableMonths.length - 1;

  function changeMonth(month: string) {
    setSelectedMonth(month);
  }

  function getColumnLabel(column: ScoreColumnDto) {
    return draftLabels[column.id] ?? column.label;
  }

  function getCellText(membershipId: number, columnId: number) {
    const draft = draftValues[membershipId]?.[columnId];
    if (draft !== undefined) {
      return draft;
    }

    const row = sheet?.rows.find((item) => item.membershipId === membershipId);
    return formatScoreValue(row?.valuesByColumnId[String(columnId)]);
  }

  function updateDraftValue(membershipId: number, columnId: number, value: string) {
    setDraftValues((current) => ({
      ...current,
      [membershipId]: {
        ...(current[membershipId] ?? {}),
        [columnId]: value,
      },
    }));
  }

  function updateDraftLabel(columnId: number, label: string) {
    setDraftLabels((current) => ({ ...current, [columnId]: label }));
  }

  function startEditing() {
    setDraftLabels({});
    setDraftValues({});
    setIsEditing(true);
    setErrorMessage("");
  }

  function cancelEditing() {
    setDraftLabels({});
    setDraftValues({});
    setIsEditing(false);
    setErrorMessage("");
  }

  async function handleAddColumn() {
    setIsSaving(true);
    setErrorMessage("");

    try {
      const nextSheet = await addScoreColumn({
        classId,
        month: selectedMonth,
        label: NEW_COLUMN_LABEL,
      });
      setSheet(nextSheet);
      setIsEditing(true);
    } catch (error) {
      console.warn("[scores] add column failed", error);
      setErrorMessage(typeof error === "string" ? error : "Không thêm được bài kiểm tra.");
    } finally {
      setIsSaving(false);
    }
  }

  async function confirmDeleteColumn() {
    if (!pendingDeleteColumn) {
      return;
    }

    const column = pendingDeleteColumn;
    setPendingDeleteColumn(null);
    setIsSaving(true);
    setErrorMessage("");

    try {
      await deleteScoreColumn(column.id);
      // Gỡ draft của cột đã xóa, giữ draft các cột còn lại.
      setDraftLabels((current) => {
        const { [column.id]: _removed, ...rest } = current;
        return rest;
      });
      setDraftValues((current) =>
        Object.fromEntries(
          Object.entries(current).map(([membershipId, values]) => {
            const { [column.id]: _removed, ...rest } = values;
            return [membershipId, rest];
          }),
        ),
      );
      await refreshSheet();
    } catch (error) {
      console.warn("[scores] delete column failed", error);
      setErrorMessage(typeof error === "string" ? error : "Không xóa được cột điểm.");
    } finally {
      setIsSaving(false);
    }
  }

  async function saveEditing() {
    if (!sheet) {
      return;
    }

    // Validate toàn bộ ô hiển thị (draft đè lên giá trị DB).
    for (const row of sortedRows) {
      for (const column of sheet.columns) {
        if (!isValidScoreText(getCellText(row.membershipId, column.id))) {
          setErrorMessage("Điểm phải là số từ 0 đến 10. Có thể để trống nếu chưa có điểm.");
          return;
        }
      }
    }

    setIsSaving(true);
    setErrorMessage("");

    try {
      // Đổi tên cột trước (chỉ những cột có draft khác giá trị hiện tại).
      for (const column of sheet.columns) {
        const nextLabel = (draftLabels[column.id] ?? column.label).trim() || "Bài kiểm tra";
        if (nextLabel !== column.label) {
          await renameScoreColumn({ columnId: column.id, label: nextLabel });
        }
      }

      const values: SaveScoreValueInput[] = sortedRows.flatMap((row) =>
        sheet.columns.map((column) => ({
          columnId: column.id,
          membershipId: row.membershipId,
          studentId: row.studentId,
          value: parseScoreText(getCellText(row.membershipId, column.id)),
        })),
      );

      if (values.length > 0) {
        await saveScoreValues({ classId, month: selectedMonth, values });
      }

      setDraftLabels({});
      setDraftValues({});
      setIsEditing(false);
      await refreshSheet();
    } catch (error) {
      console.warn("[scores] save failed", error);
      setErrorMessage(typeof error === "string" ? error : "Không lưu được bảng điểm.");
    } finally {
      setIsSaving(false);
    }
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
            disabled={!canGoPreviousMonth || isSaving}
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
            disabled={!canGoNextMonth || isSaving}
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
              <Button className="gap-2" onClick={saveEditing} disabled={isSaving}>
                <Save className="size-4" />
                <span className="hidden sm:inline">
                  {isSaving ? "Đang lưu..." : "Lưu thay đổi"}
                </span>
              </Button>
              <Button
                variant="outline"
                className="gap-2"
                onClick={cancelEditing}
                disabled={isSaving}
              >
                <X className="size-4" />
                <span className="hidden sm:inline">Hủy</span>
              </Button>
            </>
          ) : (
            <>
              <Button className="gap-2" onClick={handleAddColumn} disabled={isSaving}>
                <Plus className="size-4" />
                <span className="hidden sm:inline">Thêm bài kiểm tra</span>
              </Button>
              <Button
                variant="outline"
                className="gap-2"
                onClick={startEditing}
                disabled={isSaving || !hasColumns}
              >
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
      {isLoading ? (
        <p className="rounded-lg border bg-white px-4 py-3 text-sm text-slate-600">
          Đang tải bảng điểm...
        </p>
      ) : null}
      {!isLoading && sheet && sortedRows.length === 0 ? (
        <p className="rounded-lg border bg-white px-4 py-3 text-sm text-slate-600">
          Tháng này chưa có học sinh nào thuộc lớp.
        </p>
      ) : null}

      {!isLoading && sheet && sortedRows.length > 0 ? (
        <div className="min-w-0 rounded-lg border bg-white">
          <Table className="min-w-[760px]">
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="w-16">STT</TableHead>
                <TableHead className="min-w-52">Họ tên</TableHead>
                {columns.map((column) => (
                  <TableHead key={column.id} className="min-w-40">
                    {isEditing ? (
                      <div className="flex items-center gap-2">
                        <Input
                          value={getColumnLabel(column)}
                          onChange={(event) => updateDraftLabel(column.id, event.target.value)}
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
              {sortedRows.map((row, index) => (
                <TableRow key={row.membershipId}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell className="font-medium text-slate-950">{row.fullName}</TableCell>
                  {columns.map((column) => {
                    const cellText = getCellText(row.membershipId, column.id);

                    return (
                      <TableCell key={column.id}>
                        {isEditing ? (
                          <Input
                            value={cellText}
                            inputMode="decimal"
                            onChange={(event) => {
                              const nextValue = event.target.value;
                              if (canUseScoreInput(nextValue)) {
                                updateDraftValue(row.membershipId, column.id, nextValue);
                              }
                            }}
                            className="h-8 w-24 bg-white"
                            placeholder="-"
                            aria-label={`Điểm ${getColumnLabel(column)} của ${row.fullName}`}
                          />
                        ) : (
                          cellText || "-"
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : null}

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
