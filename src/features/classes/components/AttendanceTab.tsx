import { CheckCheck, ClipboardPlus, Download } from "lucide-react";

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
import {
  getAttendanceRowsByClassId,
  getAttendanceSessionsByClassId,
} from "@/data/mockData";
import { attendanceStatusLabel, formatShortDate } from "@/lib/format";
import type { AttendanceStatus } from "@/types/attendance";

type AttendanceTabProps = {
  classId: string;
};

const attendanceClasses: Record<AttendanceStatus, string> = {
  present: "bg-emerald-100 text-emerald-900 hover:bg-emerald-100",
  absent: "bg-red-100 text-red-900 hover:bg-red-100",
  excused: "bg-blue-100 text-blue-900 hover:bg-blue-100",
  late: "bg-amber-100 text-amber-900 hover:bg-amber-100",
};

export function AttendanceTab({ classId }: AttendanceTabProps) {
  const sessions = getAttendanceSessionsByClassId(classId);
  const rows = getAttendanceRowsByClassId(classId);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-end gap-2">
        <Button className="gap-2">
          <ClipboardPlus className="size-4" />
          <span className="hidden sm:inline">Tạo buổi học</span>
        </Button>
        <Button variant="outline" className="gap-2">
          <CheckCheck className="size-4" />
          <span className="hidden md:inline">Đánh dấu tất cả có mặt</span>
        </Button>
        <Button variant="outline" className="gap-2">
          <Download className="size-4" />
          <span className="hidden sm:inline">Xuất Excel</span>
        </Button>
      </div>

      <div className="min-w-0 rounded-lg border bg-white">
        <Table className="min-w-[820px]">
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead>STT</TableHead>
              <TableHead>Họ tên</TableHead>
              {sessions.map((session) => (
                <TableHead key={session.id}>{formatShortDate(session.date)}</TableHead>
              ))}
              <TableHead>Ghi chú</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, index) => (
              <TableRow key={row.student.id}>
                <TableCell>{index + 1}</TableCell>
                <TableCell className="font-medium text-slate-950">{row.student.fullName}</TableCell>
                {sessions.map((session) => {
                  const status = row.statusesBySessionId[session.id];

                  return (
                    <TableCell key={session.id}>
                      {status ? (
                        <Badge className={attendanceClasses[status]}>
                          {attendanceStatusLabel(status)}
                        </Badge>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                  );
                })}
                <TableCell className="max-w-52 whitespace-normal text-muted-foreground">
                  {row.note ?? "-"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
