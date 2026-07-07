use std::collections::HashMap;

use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};

use crate::db::AppDatabase;

const CURRENT_ACADEMIC_YEAR_KEY: &str = "current_academic_year_id";

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AcademicYearDto {
    id: i64,
    label: String,
    starts_at: String,
    ends_at: String,
    is_current: bool,
}

#[derive(Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ClassScheduleItemDto {
    weekday: i64,
    start_time: String,
    end_time: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ClassOverviewDto {
    id: i64,
    academic_year_id: i64,
    name: String,
    grade: i64,
    schedule: String,
    schedule_items: Vec<ClassScheduleItemDto>,
    monthly_fee: i64,
    room: String,
    note: Option<String>,
    student_count: i64,
    unpaid_count: i64,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateClassRequest {
    academic_year_id: i64,
    name: String,
    grade: i64,
    monthly_fee: i64,
    note: Option<String>,
    schedule_items: Vec<ClassScheduleItemDto>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateClassNameRequest {
    class_id: i64,
    name: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateClassMonthlyFeeRequest {
    class_id: i64,
    monthly_fee: i64,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateClassScheduleRequest {
    class_id: i64,
    schedule_items: Vec<ClassScheduleItemDto>,
}

struct SeedSchedule {
    class_key: &'static str,
    weekday: i64,
    start_time: &'static str,
    end_time: &'static str,
    sort_order: i64,
}

pub fn seed_academic_class_data(database: &AppDatabase) -> Result<(), String> {
    database.with_connection_mut(|connection| {
        let academic_year_count: i64 = connection
            .query_row("SELECT COUNT(*) FROM academic_years", [], |row| row.get(0))
            .map_err(|error| format!("Không kiểm tra được dữ liệu năm học: {error}"))?;
        let class_count: i64 = connection
            .query_row("SELECT COUNT(*) FROM classes", [], |row| row.get(0))
            .map_err(|error| format!("Không kiểm tra được dữ liệu lớp học: {error}"))?;

        if academic_year_count > 0 || class_count > 0 {
            return Ok(());
        }

        let transaction = connection
            .transaction()
            .map_err(|error| format!("Không bắt đầu được seed transaction: {error}"))?;

        let academic_years = [
            (
                "2025-2026",
                "Năm học 2025 - 2026",
                "2025-08-01",
                "2026-05-31",
                1,
            ),
            (
                "2024-2025",
                "Năm học 2024 - 2025",
                "2024-08-01",
                "2025-05-31",
                0,
            ),
            (
                "2026-2027",
                "Năm học 2026 - 2027",
                "2026-08-01",
                "2027-05-31",
                0,
            ),
        ];

        let mut academic_year_ids: HashMap<&'static str, i64> = HashMap::new();
        for (key, label, starts_at, ends_at, is_current) in academic_years {
            transaction
                .execute(
                    "INSERT INTO academic_years
                     (label, starts_at, ends_at, is_current, created_at, updated_at)
                     VALUES (?1, ?2, ?3, ?4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
                    params![label, starts_at, ends_at, is_current],
                )
                .map_err(|error| format!("Không seed được năm học {label}: {error}"))?;
            academic_year_ids.insert(key, transaction.last_insert_rowid());
        }

        let classes = [
            (
                "van-9a",
                "2025-2026",
                "Văn 9 - Ôn thi vào 10",
                9,
                700_000,
                "Phòng học nhà thầy",
            ),
            (
                "van-8a",
                "2025-2026",
                "Văn 8 - Nâng cao",
                8,
                600_000,
                "Phòng học nhà thầy",
            ),
            (
                "van-8b",
                "2025-2026",
                "Văn 8 - Cơ bản",
                8,
                550_000,
                "Phòng học nhà thầy",
            ),
            (
                "van-9-old",
                "2024-2025",
                "Văn 9 - Khóa trước",
                9,
                650_000,
                "Phòng học nhà thầy",
            ),
        ];

        let mut class_ids: HashMap<&'static str, i64> = HashMap::new();
        for (key, academic_year_key, name, grade, monthly_fee, room) in classes {
            let academic_year_id = academic_year_ids
                .get(academic_year_key)
                .copied()
                .ok_or_else(|| format!("Không tìm thấy năm học seed {academic_year_key}"))?;

            transaction
                .execute(
                    "INSERT INTO classes
                     (academic_year_id, name, grade, monthly_fee, room, note, is_archived, created_at, updated_at)
                     VALUES (?1, ?2, ?3, ?4, ?5, NULL, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
                    params![academic_year_id, name, grade, monthly_fee, room],
                )
                .map_err(|error| format!("Không seed được lớp {name}: {error}"))?;
            class_ids.insert(key, transaction.last_insert_rowid());
        }

        let schedules = [
            SeedSchedule {
                class_key: "van-9a",
                weekday: 2,
                start_time: "18:00",
                end_time: "20:00",
                sort_order: 0,
            },
            SeedSchedule {
                class_key: "van-9a",
                weekday: 5,
                start_time: "18:00",
                end_time: "20:00",
                sort_order: 1,
            },
            SeedSchedule {
                class_key: "van-8a",
                weekday: 1,
                start_time: "17:30",
                end_time: "19:30",
                sort_order: 0,
            },
            SeedSchedule {
                class_key: "van-8a",
                weekday: 4,
                start_time: "17:30",
                end_time: "19:30",
                sort_order: 1,
            },
            SeedSchedule {
                class_key: "van-8b",
                weekday: 3,
                start_time: "19:00",
                end_time: "21:00",
                sort_order: 0,
            },
            SeedSchedule {
                class_key: "van-8b",
                weekday: 0,
                start_time: "19:00",
                end_time: "21:00",
                sort_order: 1,
            },
            SeedSchedule {
                class_key: "van-9-old",
                weekday: 2,
                start_time: "18:00",
                end_time: "20:00",
                sort_order: 0,
            },
            SeedSchedule {
                class_key: "van-9-old",
                weekday: 5,
                start_time: "18:00",
                end_time: "20:00",
                sort_order: 1,
            },
        ];

        for schedule in schedules {
            let class_id = class_ids
                .get(schedule.class_key)
                .copied()
                .ok_or_else(|| format!("Không tìm thấy lớp seed {}", schedule.class_key))?;

            transaction
                .execute(
                    "INSERT INTO class_schedules
                     (class_id, weekday, start_time, end_time, sort_order, created_at, updated_at)
                     VALUES (?1, ?2, ?3, ?4, ?5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
                    params![
                        class_id,
                        schedule.weekday,
                        schedule.start_time,
                        schedule.end_time,
                        schedule.sort_order
                    ],
                )
                .map_err(|error| {
                    format!("Không seed được lịch học cho lớp {}: {error}", schedule.class_key)
                })?;
        }

        let current_academic_year_id = academic_year_ids
            .get("2025-2026")
            .copied()
            .ok_or_else(|| "Không tìm thấy năm học hiện tại khi seed.".to_string())?;

        transaction
            .execute(
                "INSERT INTO app_settings (key, value, updated_at)
                 VALUES (?1, ?2, CURRENT_TIMESTAMP)
                 ON CONFLICT(key) DO UPDATE SET
                   value = excluded.value,
                   updated_at = CURRENT_TIMESTAMP",
                params![CURRENT_ACADEMIC_YEAR_KEY, current_academic_year_id.to_string()],
            )
            .map_err(|error| format!("Không lưu được năm học hiện tại khi seed: {error}"))?;

        transaction
            .commit()
            .map_err(|error| format!("Không commit được seed dữ liệu lớp học: {error}"))
    })
}

#[tauri::command]
pub fn list_academic_years(
    database: tauri::State<'_, AppDatabase>,
) -> Result<Vec<AcademicYearDto>, String> {
    database.with_connection(|connection| {
        let mut statement = connection
            .prepare(
                "SELECT id, label, starts_at, ends_at, is_current
                 FROM academic_years
                 ORDER BY starts_at DESC",
            )
            .map_err(|error| format!("Không chuẩn bị được truy vấn năm học: {error}"))?;

        let rows = statement
            .query_map([], |row| {
                Ok(AcademicYearDto {
                    id: row.get(0)?,
                    label: row.get(1)?,
                    starts_at: row.get(2)?,
                    ends_at: row.get(3)?,
                    is_current: row.get::<_, i64>(4)? == 1,
                })
            })
            .map_err(|error| format!("Không đọc được danh sách năm học: {error}"))?;

        collect_rows(rows, "Không parse được năm học")
    })
}

#[tauri::command]
pub fn get_current_academic_year_id(
    database: tauri::State<'_, AppDatabase>,
) -> Result<i64, String> {
    get_current_academic_year_id_value(&database)
}

#[tauri::command]
pub fn set_current_academic_year(
    database: tauri::State<'_, AppDatabase>,
    academic_year_id: i64,
) -> Result<(), String> {
    database.with_connection_mut(|connection| {
        ensure_academic_year_exists(connection, academic_year_id)?;

        let transaction = connection
            .transaction()
            .map_err(|error| format!("Không bắt đầu được transaction năm học: {error}"))?;

        transaction
            .execute(
                "UPDATE academic_years SET is_current = 0, updated_at = CURRENT_TIMESTAMP",
                [],
            )
            .map_err(|error| format!("Không cập nhật được năm học hiện tại: {error}"))?;
        transaction
            .execute(
                "UPDATE academic_years
                 SET is_current = 1, updated_at = CURRENT_TIMESTAMP
                 WHERE id = ?1",
                params![academic_year_id],
            )
            .map_err(|error| format!("Không đặt được năm học hiện tại: {error}"))?;
        transaction
            .execute(
                "INSERT INTO app_settings (key, value, updated_at)
                 VALUES (?1, ?2, CURRENT_TIMESTAMP)
                 ON CONFLICT(key) DO UPDATE SET
                   value = excluded.value,
                   updated_at = CURRENT_TIMESTAMP",
                params![CURRENT_ACADEMIC_YEAR_KEY, academic_year_id.to_string()],
            )
            .map_err(|error| format!("Không lưu được cài đặt năm học hiện tại: {error}"))?;

        transaction
            .commit()
            .map_err(|error| format!("Không commit được năm học hiện tại: {error}"))
    })
}

#[tauri::command]
pub fn list_class_overviews_by_year(
    database: tauri::State<'_, AppDatabase>,
    academic_year_id: i64,
) -> Result<Vec<ClassOverviewDto>, String> {
    database.with_connection(|connection| list_class_overviews(connection, academic_year_id))
}

#[tauri::command]
pub fn get_class_detail(
    database: tauri::State<'_, AppDatabase>,
    class_id: i64,
) -> Result<ClassOverviewDto, String> {
    database.with_connection(|connection| get_class_overview(connection, class_id))
}

#[tauri::command]
pub fn create_class(
    database: tauri::State<'_, AppDatabase>,
    request: CreateClassRequest,
) -> Result<ClassOverviewDto, String> {
    validate_class_name(&request.name)?;
    validate_class_grade(request.grade)?;
    validate_monthly_fee(request.monthly_fee)?;
    validate_schedule_items(&request.schedule_items)?;

    database.with_connection_mut(|connection| {
        ensure_academic_year_exists(connection, request.academic_year_id)?;

        let name = request.name.trim().to_string();
        let note = normalize_optional_text(request.note.as_deref());
        let transaction = connection
            .transaction()
            .map_err(|error| format!("Không bắt đầu được transaction tạo lớp: {error}"))?;

        transaction
            .execute(
                "INSERT INTO classes
                 (academic_year_id, name, grade, monthly_fee, room, note, is_archived, created_at, updated_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
                params![
                    request.academic_year_id,
                    name,
                    request.grade,
                    request.monthly_fee,
                    "Phòng học nhà thầy",
                    note
                ],
            )
            .map_err(|error| format!("Không tạo được lớp học: {error}"))?;
        let class_id = transaction.last_insert_rowid();

        insert_schedule_items(&transaction, class_id, &request.schedule_items)?;

        transaction
            .commit()
            .map_err(|error| format!("Không commit được lớp học mới: {error}"))?;

        get_class_overview(connection, class_id)
    })
}

#[tauri::command]
pub fn update_class_name(
    database: tauri::State<'_, AppDatabase>,
    request: UpdateClassNameRequest,
) -> Result<ClassOverviewDto, String> {
    validate_class_name(&request.name)?;

    database.with_connection_mut(|connection| {
        ensure_class_exists(connection, request.class_id)?;
        connection
            .execute(
                "UPDATE classes
                 SET name = ?1, updated_at = CURRENT_TIMESTAMP
                 WHERE id = ?2",
                params![request.name.trim(), request.class_id],
            )
            .map_err(|error| format!("Không cập nhật được tên lớp: {error}"))?;

        get_class_overview(connection, request.class_id)
    })
}

#[tauri::command]
pub fn update_class_monthly_fee(
    database: tauri::State<'_, AppDatabase>,
    request: UpdateClassMonthlyFeeRequest,
) -> Result<ClassOverviewDto, String> {
    validate_monthly_fee(request.monthly_fee)?;

    database.with_connection_mut(|connection| {
        ensure_class_exists(connection, request.class_id)?;
        connection
            .execute(
                "UPDATE classes
                 SET monthly_fee = ?1, updated_at = CURRENT_TIMESTAMP
                 WHERE id = ?2",
                params![request.monthly_fee, request.class_id],
            )
            .map_err(|error| format!("Không cập nhật được học phí lớp: {error}"))?;

        get_class_overview(connection, request.class_id)
    })
}

#[tauri::command]
pub fn update_class_schedule(
    database: tauri::State<'_, AppDatabase>,
    request: UpdateClassScheduleRequest,
) -> Result<ClassOverviewDto, String> {
    validate_schedule_items(&request.schedule_items)?;

    database.with_connection_mut(|connection| {
        ensure_class_exists(connection, request.class_id)?;
        let transaction = connection
            .transaction()
            .map_err(|error| format!("Không bắt đầu được transaction lịch học: {error}"))?;

        transaction
            .execute(
                "DELETE FROM class_schedules WHERE class_id = ?1",
                params![request.class_id],
            )
            .map_err(|error| format!("Không xóa được lịch học cũ: {error}"))?;
        insert_schedule_items(&transaction, request.class_id, &request.schedule_items)?;
        transaction
            .execute(
                "UPDATE classes SET updated_at = CURRENT_TIMESTAMP WHERE id = ?1",
                params![request.class_id],
            )
            .map_err(|error| format!("Không cập nhật được thời gian sửa lớp: {error}"))?;

        transaction
            .commit()
            .map_err(|error| format!("Không commit được lịch học: {error}"))?;

        get_class_overview(connection, request.class_id)
    })
}

fn get_current_academic_year_id_value(database: &AppDatabase) -> Result<i64, String> {
    if let Some(stored_id) = database.get_setting(CURRENT_ACADEMIC_YEAR_KEY)? {
        let parsed_id = stored_id
            .parse::<i64>()
            .map_err(|_| "Mã năm học hiện tại trong cài đặt không hợp lệ.".to_string())?;
        let exists =
            database.with_connection(|connection| academic_year_exists(connection, parsed_id))?;

        if exists {
            return Ok(parsed_id);
        }
    }

    database.with_connection(|connection| {
        let current_id = connection
            .query_row(
                "SELECT id FROM academic_years WHERE is_current = 1 LIMIT 1",
                [],
                |row| row.get::<_, i64>(0),
            )
            .optional()
            .map_err(|error| format!("Không đọc được năm học hiện tại: {error}"))?;

        if let Some(current_id) = current_id {
            return Ok(current_id);
        }

        connection
            .query_row(
                "SELECT id FROM academic_years ORDER BY starts_at DESC LIMIT 1",
                [],
                |row| row.get::<_, i64>(0),
            )
            .optional()
            .map_err(|error| format!("Không đọc được năm học đầu tiên: {error}"))?
            .ok_or_else(|| "Chưa có năm học nào trong database.".to_string())
    })
}

fn list_class_overviews(
    connection: &Connection,
    academic_year_id: i64,
) -> Result<Vec<ClassOverviewDto>, String> {
    let mut statement = connection
        .prepare(
            "SELECT id
             FROM classes
             WHERE academic_year_id = ?1 AND is_archived = 0
             ORDER BY created_at ASC, name ASC",
        )
        .map_err(|error| format!("Không chuẩn bị được truy vấn lớp học: {error}"))?;

    let class_ids = statement
        .query_map(params![academic_year_id], |row| row.get::<_, i64>(0))
        .map_err(|error| format!("Không đọc được danh sách lớp học: {error}"))?;

    let mut overviews = Vec::new();
    for class_id in class_ids {
        let class_id = class_id.map_err(|error| format!("Không parse được mã lớp: {error}"))?;
        overviews.push(get_class_overview(connection, class_id)?);
    }

    Ok(overviews)
}

fn get_class_overview(connection: &Connection, class_id: i64) -> Result<ClassOverviewDto, String> {
    let class_row = connection
        .query_row(
            "SELECT id, academic_year_id, name, grade, monthly_fee, room, note
             FROM classes
             WHERE id = ?1 AND is_archived = 0",
            params![class_id],
            |row| {
                Ok((
                    row.get::<_, i64>(0)?,
                    row.get::<_, i64>(1)?,
                    row.get::<_, String>(2)?,
                    row.get::<_, Option<i64>>(3)?,
                    row.get::<_, i64>(4)?,
                    row.get::<_, Option<String>>(5)?,
                    row.get::<_, Option<String>>(6)?,
                ))
            },
        )
        .optional()
        .map_err(|error| format!("Không đọc được lớp học: {error}"))?
        .ok_or_else(|| "Không tìm thấy lớp học.".to_string())?;

    let schedule_items = schedule_items_for_class(connection, class_row.0)?;
    let schedule = format_schedule_text(&schedule_items);
    let student_count = crate::students::count_active_students_by_class(connection, class_row.0)?;
    let unpaid_count = crate::payments::count_unpaid_by_class_current_month(connection, class_row.0)?;

    Ok(ClassOverviewDto {
        id: class_row.0,
        academic_year_id: class_row.1,
        name: class_row.2,
        grade: class_row.3.unwrap_or(9),
        schedule,
        schedule_items,
        monthly_fee: class_row.4,
        room: class_row
            .5
            .filter(|value| !value.trim().is_empty())
            .unwrap_or_else(|| "Phòng học nhà thầy".to_string()),
        note: class_row.6,
        student_count,
        unpaid_count,
    })
}

fn schedule_items_for_class(
    connection: &Connection,
    class_id: i64,
) -> Result<Vec<ClassScheduleItemDto>, String> {
    let mut statement = connection
        .prepare(
            "SELECT weekday, start_time, end_time
             FROM class_schedules
             WHERE class_id = ?1
             ORDER BY sort_order ASC, CASE WHEN weekday = 0 THEN 7 ELSE weekday END ASC",
        )
        .map_err(|error| format!("Không chuẩn bị được truy vấn lịch học: {error}"))?;

    let rows = statement
        .query_map(params![class_id], |row| {
            Ok(ClassScheduleItemDto {
                weekday: row.get(0)?,
                start_time: row.get(1)?,
                end_time: row.get(2)?,
            })
        })
        .map_err(|error| format!("Không đọc được lịch học: {error}"))?;

    collect_rows(rows, "Không parse được lịch học")
}

fn insert_schedule_items(
    transaction: &rusqlite::Transaction<'_>,
    class_id: i64,
    schedule_items: &[ClassScheduleItemDto],
) -> Result<(), String> {
    for (index, item) in schedule_items.iter().enumerate() {
        transaction
            .execute(
                "INSERT INTO class_schedules
                 (class_id, weekday, start_time, end_time, sort_order, created_at, updated_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
                params![
                    class_id,
                    item.weekday,
                    item.start_time,
                    item.end_time,
                    index as i64
                ],
            )
            .map_err(|error| format!("Không lưu được lịch học: {error}"))?;
    }

    Ok(())
}

fn collect_rows<T>(
    rows: rusqlite::MappedRows<'_, impl FnMut(&rusqlite::Row<'_>) -> rusqlite::Result<T>>,
    error_context: &str,
) -> Result<Vec<T>, String> {
    let mut result = Vec::new();

    for row in rows {
        result.push(row.map_err(|error| format!("{error_context}: {error}"))?);
    }

    Ok(result)
}

fn ensure_academic_year_exists(
    connection: &Connection,
    academic_year_id: i64,
) -> Result<(), String> {
    if academic_year_exists(connection, academic_year_id)? {
        return Ok(());
    }

    Err("Không tìm thấy năm học.".to_string())
}

fn academic_year_exists(connection: &Connection, academic_year_id: i64) -> Result<bool, String> {
    let exists = connection
        .query_row(
            "SELECT id FROM academic_years WHERE id = ?1",
            params![academic_year_id],
            |row| row.get::<_, i64>(0),
        )
        .optional()
        .map_err(|error| format!("Không kiểm tra được năm học: {error}"))?;

    Ok(exists.is_some())
}

fn ensure_class_exists(connection: &Connection, class_id: i64) -> Result<(), String> {
    let exists = connection
        .query_row(
            "SELECT id FROM classes WHERE id = ?1 AND is_archived = 0",
            params![class_id],
            |row| row.get::<_, i64>(0),
        )
        .optional()
        .map_err(|error| format!("Không kiểm tra được lớp học: {error}"))?;

    if exists.is_some() {
        Ok(())
    } else {
        Err("Không tìm thấy lớp học.".to_string())
    }
}

fn validate_class_name(name: &str) -> Result<(), String> {
    if name.trim().is_empty() {
        return Err("Tên lớp không được để trống.".to_string());
    }

    Ok(())
}

fn validate_class_grade(grade: i64) -> Result<(), String> {
    if grade != 8 && grade != 9 {
        return Err("Khối lớp phải là Khối 8 hoặc Khối 9.".to_string());
    }

    Ok(())
}

fn validate_monthly_fee(monthly_fee: i64) -> Result<(), String> {
    if monthly_fee < 0 {
        return Err("Học phí tháng không được nhỏ hơn 0.".to_string());
    }

    Ok(())
}

fn validate_schedule_items(schedule_items: &[ClassScheduleItemDto]) -> Result<(), String> {
    if schedule_items.is_empty() {
        return Err("Lịch học không được để trống.".to_string());
    }

    for item in schedule_items {
        if !(0..=6).contains(&item.weekday) {
            return Err("Ngày học không hợp lệ.".to_string());
        }

        if item.start_time.trim().is_empty() || item.end_time.trim().is_empty() {
            return Err("Giờ học không được để trống.".to_string());
        }
    }

    Ok(())
}

fn normalize_optional_text(value: Option<&str>) -> Option<String> {
    value
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(ToString::to_string)
}

fn format_schedule_text(items: &[ClassScheduleItemDto]) -> String {
    if items.is_empty() {
        return "Chưa có lịch học".to_string();
    }

    let mut sorted_items = items.to_vec();
    sorted_items.sort_by_key(|item| if item.weekday == 0 { 7 } else { item.weekday });

    let mut groups: Vec<(String, String, Vec<i64>)> = Vec::new();

    for item in sorted_items {
        if let Some((_, _, weekdays)) = groups.iter_mut().find(|(start_time, end_time, _)| {
            start_time == &item.start_time && end_time == &item.end_time
        }) {
            weekdays.push(item.weekday);
        } else {
            groups.push((item.start_time, item.end_time, vec![item.weekday]));
        }
    }

    groups
        .into_iter()
        .map(|(start_time, end_time, weekdays)| {
            let days = weekdays
                .into_iter()
                .map(weekday_label)
                .collect::<Vec<_>>()
                .join(", ");

            format!("{days} - {start_time} đến {end_time}")
        })
        .collect::<Vec<_>>()
        .join(" / ")
}

fn weekday_label(weekday: i64) -> &'static str {
    match weekday {
        1 => "Thứ 2",
        2 => "Thứ 3",
        3 => "Thứ 4",
        4 => "Thứ 5",
        5 => "Thứ 6",
        6 => "Thứ 7",
        0 => "Chủ nhật",
        _ => "Thứ ?",
    }
}
