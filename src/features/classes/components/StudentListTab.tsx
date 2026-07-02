import { useEffect, useState } from "react";
import { Check, Download, Pencil, Search, Trash2, X } from "lucide-react";

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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getStudentsByClassId } from "@/data/mockData";
import { AddStudentDialog } from "@/features/classes/components/AddStudentDialog";
import type { Student } from "@/types/student";

type StudentListTabProps = {
  classId: string;
};

type EditableStudentField = "fullName" | "schoolClass" | "school" | "parentPhone" | "note";

export function StudentListTab({ classId }: StudentListTabProps) {
  const [students, setStudents] = useState<Student[]>(() => getStudentsByClassId(classId));
  const [searchQuery, setSearchQuery] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isSelectingToDelete, setIsSelectingToDelete] = useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredStudents = normalizedQuery
    ? students.filter((student) =>
        [student.fullName, student.schoolClass, student.school, student.parentPhone, student.note]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery),
      )
    : students;
  const selectedCount = selectedStudentIds.length;

  useEffect(() => {
    setStudents(getStudentsByClassId(classId));
    setIsEditing(false);
    setIsSelectingToDelete(false);
    setSelectedStudentIds([]);
    setConfirmDeleteOpen(false);
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

  function toggleDeleteMode() {
    if (!isSelectingToDelete) {
      setIsEditing(false);
      setIsSelectingToDelete(true);
      setSelectedStudentIds([]);
      return;
    }

    if (selectedCount > 0) {
      setConfirmDeleteOpen(true);
    }
  }

  function cancelDeleteMode() {
    setIsSelectingToDelete(false);
    setSelectedStudentIds([]);
  }

  function toggleSelectedStudent(studentId: string) {
    setSelectedStudentIds((current) =>
      current.includes(studentId)
        ? current.filter((id) => id !== studentId)
        : [...current, studentId],
    );
  }

  function confirmDeleteStudents() {
    setStudents((current) =>
      current.filter((student) => !selectedStudentIds.includes(student.id)),
    );
    setSelectedStudentIds([]);
    setIsSelectingToDelete(false);
    setConfirmDeleteOpen(false);
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
            onClick={() => {
              setIsSelectingToDelete(false);
              setSelectedStudentIds([]);
              setIsEditing((current) => !current);
            }}
          >
            {isEditing ? <Check className="size-4" /> : <Pencil className="size-4" />}
            <span className="hidden sm:inline">{isEditing ? "Lưu cập nhật" : "Cập nhật"}</span>
          </Button>
          <Button
            type="button"
            variant={isSelectingToDelete ? "destructive" : "outline"}
            className="gap-2"
            disabled={isSelectingToDelete && selectedCount === 0}
            onClick={toggleDeleteMode}
          >
            <Trash2 className="size-4" />
            <span className="hidden sm:inline">
              {isSelectingToDelete ? `Xác nhận xóa (${selectedCount})` : "Xóa học sinh"}
            </span>
          </Button>
          {isSelectingToDelete && (
            <Button type="button" variant="ghost" className="gap-2" onClick={cancelDeleteMode}>
              <X className="size-4" />
              <span className="hidden sm:inline">Hủy</span>
            </Button>
          )}
          <AddStudentDialog
            classId={classId}
            onAdd={(student) => setStudents((current) => [...current, student])}
          />
          <Button variant="outline" className="gap-2">
            <Download className="size-4" />
            <span className="hidden sm:inline">Xuất Excel</span>
          </Button>
        </div>
      </div>

      <div className="min-w-0 rounded-lg border bg-white">
        <Table className="min-w-[920px]">
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead className="w-16">{isSelectingToDelete ? "Chọn" : "STT"}</TableHead>
              <TableHead>Họ tên</TableHead>
              <TableHead>Lớp ở trường</TableHead>
              <TableHead>Trường</TableHead>
              <TableHead>SĐT phụ huynh</TableHead>
              <TableHead>Ghi chú</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredStudents.map((student, index) => (
              <TableRow key={student.id}>
                <TableCell>
                  {isSelectingToDelete ? (
                    <input
                      type="checkbox"
                      checked={selectedStudentIds.includes(student.id)}
                      onChange={() => toggleSelectedStudent(student.id)}
                      className="size-4 rounded border-slate-300 accent-slate-950"
                      aria-label={`Chọn ${student.fullName}`}
                    />
                  ) : (
                    index + 1
                  )}
                </TableCell>
                <EditableCell
                  isEditing={isEditing}
                  value={student.fullName}
                  className="font-medium text-slate-950"
                  onChange={(value) => updateStudentField(student.id, "fullName", value)}
                />
                <EditableCell
                  isEditing={isEditing}
                  value={student.schoolClass}
                  onChange={(value) => updateStudentField(student.id, "schoolClass", value)}
                />
                <EditableCell
                  isEditing={isEditing}
                  value={student.school}
                  onChange={(value) => updateStudentField(student.id, "school", value)}
                />
                <EditableCell
                  isEditing={isEditing}
                  value={student.parentPhone}
                  onChange={(value) => updateStudentField(student.id, "parentPhone", value)}
                />
                <EditableCell
                  isEditing={isEditing}
                  value={student.note ?? ""}
                  className="max-w-56 whitespace-normal text-slate-950"
                  onChange={(value) => updateStudentField(student.id, "note", value)}
                />
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Xác nhận xóa học sinh</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Thầy có chắc muốn xóa {selectedCount} học sinh đã chọn khỏi danh sách lớp này không?
          </p>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Hủy
              </Button>
            </DialogClose>
            <Button type="button" variant="destructive" onClick={confirmDeleteStudents}>
              Xác nhận xóa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EditableCell({
  isEditing,
  value,
  className,
  onChange,
}: {
  isEditing: boolean;
  value: string;
  className?: string;
  onChange: (value: string) => void;
}) {
  return (
    <TableCell className={className}>
      {isEditing ? (
        <Input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-8 min-w-36 bg-white"
        />
      ) : (
        value || "-"
      )}
    </TableCell>
  );
}
