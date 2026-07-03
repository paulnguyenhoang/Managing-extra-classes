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
import { getStudentsByClassId } from "@/data/mockData";
import type { Student, StudentStatus } from "@/types/student";

type StudentListTabProps = {
  classId: string;
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

export function StudentListTab({ classId }: StudentListTabProps) {
  const [students, setStudents] = useState<Student[]>(() => getStudentsByClassId(classId));
  const [newStudentIds, setNewStudentIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredStudents = normalizedQuery
    ? students.filter((student) =>
        [
          student.fullName,
          student.schoolClass,
          student.school,
          student.parentPhone,
          student.note,
          studentStatusConfig[student.status].label,
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery),
      )
    : students;

  useEffect(() => {
    setStudents(getStudentsByClassId(classId));
    setNewStudentIds([]);
    setIsEditing(false);
  }, [classId]);

  function updateStudentField(
    studentId: string,
    field: EditableStudentField,
    value: string,
  ) {
    setStudents((current) =>
      current.map((student) =>
        student.id === studentId ? { ...student, [field]: value } : student,
      ),
    );
  }

  function updateStudentStatus(studentId: string, status: StudentStatus) {
    setStudents((current) =>
      current.map((student) => (student.id === studentId ? { ...student, status } : student)),
    );
  }

  function addInlineStudent() {
    const newStudentId = `mock-student-${Date.now()}`;

    setStudents((current) => [
      ...current,
      {
        id: newStudentId,
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
    setStudents((current) => current.filter((student) => student.id !== studentId));
    setNewStudentIds((current) => current.filter((id) => id !== studentId));
  }

  function toggleEditing() {
    if (isEditing) {
      setNewStudentIds([]);
      setIsEditing(false);
      return;
    }

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
          >
            {isEditing ? <Check className="size-4" /> : <Pencil className="size-4" />}
            <span className="hidden sm:inline">{isEditing ? "Lưu cập nhật" : "Cập nhật"}</span>
          </Button>
          <Button type="button" className="gap-2" onClick={addInlineStudent}>
            <Plus className="size-4" />
            <span className="hidden sm:inline">Thêm học sinh</span>
          </Button>
          <Button variant="outline" className="gap-2">
            <Download className="size-4" />
            <span className="hidden sm:inline">Xuất Excel</span>
          </Button>
        </div>
      </div>

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
              const isNewStudent = newStudentIds.includes(student.id);
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
                          onClick={() => removeNewStudent(student.id)}
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
                    onChange={(value) => updateStudentField(student.id, "fullName", value)}
                  />
                  <EditableCell
                    isEditing={canEditRow}
                    value={student.schoolClass}
                    placeholder="Ví dụ: 9A1"
                    onChange={(value) => updateStudentField(student.id, "schoolClass", value)}
                  />
                  <EditableCell
                    isEditing={canEditRow}
                    value={student.school}
                    placeholder="Tên trường"
                    onChange={(value) => updateStudentField(student.id, "school", value)}
                  />
                  <EditableCell
                    isEditing={canEditRow}
                    value={student.parentPhone}
                    placeholder="SĐT phụ huynh"
                    onChange={(value) => updateStudentField(student.id, "parentPhone", value)}
                  />
                  <EditableStatusCell
                    isEditing={canEditRow}
                    status={student.status}
                    onChange={(status) => updateStudentStatus(student.id, status)}
                  />
                  <EditableCell
                    isEditing={canEditRow}
                    value={student.note ?? ""}
                    className="max-w-56 whitespace-normal text-slate-950"
                    placeholder="Ghi chú"
                    onChange={(value) => updateStudentField(student.id, "note", value)}
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
