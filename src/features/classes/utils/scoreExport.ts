import type ExcelJS from "exceljs";

import { createWorkbook, workbookToBytes } from "@/lib/excel/exportWorkbook";
import { buildScoreSheetFileName } from "@/lib/excel/filename";
import {
  addMetadataRows,
  addStyledHeaderRow,
  addTitleRow,
  applyColumnWidths,
  styleDataRows,
} from "@/lib/excel/worksheetStyle";
import { saveExcelFile, type ExcelSaveResult } from "@/services/excelExportApi";
import type { ScoreColumnDto, ScoreSheetRow } from "@/types/score";

export type ExportScoresInput = {
  classId: number;
  rows: ScoreSheetRow[];
  columns: ScoreColumnDto[];
  className: string;
  selectedMonth: string;
  sortLabel: string;
};

/// Tên sheet ẩn chứa map id để import an toàn; không hiện ID trong sheet nhìn thấy.
export const SCORE_IMPORT_MAP_SHEET = "_score_import_map";

export async function exportScoresToExcel({
  classId,
  rows,
  columns,
  className,
  selectedMonth,
  sortLabel,
}: ExportScoresInput): Promise<ExcelSaveResult | null> {
  const workbook = await createWorkbook();
  const worksheet = workbook.addWorksheet("Bảng điểm");
  const exportedAt = new Date();
  const columnCount = Math.max(2 + columns.length, 5);

  addTitleRow(worksheet, "Bảng điểm", columnCount);
  worksheet.addRow([]);
  addMetadataRows(worksheet, [
    ["Lớp", className],
    ["Tháng", formatExportMonth(selectedMonth)],
    ["Ngày xuất", formatExportDateTime(exportedAt)],
    ["Số học sinh", String(rows.length)],
    ["Số bài kiểm tra", String(columns.length)],
    ["Sắp xếp", sortLabel],
  ]);
  worksheet.addRow([]);

  if (columns.length > 0) {
    addColumnStatistics(worksheet, rows, columns);
    worksheet.addRow([]);
  } else {
    addMetadataRows(worksheet, [["Ghi chú", "Tháng này chưa có bài kiểm tra nào."]]);
    worksheet.addRow([]);
  }

  const headerRowNumber = addStyledHeaderRow(worksheet, [
    "STT",
    "Họ tên",
    ...columns.map((column) => column.label),
  ]);

  rows.forEach((row, index) => {
    worksheet.addRow([
      index + 1,
      row.fullName,
      ...columns.map((column) => row.valuesByColumnId[String(column.id)] ?? "-"),
    ]);
  });

  styleDataRows(worksheet, headerRowNumber + 1, worksheet.rowCount, 2 + columns.length);
  centerCells(worksheet, headerRowNumber + 1, worksheet.rowCount, [
    1,
    ...columns.map((_, index) => 3 + index),
  ]);
  applyColumnWidths(worksheet, [8, 28, ...columns.map(() => 14)]);
  freezeHeader(worksheet, headerRowNumber);

  addImportMapSheet(workbook, { classId, className, selectedMonth, rows, columns });

  const bytes = await workbookToBytes(workbook);
  return saveExcelFile(buildScoreSheetFileName(className, selectedMonth, exportedAt), bytes);
}

/// Sheet ẩn (veryHidden) cho phép import ghép đúng học sinh/cột theo id thay vì chỉ theo tên.
function addImportMapSheet(
  workbook: ExcelJS.Workbook,
  {
    classId,
    className,
    selectedMonth,
    rows,
    columns,
  }: {
    classId: number;
    className: string;
    selectedMonth: string;
    rows: ScoreSheetRow[];
    columns: ScoreColumnDto[];
  },
) {
  const mapSheet = workbook.addWorksheet(SCORE_IMPORT_MAP_SHEET);
  mapSheet.state = "veryHidden";

  mapSheet.addRow(["meta", classId, className, selectedMonth]);
  columns.forEach((column) => {
    mapSheet.addRow(["column", column.id, column.label]);
  });
  rows.forEach((row) => {
    mapSheet.addRow(["student", row.membershipId, row.studentId, row.fullName]);
  });
}

function addColumnStatistics(
  worksheet: ExcelJS.Worksheet,
  rows: ScoreSheetRow[],
  columns: ScoreColumnDto[],
) {
  const headerRowNumber = addStyledHeaderRow(worksheet, [
    "Bài kiểm tra",
    "Số điểm đã nhập",
    "Điểm trung bình",
    "Cao nhất",
    "Thấp nhất",
  ]);

  columns.forEach((column) => {
    const scores = rows
      .map((row) => row.valuesByColumnId[String(column.id)])
      .filter((value): value is number => value !== null && value !== undefined);
    const hasScores = scores.length > 0;
    const average = hasScores
      ? Math.round((scores.reduce((total, score) => total + score, 0) / scores.length) * 100) /
        100
      : null;

    worksheet.addRow([
      column.label,
      scores.length,
      average ?? "-",
      hasScores ? Math.max(...scores) : "-",
      hasScores ? Math.min(...scores) : "-",
    ]);
  });

  styleDataRows(worksheet, headerRowNumber + 1, worksheet.rowCount, 5);
  centerCells(worksheet, headerRowNumber + 1, worksheet.rowCount, [2, 3, 4, 5]);
}

function centerCells(
  worksheet: ExcelJS.Worksheet,
  startRow: number,
  endRow: number,
  columnNumbers: number[],
) {
  for (let rowNumber = startRow; rowNumber <= endRow; rowNumber += 1) {
    const row = worksheet.getRow(rowNumber);

    columnNumbers.forEach((columnNumber) => {
      row.getCell(columnNumber).alignment = { vertical: "middle", horizontal: "center" };
    });
  }
}

function formatExportMonth(month: string) {
  const [year, monthNumber] = month.split("-");
  return `${monthNumber}/${year}`;
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
