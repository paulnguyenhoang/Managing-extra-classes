import { Download, Filter } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  currentPaymentMonth,
  getPaymentsForClassMonth,
  getStudentsByClassId,
} from "@/data/mockData";
import { formatCurrency, formatDate, paymentStatusLabel } from "@/lib/format";

type PaymentsTabProps = {
  classId: string;
};

export function PaymentsTab({ classId }: PaymentsTabProps) {
  const students = getStudentsByClassId(classId);
  const payments = getPaymentsForClassMonth(classId);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-end gap-2">
        <Select value={currentPaymentMonth}>
          <SelectTrigger className="h-9 min-w-40 bg-white">
            <SelectValue placeholder="Chọn tháng" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={currentPaymentMonth}>Tháng 07/2026</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" className="gap-2">
          <Filter className="size-4" />
          <span className="hidden sm:inline">Lọc chưa đóng</span>
        </Button>
        <Button variant="outline" className="gap-2">
          <Download className="size-4" />
          <span className="hidden sm:inline">Xuất Excel</span>
        </Button>
      </div>

      <div className="min-w-0 rounded-lg border bg-white">
        <Table className="min-w-[760px]">
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead>STT</TableHead>
              <TableHead>Họ tên</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead>Số tiền</TableHead>
              <TableHead>Ngày đóng</TableHead>
              <TableHead>Ghi chú</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {students.map((student, index) => {
              const payment = payments.find((item) => item.studentId === student.id);
              const status = payment?.status ?? "unpaid";

              return (
                <TableRow key={student.id}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell className="font-medium text-slate-950">{student.fullName}</TableCell>
                  <TableCell>
                    <Badge
                      className={
                        status === "paid"
                          ? "bg-emerald-100 text-emerald-900 hover:bg-emerald-100"
                          : "bg-amber-100 text-amber-900 hover:bg-amber-100"
                      }
                    >
                      {paymentStatusLabel(status)}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatCurrency(payment?.amount ?? 0)}</TableCell>
                  <TableCell>{formatDate(payment?.paidAt)}</TableCell>
                  <TableCell className="max-w-52 whitespace-normal text-muted-foreground">
                    {payment?.note ?? "-"}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
