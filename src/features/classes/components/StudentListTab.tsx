import { useEffect, useState } from "react";
import { Check, Download, Pencil, Plus, Search, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { formatPhoneNumber, normalizePhoneNumber } from "@/lib/format";
import {
  createStudentForClass,
  updateClassMembershipStatus,
  updateStudent,
} from "@/services/studentApi";
import type { StudentListItem, StudentStatus } from "@/types/student";

type StudentListTabProps = {
  classId: number;
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

export function StudentListTab({ classId, onStudentsChanged }: StudentListTabProps) {
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
  const [errorMessage, setErrorMessage] = useState("");
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredStudents = normalizedQuery
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
    : students;

  useEffect(() => {
    setStudents(dbStudents);
    setNewStudentIds([]);
    setIsEditing(false);
    setErrorMessage("");
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

  function updateStudentStatus(studentId: string, status: StudentStatus) {
    setStudents((current) =>
      current.map((student) =>
        String(student.id) === studentId ? { ...student, status } : student,
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
          const createdStudent = await createStudentForClass({
            classId,
            ...input,
          });

          if (student.status !== "active") {
            await updateClassMembershipStatus(Number(createdStudent.membershipId), student.status);
          }
        } else {
          await updateStudent({
            studentId: Number(student.studentId),
            ...input,
          });
          await updateClassMembershipStatus(Number(student.membershipId), student.status);
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
    setIsEditing(true);
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
            disabled={isLoading || isSaving}
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
            disabled={isLoading || isSaving}
          >
            <Plus className="size-4" />
            <span className="hidden sm:inline">Thêm học sinh</span>
          </Button>
          <Button variant="outline" className="gap-2">
            <Download className="size-4" />
            <span className="hidden sm:inline">Xuất Excel</span>
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

      <div className="min-w-0 rounded-lg border bg-white">
        <Table className="min-w-[1040px]">
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead className="w-20">STT</TableHead>
              <TableHead>Họ tên</TableHead>
              <TableHead>Lớp ở trường</TableHead>
              <TableHead>Trường</TableHead>
              <TableHead>SĐT phụ huynh</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead>Ghi chú</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredStudents.map((student, index) => {
              const studentRowId = String(student.id);
              const isNewStudent = newStudentIds.includes(studentRowId);
              const canEditRow = isEditing || isNewStudent;

              return (
                <TableRow key={student.id}>
                  <TableCell>
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
                  <EditableStatusCell
                    isEditing={canEditRow}
                    status={student.status}
                    onChange={(status) => updateStudentStatus(studentRowId, status)}
                  />
                  <EditableCell
                    isEditing={canEditRow}
                    value={student.note ?? ""}
                    className="max-w-56 whitespace-normal text-slate-950"
                    placeholder="Ghi chú"
                    onChange={(value) => updateStudentField(studentRowId, "note", value)}
                  />
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function StudentStatusBadge({ status }: { status: StudentStatus }) {
  const config = studentStatusConfig[status];

  return <Badge className={config.className}>{config.label}</Badge>;
}

function EditableStatusCell({
  isEditing,
  status,
  onChange,
}: {
  isEditing: boolean;
  status: StudentStatus;
  onChange: (status: StudentStatus) => void;
}) {
  if (!isEditing) {
    return (
      <TableCell>
        <StudentStatusBadge status={status} />
      </TableCell>
    );
  }

  return (
    <TableCell>
      <Select value={status} onValueChange={(value) => onChange(value as StudentStatus)}>
        <SelectTrigger className="h-8 min-w-32 bg-white">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="active">Đang học</SelectItem>
          <SelectItem value="paused">Đã nghỉ</SelectItem>
        </SelectContent>
      </Select>
    </TableCell>
  );
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
    <TableCell className={className}>
      {isEditing ? (
        <Input
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          className="h-8 min-w-36 bg-white"
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
    <TableCell>
      {isEditing ? (
        <Input
          value={formatPhoneNumber(value)}
          placeholder={placeholder}
          inputMode="numeric"
          onChange={(event) => onChange(event.target.value)}
          className="h-8 min-w-36 bg-white"
        />
      ) : (
        formatPhoneNumber(value) || "-"
      )}
    </TableCell>
  );
}
