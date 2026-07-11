import type ExcelJS from "exceljs";

import { SCORE_IMPORT_MAP_SHEET } from "@/features/classes/utils/scoreExport";
import { isValidMonthKey } from "@/lib/months";
import type { ImportScoreRowInput, ScoreSheetDto, ScoreSheetRow } from "@/types/score";

export type ScoreImportColumnPlan = {
  label: string;
  action: "keep" | "rename" | "create";
  existingColumnId: number | null;
  previousLabel: string | null;
};

export type ScoreImportErrorItem = {
  excelRowNumber: number | null;
  fullName: string | null;
  message: string;
};

export type ScoreImportPlan = {
  fileName: string;
  className: string;
  month: string;
  hasImportMap: boolean;
  columns: ScoreImportColumnPlan[];
  deletedColumns: Array<{ id: number; label: string }>;
  rows: ImportScoreRowInput[];
  changedValueCount: number;
  clearedValueCount: number;
  errors: ScoreImportErrorItem[];
};

export type ParseScoreImportInput = {
  fileName: string;
  bytes: number[];
  classId: number;
  className: string;
  selectedMonth: string;
  sheet: ScoreSheetDto;
  eligibleRows: ScoreSheetRow[];
};

const SCORE_SHEET_NAME = "Bảng điểm";
const HEADER_SCAN_LIMIT = 50;

type ImportMap = {
  classId: number;
  className: string;
  month: string;
  columns: Array<{ columnId: number; label: string }>;
  studentsByName: Map<string, Array<{ membershipId: number; studentId: number }>>;
};

export async function parseScoreImportFile({
  fileName,
  bytes,
  classId,
  className,
  selectedMonth,
  sheet,
  eligibleRows,
}: ParseScoreImportInput): Promise<ScoreImportPlan> {
  const workbook = await loadWorkbook(bytes);
  const importMap = readImportMap(workbook);

  // Validate lớp/tháng trước, không đoán ngầm (Part D).
  if (importMap) {
    if (importMap.classId !== classId) {
      throw new Error("File Excel không đúng lớp hiện tại.");
    }
    if (importMap.month !== selectedMonth) {
      throw new Error("File Excel không đúng tháng đang chọn.");
    }
  }

  const worksheet = findScoreWorksheet(workbook);
  const header = findScoreTableHeader(worksheet);

  if (!importMap) {
    const metadata = readSheetMetadata(worksheet, header.headerRowNumber);
    if (!metadata.className || !metadata.month) {
      throw new Error("File Excel thiếu thông tin lớp hoặc tháng.");
    }
    if (normalizeMatchText(metadata.className) !== normalizeMatchText(className)) {
      throw new Error("File Excel không đúng lớp hiện tại.");
    }
    if (parseMonthText(metadata.month) !== selectedMonth) {
      throw new Error("File Excel không đúng tháng đang chọn.");
    }
  }

  const errors: ScoreImportErrorItem[] = [];

  const importedLabels = readImportedColumnLabels(worksheet, header, errors);
  const columnDiff = diffColumns(importedLabels, sheet, importMap);
  const parsedRows = readScoreRows(worksheet, header, importedLabels.length, errors);
  const matchedRows = matchStudents(parsedRows, eligibleRows, importMap, errors);

  const { changedValueCount, clearedValueCount } = countValueChanges(
    matchedRows,
    columnDiff.columns,
    sheet,
  );

  return {
    fileName,
    className,
    month: selectedMonth,
    hasImportMap: Boolean(importMap),
    columns: columnDiff.columns,
    deletedColumns: columnDiff.deletedColumns,
    rows: matchedRows,
    changedValueCount,
    clearedValueCount,
    errors,
  };
}

async function loadWorkbook(bytes: number[]) {
  const ExcelJS = await import("exceljs");
  const workbook = new ExcelJS.Workbook();

  try {
    await workbook.xlsx.load(new Uint8Array(bytes).buffer);
  } catch (error) {
    console.warn("[scores] import parse failed", error);
    throw new Error("Không thể đọc file Excel. Vui lòng kiểm tra lại file.");
  }

  return workbook;
}

