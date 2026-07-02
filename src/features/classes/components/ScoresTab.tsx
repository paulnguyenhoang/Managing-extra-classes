import { useState } from "react";
import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getScoreColumnsByClassId, getScoreRowsByClassId } from "@/data/mockData";
import { AddScoreColumnDialog } from "@/features/classes/components/AddScoreColumnDialog";
import type { ScoreColumn } from "@/types/score";

type ScoresTabProps = {
  classId: string;
};

export function ScoresTab({ classId }: ScoresTabProps) {
  const [extraColumns, setExtraColumns] = useState<ScoreColumn[]>([]);
  const columns = [...getScoreColumnsByClassId(classId), ...extraColumns];
  const rows = getScoreRowsByClassId(classId);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-end gap-2">
        <AddScoreColumnDialog
          classId={classId}
          onAdd={(column) => setExtraColumns((current) => [...current, column])}
        />
        <Button variant="outline" className="gap-2">
          <Download className="size-4" />
          <span className="hidden sm:inline">Xuất bảng điểm</span>
        </Button>
      </div>

      <div className="min-w-0 rounded-lg border bg-white">
        <Table className="min-w-[760px]">
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead>STT</TableHead>
              <TableHead>Họ tên</TableHead>
              {columns.map((column) => (
                <TableHead key={column.id}>{column.label}</TableHead>
              ))}
              <TableHead>Ghi chú</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, index) => (
              <TableRow key={row.student.id}>
                <TableCell>{index + 1}</TableCell>
                <TableCell className="font-medium text-slate-950">{row.student.fullName}</TableCell>
                {columns.map((column) => (
                  <TableCell key={column.id}>
                    {row.valuesByColumnId[column.id] ?? "-"}
                  </TableCell>
                ))}
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
