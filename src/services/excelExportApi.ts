import { invoke } from "@tauri-apps/api/core";

export type ExcelSaveResult = {
  filePath: string;
  fileName: string;
};

export function saveExcelFile(suggestedFileName: string, bytes: Uint8Array) {
  return invoke<ExcelSaveResult | null>("save_excel_file", {
    suggestedFileName,
    bytes: Array.from(bytes),
  });
}
