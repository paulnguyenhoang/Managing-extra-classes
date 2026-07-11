import type ExcelJS from "exceljs";

const thinBorder: Partial<ExcelJS.Borders> = {
  top: { style: "thin", color: { argb: "FFE2E8F0" } },
  right: { style: "thin", color: { argb: "FFE2E8F0" } },
  bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
  left: { style: "thin", color: { argb: "FFE2E8F0" } },
};

export function addTitleRow(
  worksheet: ExcelJS.Worksheet,
  title: string,
  columnCount: number,
) {
  const row = worksheet.addRow([title]);
  row.height = 26;
  const titleCell = row.getCell(1);
  titleCell.font = { bold: true, size: 16 };
  titleCell.alignment = { vertical: "middle" };
  worksheet.mergeCells(row.number, 1, row.number, columnCount);
}

export function addMetadataRows(
  worksheet: ExcelJS.Worksheet,
  metadata: Array<[string, string]>,
) {
  metadata.forEach(([label, value]) => {
    const row = worksheet.addRow([label, value]);
    row.getCell(1).font = { bold: true };
    row.getCell(1).alignment = { vertical: "middle" };
    row.getCell(2).alignment = { vertical: "middle", wrapText: true };
  });
}

export function addStyledHeaderRow(
  worksheet: ExcelJS.Worksheet,
  labels: string[],
) {
  const row = worksheet.addRow(labels);
  row.height = 22;

  row.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FF0F172A" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFF1F5F9" },
    };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = thinBorder;
  });

  return row.number;
}

export function styleDataRows(
  worksheet: ExcelJS.Worksheet,
  startRow: number,
  endRow: number,
  columnCount: number,
) {
  for (let rowNumber = startRow; rowNumber <= endRow; rowNumber += 1) {
    const row = worksheet.getRow(rowNumber);

    for (let columnNumber = 1; columnNumber <= columnCount; columnNumber += 1) {
      const cell = row.getCell(columnNumber);
      cell.border = thinBorder;
      cell.alignment = {
        vertical: "middle",
        wrapText: columnNumber === columnCount,
      };
    }
  }
}

export function applyColumnWidths(
  worksheet: ExcelJS.Worksheet,
  widths: number[],
) {
  widths.forEach((width, index) => {
    worksheet.getColumn(index + 1).width = width;
  });
}
