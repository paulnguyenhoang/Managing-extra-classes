use std::{
    fs,
    path::{Path, PathBuf},
    sync::Mutex,
};

use rusqlite::{params, Connection, OptionalExtension};
use serde::Serialize;
use tauri::{AppHandle, Manager};

const DATABASE_FILE_NAME: &str = "data.sqlite";

struct Migration {
    version: i64,
    name: &'static str,
    sql: &'static str,
}

const MIGRATIONS: &[Migration] = &[
    Migration {
        version: 1,
        name: "001_init",
        sql: include_str!("../../migrations/001_init.sql"),
    },
    Migration {
        version: 2,
        name: "002_academic_classes",
        sql: include_str!("../../migrations/002_academic_classes.sql"),
    },
    Migration {
        version: 3,
        name: "003_students_memberships",
        sql: include_str!("../../migrations/003_students_memberships.sql"),
    },
];

pub struct AppDatabase {
    path: PathBuf,
    connection: Mutex<Connection>,
}

#[derive(Serialize)]
pub struct DatabaseStatus {
    pub ready: bool,
    pub database_path: String,
    pub applied_migrations: Vec<String>,
}

impl AppDatabase {
    pub fn initialize(app_handle: &AppHandle) -> Result<Self, String> {
        let app_data_dir = app_handle
            .path()
            .app_data_dir()
            .map_err(|error| format!("Không xác định được thư mục dữ liệu ứng dụng: {error}"))?;

        fs::create_dir_all(&app_data_dir)
            .map_err(|error| format!("Không tạo được thư mục dữ liệu ứng dụng: {error}"))?;

        let database_path = app_data_dir.join(DATABASE_FILE_NAME);
        let mut connection = Connection::open(&database_path)
            .map_err(|error| format!("Không mở được SQLite database: {error}"))?;

        configure_connection(&connection)?;
        run_migrations(&mut connection)?;

        Ok(Self {
            path: database_path,
            connection: Mutex::new(connection),
        })
    }

    pub fn status(&self) -> Result<DatabaseStatus, String> {
        let connection = self
            .connection
            .lock()
            .map_err(|_| "Không khóa được SQLite connection".to_string())?;

        let applied_migrations = list_applied_migrations(&connection)?;

        Ok(DatabaseStatus {
            ready: true,
            database_path: path_to_string(&self.path),
            applied_migrations,
        })
    }

    pub fn get_setting(&self, key: &str) -> Result<Option<String>, String> {
        let connection = self
            .connection
            .lock()
            .map_err(|_| "Không khóa được SQLite connection".to_string())?;

        connection
            .query_row(
                "SELECT value FROM app_settings WHERE key = ?1",
                params![key],
                |row| row.get::<_, String>(0),
            )
            .optional()
            .map_err(|error| format!("Không đọc được cài đặt ứng dụng: {error}"))
    }

    pub fn set_settings(&self, settings: &[(&str, &str)]) -> Result<(), String> {
        let mut connection = self
            .connection
            .lock()
            .map_err(|_| "Không khóa được SQLite connection".to_string())?;

        let transaction = connection
            .transaction()
            .map_err(|error| format!("Không bắt đầu được settings transaction: {error}"))?;

        for (key, value) in settings {
            transaction
                .execute(
                    "INSERT INTO app_settings (key, value, updated_at)
                     VALUES (?1, ?2, CURRENT_TIMESTAMP)
                     ON CONFLICT(key) DO UPDATE SET
                       value = excluded.value,
                       updated_at = CURRENT_TIMESTAMP",
                    params![key, value],
                )
                .map_err(|error| format!("Không lưu được cài đặt ứng dụng: {error}"))?;
        }

        transaction
            .commit()
            .map_err(|error| format!("Không commit được settings transaction: {error}"))
    }

    pub fn with_connection<T>(
        &self,
        operation: impl FnOnce(&Connection) -> Result<T, String>,
    ) -> Result<T, String> {
        let connection = self
            .connection
            .lock()
            .map_err(|_| "Không khóa được SQLite connection".to_string())?;

        operation(&connection)
    }

    pub fn with_connection_mut<T>(
        &self,
        operation: impl FnOnce(&mut Connection) -> Result<T, String>,
    ) -> Result<T, String> {
        let mut connection = self
            .connection
            .lock()
            .map_err(|_| "Không khóa được SQLite connection".to_string())?;

        operation(&mut connection)
    }
}

fn configure_connection(connection: &Connection) -> Result<(), String> {
    connection
        .pragma_update(None, "foreign_keys", "ON")
        .map_err(|error| format!("Không bật được SQLite foreign keys: {error}"))?;

    connection
        .pragma_update(None, "journal_mode", "WAL")
        .map_err(|error| format!("Không bật được SQLite WAL mode: {error}"))?;

    Ok(())
}

fn run_migrations(connection: &mut Connection) -> Result<(), String> {
    ensure_migration_table(connection)?;

    for migration in MIGRATIONS {
        if is_migration_applied(connection, migration.version)? {
            continue;
        }

        let transaction = connection
            .transaction()
            .map_err(|error| format!("Không bắt đầu được migration transaction: {error}"))?;

        transaction
            .execute_batch(migration.sql)
            .map_err(|error| format!("Migration {} thất bại: {error}", migration.name))?;

        transaction
            .execute(
                "INSERT INTO schema_migrations (version, name) VALUES (?1, ?2)",
                params![migration.version, migration.name],
            )
            .map_err(|error| format!("Không lưu được migration {}: {error}", migration.name))?;

        transaction
            .commit()
            .map_err(|error| format!("Không commit được migration {}: {error}", migration.name))?;
    }

    Ok(())
}

fn ensure_migration_table(connection: &Connection) -> Result<(), String> {
    connection
        .execute_batch(
            "CREATE TABLE IF NOT EXISTS schema_migrations (
              version INTEGER PRIMARY KEY,
              name TEXT NOT NULL,
              applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );",
        )
        .map_err(|error| format!("Không tạo được bảng schema_migrations: {error}"))
}

fn is_migration_applied(connection: &Connection, version: i64) -> Result<bool, String> {
    let applied_version = connection
        .query_row(
            "SELECT version FROM schema_migrations WHERE version = ?1",
            params![version],
            |row| row.get::<_, i64>(0),
        )
        .optional()
        .map_err(|error| format!("Không đọc được trạng thái migration: {error}"))?;

    Ok(applied_version.is_some())
}

fn list_applied_migrations(connection: &Connection) -> Result<Vec<String>, String> {
    let mut statement = connection
        .prepare("SELECT version, name FROM schema_migrations ORDER BY version")
        .map_err(|error| format!("Không chuẩn bị được truy vấn migration: {error}"))?;

    let rows = statement
        .query_map([], |row| {
            let version: i64 = row.get(0)?;
            let name: String = row.get(1)?;
            Ok(format!("{version}:{name}"))
        })
        .map_err(|error| format!("Không đọc được danh sách migration: {error}"))?;

    let mut migrations = Vec::new();
    for row in rows {
        migrations.push(row.map_err(|error| format!("Không parse được migration: {error}"))?);
    }

    Ok(migrations)
}

fn path_to_string(path: &Path) -> String {
    path.to_string_lossy().into_owned()
}

#[tauri::command]
pub fn check_database_ready(
    database: tauri::State<'_, AppDatabase>,
) -> Result<DatabaseStatus, String> {
    database.status()
}
