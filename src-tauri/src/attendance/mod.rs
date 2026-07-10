use std::collections::HashMap;

use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};

use crate::db::AppDatabase;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AttendanceWeekDto {
    class_id: i64,
    week_start: String,
    sessions: Vec<AttendanceSessionDto>,
    official_rows: Vec<AttendanceOfficialRowDto>,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AttendanceSessionDto {
    id: i64,
    class_id: i64,
    session_date: String,
    start_time: String,
    end_time: String,
    session_index_in_week: i64,
    r#type: String,
    status: String,
    is_locked: bool,
    makeup_for_session_id: Option<i64>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AttendanceOfficialRowDto {
    id: i64,
    membership_id: i64,
    student_id: i64,
    class_id: i64,
    full_name: String,
    school_class: String,
    school: String,
    parent_phone: String,
    status: String,
    joined_month: String,
    left_month: Option<String>,
    note: Option<String>,
    attendance_by_session_id: HashMap<i64, Option<String>>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SetAttendanceStatusRequest {
    session_id: i64,
    membership_id: i64,
    student_id: i64,
    status: Option<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ToggleAttendanceLockRequest {
    session_id: i64,
    is_locked: bool,
}

struct ClassRange {
    start_month: String,
    end_month: String,
}

struct ScheduleRow {
    weekday: i64,
    start_time: String,
    end_time: String,
}

#[tauri::command]
pub fn get_attendance_week(
    database: tauri::State<'_, AppDatabase>,
    class_id: i64,
    week_start: String,
) -> Result<AttendanceWeekDto, String> {
    validate_date_key(&week_start)?;

    database.with_connection_mut(|connection| {
        let class_range = load_class_range(connection, class_id)?;
        materialize_regular_sessions(connection, class_id, &week_start, &class_range)?;
        let week_end = sqlite_date(connection, &week_start, 6)?;
        let sessions = list_sessions_for_week(connection, class_id, &week_start, &week_end)?;
        let official_rows = list_attendance_rows(connection, class_id, &sessions)?;

        Ok(AttendanceWeekDto {
            class_id,
            week_start,
            sessions,
            official_rows,
        })
    })
}

#[tauri::command]
pub fn set_attendance_status(
    database: tauri::State<'_, AppDatabase>,
    request: SetAttendanceStatusRequest,
) -> Result<(), String> {
    if let Some(status) = request.status.as_deref() {
        validate_attendance_status(status)?;
    }

    database.with_connection_mut(|connection| {
        let transaction = connection
            .transaction()
            .map_err(|error| format!("Không bắt đầu được transaction điểm danh: {error}"))?;

        let session = load_session_for_write(&transaction, request.session_id)?;

        if session.status == "cancelled" {
            return Err(
                "Buổi học này đang nghỉ, không thể sửa điểm danh từng học sinh.".to_string(),
            );
        }

        if session.is_locked {
            return Err(
                "Buổi học đang khóa. Vui lòng mở khóa trước khi sửa điểm danh.".to_string(),
            );
        }

        validate_membership_for_session(
            &transaction,
            request.membership_id,
            request.student_id,
            session.class_id,
            &session.session_date,
        )?;

        match request.status {
            Some(status) => {
                transaction
                    .execute(
                        "INSERT INTO attendance_records
                         (session_id, membership_id, student_id, status, created_at, updated_at)
                         VALUES (?1, ?2, ?3, ?4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                         ON CONFLICT(session_id, membership_id) DO UPDATE SET
                           student_id = excluded.student_id,
                           status = excluded.status,
                           updated_at = CURRENT_TIMESTAMP",
                        params![
                            request.session_id,
                            request.membership_id,
                            request.student_id,
                            status
                        ],
                    )
                    .map_err(|error| format!("Không lưu được điểm danh: {error}"))?;
            }
            None => {
                transaction
                    .execute(
                        "DELETE FROM attendance_records
                         WHERE session_id = ?1 AND membership_id = ?2",
                        params![request.session_id, request.membership_id],
                    )
                    .map_err(|error| format!("Không xóa được trạng thái điểm danh: {error}"))?;
            }
        }

        transaction
            .commit()
            .map_err(|error| format!("Không commit được điểm danh: {error}"))
    })
}

#[tauri::command]
pub fn toggle_attendance_lock(
    database: tauri::State<'_, AppDatabase>,
    request: ToggleAttendanceLockRequest,
) -> Result<AttendanceSessionDto, String> {
    database.with_connection_mut(|connection| {
        let updated = connection
            .execute(
                "UPDATE attendance_sessions
                 SET is_locked = ?1, updated_at = CURRENT_TIMESTAMP
                 WHERE id = ?2",
                params![if request.is_locked { 1 } else { 0 }, request.session_id],
            )
            .map_err(|error| format!("Không cập nhật được khóa điểm danh: {error}"))?;

        if updated == 0 {
            return Err("Không tìm thấy buổi học.".to_string());
        }

        load_session_dto(connection, request.session_id)
    })
}

#[tauri::command]
pub fn mark_session_present(
    database: tauri::State<'_, AppDatabase>,
    session_id: i64,
) -> Result<(), String> {
    database.with_connection_mut(|connection| {
        let transaction = connection.transaction().map_err(|error| {
            format!("Không bắt đầu được transaction đánh dấu cả lớp đi học: {error}")
        })?;

        let session = load_session_for_write(&transaction, session_id)?;

        if session.status == "cancelled" {
            return Err("Buổi học này đang nghỉ.".to_string());
        }

        if session.is_locked {
            return Err("Buổi học đang khóa. Vui lòng mở khóa trước.".to_string());
        }

        let session_month = month_from_date(&session.session_date)?;
        let mut statement = transaction
            .prepare(
                "SELECT cm.id, cm.student_id
                 FROM class_memberships cm
                 JOIN students s ON s.id = cm.student_id
                 WHERE cm.class_id = ?1
                   AND s.is_archived = 0
                   AND cm.joined_month <= ?2
                   AND (cm.left_month IS NULL OR ?2 < cm.left_month)",
            )
            .map_err(|error| {
                format!("Không chuẩn bị được danh sách học sinh điểm danh: {error}")
            })?;

        let rows = statement
            .query_map(params![session.class_id, session_month], |row| {
                Ok((row.get::<_, i64>(0)?, row.get::<_, i64>(1)?))
            })
            .map_err(|error| format!("Không đọc được danh sách học sinh điểm danh: {error}"))?;

        let mut memberships = Vec::new();
        for row in rows {
            memberships.push(
                row.map_err(|error| format!("Không parse được học sinh điểm danh: {error}"))?,
            );
        }
        drop(statement);

        for (membership_id, student_id) in memberships {
            transaction
                .execute(
                    "INSERT INTO attendance_records
                     (session_id, membership_id, student_id, status, created_at, updated_at)
                     VALUES (?1, ?2, ?3, 'present', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                     ON CONFLICT(session_id, membership_id) DO UPDATE SET
                       student_id = excluded.student_id,
                       status = 'present',
                       updated_at = CURRENT_TIMESTAMP",
                    params![session_id, membership_id, student_id],
                )
                .map_err(|error| format!("Không đánh dấu cả lớp đi học: {error}"))?;
        }

        transaction
            .commit()
            .map_err(|error| format!("Không commit được thao tác điểm danh cả lớp: {error}"))
    })
}

fn materialize_regular_sessions(
    connection: &Connection,
    class_id: i64,
    week_start: &str,
    class_range: &ClassRange,
) -> Result<(), String> {
    let schedules = list_schedules(connection, class_id)?;
    let today = current_local_date(connection)?;

    for (index, schedule) in schedules.iter().enumerate() {
        let offset = weekday_to_week_offset(schedule.weekday)?;
        let session_date = sqlite_date(connection, week_start, offset)?;
        let session_month = month_from_date(&session_date)?;

        if session_date.as_str() < today.as_str() {
            continue;
        }

        if session_month < class_range.start_month || session_month > class_range.end_month {
            continue;
        }

        let updated_count = connection
            .execute(
                "UPDATE attendance_sessions
                 SET start_time = ?1,
                     end_time = ?2,
                     session_index_in_week = ?3,
                     updated_at = CURRENT_TIMESTAMP
                 WHERE class_id = ?4
                   AND session_date = ?5
                   AND type = 'regular'",
                params![
                    schedule.start_time,
                    schedule.end_time,
                    (index as i64) + 1,
                    class_id,
                    session_date
                ],
            )
            .map_err(|error| format!("Không cập nhật được buổi điểm danh theo lịch: {error}"))?;

        if updated_count > 0 {
            continue;
        }

        connection
            .execute(
                "INSERT INTO attendance_sessions
                 (class_id, session_date, start_time, end_time, session_index_in_week, type, status, is_locked, created_at, updated_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, 'regular', 'active', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                 ON CONFLICT(class_id, session_date, session_index_in_week, type) WHERE type = 'regular'
                 DO NOTHING",
                params![
                    class_id,
                    session_date,
                    schedule.start_time,
                    schedule.end_time,
                    (index as i64) + 1
                ],
            )
            .map_err(|error| format!("Không tạo được buổi điểm danh theo lịch: {error}"))?;
    }

    Ok(())
}

fn current_local_date(connection: &Connection) -> Result<String, String> {
    connection
        .query_row("SELECT date('now', 'localtime')", [], |row| row.get(0))
        .map_err(|error| format!("Không đọc được ngày hiện tại: {error}"))
}

fn list_schedules(connection: &Connection, class_id: i64) -> Result<Vec<ScheduleRow>, String> {
    let mut statement = connection
        .prepare(
            "SELECT weekday, start_time, end_time
             FROM class_schedules
             WHERE class_id = ?1
             ORDER BY sort_order ASC, CASE WHEN weekday = 0 THEN 7 ELSE weekday END ASC, start_time ASC",
        )
        .map_err(|error| format!("Không chuẩn bị được lịch học của lớp: {error}"))?;

    let rows = statement
        .query_map(params![class_id], |row| {
            Ok(ScheduleRow {
                weekday: row.get(0)?,
                start_time: row.get(1)?,
                end_time: row.get(2)?,
            })
        })
        .map_err(|error| format!("Không đọc được lịch học của lớp: {error}"))?;

    collect_rows(rows, "Không parse được lịch học")
}

fn list_sessions_for_week(
    connection: &Connection,
    class_id: i64,
    week_start: &str,
    week_end: &str,
) -> Result<Vec<AttendanceSessionDto>, String> {
    let mut statement = connection
        .prepare(
            "SELECT id, class_id, session_date, start_time, end_time, session_index_in_week,
                    type, status, is_locked, makeup_for_session_id
             FROM attendance_sessions
             WHERE class_id = ?1
               AND session_date BETWEEN ?2 AND ?3
               AND type = 'regular'
             ORDER BY session_date ASC, start_time ASC, id ASC",
        )
        .map_err(|error| format!("Không chuẩn bị được buổi điểm danh trong tuần: {error}"))?;

    let rows = statement
        .query_map(params![class_id, week_start, week_end], map_session_dto)
        .map_err(|error| format!("Không đọc được buổi điểm danh trong tuần: {error}"))?;

    collect_rows(rows, "Không parse được buổi điểm danh")
}

fn list_attendance_rows(
    connection: &Connection,
    class_id: i64,
    sessions: &[AttendanceSessionDto],
) -> Result<Vec<AttendanceOfficialRowDto>, String> {
    let Some(first_session) = sessions.first() else {
        return Ok(Vec::new());
    };
    let Some(last_session) = sessions.last() else {
        return Ok(Vec::new());
    };
    let min_month = month_from_date(&first_session.session_date)?;
    let max_month = month_from_date(&last_session.session_date)?;
    let session_ids: Vec<i64> = sessions.iter().map(|session| session.id).collect();

    let mut statement = connection
        .prepare(
            "SELECT
               cm.id,
               s.id,
               cm.class_id,
               s.full_name,
               s.school_class,
               s.school,
               s.parent_phone,
               cm.status,
               cm.joined_month,
               cm.left_month,
               s.note
             FROM class_memberships cm
             JOIN students s ON s.id = cm.student_id
             WHERE cm.class_id = ?1
               AND s.is_archived = 0
               AND cm.joined_month <= ?2
               AND (cm.left_month IS NULL OR ?3 < cm.left_month)
             ORDER BY s.full_name COLLATE NOCASE ASC, cm.id ASC",
        )
        .map_err(|error| format!("Không chuẩn bị được roster điểm danh: {error}"))?;

    let rows = statement
        .query_map(params![class_id, max_month, min_month], |row| {
            Ok(AttendanceOfficialRowDto {
                id: row.get(1)?,
                membership_id: row.get(0)?,
                student_id: row.get(1)?,
                class_id: row.get(2)?,
                full_name: row.get(3)?,
                school_class: row.get(4)?,
                school: row.get(5)?,
                parent_phone: row.get(6)?,
                status: row.get(7)?,
                joined_month: row.get(8)?,
                left_month: row.get(9)?,
                note: row.get(10)?,
                attendance_by_session_id: HashMap::new(),
            })
        })
        .map_err(|error| format!("Không đọc được roster điểm danh: {error}"))?;

    let mut official_rows = collect_rows(rows, "Không parse được roster điểm danh")?;
    drop(statement);

    for row in official_rows.iter_mut() {
        for session in sessions {
            let session_month = month_from_date(&session.session_date)?;
            if row.joined_month <= session_month
                && (row.left_month.is_none()
                    || session_month < row.left_month.clone().unwrap_or_default())
            {
                row.attendance_by_session_id.insert(session.id, None);
            }
        }
    }

    if session_ids.is_empty() || official_rows.is_empty() {
        return Ok(official_rows);
    }

    let placeholders = session_ids
        .iter()
        .map(|id| id.to_string())
        .collect::<Vec<_>>()
        .join(",");
    let sql = format!(
        "SELECT session_id, membership_id, status
         FROM attendance_records
         WHERE session_id IN ({placeholders})"
    );
    let mut record_statement = connection
        .prepare(&sql)
        .map_err(|error| format!("Không chuẩn bị được trạng thái điểm danh: {error}"))?;
    let records = record_statement
        .query_map([], |row| {
            Ok((
                row.get::<_, i64>(0)?,
                row.get::<_, i64>(1)?,
                row.get::<_, String>(2)?,
            ))
        })
        .map_err(|error| format!("Không đọc được trạng thái điểm danh: {error}"))?;

    let mut record_map = HashMap::new();
    for record in records {
        let (session_id, membership_id, status) =
            record.map_err(|error| format!("Không parse được trạng thái điểm danh: {error}"))?;
        record_map.insert((session_id, membership_id), status);
    }

    for row in official_rows.iter_mut() {
        for session in sessions {
            if !row.attendance_by_session_id.contains_key(&session.id) {
                continue;
            }

            if let Some(status) = record_map.get(&(session.id, row.membership_id)) {
                row.attendance_by_session_id
                    .insert(session.id, Some(status.clone()));
            }
        }
    }

    Ok(official_rows)
}

fn load_class_range(connection: &Connection, class_id: i64) -> Result<ClassRange, String> {
    connection
        .query_row(
            "SELECT start_month, end_month
             FROM classes
             WHERE id = ?1 AND is_archived = 0",
            params![class_id],
            |row| {
                Ok(ClassRange {
                    start_month: row.get(0)?,
                    end_month: row.get(1)?,
                })
            },
        )
        .optional()
        .map_err(|error| format!("Không đọc được thời gian học của lớp: {error}"))?
        .ok_or_else(|| "Không tìm thấy lớp học.".to_string())
}

fn load_session_dto(
    connection: &Connection,
    session_id: i64,
) -> Result<AttendanceSessionDto, String> {
    connection
        .query_row(
            "SELECT id, class_id, session_date, start_time, end_time, session_index_in_week,
                    type, status, is_locked, makeup_for_session_id
             FROM attendance_sessions
             WHERE id = ?1",
            params![session_id],
            map_session_dto,
        )
        .optional()
        .map_err(|error| format!("Không đọc được buổi học: {error}"))?
        .ok_or_else(|| "Không tìm thấy buổi học.".to_string())
}

fn load_session_for_write(
    connection: &Connection,
    session_id: i64,
) -> Result<AttendanceSessionDto, String> {
    load_session_dto(connection, session_id)
}

fn validate_membership_for_session(
    connection: &Connection,
    membership_id: i64,
    student_id: i64,
    class_id: i64,
    session_date: &str,
) -> Result<(), String> {
    let session_month = month_from_date(session_date)?;
    let exists = connection
        .query_row(
            "SELECT cm.id
             FROM class_memberships cm
             JOIN students s ON s.id = cm.student_id
             WHERE cm.id = ?1
               AND cm.student_id = ?2
               AND cm.class_id = ?3
               AND s.is_archived = 0
               AND cm.joined_month <= ?4
               AND (cm.left_month IS NULL OR ?4 < cm.left_month)",
            params![membership_id, student_id, class_id, session_month],
            |row| row.get::<_, i64>(0),
        )
        .optional()
        .map_err(|error| format!("Không kiểm tra được học sinh của buổi học: {error}"))?;

    exists
        .map(|_| ())
        .ok_or_else(|| "Học sinh không thuộc lớp trong thời điểm của buổi học.".to_string())
}

fn map_session_dto(row: &rusqlite::Row<'_>) -> rusqlite::Result<AttendanceSessionDto> {
    let is_locked: i64 = row.get(8)?;

    Ok(AttendanceSessionDto {
        id: row.get(0)?,
        class_id: row.get(1)?,
        session_date: row.get(2)?,
        start_time: row.get(3)?,
        end_time: row.get(4)?,
        session_index_in_week: row.get(5)?,
        r#type: row.get(6)?,
        status: row.get(7)?,
        is_locked: is_locked != 0,
        makeup_for_session_id: row.get(9)?,
    })
}

fn sqlite_date(
    connection: &Connection,
    start_date: &str,
    offset_days: i64,
) -> Result<String, String> {
    let modifier = format!("+{offset_days} days");
    connection
        .query_row(
            "SELECT date(?1, ?2)",
            params![start_date, modifier],
            |row| row.get(0),
        )
        .map_err(|error| format!("Không tính được ngày điểm danh: {error}"))
}

fn weekday_to_week_offset(weekday: i64) -> Result<i64, String> {
    match weekday {
        0 => Ok(6),
        1..=6 => Ok(weekday - 1),
        _ => Err("Thứ trong tuần không hợp lệ.".to_string()),
    }
}

fn month_from_date(date: &str) -> Result<String, String> {
    if date.len() < 7 {
        return Err("Ngày học không hợp lệ.".to_string());
    }

    Ok(date[..7].to_string())
}

fn validate_date_key(date: &str) -> Result<(), String> {
    let parts: Vec<&str> = date.split('-').collect();
    if parts.len() != 3
        || parts[0].len() != 4
        || parts[1].len() != 2
        || parts[2].len() != 2
        || parts
            .iter()
            .any(|part| !part.chars().all(|char| char.is_ascii_digit()))
    {
        return Err("Ngày điểm danh không hợp lệ, cần định dạng YYYY-MM-DD.".to_string());
    }

    Ok(())
}

fn validate_attendance_status(status: &str) -> Result<(), String> {
    match status {
        "present" | "absent" => Ok(()),
        "makeup" => Err(
            "Học bù theo học sinh sẽ được lưu ở Phase 7C; Phase 7A chỉ lưu Có học/Nghỉ."
                .to_string(),
        ),
        _ => Err("Trạng thái điểm danh không hợp lệ.".to_string()),
    }
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
