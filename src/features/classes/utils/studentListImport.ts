import type ExcelJS from "exceljs";

import { normalizePhoneNumber } from "@/lib/format";
import { clampMonthToRange, currentMonthKey, formatMonthLabel, isValidMonthKey } from "@/lib/months";
import type { StudentImportRowInput, StudentListItem, StudentStatus } from "@/types/student";

export type StudentImportAction = "create" | "update" | "skip" | "error";

export type StudentImportRowPlan = {
  excelRowNumber: number;
  fullName: string;
  action: StudentImportAction;
  messages: string[];
  input: StudentImportRowInput | null;
};

export type StudentImportPlan = {
  fileName: string;
  rows: StudentImportRowPlan[];
  createCount: number;
  updateCount: number;
  skipCount: number;
  errorCount: number;
  warningCount: number;
};

export type ParseStudentImportInput = {
  fileName: string;
  bytes: number[];
  roster: StudentListItem[];
  classStartMonth: string;
  classEndMonth: string;
};

const WORKSHEET_NAME = "Danh sách học sinh";
const HEADER_SCAN_LIMIT = 30;

type HeaderKey =
  | "fullName"
  | "schoolClass"
  | "school"
  | "parentPhone"
  | "joinedMonth"
  | "status"
  | "leftMonth"
  | "note";

const HEADER_LABELS: Record<HeaderKey, string> = {
  fullName: "họ tên",
  schoolClass: "lớp ở trường",
  school: "trường",
  parentPhone: "sđt phụ huynh",
  joinedMonth: "bắt đầu học",
  status: "trạng thái",
  leftMonth: "tháng nghỉ",
  note: "ghi chú",
};

// Dòng thô đọc từ Excel trước khi validate.
type RawImportRow = {
  excelRowNumber: number;
  fullName: string;
  schoolClass: string;
  school: string;
  parentPhone: string;
  joinedMonthText: string;
  statusText: string;
  leftMonthText: string;
  note: string;
};

export async function parseStudentImportFile({
  fileName,
  bytes,
  roster,
  classStartMonth,
  classEndMonth,
}: ParseStudentImportInput): Promise<StudentImportPlan> {
  const worksheet = await loadWorksheet(bytes);
  const { headerRowNumber, columnByKey } = findHeaderRow(worksheet);
  const rawRows = readRawRows(worksheet, headerRowNumber, columnByKey);

  const duplicateKeyCounts = new Map<string, number>();
  rawRows.forEach((raw) => {
    const key = duplicateKey(raw);
    duplicateKeyCounts.set(key, (duplicateKeyCounts.get(key) ?? 0) + 1);
  });

  const rows = rawRows.map((raw) =>
    planImportRow(raw, {
      roster,
      classStartMonth,
      classEndMonth,
      isDuplicateInFile: (duplicateKeyCounts.get(duplicateKey(raw)) ?? 0) > 1,
    }),
  );

  return {
    fileName,
    rows,
    createCount: rows.filter((row) => row.action === "create").length,
    updateCount: rows.filter((row) => row.action === "update").length,
    skipCount: rows.filter((row) => row.action === "skip").length,
    errorCount: rows.filter((row) => row.action === "error").length,
    warningCount: rows.filter((row) => row.action !== "error" && row.messages.length > 0).length,
  };
}

async function loadWorksheet(bytes: number[]) {
  const ExcelJS = await import("exceljs");
  const workbook = new ExcelJS.Workbook();

  try {
    await workbook.xlsx.load(new Uint8Array(bytes).buffer);
  } catch (error) {
    console.warn("[students] import parse failed", error);
    throw new Error("Không thể đọc file Excel. Vui lòng kiểm tra lại file.");
  }

  const worksheet = workbook.getWorksheet(WORKSHEET_NAME) ?? workbook.worksheets[0];
  if (!worksheet) {
    throw new Error("File Excel không có sheet dữ liệu.");
  }

  return worksheet;
}

function findHeaderRow(worksheet: ExcelJS.Worksheet) {
  const scanLimit = Math.min(worksheet.rowCount, HEADER_SCAN_LIMIT);

  for (let rowNumber = 1; rowNumber <= scanLimit; rowNumber += 1) {
    const row = worksheet.getRow(rowNumber);
    const columnByLabel = new Map<string, number>();

    for (let columnNumber = 1; columnNumber <= row.cellCount; columnNumber += 1) {
      const label = normalizeText(cellText(row, columnNumber)).toLowerCase();
      if (label && !columnByLabel.has(label)) {
        columnByLabel.set(label, columnNumber);
      }
    }

    if (!columnByLabel.has(HEADER_LABELS.fullName)) {
      continue;
    }

    const columnByKey = new Map<HeaderKey, number>();
    (Object.keys(HEADER_LABELS) as HeaderKey[]).forEach((key) => {
      const column = columnByLabel.get(HEADER_LABELS[key]);
      if (column !== undefined) {
        columnByKey.set(key, column);
      }
    });

    return { headerRowNumber: rowNumber, columnByKey };
  }

  throw new Error(
    'File Excel không đúng định dạng danh sách học sinh (không tìm thấy dòng tiêu đề có cột "Họ tên").',
  );
}

