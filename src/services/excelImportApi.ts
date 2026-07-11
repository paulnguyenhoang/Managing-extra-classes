import { invoke } from "@tauri-apps/api/core";

export type ExcelImportFile = {
  fileName: string;
  bytes: number[];
};

export function pickExcelImportFile() {
  return invoke<ExcelImportFile | null>("pick_excel_import_file");
}