function readImportMap(workbook: ExcelJS.Workbook): ImportMap | null {
  const mapSheet = workbook.getWorksheet(SCORE_IMPORT_MAP_SHEET);
  if (!mapSheet) {
    return null;
  }

  let meta: { classId: number; className: string; month: string } | null = null;
  const columns: Array<{ columnId: number; label: string }> = [];
  const studentsByName = new Map<string, Array<{ membershipId: number; studentId: number }>>();

  for (let rowNumber = 1; rowNumber <= mapSheet.rowCount; rowNumber += 1) {
    const row = mapSheet.getRow(rowNumber);
    const kind = cellText(row, 1);

    if (kind === "meta") {
      meta = {
        classId: Number(cellText(row, 2)),
        className: cellText(row, 3),
        month: cellText(row, 4),
      };
    } else if (kind === "column") {
      columns.push({ columnId: Number(cellText(row, 2)), label: cellText(row, 3) });
    } else if (kind === "student") {
      const fullName = cellText(row, 4);
      const key = normalizeMatchText(fullName);
      const entries = studentsByName.get(key) ?? [];
      entries.push({
        membershipId: Number(cellText(row, 2)),
        studentId: Number(cellText(row, 3)),
      });
      studentsByName.set(key, entries);
    }
  }

  if (!meta || !Number.isFinite(meta.classId) || !isValidMonthKey(meta.month)) {
    return null;
  }

  return { ...meta, columns, studentsByName };
}

function findScoreWorksheet(workbook: ExcelJS.Workbook) {
  const named = workbook.getWorksheet(SCORE_SHEET_NAME);
  if (named) {
    return named;
  }

  const firstVisible = workbook.worksheets.find(
    (worksheet) => worksheet.name !== SCORE_IMPORT_MAP_SHEET,
  );
  if (!firstVisible) {
    throw new Error("File Excel không có sheet dữ liệu.");
  }

  return firstVisible;
}

function findScoreTableHeader(worksheet: ExcelJS.Worksheet) {
  const scanLimit = Math.min(worksheet.rowCount, HEADER_SCAN_LIMIT);

  for (let rowNumber = 1; rowNumber <= scanLimit; rowNumber += 1) {
    const row = worksheet.getRow(rowNumber);

    for (let columnNumber = 1; columnNumber < row.cellCount; columnNumber += 1) {
      const first = normalizeMatchText(cellText(row, columnNumber));
      const second = normalizeMatchText(cellText(row, columnNumber + 1));

      if (first === "stt" && second === "họ tên") {
        return { headerRowNumber: rowNumber, sttColumn: columnNumber, nameColumn: columnNumber + 1 };
      }
    }
  }

  throw new Error(
    'File Excel không đúng định dạng bảng điểm (không tìm thấy dòng tiêu đề "STT" / "Họ tên").',
  );
}

/// Đọc metadata "Lớp"/"Tháng" phía trên bảng chính khi file không có sheet map ẩn.
function readSheetMetadata(worksheet: ExcelJS.Worksheet, headerRowNumber: number) {
  let className = "";
  let month = "";

  for (let rowNumber = 1; rowNumber < headerRowNumber; rowNumber += 1) {
    const row = worksheet.getRow(rowNumber);
    const label = normalizeMatchText(cellText(row, 1));

    if (label === "lớp" && !className) {
      className = cellText(row, 2);
    } else if (label === "tháng" && !month) {
      month = cellText(row, 2);
    }
  }

  return { className, month };
}

function readImportedColumnLabels(
  worksheet: ExcelJS.Worksheet,
  header: { headerRowNumber: number; nameColumn: number },
  errors: ScoreImportErrorItem[],
) {
  const row = worksheet.getRow(header.headerRowNumber);
  const labels: string[] = [];

  let lastColumn = header.nameColumn;
  for (let columnNumber = header.nameColumn + 1; columnNumber <= row.cellCount; columnNumber += 1) {
    if (cellText(row, columnNumber)) {
      lastColumn = columnNumber;
    }
  }

  for (let columnNumber = header.nameColumn + 1; columnNumber <= lastColumn; columnNumber += 1) {
    const label = cellText(row, columnNumber);
    if (!label) {
      errors.push({
        excelRowNumber: header.headerRowNumber,
        fullName: null,
        message: "Tiêu đề cột điểm bị trống trong dòng tiêu đề.",
      });
      continue;
    }
    labels.push(label);
  }

  const seen = new Map<string, number>();
  labels.forEach((label) => {
    const key = normalizeMatchText(label);
    seen.set(key, (seen.get(key) ?? 0) + 1);
  });
  [...seen.entries()]
    .filter(([, count]) => count > 1)
    .forEach(([key]) => {
      const label = labels.find((item) => normalizeMatchText(item) === key) ?? key;
      errors.push({
        excelRowNumber: header.headerRowNumber,
        fullName: null,
        message: `Tên cột điểm bị trùng trong file: "${label}".`,
      });
    });

  return labels;
}