function readRawRows(
  worksheet: ExcelJS.Worksheet,
  headerRowNumber: number,
  columnByKey: Map<HeaderKey, number>,
): RawImportRow[] {
  const rawRows: RawImportRow[] = [];

  for (let rowNumber = headerRowNumber + 1; rowNumber <= worksheet.rowCount; rowNumber += 1) {
    const row = worksheet.getRow(rowNumber);
    const readField = (key: HeaderKey) => {
      const column = columnByKey.get(key);
      return column === undefined ? "" : normalizeText(cellText(row, column));
    };

    const raw: RawImportRow = {
      excelRowNumber: rowNumber,
      fullName: readField("fullName"),
      schoolClass: readField("schoolClass"),
      school: readField("school"),
      parentPhone: readField("parentPhone"),
      joinedMonthText: readField("joinedMonth"),
      statusText: readField("status"),
      leftMonthText: readField("leftMonth"),
      note: readField("note"),
    };

    const isEmpty =
      !raw.fullName &&
      !raw.schoolClass &&
      !raw.school &&
      !raw.parentPhone &&
      !raw.joinedMonthText &&
      !raw.statusText &&
      !raw.leftMonthText &&
      !raw.note;

    if (!isEmpty) {
      rawRows.push(raw);
    }
  }

  return rawRows;
}

