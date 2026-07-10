use std::{
    fs,
    path::{Path, PathBuf},
    time::Duration,
};

use rusqlite::{backup::Backup, params, Connection, OpenFlags, OptionalExtension};
use serde::Serialize;
use tauri::{AppHandle, Manager};
use tauri_plugin_dialog::DialogExt;

use crate::db::{self, AppDatabase};

const BACKUP_DIR_NAME: &str = "backups";
const BACKUP_FILE_PREFIX: &str = "quan-ly-lop-hoc-them-backup";
const BACKUP_PAGES_PER_STEP: std::os::raw::c_int = 100;
const DEFAULT_LOG_LIMIT: i64 = 20;

const REQUIRED_TABLES: &[&str] = &[
    "app_settings",
    "academic_years",
    "classes",
    "class_schedules",
    "students",
    "class_memberships",
    "payments",
    "score_columns",
    "score_values",
    "attendance_sessions",
    "attendance_records",
    "student_makeup_records",
];

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DatabaseInfoDto {
    database_path: String,
    database_size_bytes: i64,
    app_data_dir: String,
    latest_migration: String,
    last_backup_at: Option<String>,
    last_restore_at: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BackupResultDto {
    file_path: String,
    file_name: String,
    size_bytes: i64,
    created_at: String,
    message: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BackupValidationDto {
    is_valid: bool,
    message: String,
    latest_migration: Option<String>,
    table_summary: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BackupLogDto {
    id: i64,
    action: String,
    file_path: String,
    status: String,
    message: Option<String>,
    created_at: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RestoreResultDto {
    message: String,
    safety_backup_path: String,
}

fn app_data_dir(app: &AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_data_dir()
        .map_err(|error| format!("Không xác định được thư mục dữ liệu ứng dụng: {error}"))
}

fn backups_dir(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(app_data_dir(app)?.join(BACKUP_DIR_NAME))
}

fn now_compact_timestamp(connection: &Connection) -> Result<String, String> {
    connection
        .query_row(
            "SELECT strftime('%Y%m%d-%H%M%S', 'now', 'localtime')",
            [],
            |row| row.get(0),
        )
        .map_err(|error| format!("Không đọc được thời gian hiện tại: {error}"))
}

fn now_datetime(connection: &Connection) -> Result<String, String> {
    connection
        .query_row(
            "SELECT strftime('%Y-%m-%d %H:%M:%S', 'now', 'localtime')",
            [],
            |row| row.get(0),
        )
        .map_err(|error| format!("Không đọc được thời gian hiện tại: {error}"))
}

fn insert_backup_log(
    connection: &Connection,
    action: &str,
    file_path: &str,
    status: &str,
    message: Option<&str>,
) {
    let result = connection.execute(
        "INSERT INTO backup_logs (action, file_path, status, message, created_at)
         VALUES (?1, ?2, ?3, ?4, strftime('%Y-%m-%d %H:%M:%S', 'now', 'localtime'))",
        params![action, file_path, status, message],
    );

    if let Err(error) = result {
        eprintln!("[backup] Không ghi được backup log: {error}");
    }
}

fn copy_database_to_file(source: &Connection, destination: &Path) -> Result<(), String> {
    if let Some(parent) = destination.parent() {
        fs::create_dir_all(parent)
            .map_err(|error| format!("Không tạo được thư mục sao lưu: {error}"))?;
    }

    let mut destination_connection = Connection::open(destination)
        .map_err(|error| format!("Không tạo được file sao lưu: {error}"))?;

    let backup = Backup::new(source, &mut destination_connection)
        .map_err(|error| format!("Không khởi tạo được tiến trình sao lưu: {error}"))?;

    backup
        .run_to_completion(BACKUP_PAGES_PER_STEP, Duration::ZERO, None)
        .map_err(|error| format!("Sao lưu database thất bại: {error}"))
}

fn validate_backup_at(path: &Path) -> BackupValidationDto {
    match try_validate_backup(path) {
        Ok(validation) => validation,
        Err(message) => BackupValidationDto {
            is_valid: false,
            message,
            latest_migration: None,
            table_summary: None,
        },
    }
}

fn try_validate_backup(path: &Path) -> Result<BackupValidationDto, String> {
    if !path.is_file() {
        return Err("File sao lưu không tồn tại.".to_string());
    }

    let connection = Connection::open_with_flags(path, OpenFlags::SQLITE_OPEN_READ_ONLY)
        .map_err(|_| "Không mở được file. File không phải SQLite database hợp lệ.".to_string())?;

    let integrity: String = connection
        .query_row("PRAGMA integrity_check", [], |row| row.get(0))
        .map_err(|_| "File không phải SQLite database hợp lệ.".to_string())?;

    if integrity != "ok" {
        return Err(format!("Database trong file sao lưu bị lỗi: {integrity}"));
    }

    for table in REQUIRED_TABLES {
        let exists: Option<i64> = connection
            .query_row(
                "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?1",
                params![table],
                |row| row.get(0),
            )
            .optional()
            .map_err(|error| format!("Không kiểm tra được cấu trúc file sao lưu: {error}"))?;

        if exists.is_none() {
            return Err(format!("File sao lưu thiếu bảng dữ liệu `{table}`."));
        }
    }

    let backup_migration: Option<(i64, String)> = connection
        .query_row(
            "SELECT version, name FROM schema_migrations ORDER BY version DESC LIMIT 1",
            [],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .optional()
        .map_err(|_| "File sao lưu không có thông tin schema migration.".to_string())?;

    let Some((backup_version, backup_name)) = backup_migration else {
        return Err("File sao lưu không có thông tin schema migration.".to_string());
    };

    let (latest_version, _) = db::latest_defined_migration();
    if backup_version > latest_version {
        return Err(
            "File sao lưu được tạo từ phiên bản ứng dụng mới hơn. Vui lòng cập nhật ứng dụng trước khi khôi phục."
                .to_string(),
        );
    }

    let class_count: i64 = connection
        .query_row("SELECT COUNT(*) FROM classes", [], |row| row.get(0))
        .map_err(|error| format!("Không đọc được dữ liệu lớp trong file sao lưu: {error}"))?;
    let student_count: i64 = connection
        .query_row("SELECT COUNT(*) FROM students", [], |row| row.get(0))
        .map_err(|error| format!("Không đọc được dữ liệu học sinh trong file sao lưu: {error}"))?;

    Ok(BackupValidationDto {
        is_valid: true,
        message: "File sao lưu hợp lệ.".to_string(),
        latest_migration: Some(format!("{backup_version}:{backup_name}")),
        table_summary: Some(format!("{class_count} lớp, {student_count} học sinh")),
    })
}

fn last_success_log_time(connection: &Connection, action: &str) -> Result<Option<String>, String> {
    connection
        .query_row(
            "SELECT created_at FROM backup_logs
             WHERE action = ?1 AND status = 'success'
             ORDER BY id DESC
             LIMIT 1",
            params![action],
            |row| row.get(0),
        )
        .optional()
        .map_err(|error| format!("Không đọc được lịch sử sao lưu: {error}"))
}

#[tauri::command]
pub fn get_database_info(
    app: AppHandle,
    database: tauri::State<'_, AppDatabase>,
) -> Result<DatabaseInfoDto, String> {
    let database_path = database.database_path().to_path_buf();
    let database_size_bytes = fs::metadata(&database_path)
        .map(|metadata| metadata.len() as i64)
        .unwrap_or(0);
    let app_data_dir = app_data_dir(&app)?;

    database.with_connection(|connection| {
        let latest_migration: Option<String> = connection
            .query_row(
                "SELECT version || ':' || name FROM schema_migrations ORDER BY version DESC LIMIT 1",
                [],
                |row| row.get(0),
            )
            .optional()
            .map_err(|error| format!("Không đọc được phiên bản schema: {error}"))?;

        Ok(DatabaseInfoDto {
            database_path: database_path.to_string_lossy().into_owned(),
            database_size_bytes,
            app_data_dir: app_data_dir.to_string_lossy().into_owned(),
            latest_migration: latest_migration.unwrap_or_else(|| "không xác định".to_string()),
            last_backup_at: last_success_log_time(connection, "backup")?,
            last_restore_at: last_success_log_time(connection, "restore")?,
        })
    })
}

#[tauri::command]
pub fn create_backup(
    app: AppHandle,
    database: tauri::State<'_, AppDatabase>,
    destination_path: Option<String>,
) -> Result<BackupResultDto, String> {
    let default_dir = backups_dir(&app)?;

    database.with_connection(|connection| {
        let created_at = now_datetime(connection)?;
        let file_name = format!(
            "{BACKUP_FILE_PREFIX}-{}.sqlite",
            now_compact_timestamp(connection)?
        );

        let destination = match destination_path.as_deref() {
            Some(path) => {
                let provided = PathBuf::from(path);
                if provided.is_dir() {
                    provided.join(&file_name)
                } else {
                    provided
                }
            }
            None => default_dir.join(&file_name),
        };
        let destination_display = destination.to_string_lossy().into_owned();

        let backup_result = copy_database_to_file(connection, &destination).and_then(|()| {
            let validation = validate_backup_at(&destination);
            if !validation.is_valid {
                return Err(format!(
                    "File sao lưu tạo ra không hợp lệ: {}",
                    validation.message
                ));
            }

            fs::metadata(&destination)
                .map(|metadata| metadata.len() as i64)
                .map_err(|error| format!("Không đọc được file sao lưu vừa tạo: {error}"))
        });

        match backup_result {
            Ok(size_bytes) => {
                insert_backup_log(
                    connection,
                    "backup",
                    &destination_display,
                    "success",
                    Some("Sao lưu thành công"),
                );

                Ok(BackupResultDto {
                    file_name: destination
                        .file_name()
                        .map(|name| name.to_string_lossy().into_owned())
                        .unwrap_or(file_name),
                    file_path: destination_display,
                    size_bytes,
                    created_at,
                    message: "Sao lưu thành công.".to_string(),
                })
            }
            Err(error) => {
                insert_backup_log(
                    connection,
                    "backup",
                    &destination_display,
                    "failed",
                    Some(&error),
                );

                Err(error)
            }
        }
    })
}

#[tauri::command]
pub fn validate_backup_file(file_path: String) -> Result<BackupValidationDto, String> {
    Ok(validate_backup_at(Path::new(&file_path)))
}

#[tauri::command]
pub fn restore_backup(
    app: AppHandle,
    database: tauri::State<'_, AppDatabase>,
    file_path: String,
) -> Result<RestoreResultDto, String> {
    let source_path = PathBuf::from(&file_path);
    let validation = validate_backup_at(&source_path);

    if !validation.is_valid {
        let message = validation.message;
        database.with_connection(|connection| {
            insert_backup_log(connection, "restore", &file_path, "failed", Some(&message));
            Ok(())
        })?;
        return Err(message);
    }

    let backups_dir = backups_dir(&app)?;

    database.with_connection_mut(|connection| {
        let safety_path =
            backups_dir.join(format!("pre-restore-{}.sqlite", now_compact_timestamp(connection)?));

        copy_database_to_file(connection, &safety_path).map_err(|error| {
            format!("Không tạo được bản sao lưu an toàn trước khi khôi phục: {error}")
        })?;

        // The SQLite backup API restores INTO the live connection, so the
        // data.sqlite/-wal/-shm files stay owned by this connection and the
        // destination rolls back automatically if the copy fails midway.
        let restore_result = (|| -> Result<(), String> {
            let source = Connection::open_with_flags(&source_path, OpenFlags::SQLITE_OPEN_READ_ONLY)
                .map_err(|error| format!("Không mở được file sao lưu: {error}"))?;

            {
                let backup = Backup::new(&source, connection)
                    .map_err(|error| format!("Không khởi tạo được tiến trình khôi phục: {error}"))?;
                backup
                    .run_to_completion(BACKUP_PAGES_PER_STEP, Duration::ZERO, None)
                    .map_err(|error| format!("Khôi phục database thất bại: {error}"))?;
            }

            db::configure_connection(connection)?;
            db::run_migrations(connection)
        })();

        match restore_result {
            Ok(()) => {
                insert_backup_log(
                    connection,
                    "restore",
                    &file_path,
                    "success",
                    Some("Khôi phục thành công"),
                );

                Ok(RestoreResultDto {
                    message: "Khôi phục dữ liệu thành công.".to_string(),
                    safety_backup_path: safety_path.to_string_lossy().into_owned(),
                })
            }
            Err(error) => {
                insert_backup_log(connection, "restore", &file_path, "failed", Some(&error));
                Err(error)
            }
        }
    })
}

#[tauri::command]
pub fn list_backup_logs(
    database: tauri::State<'_, AppDatabase>,
    limit: Option<i64>,
) -> Result<Vec<BackupLogDto>, String> {
    let limit = limit.unwrap_or(DEFAULT_LOG_LIMIT).clamp(1, 200);

    database.with_connection(|connection| {
        let mut statement = connection
            .prepare(
                "SELECT id, action, file_path, status, message, created_at
                 FROM backup_logs
                 ORDER BY id DESC
                 LIMIT ?1",
            )
            .map_err(|error| format!("Không đọc được lịch sử sao lưu: {error}"))?;

        let rows = statement
            .query_map(params![limit], |row| {
                Ok(BackupLogDto {
                    id: row.get(0)?,
                    action: row.get(1)?,
                    file_path: row.get(2)?,
                    status: row.get(3)?,
                    message: row.get(4)?,
                    created_at: row.get(5)?,
                })
            })
            .map_err(|error| format!("Không đọc được lịch sử sao lưu: {error}"))?;

        let mut logs = Vec::new();
        for row in rows {
            logs.push(row.map_err(|error| format!("Không đọc được lịch sử sao lưu: {error}"))?);
        }

        Ok(logs)
    })
}

#[tauri::command]
pub fn open_app_data_folder(app: AppHandle) -> Result<(), String> {
    let dir = app_data_dir(&app)?;
    fs::create_dir_all(&dir)
        .map_err(|error| format!("Không tạo được thư mục dữ liệu ứng dụng: {error}"))?;

    tauri_plugin_opener::open_path(&dir, None::<&str>)
        .map_err(|error| format!("Không mở được thư mục dữ liệu: {error}"))
}

#[tauri::command]
pub fn open_backup_folder(app: AppHandle) -> Result<(), String> {
    let dir = backups_dir(&app)?;
    fs::create_dir_all(&dir)
        .map_err(|error| format!("Không tạo được thư mục sao lưu: {error}"))?;

    tauri_plugin_opener::open_path(&dir, None::<&str>)
        .map_err(|error| format!("Không mở được thư mục sao lưu: {error}"))
}

#[tauri::command]
pub async fn pick_backup_file(app: AppHandle) -> Result<Option<String>, String> {
    let picked = app
        .dialog()
        .file()
        .add_filter("SQLite backup", &["sqlite"])
        .blocking_pick_file();

    match picked {
        Some(file) => {
            let path = file
                .into_path()
                .map_err(|error| format!("Không đọc được đường dẫn file đã chọn: {error}"))?;
            Ok(Some(path.to_string_lossy().into_owned()))
        }
        None => Ok(None),
    }
}