/// So khớp cột file với cột DB: theo tên trước, phần còn lại ghép theo thứ tự với map ẩn = đổi tên.
function diffColumns(importedLabels: string[], sheet: ScoreSheetDto, importMap: ImportMap | null) {
  const dbColumns = sheet.columns.map((column) => ({ id: column.id, label: column.label }));
  const consumedDbIds = new Set<number>();
  const columns: ScoreImportColumnPlan[] = importedLabels.map((label) => ({
    label,
    action: "create",
    existingColumnId: null,
    previousLabel: null,
  }));

  // Pass 1: khớp theo tên chuẩn hóa.
  columns.forEach((column) => {
    const match = dbColumns.find(
      (dbColumn) =>
        !consumedDbIds.has(dbColumn.id) &&
        normalizeMatchText(dbColumn.label) === normalizeMatchText(column.label),
    );
    if (match) {
      consumedDbIds.add(match.id);
      column.action = "keep";
      column.existingColumnId = match.id;
    }
  });

  // Pass 2: chỉ khi có map ẩn — cột chưa khớp ghép theo thứ tự với cột map chưa dùng = đổi tên.
  if (importMap) {
    const remainingMapColumns = importMap.columns.filter(
      (mapColumn) =>
        !consumedDbIds.has(mapColumn.columnId) &&
        dbColumns.some((dbColumn) => dbColumn.id === mapColumn.columnId),
    );
    let mapIndex = 0;

    columns.forEach((column) => {
      if (column.action !== "create" || mapIndex >= remainingMapColumns.length) {
        return;
      }

      const mapColumn = remainingMapColumns[mapIndex];
      mapIndex += 1;
      consumedDbIds.add(mapColumn.columnId);
      column.action = "rename";
      column.existingColumnId = mapColumn.columnId;
      column.previousLabel =
        dbColumns.find((dbColumn) => dbColumn.id === mapColumn.columnId)?.label ?? mapColumn.label;
    });
  }

  const deletedColumns = dbColumns.filter((dbColumn) => !consumedDbIds.has(dbColumn.id));

  return { columns, deletedColumns };
}

type ParsedScoreRow = {
  excelRowNumber: number;
  fullName: string;
  values: Array<number | null>;
};

function readScoreRows(
  worksheet: ExcelJS.Worksheet,
  header: { headerRowNumber: number; sttColumn: number; nameColumn: number },
  columnCount: number,
  errors: ScoreImportErrorItem[],
): ParsedScoreRow[] {
  const rows: ParsedScoreRow[] = [];

  for (let rowNumber = header.headerRowNumber + 1; rowNumber <= worksheet.rowCount; rowNumber += 1) {
    const row = worksheet.getRow(rowNumber);
    const fullName = cellText(row, header.nameColumn);
    const valueTexts = Array.from({ length: columnCount }, (_, index) =>
      cellText(row, header.nameColumn + 1 + index),
    );

    if (!fullName && valueTexts.every((text) => !text)) {
      continue;
    }

    if (!fullName) {
      errors.push({ excelRowNumber: rowNumber, fullName: null, message: "Thiếu họ tên." });
      continue;
    }

    const values: Array<number | null> = [];
    let rowHasError = false;

    valueTexts.forEach((text, index) => {
      const parsed = parseScoreCell(text);
      if (parsed.ok) {
        values.push(parsed.value);
      } else {
        rowHasError = true;
        errors.push({
          excelRowNumber: rowNumber,
          fullName,
          message: `Điểm không hợp lệ: "${text}" (cột thứ ${index + 1} sau Họ tên). Điểm phải trống, "-" hoặc số từ 0 đến 10.`,
        });
      }
    });

    if (!rowHasError) {
      rows.push({ excelRowNumber: rowNumber, fullName, values });
    }
  }

  return rows;
}

