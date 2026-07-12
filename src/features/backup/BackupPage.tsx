import { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2,
  FileSearch,
  FolderOpen,
  HardDriveDownload,
  Loader2,
  RotateCcw,
  XCircle,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  createBackup,
  getDatabaseInfo,
  listBackupLogs,
  openAppDataFolder,
  openBackupFolder,
  pickBackupFile,
  restoreBackup,
  validateBackupFile,
} from "@/services/backupApi";
import type {
  BackupLogDto,
  BackupResultDto,
  BackupValidationDto,
  DatabaseInfoDto,
} from "@/types/backup";

type BackupPageProps = {
  onRestored: () => void;
};

type SelectedRestoreFile = {
  filePath: string;
  validation: BackupValidationDto;
};

function getErrorMessage(error: unknown, fallback: string) {
  if (typeof error === "string") {
    return error;
  }

  return error instanceof Error ? error.message : fallback;
}

function formatBytes(bytes: number) {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(0)} KB`;
  }

  return `${bytes} B`;
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "Chưa có";
  }

  const [datePart, timePart] = value.split(" ");
  if (!datePart || !timePart) {
    return value;
  }

  const [year, month, day] = datePart.split("-");
  return `${day}/${month}/${year} ${timePart.slice(0, 5)}`;
}

function fileNameFromPath(filePath: string) {
  const segments = filePath.split(/[\\/]/);
  return segments[segments.length - 1] || filePath;
}

export function BackupPage({ onRestored }: BackupPageProps) {
  const [databaseInfo, setDatabaseInfo] = useState<DatabaseInfoDto | null>(null);
  const [logs, setLogs] = useState<BackupLogDto[]>([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [latestBackup, setLatestBackup] = useState<BackupResultDto | null>(null);
  const [isPickingFile, setIsPickingFile] = useState(false);
  const [selectedRestoreFile, setSelectedRestoreFile] = useState<SelectedRestoreFile | null>(null);
  const [isRestoreConfirmOpen, setIsRestoreConfirmOpen] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreSuccessMessage, setRestoreSuccessMessage] = useState("");

  const refreshOverview = useCallback(async () => {
    try {
      const [info, backupLogs] = await Promise.all([getDatabaseInfo(), listBackupLogs(20)]);
      setDatabaseInfo(info);
      setLogs(backupLogs);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Không tải được thông tin sao lưu."));
    }
  }, []);

  useEffect(() => {
    void refreshOverview();
  }, [refreshOverview]);

  async function handleCreateBackup() {
    setIsBackingUp(true);
    setErrorMessage("");

    try {
      setLatestBackup(await createBackup());
      await refreshOverview();
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Sao lưu thất bại."));
      await refreshOverview();
    } finally {
      setIsBackingUp(false);
    }
  }

  async function handleOpenBackupFolder() {
    setErrorMessage("");

    try {
      await openBackupFolder();
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Không mở được thư mục sao lưu."));
    }
  }

  async function handleOpenAppDataFolder() {
    setErrorMessage("");

    try {
      await openAppDataFolder();
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Không mở được thư mục dữ liệu."));
    }
  }

  async function handlePickRestoreFile() {
    setIsPickingFile(true);
    setErrorMessage("");

    try {
      const filePath = await pickBackupFile();
      if (!filePath) {
        return;
      }

      const validation = await validateBackupFile(filePath);
      setSelectedRestoreFile({ filePath, validation });
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Không kiểm tra được file sao lưu."));
    } finally {
      setIsPickingFile(false);
    }
  }

  async function handleConfirmRestore() {
    if (!selectedRestoreFile?.validation.isValid) {
      return;
    }

    setIsRestoring(true);
    setErrorMessage("");

    try {
      const result = await restoreBackup(selectedRestoreFile.filePath);
      setIsRestoreConfirmOpen(false);
      setSelectedRestoreFile(null);
      setRestoreSuccessMessage(result.message);
    } catch (error) {
      setIsRestoreConfirmOpen(false);
      setErrorMessage(getErrorMessage(error, "Khôi phục dữ liệu thất bại."));
      await refreshOverview();
    } finally {
      setIsRestoring(false);
    }
  }

  function handleRestoreSuccessClose() {
    setRestoreSuccessMessage("");
    onRestored();
  }

  return (
    <div className="min-h-full min-w-0 space-y-4 pb-4">
      <section>
        <h2 className="text-2xl font-semibold text-slate-950 md:text-3xl">Sao lưu dữ liệu</h2>
        <p className="mt-2 max-w-3xl text-muted-foreground">
          Sao lưu và khôi phục dữ liệu SQLite trên máy tính này.
        </p>
      </section>

      {errorMessage ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </p>
      ) : null}

      <Card className="rounded-lg border-slate-200 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Thông tin dữ liệu</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {databaseInfo ? (
            <>
              <InfoRow label="Đường dẫn dữ liệu" value={databaseInfo.databasePath} />
              <InfoRow
                label="Dung lượng dữ liệu"
                value={formatBytes(databaseInfo.databaseSizeBytes)}
              />
              <InfoRow label="Phiên bản schema" value={databaseInfo.latestMigration} />
              <InfoRow
                label="Lần sao lưu gần nhất"
                value={formatDateTime(databaseInfo.lastBackupAt)}
              />
              <InfoRow
                label="Lần khôi phục gần nhất"
                value={formatDateTime(databaseInfo.lastRestoreAt)}
              />
              <div className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 gap-2"
                  onClick={handleOpenAppDataFolder}
                >
                  <FolderOpen className="size-4" />
                  Mở thư mục dữ liệu
                </Button>
              </div>
            </>
          ) : (
            <p className="text-muted-foreground">Đang tải thông tin dữ liệu...</p>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-lg border-slate-200 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Sao lưu</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              className="h-10 gap-2"
              onClick={handleCreateBackup}
              disabled={isBackingUp}
            >
              {isBackingUp ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <HardDriveDownload className="size-4" />
              )}
              {isBackingUp ? "Đang sao lưu..." : "Sao lưu ngay"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-10 gap-2"
              onClick={handleOpenBackupFolder}
            >
              <FolderOpen className="size-4" />
              Mở thư mục sao lưu
            </Button>
          </div>

          {latestBackup ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
              <p className="flex items-center gap-2 font-medium">
                <CheckCircle2 className="size-4" />
                {latestBackup.message}
              </p>
              <p className="mt-1 break-all">{latestBackup.fileName}</p>
              <p className="mt-1 text-emerald-800">
                {formatBytes(latestBackup.sizeBytes)} - {formatDateTime(latestBackup.createdAt)}
              </p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card className="rounded-lg border-slate-200 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Khôi phục</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              variant="outline"
              className="h-10 gap-2"
              onClick={handlePickRestoreFile}
              disabled={isPickingFile || isRestoring}
            >
              {isPickingFile ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <FileSearch className="size-4" />
              )}
              Chọn file khôi phục
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="h-10 gap-2"
              onClick={() => setIsRestoreConfirmOpen(true)}
              disabled={!selectedRestoreFile?.validation.isValid || isRestoring}
            >
              {isRestoring ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <RotateCcw className="size-4" />
              )}
              {isRestoring ? "Đang khôi phục..." : "Khôi phục dữ liệu"}
            </Button>
          </div>

          {selectedRestoreFile ? (
            <div
              className={[
                "rounded-lg border px-4 py-3 text-sm",
                selectedRestoreFile.validation.isValid
                  ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                  : "border-red-200 bg-red-50 text-red-700",
              ].join(" ")}
            >
              <p className="flex items-center gap-2 font-medium">
                {selectedRestoreFile.validation.isValid ? (
                  <CheckCircle2 className="size-4" />
                ) : (
                  <XCircle className="size-4" />
                )}
                {selectedRestoreFile.validation.message}
              </p>
              <p className="mt-1 break-all">{fileNameFromPath(selectedRestoreFile.filePath)}</p>
              {selectedRestoreFile.validation.latestMigration ? (
                <p className="mt-1">
                  Phiên bản schema: {selectedRestoreFile.validation.latestMigration}
                </p>
              ) : null}
              {selectedRestoreFile.validation.tableSummary ? (
                <p className="mt-1">Dữ liệu: {selectedRestoreFile.validation.tableSummary}</p>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Chọn file sao lưu (.sqlite) để kiểm tra trước khi khôi phục.
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-lg border-slate-200 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Lịch sử sao lưu / khôi phục</CardTitle>
        </CardHeader>
        <CardContent>
          {logs.length > 0 ? (
            <ul className="space-y-2">
              {logs.map((log) => (
                <li
                  key={log.id}
                  className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm"
                >
                  <Badge variant="outline">
                    {log.action === "backup" ? "Sao lưu" : "Khôi phục"}
                  </Badge>
                  <Badge
                    className={
                      log.status === "success"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-red-100 text-red-700"
                    }
                  >
                    {log.status === "success" ? "Thành công" : "Thất bại"}
                  </Badge>
                  <span className="text-muted-foreground">{formatDateTime(log.createdAt)}</span>
                  <span className="min-w-0 flex-1 break-all text-slate-700">
                    {log.message || fileNameFromPath(log.filePath)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Chưa có lịch sử sao lưu/khôi phục.</p>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={isRestoreConfirmOpen}
        onOpenChange={(open) => {
          if (!isRestoring) {
            setIsRestoreConfirmOpen(open);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Khôi phục dữ liệu?</DialogTitle>
            <DialogDescription>
              Thao tác này sẽ thay thế toàn bộ dữ liệu hiện tại bằng file sao lưu đã chọn. Ứng dụng
              sẽ tạo một bản sao lưu an toàn trước khi khôi phục.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={isRestoring}>
                Hủy
              </Button>
            </DialogClose>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmRestore}
              disabled={isRestoring}
            >
              {isRestoring ? "Đang khôi phục..." : "Khôi phục"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(restoreSuccessMessage)}
        onOpenChange={(open) => {
          if (!open) {
            handleRestoreSuccessClose();
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Khôi phục thành công</DialogTitle>
            <DialogDescription>
              {restoreSuccessMessage} Ứng dụng sẽ tải lại dữ liệu và quay về trang chủ.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" onClick={handleRestoreSuccessClose}>
              Về trang chủ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 md:grid-cols-[200px_minmax(0,1fr)] md:gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="min-w-0 break-all font-medium text-slate-950">{value}</span>
    </div>
  );
}
