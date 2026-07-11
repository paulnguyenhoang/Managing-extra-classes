import type ExcelJS from "exceljs";

export async function createWorkbook() {
  const ExcelJS = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Quản lý lớp học thêm";
  workbook.created = new Date();
  workbook.modified = new Date();

  return workbook;
}

export async function workbookToBytes(workbook: ExcelJS.Workbook) {
  const buffer = await workbook.xlsx.writeBuffer();
  return new Uint8Array(buffer);
}
