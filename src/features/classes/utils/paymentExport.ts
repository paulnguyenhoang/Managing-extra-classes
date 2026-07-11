import type ExcelJS from "exceljs";

import { createWorkbook, workbookToBytes } from "@/lib/excel/exportWorkbook";
import { buildPaymentFileName } from "@/lib/excel/filename";
import {
  addMetadataRows,
  addStyledHeaderRow,
  addTitleRow,
  applyColumnWidths,
  styleDataRows,
} from "@/lib/excel/worksheetStyle";
import { formatCurrency, paymentStatusLabel } from "@/lib/format";
import { saveExcelFile, type ExcelSaveResult } from "@/services/excelExportApi";
import type { PaymentRow } from "@/types/payment";

export type ExportPaymentsInput = {
  rows: PaymentRow[];
  className: string;
  selectedMonth: string;
  monthlyFee: number;
  filterLabel: string;
  searchQuery: string;
};

export async function exportPaymentsToExcel({
  rows,
  className,
  selectedMonth,
  monthlyFee,
  filterLabel,
  searchQuery,
}: ExportPaymentsInput): Promise<ExcelSaveResult | null> {
  const workbook = await createWorkbook();
  const worksheet = workbook.addWorksheet("Học phí");
  const exportedAt = new Date();
  const columnCount = 7;
  const summary = getVisiblePaymentSummary(rows);

  addTitleRow(worksheet, "Bảng học phí", columnCount);
  worksheet.addRow([]);
  addMetadataRows(
    worksheet,
    [
      ["Lớp", className],
      ["Tháng", formatExportMonth(selectedMonth)],
      ["Học phí tháng", formatCurrency(monthlyFee)],
      ["Ngày xuất", formatExportDateTime(exportedAt)],
      ["Bộ lọc", filterLabel],
      searchQuery.trim() ? ["Tìm kiếm", searchQuery.trim()] : null,
    ].filter(Boolean) as Array<[string, string]>,
  );
  worksheet.addRow([]);
  addMetadataRows(worksheet, [
    ["Tổng hợp", "Theo danh sách đang hiển thị"],
    ["Đã đóng", String(summary.paid)],
    ["Chưa đóng", String(summary.unpaid)],
    ["Miễn giảm", String(summary.waived)],
    ["Tổng đã thu", formatCurrency(summary.collected)],
  ]);
  worksheet.addRow([]);

  const headerRowNumber = addStyledHeaderRow(worksheet, [
    "STT",
    "Họ tên",
    "Trạng thái",
    "Học phí tháng",
    "Số tiền đã thu",
    "Ngày đóng",
    "Ghi chú",
  ]);

  rows.forEach((row, index) => {
    const dataRow = worksheet.addRow([
      index + 1,
      row.fullName,
      paymentStatusLabel(row.status),
      monthlyFee,
      row.status === "unpaid" ? 0 : row.amount,
      row.paidAt ? formatExportDate(row.paidAt) : "",
      row.note ?? "",
    ]);
    dataRow.getCell(4).numFmt = '#,##0 "đ"';
    dataRow.getCell(5).numFmt = '#,##0 "đ"';
  });

  styleDataRows(worksheet, headerRowNumber + 1, worksheet.rowCount, columnCount);
  applyColumnWidths(worksheet, [8, 28, 16, 18, 18, 16, 36]);
  freezeHeader(worksheet, headerRowNumber);

  const bytes = await workbookToBytes(workbook);
  return saveExcelFile(buildPaymentFileName(className, selectedMonth, exportedAt), bytes);
}

function getVisiblePaymentSummary(rows: PaymentRow[]) {
  return {
    paid: rows.filter((row) => row.status === "paid").length,
    unpaid: rows.filter((row) => row.status === "unpaid").length,
    waived: rows.filter((row) => row.status === "waived").length,
    collected: rows
      .filter((row) => row.status === "paid" || row.status === "waived")
      .reduce((total, row) => total + row.amount, 0),
  };
}

function formatExportMonth(month: string) {
  const [year, monthNumber] = month.split("-");
  return `${monthNumber}/${year}`;
}

function formatExportDate(date: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(date));
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
