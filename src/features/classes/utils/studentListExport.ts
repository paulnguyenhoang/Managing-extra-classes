import type ExcelJS from "exceljs";

import { createWorkbook, workbookToBytes } from "@/lib/excel/exportWorkbook";
import { buildStudentListFileName } from "@/lib/excel/filename";
import {
  addMetadataRows,
  addStyledHeaderRow,
  addTitleRow,
  applyColumnWidths,
  styleDataRows,
} from "@/lib/excel/worksheetStyle";
import { formatPhoneNumber } from "@/lib/format";
import { formatMonthLabel } from "@/lib/months";
import { saveExcelFile, type ExcelSaveResult } from "@/services/excelExportApi";
import type { StudentListItem, StudentStatus } from "@/types/student";

const studentStatusLabels: Record<StudentStatus, string> = {
  active: "Đang học",
  paused: "Đã nghỉ",
};

export type ExportStudentListInput = {
  rows: StudentListItem[];
  className: string;
  academicYearLabel?: string;
  classStartMonth: string;
  classEndMonth: string;
};

export async function exportStudentListToExcel({
  rows,
  className,
  academicYearLabel,
  classStartMonth,
  classEndMonth,
}: ExportStudentListInput): Promise<ExcelSaveResult | null> {
  const workbook = await createWorkbook();
  const worksheet = workbook.addWorksheet("Danh sách học sinh");
  const exportedAt = new Date();
  const columnCount = 9;

  addTitleRow(worksheet, "Danh sách học sinh", columnCount);
  worksheet.addRow([]);
  addMetadataRows(worksheet, [
    ["Lớp", className],
    ["Năm học", academicYearLabel || ""],
    [
      "Thời gian học",
      `${formatMonthLabel(classStartMonth)} - ${formatMonthLabel(classEndMonth)}`,
    ],
    ["Ngày xuất", formatExportDateTime(exportedAt)],
  ]);
  worksheet.addRow([]);

  const headerRowNumber = addStyledHeaderRow(worksheet, [
    "STT",
    "Họ tên",
    "Lớp ở trường",
    "Trường",
    "SĐT phụ huynh",
    "Bắt đầu học",
    "Trạng thái",
    "Tháng nghỉ",
    "Ghi chú",
  ]);

  rows.forEach((student, index) => {
    const row = worksheet.addRow([
      index + 1,
      student.fullName,
      student.schoolClass,
      student.school,
      formatPhoneNumber(student.parentPhone),
      student.joinedMonth ? formatMonthLabel(student.joinedMonth) : "",
      studentStatusLabels[student.status],
      student.leftMonth ? formatMonthLabel(student.leftMonth) : "",
      student.note ?? "",
    ]);
    const phoneCell = row.getCell(5);
    phoneCell.numFmt = "@";
    phoneCell.value = String(phoneCell.value ?? "");
  });

  styleDataRows(worksheet, headerRowNumber + 1, worksheet.rowCount, columnCount);
  applyColumnWidths(worksheet, [8, 28, 16, 28, 18, 16, 16, 16, 34]);
  freezeHeader(worksheet, headerRowNumber);

  const bytes = await workbookToBytes(workbook);
  return saveExcelFile(buildStudentListFileName(className, exportedAt), bytes);
}

function formatExportDateTime(date: Date) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function freezeHeader(worksheet: ExcelJS.Worksheet, headerRowNumber: number) {
  worksheet.views = [{ state: "frozen", ySplit: headerRowNumber }];
}