function planImportRow(
  raw: RawImportRow,
  context: {
    roster: StudentListItem[];
    classStartMonth: string;
    classEndMonth: string;
    isDuplicateInFile: boolean;
  },
): StudentImportRowPlan {
  const messages: string[] = [];
  const fail = (message: string): StudentImportRowPlan => ({
    excelRowNumber: raw.excelRowNumber,
    fullName: raw.fullName || "(trống)",
    action: "error",
    messages: [message, ...messages],
    input: null,
  });

  if (!raw.fullName) {
    return fail("Thiếu họ tên.");
  }

  if (context.isDuplicateInFile) {
    return fail("Trùng lặp với dòng khác trong file Excel.");
  }

  const status = parseStatus(raw.statusText);
  if (!status) {
    return fail(`Trạng thái không hợp lệ: "${raw.statusText}". Chỉ nhận Đang học hoặc Đã nghỉ.`);
  }

  let joinedMonth: string;
  if (raw.joinedMonthText) {
    const parsed = parseMonthText(raw.joinedMonthText);
    if (!parsed) {
      return fail("Tháng bắt đầu học không hợp lệ (dùng MM/YYYY hoặc YYYY-MM).");
    }
    joinedMonth = parsed;
  } else {
    joinedMonth = clampMonthToRange(
      currentMonthKey(),
      context.classStartMonth,
      context.classEndMonth,
    );
    messages.push(`Thiếu tháng bắt đầu học, dùng mặc định ${formatMonthLabel(joinedMonth)}.`);
  }

  if (joinedMonth < context.classStartMonth || joinedMonth > context.classEndMonth) {
    return fail(
      `Tháng bắt đầu học phải trong thời gian học của lớp (${formatMonthLabel(
        context.classStartMonth,
      )} - ${formatMonthLabel(context.classEndMonth)}).`,
    );
  }

  let leftMonth: string | null = null;
  if (status === "paused") {
    if (!raw.leftMonthText) {
      return fail("Học sinh đã nghỉ cần có tháng nghỉ.");
    }

    leftMonth = parseMonthText(raw.leftMonthText);
    if (!leftMonth) {
      return fail("Tháng nghỉ không hợp lệ (dùng MM/YYYY hoặc YYYY-MM).");
    }

    if (leftMonth < joinedMonth) {
      return fail("Tháng nghỉ không được trước tháng bắt đầu học.");
    }

    if (leftMonth > context.classEndMonth) {
      return fail("Tháng nghỉ vượt quá thời gian học của lớp.");
    }
  } else if (raw.leftMonthText) {
    messages.push("Bỏ qua tháng nghỉ vì trạng thái là Đang học.");
  }

  const phoneDigits = raw.parentPhone.replace(/\D/g, "");
  const parentPhone = normalizePhoneNumber(raw.parentPhone);
  if (phoneDigits && phoneDigits.length !== 10) {
    messages.push("Số điện thoại có thể chưa đúng định dạng (thường gồm 10 số).");
  }

  const matches = findRosterMatches(raw, context.roster);
  if (matches.length > 1) {
    return {
      excelRowNumber: raw.excelRowNumber,
      fullName: raw.fullName,
      action: "skip",
      messages: ["Nhiều học sinh trong lớp trùng thông tin, không xác định được học sinh cần cập nhật.", ...messages],
      input: null,
    };
  }

  const matched = matches[0] ?? null;
  const note = raw.note || null;

  if (!matched) {
    const sameNameExists = context.roster.some(
      (student) => normalizeMatchText(student.fullName) === normalizeMatchText(raw.fullName),
    );
    if (sameNameExists) {
      messages.push("Trong lớp đã có học sinh trùng tên nhưng khác thông tin; sẽ tạo học sinh mới.");
    }

    return {
      excelRowNumber: raw.excelRowNumber,
      fullName: raw.fullName,
      action: "create",
      messages,
      input: {
        fullName: raw.fullName,
        schoolClass: raw.schoolClass,
        school: raw.school,
        parentPhone,
        joinedMonth,
        status,
        leftMonth,
        note,
        matchedMembershipId: null,
        matchedStudentId: null,
        action: "create",
      },
    };
  }

  // Update an toàn: ô Excel để trống thì giữ nguyên giá trị đang có, không xóa dữ liệu.
  const nextSchoolClass = raw.schoolClass || matched.schoolClass;
  const nextSchool = raw.school || matched.school;
  const nextPhone = parentPhone || normalizePhoneNumber(matched.parentPhone);
  const nextNote = note ?? (matched.note?.trim() ? matched.note.trim() : null);

  if (matched.status === "paused" && status === "active") {
    messages.push("Học sinh đang nghỉ sẽ được kích hoạt lại.");
  }

  const isUnchanged =
    matched.fullName.trim() === raw.fullName &&
    matched.schoolClass.trim() === nextSchoolClass &&
    matched.school.trim() === nextSchool &&
    normalizePhoneNumber(matched.parentPhone) === nextPhone &&
    matched.joinedMonth === joinedMonth &&
    matched.status === status &&
    (matched.leftMonth ?? null) === leftMonth &&
    (matched.note?.trim() ? matched.note.trim() : null) === nextNote;

  if (isUnchanged) {
    return {
      excelRowNumber: raw.excelRowNumber,
      fullName: raw.fullName,
      action: "skip",
      messages: ["Không có thay đổi.", ...messages],
      input: null,
    };
  }

  return {
    excelRowNumber: raw.excelRowNumber,
    fullName: raw.fullName,
    action: "update",
    messages,
    input: {
      fullName: raw.fullName,
      schoolClass: nextSchoolClass,
      school: nextSchool,
      parentPhone: nextPhone,
      joinedMonth,
      status,
      leftMonth,
      note: nextNote,
      matchedMembershipId: Number(matched.membershipId),
      matchedStudentId: Number(matched.studentId),
      action: "update",
    },
  };
}

function findRosterMatches(raw: RawImportRow, roster: StudentListItem[]) {
  const name = normalizeMatchText(raw.fullName);
  const phoneDigits = raw.parentPhone.replace(/\D/g, "");

  if (phoneDigits) {
    return roster.filter(
      (student) =>
        normalizeMatchText(student.fullName) === name &&
        student.parentPhone.replace(/\D/g, "") === phoneDigits,
    );
  }

  return roster.filter(
    (student) =>
      normalizeMatchText(student.fullName) === name &&
      normalizeMatchText(student.schoolClass) === normalizeMatchText(raw.schoolClass) &&
      normalizeMatchText(student.school) === normalizeMatchText(raw.school),
  );
}

function duplicateKey(raw: RawImportRow) {
  const name = normalizeMatchText(raw.fullName);
  const phoneDigits = raw.parentPhone.replace(/\D/g, "");

  return phoneDigits
    ? `phone:${name}|${phoneDigits}`
    : `school:${name}|${normalizeMatchText(raw.schoolClass)}|${normalizeMatchText(raw.school)}`;
}

function parseStatus(text: string): StudentStatus | null {
  const normalized = text.toLowerCase();

  if (!normalized || normalized === "đang học" || normalized === "active") {
    return "active";
  }

  if (normalized === "đã nghỉ" || normalized === "paused") {
    return "paused";
  }

  return null;
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
  const cell = row.getCell(columnNumber);
  return String(cell.text ?? "");
}

function normalizeText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeMatchText(value: string) {
  return normalizeText(value).toLowerCase();
}
