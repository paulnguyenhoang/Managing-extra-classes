import { useEffect, useMemo, useState } from "react";
import { Check, Download, Pencil, Plus, Search, Trash2, Upload } from "lucide-react";

import { Badge } from "@/components/ui/badge";
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
import { PauseStudentDialog } from "@/features/classes/components/PauseStudentDialog";
import { StudentImportPreviewDialog } from "@/features/classes/components/StudentImportPreviewDialog";
import { useClassStudents } from "@/features/classes/hooks/useClassStudents";
import {
  excelExportButtonClassName,
  excelImportButtonClassName,
} from "@/features/classes/utils/excelButtonStyles";
import { exportStudentListToExcel } from "@/features/classes/utils/studentListExport";
import {
  parseStudentImportFile,
  type StudentImportPlan,
} from "@/features/classes/utils/studentListImport";
import { sortStudentsByVietnameseName } from "@/features/classes/utils/studentRoster";
import { formatPhoneNumber, normalizePhoneNumber } from "@/lib/format";
import {
  clampMonthToRange,
  currentMonthKey,
  formatMonthLabel,
  isValidMonthKey,
  monthsInRange,
} from "@/lib/months";
import { pickExcelImportFile } from "@/services/excelImportApi";
import { getUnpaidMonthsForMembership } from "@/services/paymentApi";
import {
  archiveStudentMembership,
  createStudentForClass,
  importStudentsForClass,
  pauseStudentMembership,
  reactivateStudentMembership,
  updateStudent,
} from "@/services/studentApi";
import type { StudentListItem, StudentStatus } from "@/types/student";

type StudentListTabProps = {
  classId: number;
  className: string;
  academicYearLabel?: string;
  classStartMonth: string;
  classEndMonth: string;
  onStudentsChanged?: () => void | Promise<void>;
};

type EditableStudentField = "fullName" | "schoolClass" | "school" | "parentPhone" | "note";

const studentStatusConfig: Record<
  StudentStatus,
  { label: string; className: string }
> = {
  active: {
    label: "Đang học",
    className: "bg-emerald-100 text-emerald-900 hover:bg-emerald-100",
  },
  paused: {
    label: "Đã nghỉ",
    className: "bg-slate-200 text-slate-700 hover:bg-slate-200",
  },
};

