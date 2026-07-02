import { Download, UserPlus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getStudentsByClassId } from "@/data/mockData";
import { studentStatusLabel } from "@/lib/format";

type StudentListTabProps = {
  classId: string;
};

export function StudentListTab({ classId }: StudentListTabProps) {
  const students = getStudentsByClassId(classId);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-end gap-2">
        <Button className="gap-2">
          <UserPlus className="size-4" />
          <span className="hidden sm:inline">Thêm học sinh</span>
        </Button>
        <Button variant="outline" className="gap-2">
          <Download className="size-4" />
          <span className="hidden sm:inline">Xuất Excel</span>
        </Button>
      </div>

      <div className="min-w-0 rounded-lg border bg-white">
        <Table className="min-w-[900px]">
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead>STT</TableHead>
              <TableHead>Họ tên</TableHead>
              <TableHead>Lớp ở trường</TableHead>
              <TableHead>Trường</TableHead>
              <TableHead>SĐT phụ huynh</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead>Ghi chú</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {students.map((student, index) => (
              <TableRow key={student.id}>
                <TableCell>{index + 1}</TableCell>
                <TableCell className="font-medium text-slate-950">{student.fullName}</TableCell>
                <TableCell>{student.schoolClass}</TableCell>
                <TableCell>{student.school}</TableCell>
                <TableCell>{student.parentPhone}</TableCell>
                <TableCell>
                  <Badge
                    className={
                      student.status === "active"
                        ? "bg-emerald-100 text-emerald-900 hover:bg-emerald-100"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-100"
                    }
                  >
                    {studentStatusLabel(student.status)}
                  </Badge>
                </TableCell>
                <TableCell className="max-w-52 whitespace-normal text-muted-foreground">
                  {student.note ?? "-"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