function matchStudents(
  parsedRows: ParsedScoreRow[],
  eligibleRows: ScoreSheetRow[],
  importMap: ImportMap | null,
  errors: ScoreImportErrorItem[],
): ImportScoreRowInput[] {
  const matched: ImportScoreRowInput[] = [];
  const matchedMembershipIds = new Set<number>();

  const nameCounts = new Map<string, number>();
  parsedRows.forEach((row) => {
    const key = normalizeMatchText(row.fullName);
    nameCounts.set(key, (nameCounts.get(key) ?? 0) + 1);
  });

  parsedRows.forEach((row) => {
    const key = normalizeMatchText(row.fullName);

    if ((nameCounts.get(key) ?? 0) > 1) {
      errors.push({
        excelRowNumber: row.excelRowNumber,
        fullName: row.fullName,
        message: "Tên học sinh xuất hiện nhiều lần trong file Excel.",
      });
      return;
    }

    // Ưu tiên map ẩn: ghép theo membershipId; file tự tạo/không có map thì ghép theo tên.
    const mapEntries = importMap?.studentsByName.get(key) ?? [];
    let candidates: ScoreSheetRow[];

    if (mapEntries.length === 1) {
      candidates = eligibleRows.filter(
        (eligible) => eligible.membershipId === mapEntries[0].membershipId,
      );
    } else if (mapEntries.length > 1) {
      errors.push({
        excelRowNumber: row.excelRowNumber,
        fullName: row.fullName,
        message: "Tên học sinh bị trùng, không thể tự động ghép điểm.",
      });
      return;
    } else {
      candidates = eligibleRows.filter(
        (eligible) => normalizeMatchText(eligible.fullName) === key,
      );
    }

    if (candidates.length === 0) {
      errors.push({
        excelRowNumber: row.excelRowNumber,
        fullName: row.fullName,
        message: "Học sinh không tồn tại trong lớp/tháng hiện tại.",
      });
      return;
    }

    if (candidates.length > 1) {
      errors.push({
        excelRowNumber: row.excelRowNumber,
        fullName: row.fullName,
        message: "Tên học sinh bị trùng, không thể tự động ghép điểm.",
      });
      return;
    }

    const student = candidates[0];
    matchedMembershipIds.add(student.membershipId);
    matched.push({
      membershipId: student.membershipId,
      studentId: student.studentId,
      fullName: student.fullName,
      values: row.values,
    });
  });

  // File thiếu học sinh đang có trong tháng: chặn để tránh import từ file đã filter/thiếu dòng.
  eligibleRows.forEach((eligible) => {
    if (!matchedMembershipIds.has(eligible.membershipId)) {
      errors.push({
        excelRowNumber: null,
        fullName: eligible.fullName,
        message: "Thiếu học sinh trong file Excel.",
      });
    }
  });

  return matched;
}

function countValueChanges(
  rows: ImportScoreRowInput[],
  columns: ScoreImportColumnPlan[],
  sheet: ScoreSheetDto,
) {
  const currentValuesByMembership = new Map<number, Record<string, number | null>>(
    sheet.rows.map((row) => [row.membershipId, row.valuesByColumnId]),
  );

  let changedValueCount = 0;
  let clearedValueCount = 0;

  rows.forEach((row) => {
    const currentValues = currentValuesByMembership.get(row.membershipId) ?? {};

    columns.forEach((column, index) => {
      const importedValue = row.values[index] ?? null;
      const currentValue = column.existingColumnId
        ? currentValues[String(column.existingColumnId)] ?? null
        : null;

      if (importedValue === null && currentValue !== null) {
        clearedValueCount += 1;
      } else if (importedValue !== null && importedValue !== currentValue) {
        changedValueCount += 1;
      }
    });
  });

  return { changedValueCount, clearedValueCount };
}

/// Ô điểm: trống hoặc "-" = xóa điểm; số 0-10 (nhận dấu phẩy thập phân).
function parseScoreCell(text: string): { ok: true; value: number | null } | { ok: false } {
  if (!text || text === "-") {
    return { ok: true, value: null };
  }

  const normalized = text.replace(",", ".");
  if (!/^\d+(?:\.\d+)?$/.test(normalized)) {
    return { ok: false };
  }

  const value = Number(normalized);
  if (!Number.isFinite(value) || value < 0 || value > 10) {
    return { ok: false };
  }

  return { ok: true, value };
}

/// Nhận MM/YYYY hoặc YYYY-MM, trả về YYYY-MM; null nếu không hợp lệ.
function parseMonthText(text: string): string | null {
  const slashMatch = text.match(/^(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    const candidate = `${slashMatch[2]}-${slashMatch[1].padStart(2, "0")}`;
    return isValidMonthKey(candidate) ? candidate : null;
  }

  return isValidMonthKey(text) ? text : null;
}

function cellText(row: ExcelJS.Row, columnNumber: number) {
  return String(row.getCell(columnNumber).text ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeMatchText(value: string) {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}
