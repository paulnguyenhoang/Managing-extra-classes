import { invoke } from "@tauri-apps/api/core";

import type {
  AddScoreColumnInput,
  ImportScoreSheetInput,
  ImportScoreSummary,
  RenameScoreColumnInput,
  SaveScoreValuesInput,
  ScoreSheetDto,
} from "@/types/score";

export function listScoreSheet(classId: number, month: string) {
  return invoke<ScoreSheetDto>("list_score_sheet", { classId, month });
}

export function addScoreColumn(input: AddScoreColumnInput) {
  return invoke<ScoreSheetDto>("add_score_column", { request: input });
}

export function renameScoreColumn(input: RenameScoreColumnInput) {
  return invoke<void>("rename_score_column", { request: input });
}

export function deleteScoreColumn(columnId: number) {
  return invoke<void>("delete_score_column", { request: { columnId } });
}

export function saveScoreValues(input: SaveScoreValuesInput) {
  return invoke<void>("save_score_values", { request: input });
}

export function importScoreSheet(input: ImportScoreSheetInput) {
  return invoke<ImportScoreSummary>("import_score_sheet", { request: input });
}