export function StudentListTab({
  classId,
  className,
  academicYearLabel,
  classStartMonth,
  classEndMonth,
  onStudentsChanged,
}: StudentListTabProps) {
  const {
    students: dbStudents,
    isLoading,
    errorMessage: loadErrorMessage,
    refresh,
  } = useClassStudents(classId);
  const [students, setStudents] = useState<StudentListItem[]>([]);
  const [newStudentIds, setNewStudentIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importPlan, setImportPlan] = useState<StudentImportPlan | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [pendingPauseStudent, setPendingPauseStudent] = useState<StudentListItem | null>(null);
  const [pendingArchiveStudent, setPendingArchiveStudent] = useState<StudentListItem | null>(null);
  const [debtByMembershipId, setDebtByMembershipId] = useState<
    Record<string, number | null>
  >({});
  const hasValidRange =
    isValidMonthKey(classStartMonth) &&
    isValidMonthKey(classEndMonth) &&
    classStartMonth <= classEndMonth;
  const defaultJoinedMonth = hasValidRange
    ? clampMonthToRange(currentMonthKey(), classStartMonth, classEndMonth)
    : currentMonthKey();
  const joinedMonthOptions = hasValidRange
    ? monthsInRange(classStartMonth, classEndMonth)
    : [defaultJoinedMonth];
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredStudents = useMemo(
    () =>
      sortStudentsByVietnameseName(
        normalizedQuery
          ? students.filter((student) =>
              [
                student.fullName,
                student.schoolClass,
                student.school,
                student.parentPhone,
                formatPhoneNumber(student.parentPhone),
                student.note,
                studentStatusConfig[student.status].label,
              ]
                .join(" ")
                .toLowerCase()
                .includes(normalizedQuery),
            )
          : students,
      ),
    [normalizedQuery, students],
  );

  // Không reset successMessage ở đây: refresh sau khi nhập Excel cần giữ thông báo thành công;
  // các handler đều tự clear message khi bắt đầu thao tác mới.
  useEffect(() => {
    setStudents(dbStudents);
    setNewStudentIds([]);
    setIsEditing(false);
    setErrorMessage("");
  }, [dbStudents]);

  // "Còn nợ X tháng" cho học sinh đã nghỉ — tính từ bảng payments, không lưu tay.
  useEffect(() => {
    const pausedStudents = dbStudents.filter(
      (student) => student.status === "paused" && student.leftMonth,
    );

    if (pausedStudents.length === 0) {
      setDebtByMembershipId({});
      return;
    }

    let cancelled = false;

    Promise.all(
      pausedStudents.map(async (student) => {
        try {
          const months = await getUnpaidMonthsForMembership(
            Number(student.membershipId),
            student.leftMonth as string,
          );
          return [String(student.membershipId), months.length] as const;
        } catch (error) {
          console.warn("[students] debt check failed", error);
          return [String(student.membershipId), null] as const;
        }
      }),
    ).then((entries) => {
      if (!cancelled) {
        setDebtByMembershipId(Object.fromEntries(entries));
      }
    });

    return () => {
      cancelled = true;
    };
  }, [dbStudents]);

  function updateStudentField(
    studentId: string,
    field: EditableStudentField,
    value: string,
  ) {
    setStudents((current) =>
      current.map((student) =>
        String(student.id) === studentId ? { ...student, [field]: value } : student,
      ),
    );
  }

  function updateStudentJoinedMonth(studentId: string, joinedMonth: string) {
    setStudents((current) =>
      current.map((student) =>
        String(student.id) === studentId ? { ...student, joinedMonth } : student,
      ),
    );
  }

  function addInlineStudent() {
    const newStudentId = `draft-student-${Date.now()}`;

    setStudents((current) => [
      ...current,
      {
        id: newStudentId,
        studentId: newStudentId,
        membershipId: `draft-membership-${Date.now()}`,
        classId,
        fullName: "",
        schoolClass: "",
        school: "",
        parentPhone: "",
        status: "active",
        joinedMonth: defaultJoinedMonth,
        leftMonth: null,
        note: "",
      },
    ]);
    setNewStudentIds((current) => [...current, newStudentId]);
    setIsEditing(true);
  }

  function removeNewStudent(studentId: string) {
    setStudents((current) => current.filter((student) => String(student.id) !== studentId));
    setNewStudentIds((current) => current.filter((id) => id !== studentId));
  }

  async function saveStudents() {
    const invalidStudent = students.find((student) => !student.fullName.trim());
    if (invalidStudent) {
      setErrorMessage("Vui lòng nhập họ tên học sinh trước khi lưu.");
      return;
    }

    setIsSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      for (const student of students) {
        const input = {
          fullName: student.fullName,
          schoolClass: student.schoolClass,
          school: student.school,
          parentPhone: normalizePhoneNumber(student.parentPhone),
          note: student.note,
        };

        if (newStudentIds.includes(String(student.id))) {
          await createStudentForClass({
            classId,
            joinedMonth: student.joinedMonth,
            ...input,
          });
        } else {
          await updateStudent({
            studentId: Number(student.studentId),
            ...input,
          });
        }
      }

      setNewStudentIds([]);
      setIsEditing(false);
      await refresh();
      await onStudentsChanged?.();
    } catch (error) {
      console.warn("[students] save failed", error);
      setErrorMessage(
        typeof error === "string" ? error : "Không lưu được danh sách học sinh.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  function toggleEditing() {
    if (isEditing) {
      saveStudents();
      return;
    }

    setErrorMessage("");
    setSuccessMessage("");
    setIsEditing(true);
  }

  async function exportVisibleStudents() {
    if (newStudentIds.length > 0) {
      setSuccessMessage("");
      setErrorMessage("Vui lòng lưu cập nhật trước khi xuất Excel.");
      return;
    }

    if (filteredStudents.length === 0) {
      setSuccessMessage("");
      setErrorMessage("Không có học sinh để xuất Excel.");
      return;
    }

    setIsExporting(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const result = await exportStudentListToExcel({
        rows: filteredStudents,
        className,
        academicYearLabel,
        classStartMonth,
        classEndMonth,
      });

      if (result) {
        setSuccessMessage("Đã xuất file Excel.");
      }
    } catch (error) {
      console.warn("[students] export failed", error);
      setErrorMessage(
        typeof error === "string" ? error : "Không xuất được file Excel.",
      );
    } finally {
      setIsExporting(false);
    }
  }

  async function handleImportExcel() {
    if (isEditing || newStudentIds.length > 0) {
      setSuccessMessage("");
      setErrorMessage("Vui lòng lưu hoặc hủy cập nhật trước khi nhập Excel.");
      return;
    }

    setIsImporting(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const file = await pickExcelImportFile();
      if (!file) {
        return;
      }

      // Match với roster DB gốc, không dùng danh sách đã filter theo search.
      setImportPlan(
        await parseStudentImportFile({
          fileName: file.fileName,
          bytes: file.bytes,
          roster: dbStudents,
          classStartMonth,
          classEndMonth,
        }),
      );
    } catch (error) {
      console.warn("[students] import parse failed", error);
      setErrorMessage(getImportErrorMessage(error));
    } finally {
      setIsImporting(false);
    }
  }

  async function confirmImport() {
    if (!importPlan) {
      return;
    }

    const rows = importPlan.rows.flatMap((row) => (row.input ? [row.input] : []));
    if (rows.length === 0) {
      setImportPlan(null);
      return;
    }

    setIsImporting(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await importStudentsForClass({ classId, rows });
      setImportPlan(null);
      await refresh();
      await onStudentsChanged?.();
      setSuccessMessage("Đã nhập danh sách học sinh.");
    } catch (error) {
      console.warn("[students] import failed", error);
      setImportPlan(null);
      setErrorMessage(getImportErrorMessage(error));
    } finally {
      setIsImporting(false);
    }
  }

  function handleStatusChange(student: StudentListItem, nextStatus: StudentStatus) {
    if (nextStatus === student.status) {
      return;
    }

    if (nextStatus === "paused") {
      setPendingPauseStudent(student);
      return;
    }

    void reactivateStudent(student);
  }

  async function reactivateStudent(student: StudentListItem) {
    setIsSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await reactivateStudentMembership(Number(student.membershipId));
      await refresh();
      await onStudentsChanged?.();
    } catch (error) {
      console.warn("[students] reactivate failed", error);
      setErrorMessage(
        typeof error === "string" ? error : "Không kích hoạt lại được học sinh.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function confirmPauseStudent(leftMonth: string) {
    if (!pendingPauseStudent) {
      return;
    }

    setSuccessMessage("");
    await pauseStudentMembership(Number(pendingPauseStudent.membershipId), leftMonth);
    setPendingPauseStudent(null);
    await refresh();
    await onStudentsChanged?.();
  }

  async function confirmArchiveStudent() {
    if (!pendingArchiveStudent) {
      return;
    }

    setIsSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const studentName = pendingArchiveStudent.fullName;
      await archiveStudentMembership(Number(pendingArchiveStudent.membershipId));
      setPendingArchiveStudent(null);
      await refresh();
      await onStudentsChanged?.();
      setSuccessMessage(`Đã xóa ${studentName} khỏi danh sách lớp.`);
    } catch (error) {
      console.warn("[students] archive failed", error);
      setPendingArchiveStudent(null);
      setErrorMessage(
        typeof error === "string" ? error : "Không xóa được học sinh khỏi danh sách.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative min-w-64 flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="h-9 bg-white pl-9"
            placeholder="Tìm theo tên, lớp, trường..."
          />
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <Button
            type="button"
            variant={isEditing ? "default" : "outline"}
            className="gap-2"
            onClick={toggleEditing}
            disabled={isLoading || isSaving || isExporting}
          >
            {isEditing ? <Check className="size-4" /> : <Pencil className="size-4" />}
            <span className="hidden sm:inline">
              {isSaving ? "Đang lưu..." : isEditing ? "Lưu cập nhật" : "Cập nhật"}
            </span>
          </Button>
          <Button
            type="button"
            className="gap-2"
            onClick={addInlineStudent}
            disabled={isLoading || isSaving || isExporting || isImporting}
          >
            <Plus className="size-4" />
            <span className="hidden sm:inline">Thêm học sinh</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            className={excelImportButtonClassName}
            onClick={handleImportExcel}
            disabled={isLoading || isSaving || isExporting || isImporting}
          >
            <Upload className="size-4" />
            <span className="hidden sm:inline">
              {isImporting ? "Đang nhập..." : "Nhập Excel"}
            </span>
          </Button>
          <Button
            type="button"
            variant="outline"
            className={excelExportButtonClassName}
            onClick={exportVisibleStudents}
            disabled={
              isLoading || isSaving || isExporting || isImporting || filteredStudents.length === 0
            }
          >
            <Download className="size-4" />
            <span className="hidden sm:inline">
              {isExporting ? "Đang xuất..." : "Xuất Excel"}
            </span>
          </Button>
        </div>
      </div>
      {isLoading && (
        <p className="text-sm text-slate-600">Đang tải danh sách học sinh...</p>
      )}
      {(loadErrorMessage || errorMessage) && (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {loadErrorMessage || errorMessage}
        </p>
      )}
      {successMessage && !errorMessage && (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {successMessage}
        </p>
      )}

      <div className="min-w-0 rounded-lg border bg-white [&_[data-slot=table-container]]:overflow-x-hidden">
        <Table className="w-full table-fixed">
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead className="w-12">STT</TableHead>
              <TableHead className="w-[14%] whitespace-normal">Họ tên</TableHead>
              <TableHead className="w-[8%]">Lớp</TableHead>
              <TableHead className="w-[12%]">Trường</TableHead>
              <TableHead className="w-[11%] whitespace-normal">SĐT phụ huynh</TableHead>
              <TableHead className="w-[9%] whitespace-normal">Bắt đầu học</TableHead>
              <TableHead className="w-[20%]">Trạng thái</TableHead>
              <TableHead className="w-[14%]">Ghi chú</TableHead>
              <TableHead className="w-24 text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredStudents.map((student, index) => {
              const studentRowId = String(student.id);
              const isNewStudent = newStudentIds.includes(studentRowId);
              const canEditRow = isEditing || isNewStudent;
              const debtMonths = debtByMembershipId[String(student.membershipId)];

              return (
                <TableRow key={student.id}>
                  <TableCell className="overflow-hidden">
                    <div className="flex items-center gap-2">
                      <span>{index + 1}</span>
                      {isNewStudent && (
                        <Button
                          type="button"
                          size="icon-sm"
                          variant="ghost"
                          className="text-red-700 hover:bg-red-50 hover:text-red-800"
                          onClick={() => removeNewStudent(studentRowId)}
                        >
                          <Trash2 className="size-4" />
                          <span className="sr-only">Xóa dòng học sinh mới</span>
                        </Button>
                      )}
                    </div>
                  </TableCell>
                  <EditableCell
                    isEditing={canEditRow}
                    value={student.fullName}
                    className="font-medium text-slate-950"
                    placeholder="Nhập họ tên"
                    onChange={(value) => updateStudentField(studentRowId, "fullName", value)}
                  />
                  <EditableCell
                    isEditing={canEditRow}
                    value={student.schoolClass}
                    placeholder="Ví dụ: 9A1"
                    onChange={(value) => updateStudentField(studentRowId, "schoolClass", value)}
                  />
                  <EditableCell
                    isEditing={canEditRow}
                    value={student.school}
                    placeholder="Tên trường"
                    onChange={(value) => updateStudentField(studentRowId, "school", value)}
                  />
                  <EditablePhoneCell
                    isEditing={canEditRow}
                    value={student.parentPhone}
                    placeholder="SĐT phụ huynh"
                    onChange={(value) =>
                      updateStudentField(studentRowId, "parentPhone", normalizePhoneNumber(value))
                    }
                  />
                  <TableCell className="whitespace-normal">
                    {isNewStudent ? (
                      <Select
                        value={student.joinedMonth}
                        onValueChange={(value) => updateStudentJoinedMonth(studentRowId, value)}
                      >
                        <SelectTrigger className="h-8 w-full min-w-0 bg-white">
                          <SelectValue placeholder="Tháng bắt đầu" />
                        </SelectTrigger>
                        <SelectContent>
                          {joinedMonthOptions.map((month) => (
                            <SelectItem key={month} value={month}>
                              Tháng {formatMonthLabel(month)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className="text-slate-700">
                        {student.joinedMonth ? formatMonthLabel(student.joinedMonth) : "-"}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="whitespace-normal">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {canEditRow && !isNewStudent ? (
                        <Select
                          value={student.status}
                          onValueChange={(value) =>
                            handleStatusChange(student, value as StudentStatus)
                          }
                        >
                          <SelectTrigger className="h-8 w-full min-w-0 bg-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">Đang học</SelectItem>
                            <SelectItem value="paused">Đã nghỉ</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <StudentStatusBadge status={student.status} />
                      )}
                      {student.status === "paused" && student.leftMonth ? (
                        <span className="text-xs text-slate-500">
                          Nghỉ từ {formatMonthLabel(student.leftMonth)}
                        </span>
                      ) : null}
                      {typeof debtMonths === "number" && debtMonths > 0 ? (
                        <Badge className="bg-amber-100 text-amber-900 hover:bg-amber-100">
                          Còn nợ {debtMonths} tháng
                        </Badge>
                      ) : student.status === "paused" && debtMonths === 0 ? (
                        <Badge className="bg-emerald-100 text-emerald-900 hover:bg-emerald-100">
                          Đã đủ học phí
                        </Badge>
                      ) : student.status === "paused" && debtMonths === null ? (
                        <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
                          Chưa kiểm tra được học phí
                        </Badge>
                      ) : student.status === "paused" ? (
                        <span className="text-xs text-slate-500">Đang kiểm tra học phí...</span>
                      ) : null}
                    </div>
                  </TableCell>
                  <EditableCell
                    isEditing={canEditRow}
                    value={student.note ?? ""}
                    className="max-w-56 whitespace-normal text-slate-950"
                    placeholder="Ghi chú"
                    onChange={(value) => updateStudentField(studentRowId, "note", value)}
                  />
                  <TableCell className="text-right">
                    {student.status === "paused" && !isNewStudent ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="gap-1 border-red-200 px-2 text-red-700 hover:bg-red-50 hover:text-red-800"
                        disabled={isEditing || isSaving || debtMonths !== 0}
                        title={
                          debtMonths === 0
                            ? "Xóa học sinh khỏi danh sách lớp"
                            : debtMonths === null
                              ? "Không thể kiểm tra học phí"
                              : debtMonths === undefined
                                ? "Đang kiểm tra học phí"
                                : `Học sinh còn nợ ${debtMonths} tháng học phí`
                        }
                        onClick={() => setPendingArchiveStudent(student)}
                      >
                        <Trash2 className="size-3.5" />
                        Xóa
                      </Button>
                    ) : (
                      <span className="text-slate-300">-</span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <StudentImportPreviewDialog
        plan={importPlan}
        className={className}
        currentStudentCount={dbStudents.length}
        isImporting={isImporting}
        onOpenChange={(open) => {
          if (!open) {
            setImportPlan(null);
          }
        }}
        onConfirm={confirmImport}
      />

      <PauseStudentDialog
        open={Boolean(pendingPauseStudent)}
        studentName={pendingPauseStudent?.fullName ?? ""}
        membershipId={
          pendingPauseStudent ? Number(pendingPauseStudent.membershipId) : null
        }
        joinedMonth={pendingPauseStudent?.joinedMonth ?? classStartMonth}
        classEndMonth={classEndMonth}
        onOpenChange={(open) => {
          if (!open) {
            setPendingPauseStudent(null);
          }
        }}
        onConfirm={confirmPauseStudent}
      />

      <Dialog
        open={Boolean(pendingArchiveStudent)}
        onOpenChange={(open) => {
          if (!open && !isSaving) {
            setPendingArchiveStudent(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Xóa học sinh khỏi danh sách?</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm text-slate-600">
            <p>
              Xóa <span className="font-medium text-slate-950">{pendingArchiveStudent?.fullName}</span>{" "}
              khỏi danh sách lớp này?
            </p>
            <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-900">
              Học sinh đã nghỉ và đã hoàn tất học phí các tháng đã học.
            </p>
            <p>
              Lịch sử điểm danh, điểm số và học phí vẫn được giữ lại để tra cứu khi cần.
            </p>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={isSaving}>
                Giữ lại
              </Button>
            </DialogClose>
            <Button
              type="button"
              variant="destructive"
              disabled={isSaving}
              onClick={() => void confirmArchiveStudent()}
            >
              {isSaving ? "Đang xóa..." : "Xóa khỏi danh sách"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function getImportErrorMessage(error: unknown) {
  if (typeof error === "string") {
    return error;
  }

  return error instanceof Error
    ? error.message
    : "Không thể đọc file Excel. Vui lòng kiểm tra lại file.";
}

function StudentStatusBadge({ status }: { status: StudentStatus }) {
  const config = studentStatusConfig[status];

  return <Badge className={config.className}>{config.label}</Badge>;
}

function EditableCell({
  isEditing,
  value,
  className,
  placeholder,
  onChange,
}: {
  isEditing: boolean;
  value: string;
  className?: string;
  placeholder?: string;
  onChange: (value: string) => void;
}) {
  return (
    <TableCell className={`overflow-hidden whitespace-normal break-words ${className ?? ""}`}>
      {isEditing ? (
        <Input
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          className="h-8 w-full min-w-0 bg-white"
        />
      ) : (
        value || "-"
      )}
    </TableCell>
  );
}

function EditablePhoneCell({
  isEditing,
  value,
  placeholder,
  onChange,
}: {
  isEditing: boolean;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
}) {
  return (
    <TableCell className="overflow-hidden whitespace-normal break-words">
      {isEditing ? (
        <Input
          value={formatPhoneNumber(value)}
          placeholder={placeholder}
          inputMode="numeric"
          onChange={(event) => onChange(event.target.value)}
          className="h-8 w-full min-w-0 bg-white"
        />
      ) : (
        formatPhoneNumber(value) || "-"
      )}
    </TableCell>
  );
}
