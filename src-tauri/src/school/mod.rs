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
    class_count: i64,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateAcademicYearRequest {
    label: String,
    starts_at: String,
    ends_at: String,
    make_current: Option<bool>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateAcademicYearRequest {
    id: i64,
    label: String,
    starts_at: String,
    ends_at: String,
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
    start_month: String,
    end_month: String,
    status: String,
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
    start_month: String,
    end_month: String,
    monthly_fee: i64,
    note: Option<String>,
    schedule_items: Vec<ClassScheduleItemDto>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateClassMonthRangeRequest {
    class_id: i64,
    start_month: String,
    end_month: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CompleteClassRequest {
    class_id: i64,
    end_month: String,
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

#[tauri::command]
pub fn list_academic_years(
    database: tauri::State<'_, AppDatabase>,
) -> Result<Vec<AcademicYearDto>, String> {
    database.with_connection(|connection| {
        let mut statement = connection
            .prepare(
                "SELECT
                   y.id, y.label, y.starts_at, y.ends_at, y.is_current,
                   (SELECT COUNT(*) FROM classes c WHERE c.academic_year_id = y.id AND c.is_archived = 0)
                 FROM academic_years y
                 ORDER BY y.starts_at DESC",
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
                    class_count: row.get(5)?,
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
pub fn create_academic_year(
    database: tauri::State<'_, AppDatabase>,
    request: CreateAcademicYearRequest,
) -> Result<AcademicYearDto, String> {
    let label = request.label.trim().to_string();
    let make_current = request.make_current.unwrap_or(false);

    database.with_connection_mut(|connection| {
        validate_academic_year_fields(connection, &label, &request.starts_at, &request.ends_at, None)?;

        let transaction = connection
            .transaction()
            .map_err(|error| format!("Không bắt đầu được transaction tạo năm học: {error}"))?;

        transaction
            .execute(
                "INSERT INTO academic_years (label, starts_at, ends_at, is_current, created_at, updated_at)
                 VALUES (?1, ?2, ?3, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
                params![label, request.starts_at, request.ends_at],
            )
            .map_err(|error| format!("Không tạo được năm học: {error}"))?;
        let academic_year_id = transaction.last_insert_rowid();

        if make_current {
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
        }

        transaction
            .commit()
            .map_err(|error| format!("Không commit được năm học mới: {error}"))?;

        get_academic_year_dto(connection, academic_year_id)
    })
}

#[tauri::command]
pub fn update_academic_year(
    database: tauri::State<'_, AppDatabase>,
    request: UpdateAcademicYearRequest,
) -> Result<AcademicYearDto, String> {
    let label = request.label.trim().to_string();

    database.with_connection_mut(|connection| {
        ensure_academic_year_exists(connection, request.id)?;
        validate_academic_year_fields(
            connection,
            &label,
            &request.starts_at,
            &request.ends_at,
            Some(request.id),
        )?;

        // Chỉ sửa metadata năm học; KHÔNG tự đổi start_month/end_month của các lớp thuộc năm.
        connection
            .execute(
                "UPDATE academic_years
                 SET label = ?1, starts_at = ?2, ends_at = ?3, updated_at = CURRENT_TIMESTAMP
                 WHERE id = ?4",
                params![label, request.starts_at, request.ends_at, request.id],
            )
            .map_err(|error| format!("Không cập nhật được năm học: {error}"))?;

        get_academic_year_dto(connection, request.id)
    })
}

fn validate_academic_year_fields(
    connection: &Connection,
    label: &str,
    starts_at: &str,
    ends_at: &str,
    exclude_id: Option<i64>,
) -> Result<(), String> {
    if label.is_empty() {
        return Err("Tên năm học không được để trống.".to_string());
    }

    validate_iso_date(connection, starts_at)
        .map_err(|_| "Ngày bắt đầu không hợp lệ, cần định dạng YYYY-MM-DD.".to_string())?;
    validate_iso_date(connection, ends_at)
        .map_err(|_| "Ngày kết thúc không hợp lệ, cần định dạng YYYY-MM-DD.".to_string())?;

    if ends_at <= starts_at {
        return Err("Ngày kết thúc phải sau ngày bắt đầu.".to_string());
    }

    let duplicate: Option<i64> = connection
        .query_row(
            "SELECT id FROM academic_years
             WHERE LOWER(TRIM(label)) = LOWER(TRIM(?1)) AND id != COALESCE(?2, -1)
             LIMIT 1",
            params![label, exclude_id],
            |row| row.get(0),
        )
        .optional()
        .map_err(|error| format!("Không kiểm tra được tên năm học: {error}"))?;

    if duplicate.is_some() {
        return Err("Tên năm học đã tồn tại.".to_string());
    }

    Ok(())
}

fn validate_iso_date(connection: &Connection, value: &str) -> Result<(), ()> {
    let normalized: Option<String> = connection
        .query_row("SELECT date(?1)", params![value], |row| row.get(0))
        .optional()
        .map_err(|_| ())?;

    match normalized {
        Some(normalized) if normalized == value => Ok(()),
        _ => Err(()),
    }
}

fn get_academic_year_dto(
    connection: &Connection,
    academic_year_id: i64,
) -> Result<AcademicYearDto, String> {
    connection
        .query_row(
            "SELECT
               y.id, y.label, y.starts_at, y.ends_at, y.is_current,
               (SELECT COUNT(*) FROM classes c WHERE c.academic_year_id = y.id AND c.is_archived = 0)
             FROM academic_years y
             WHERE y.id = ?1",
            params![academic_year_id],
            |row| {
                Ok(AcademicYearDto {
                    id: row.get(0)?,
                    label: row.get(1)?,
                    starts_at: row.get(2)?,
                    ends_at: row.get(3)?,
                    is_current: row.get::<_, i64>(4)? == 1,
                    class_count: row.get(5)?,
                })
            },
        )
        .optional()
        .map_err(|error| format!("Không đọc được năm học: {error}"))?
        .ok_or_else(|| "Không tìm thấy năm học.".to_string())
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
    validate_month_range(&request.start_month, &request.end_month)?;
    validate_monthly_fee(request.monthly_fee)?;
    validate_schedule_items(&request.schedule_items)?;

    database.with_connection_mut(|connection| {
        ensure_academic_year_exists(connection, request.academic_year_id)?;
        validate_month_range_within_academic_year(
            connection,
            request.academic_year_id,
            &request.start_month,
            &request.end_month,
        )?;

        validate_fixed_schedule_no_overlap(
            connection,
            None,
            &request.start_month,
            &request.end_month,
            &request.schedule_items,
        )?;

        let name = request.name.trim().to_string();
        let note = normalize_optional_text(request.note.as_deref());
        let transaction = connection
            .transaction()
            .map_err(|error| format!("Không bắt đầu được transaction tạo lớp: {error}"))?;

        transaction
            .execute(
                "INSERT INTO classes
                 (academic_year_id, name, grade, start_month, end_month, status, monthly_fee, room, note, is_archived, created_at, updated_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, 'active', ?6, ?7, ?8, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
                params![
                    request.academic_year_id,
                    name,
                    request.grade,
                    request.start_month,
                    request.end_month,
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
pub fn update_class_month_range(
    database: tauri::State<'_, AppDatabase>,
    request: UpdateClassMonthRangeRequest,
) -> Result<ClassOverviewDto, String> {
    validate_month_range(&request.start_month, &request.end_month)?;

    database.with_connection_mut(|connection| {
        ensure_class_exists(connection, request.class_id)?;
        let academic_year_id = class_academic_year_id(connection, request.class_id)?;
        validate_month_range_within_academic_year(
            connection,
            academic_year_id,
            &request.start_month,
            &request.end_month,
        )?;

        // Mở rộng khoảng tháng có thể tạo trùng lịch mới với lớp khác — kiểm tra lại
        // lịch cố định hiện có của lớp theo khoảng tháng mới.
        let schedule_items = class_schedule_items(connection, request.class_id)?;
        if !schedule_items.is_empty() {
            validate_fixed_schedule_no_overlap(
                connection,
                Some(request.class_id),
                &request.start_month,
                &request.end_month,
                &schedule_items,
            )?;
        }

        connection
            .execute(
                "UPDATE classes
                 SET start_month = ?1, end_month = ?2, updated_at = CURRENT_TIMESTAMP
                 WHERE id = ?3",
                params![request.start_month, request.end_month, request.class_id],
            )
            .map_err(|error| format!("Không cập nhật được thời gian học của lớp: {error}"))?;

        get_class_overview(connection, request.class_id)
    })
}

#[tauri::command]
pub fn complete_class(
    database: tauri::State<'_, AppDatabase>,
    request: CompleteClassRequest,
) -> Result<ClassOverviewDto, String> {
    crate::months::validate_month(&request.end_month)?;

    database.with_connection_mut(|connection| {
        ensure_class_exists(connection, request.class_id)?;

        let start_month: String = connection
            .query_row(
                "SELECT start_month FROM classes WHERE id = ?1",
                params![request.class_id],
                |row| row.get(0),
            )
            .map_err(|error| format!("Không đọc được tháng bắt đầu của lớp: {error}"))?;

        if request.end_month < start_month {
            return Err("Tháng kết thúc không được trước tháng bắt đầu của lớp.".to_string());
        }

        let academic_year_id = class_academic_year_id(connection, request.class_id)?;
        validate_month_range_within_academic_year(
            connection,
            academic_year_id,
            &start_month,
            &request.end_month,
        )?;

        connection
            .execute(
                "UPDATE classes
                 SET end_month = ?1, status = 'completed', updated_at = CURRENT_TIMESTAMP
                 WHERE id = ?2",
                params![request.end_month, request.class_id],
            )
            .map_err(|error| format!("Không kết thúc được lớp học: {error}"))?;

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

        let (class_start_month, class_end_month): (String, String) = connection
            .query_row(
                "SELECT start_month, end_month FROM classes WHERE id = ?1",
                params![request.class_id],
                |row| Ok((row.get(0)?, row.get(1)?)),
            )
            .map_err(|error| format!("Không đọc được thời gian học của lớp: {error}"))?;
        validate_fixed_schedule_no_overlap(
            connection,
            Some(request.class_id),
            &class_start_month,
            &class_end_month,
            &request.schedule_items,
        )?;

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
        prune_future_regular_attendance_sessions(&transaction, request.class_id)?;
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
            "SELECT id, academic_year_id, name, grade, start_month, end_month, status, monthly_fee, room, note
             FROM classes
             WHERE id = ?1 AND is_archived = 0",
            params![class_id],
            |row| {
                Ok((
                    row.get::<_, i64>(0)?,
                    row.get::<_, i64>(1)?,
                    row.get::<_, String>(2)?,
                    row.get::<_, Option<i64>>(3)?,
                    row.get::<_, String>(4)?,
                    row.get::<_, String>(5)?,
                    row.get::<_, String>(6)?,
                    row.get::<_, i64>(7)?,
                    row.get::<_, Option<String>>(8)?,
                    row.get::<_, Option<String>>(9)?,
                ))
            },
        )
        .optional()
        .map_err(|error| format!("Không đọc được lớp học: {error}"))?
        .ok_or_else(|| "Không tìm thấy lớp học.".to_string())?;

    let schedule_items = schedule_items_for_class(connection, class_row.0)?;
    let schedule = format_schedule_text(&schedule_items);
    let student_count = crate::students::count_active_students_by_class(connection, class_row.0)?;
    let unpaid_count =
        crate::payments::count_unpaid_by_class_current_month(connection, class_row.0)?;

    Ok(ClassOverviewDto {
        id: class_row.0,
        academic_year_id: class_row.1,
        name: class_row.2,
        grade: class_row.3.unwrap_or(9),
        start_month: class_row.4,
        end_month: class_row.5,
        status: class_row.6,
        schedule,
        schedule_items,
        monthly_fee: class_row.7,
        room: class_row
            .8
            .filter(|value| !value.trim().is_empty())
            .unwrap_or_else(|| "Phòng học nhà thầy".to_string()),
        note: class_row.9,
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

fn prune_future_regular_attendance_sessions(
    transaction: &rusqlite::Transaction<'_>,
    class_id: i64,
) -> Result<(), String> {
    transaction
        .execute(
            "DELETE FROM attendance_sessions
             WHERE class_id = ?1
               AND type = 'regular'
               AND session_date >= date('now', 'localtime')
               AND NOT EXISTS (
                 SELECT 1
                 FROM attendance_records ar
                 WHERE ar.session_id = attendance_sessions.id
               )",
            params![class_id],
        )
        .map_err(|error| format!("Không đồng bộ được buổi điểm danh tương lai: {error}"))?;

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

fn class_academic_year_id(connection: &Connection, class_id: i64) -> Result<i64, String> {
    connection
        .query_row(
            "SELECT academic_year_id FROM classes WHERE id = ?1 AND is_archived = 0",
            params![class_id],
            |row| row.get::<_, i64>(0),
        )
        .optional()
        .map_err(|error| format!("Không đọc được năm học của lớp: {error}"))?
        .ok_or_else(|| "Không tìm thấy lớp học.".to_string())
}

fn validate_class_name(name: &str) -> Result<(), String> {
    if name.trim().is_empty() {
        return Err("Tên lớp không được để trống.".to_string());
    }

    Ok(())
}

fn validate_month_range(start_month: &str, end_month: &str) -> Result<(), String> {
    crate::months::validate_month(start_month)
        .map_err(|_| "Tháng bắt đầu không hợp lệ, cần định dạng YYYY-MM.".to_string())?;
    crate::months::validate_month(end_month)
        .map_err(|_| "Tháng kết thúc không hợp lệ, cần định dạng YYYY-MM.".to_string())?;

    if start_month > end_month {
        return Err("Tháng bắt đầu phải trước hoặc bằng tháng kết thúc.".to_string());
    }

    Ok(())
}

fn validate_month_range_within_academic_year(
    connection: &Connection,
    academic_year_id: i64,
    start_month: &str,
    end_month: &str,
) -> Result<(), String> {
    let (min_month, max_month) = academic_year_month_bounds(connection, academic_year_id)?;

    if start_month < min_month.as_str() || end_month > max_month.as_str() {
        return Err(format!(
            "Thời gian học của lớp phải nằm trong hai năm của năm học ({} - {}).",
            crate::months::format_month_label(&min_month),
            crate::months::format_month_label(&max_month)
        ));
    }

    Ok(())
}

fn academic_year_month_bounds(
    connection: &Connection,
    academic_year_id: i64,
) -> Result<(String, String), String> {
    let (starts_at, ends_at) = connection
        .query_row(
            "SELECT starts_at, ends_at FROM academic_years WHERE id = ?1",
            params![academic_year_id],
            |row| Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?)),
        )
        .optional()
        .map_err(|error| format!("Không đọc được năm học: {error}"))?
        .ok_or_else(|| "Không tìm thấy năm học.".to_string())?;

    Ok((
        format!("{}-01", &starts_at[..4]),
        format!("{}-12", &ends_at[..4]),
    ))
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

        if !is_valid_time_text(&item.start_time) || !is_valid_time_text(&item.end_time) {
            return Err("Giờ học không hợp lệ, cần định dạng HH:MM.".to_string());
        }

        if item.end_time <= item.start_time {
            return Err("Giờ kết thúc phải sau giờ bắt đầu.".to_string());
        }
    }

    // Các buổi trong CÙNG lớp không được trùng khoảng giờ trên cùng một thứ.
    for (first_index, first) in schedule_items.iter().enumerate() {
        for second in schedule_items.iter().skip(first_index + 1) {
            if first.weekday == second.weekday
                && times_overlap(&first.start_time, &first.end_time, &second.start_time, &second.end_time)
            {
                return Err("Các buổi học trong cùng lớp không được trùng giờ.".to_string());
            }
        }
    }

    Ok(())
}

fn is_valid_time_text(value: &str) -> bool {
    let bytes = value.as_bytes();
    if bytes.len() != 5 || bytes[2] != b':' {
        return false;
    }

    let hours = &value[0..2];
    let minutes = &value[3..5];
    match (hours.parse::<u32>(), minutes.parse::<u32>()) {
        (Ok(hours), Ok(minutes)) => hours <= 23 && minutes <= 59,
        _ => false,
    }
}

fn times_overlap(a_start: &str, a_end: &str, b_start: &str, b_end: &str) -> bool {
    a_start < b_end && b_start < a_end
}

/// Rule một-giáo-viên: lịch cố định không được trùng khoảng giờ với lớp khác có
/// khoảng tháng hoạt động giao nhau (kể cả khác khối/khác năm học), và không được
/// trùng với buổi học bù cả lớp đang active. Backend là source of truth.
fn validate_fixed_schedule_no_overlap(
    connection: &Connection,
    exclude_class_id: Option<i64>,
    start_month: &str,
    end_month: &str,
    schedule_items: &[ClassScheduleItemDto],
) -> Result<(), String> {
    // Lịch cố định của các lớp khác có khoảng tháng giao nhau (dựa trên start/end month
    // thật của lớp, không dựa vào academic_year_id hay status).
    let mut statement = connection
        .prepare(
            "SELECT c.name, cs.weekday, cs.start_time, cs.end_time
             FROM classes c
             JOIN class_schedules cs ON cs.class_id = c.id
             WHERE c.is_archived = 0
               AND c.id != COALESCE(?1, -1)
               AND c.start_month <= ?3
               AND ?2 <= c.end_month",
        )
        .map_err(|error| format!("Không chuẩn bị được kiểm tra trùng lịch: {error}"))?;

    let other_schedules = statement
        .query_map(params![exclude_class_id, start_month, end_month], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, i64>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, String>(3)?,
            ))
        })
        .map_err(|error| format!("Không đọc được lịch học các lớp khác: {error}"))?;

    let mut conflicts = Vec::new();
    for row in other_schedules {
        conflicts.push(row.map_err(|error| format!("Không parse được lịch học: {error}"))?);
    }

    for item in schedule_items {
        for (class_name, weekday, other_start, other_end) in &conflicts {
            if item.weekday == *weekday
                && times_overlap(&item.start_time, &item.end_time, other_start, other_end)
            {
                return Err(format!(
                    "Lịch học bị trùng với lớp {class_name} vào {}, {other_start} - {other_end}.",
                    weekday_label(*weekday)
                ));
            }
        }
    }

    // Buổi học bù cả lớp đang active trong khoảng tháng của lớp (mọi lớp, kể cả chính nó).
    let mut makeup_statement = connection
        .prepare(
            "SELECT c.name, a.session_date, a.start_time, a.end_time,
                    CAST(strftime('%w', a.session_date) AS INTEGER)
             FROM attendance_sessions a
             JOIN classes c ON c.id = a.class_id
             WHERE a.type = 'class_makeup'
               AND a.status = 'active'
               AND c.is_archived = 0
               AND substr(a.session_date, 1, 7) >= ?1
               AND substr(a.session_date, 1, 7) <= ?2",
        )
        .map_err(|error| format!("Không chuẩn bị được kiểm tra buổi học bù: {error}"))?;

    let makeup_rows = makeup_statement
        .query_map(params![start_month, end_month], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, String>(3)?,
                row.get::<_, i64>(4)?,
            ))
        })
        .map_err(|error| format!("Không đọc được buổi học bù: {error}"))?;

    let mut makeup_sessions = Vec::new();
    for row in makeup_rows {
        makeup_sessions.push(row.map_err(|error| format!("Không parse được buổi học bù: {error}"))?);
    }

    for item in schedule_items {
        for (class_name, session_date, other_start, other_end, weekday) in &makeup_sessions {
            if item.weekday == *weekday
                && times_overlap(&item.start_time, &item.end_time, other_start, other_end)
            {
                return Err(format!(
                    "Lịch học bị trùng với buổi học bù của lớp {class_name} vào {}, {other_start} - {other_end}.",
                    format_date_label(session_date)
                ));
            }
        }
    }

    Ok(())
}

fn format_date_label(date: &str) -> String {
    let mut parts = date.splitn(3, '-');
    match (parts.next(), parts.next(), parts.next()) {
        (Some(year), Some(month), Some(day)) => format!("{day}/{month}/{year}"),
        _ => date.to_string(),
    }
}

fn class_schedule_items(
    connection: &Connection,
    class_id: i64,
) -> Result<Vec<ClassScheduleItemDto>, String> {
    let mut statement = connection
        .prepare(
            "SELECT weekday, start_time, end_time
             FROM class_schedules
             WHERE class_id = ?1
             ORDER BY CASE WHEN weekday = 0 THEN 7 ELSE weekday END ASC, start_time ASC, sort_order ASC",
        )
        .map_err(|error| format!("Không chuẩn bị được lịch học của lớp: {error}"))?;

    let rows = statement
        .query_map(params![class_id], |row| {
            Ok(ClassScheduleItemDto {
                weekday: row.get(0)?,
                start_time: row.get(1)?,
                end_time: row.get(2)?,
            })
        })
        .map_err(|error| format!("Không đọc được lịch học của lớp: {error}"))?;

    collect_rows(rows, "Không parse được lịch học")
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
