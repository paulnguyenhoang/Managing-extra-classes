import { invoke } from "@tauri-apps/api/core";

import type {
  BackupLogDto,
  BackupResultDto,
  BackupValidationDto,
  DatabaseInfoDto,
  RestoreResultDto,
} from "@/types/backup";

export function getDatabaseInfo() {
  return invoke<DatabaseInfoDto>("get_database_info");
}

export function createBackup(destinationPath?: string) {
  return invoke<BackupResultDto>("create_backup", {
    destinationPath: destinationPath ?? null,
  });
}

export function validateBackupFile(filePath: string) {
  return invoke<BackupValidationDto>("validate_backup_file", { filePath });
}

export function restoreBackup(filePath: string) {
  return invoke<RestoreResultDto>("restore_backup", { filePath });
}

export function listBackupLogs(limit?: number) {
  return invoke<BackupLogDto[]>("list_backup_logs", { limit: limit ?? null });
}

export function openAppDataFolder() {
  return invoke<void>("open_app_data_folder");
}

export function openBackupFolder() {
  return invoke<void>("open_backup_folder");
}

export function pickBackupFile() {
  return invoke<string | null>("pick_backup_file");
}
