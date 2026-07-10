export type BackupAction = "backup" | "restore";

export type BackupStatus = "success" | "failed";

export type DatabaseInfoDto = {
  databasePath: string;
  databaseSizeBytes: number;
  appDataDir: string;
  latestMigration: string;
  lastBackupAt: string | null;
  lastRestoreAt: string | null;
};

export type BackupResultDto = {
  filePath: string;
  fileName: string;
  sizeBytes: number;
  createdAt: string;
  message: string;
};

export type BackupValidationDto = {
  isValid: boolean;
  message: string;
  latestMigration: string | null;
  tableSummary: string | null;
};

export type BackupLogDto = {
  id: number;
  action: BackupAction;
  filePath: string;
  status: BackupStatus;
  message: string | null;
  createdAt: string;
};

export type RestoreResultDto = {
  message: string;
  safetyBackupPath: string;
};
