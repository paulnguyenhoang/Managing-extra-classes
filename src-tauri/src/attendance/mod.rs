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
    upcoming_makeup_sessions: Vec<AttendanceSessionDto>,
    official_rows: Vec<AttendanceOfficialRowDto>,
    receiving_makeup_rows: Vec<AttendanceReceivingMakeupRowDto>,
    makeup_details: Vec<AttendanceMakeupDetailDto>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AttendanceReceivingMakeupRowDto {
    makeup_record_id: i64,
    student_id: i64,
    original_membership_id: i64,
    original_class_id: i64,
    original_class_name: String,
    original_session_id: i64,
    original_session_date: String,
    receiving_class_id: i64,
    receiving_session_id: i64,
    session_index_in_week: i64,
    full_name: String,
    school_class: String,
    school: String,
    parent_phone: String,
    receiving_attendance_status: Option<String>,
    note: Option<String>,
}

/// Thông tin học bù của học sinh chính thức (lớp gốc) để hiển thị helper text.
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AttendanceMakeupDetailDto {
    makeup_record_id: i64,
    original_membership_id: i64,
    original_session_id: i64,
    receiving_class_id: i64,
    receiving_class_name: String,
    receiving_session_id: i64,
    receiving_session_date: String,
    receiving_start_time: String,
    receiving_end_time: String,
    receiving_attendance_status: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StudentMakeupOptionDto {
    receiving_class_id: i64,
    receiving_class_name: String,
    receiving_session_id: i64,
    receiving_session_date: String,
    start_time: String,
    end_time: String,
    session_index_in_week: i64,
    r#type: String,
    status: String,
    is_locked: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StudentMakeupOptionsDto {
    student_id: i64,
    membership_id: i64,
    original_class_id: i64,
    original_class_name: String,
    original_session_id: i64,
    original_session_date: String,
    session_index_in_week: i64,
    options: Vec<StudentMakeupOptionDto>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateStudentMakeupRecordRequest {
    student_id: i64,
    original_membership_id: i64,
    original_session_id: i64,
    receiving_session_id: i64,
    note: Option<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RemoveStudentMakeupRecordRequest {
    original_session_id: i64,
    original_membership_id: i64,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SetReceivingMakeupStatusRequest {
    makeup_record_id: i64,
    status: Option<String>,
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

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateClassMakeupSessionRequest {
    class_id: i64,
    original_session_id: i64,
    makeup_date: String,
    start_time: String,
    end_time: String,
    note: Option<String>,
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
        materialize_regular_sessions(connection, class_id, &week_start, &class_range, false)?;
        let week_end = sqlite_date(connection, &week_start, 6)?;
        let sessions = list_sessions_for_week(connection, class_id, &week_start, &week_end)?;
        let upcoming_makeup_sessions = list_upcoming_makeup_sessions(connection, class_id)?;
        let official_rows = list_attendance_rows(connection, class_id, &sessions)?;
        let session_ids: Vec<i64> = sessions.iter().map(|session| session.id).collect();
        let receiving_makeup_rows = list_receiving_makeup_rows(connection, class_id, &session_ids)?;
        let makeup_details = list_makeup_details(connection, class_id, &session_ids)?;

        Ok(AttendanceWeekDto {
            class_id,
            week_start,
            sessions,
            upcoming_makeup_sessions,
            official_rows,
            receiving_makeup_rows,
            makeup_details,
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

        // Đổi trạng thái trực tiếp (Học/Nghỉ/Chưa điểm danh) luôn gỡ liên kết học bù cũ —
        // dòng học bù ở lớp nhận sẽ biến mất sau khi refresh.
        transaction
            .execute(
                "DELETE FROM student_makeup_records
                 WHERE original_session_id = ?1 AND original_membership_id = ?2",
                params![request.session_id, request.membership_id],
            )
            .map_err(|error| format!("Không gỡ được liên kết học bù cũ: {error}"))?;

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
                 WHERE id = ?2 AND status = 'active'",
                params![if request.is_locked { 1 } else { 0 }, request.session_id],
            )
            .map_err(|error| format!("Không cập nhật được khóa điểm danh: {error}"))?;

        if updated == 0 {
            return Err("Không tìm thấy buổi học đang hoạt động để đổi khóa.".to_string());
        }

        load_session_dto(connection, request.session_id)
    })
}

#[tauri::command]
pub fn cancel_attendance_session(
    database: tauri::State<'_, AppDatabase>,
    session_id: i64,
) -> Result<AttendanceSessionDto, String> {
    database.with_connection_mut(|connection| {
        let transaction = connection
            .transaction()
            .map_err(|error| format!("Không bắt đầu được transaction nghỉ buổi học: {error}"))?;
        let session = load_session_for_write(&transaction, session_id)?;

        if session.r#type != "regular" {
            return Err("Chỉ buổi học thường mới có thể chuyển sang nghỉ.".to_string());
        }

        transaction
            .execute(
                "UPDATE attendance_sessions
                 SET status = 'cancelled', is_locked = 1, updated_at = CURRENT_TIMESTAMP
                 WHERE id = ?1",
                params![session_id],
            )
            .map_err(|error| format!("Không chuyển được buổi học sang nghỉ: {error}"))?;
        upsert_official_attendance(&transaction, &session, "absent")?;
        clear_makeup_links_for_cancelled_session(&transaction, session_id)?;
        transaction
            .commit()
            .map_err(|error| format!("Không commit được buổi nghỉ: {error}"))?;

        load_session_dto(connection, session_id)
    })
}

#[tauri::command]
pub fn restore_attendance_session(
    database: tauri::State<'_, AppDatabase>,
    session_id: i64,
) -> Result<AttendanceSessionDto, String> {
    database.with_connection_mut(|connection| {
        let transaction = connection.transaction().map_err(|error| {
            format!("Không bắt đầu được transaction khôi phục buổi học: {error}")
        })?;
        let session = load_session_for_write(&transaction, session_id)?;

        if session.r#type != "regular" {
            return Err("Chỉ buổi học thường mới có thể khôi phục theo cách này.".to_string());
        }

        let has_makeup = transaction
            .query_row(
                "SELECT id FROM attendance_sessions
                 WHERE makeup_for_session_id = ?1 AND type = 'class_makeup' LIMIT 1",
                params![session_id],
                |row| row.get::<_, i64>(0),
            )
            .optional()
            .map_err(|error| format!("Không kiểm tra được buổi học bù liên quan: {error}"))?
            .is_some();

        if has_makeup {
            return Err(
                "Buổi này đang có buổi học bù. Vui lòng hủy buổi học bù để mở lại buổi gốc."
                    .to_string(),
            );
        }

        transaction
            .execute(
                "UPDATE attendance_sessions
                 SET status = 'active', is_locked = 0, updated_at = CURRENT_TIMESTAMP
                 WHERE id = ?1",
                params![session_id],
            )
            .map_err(|error| format!("Không khôi phục được buổi học: {error}"))?;
        transaction
            .commit()
            .map_err(|error| format!("Không commit được khôi phục buổi học: {error}"))?;

        load_session_dto(connection, session_id)
    })
}

#[tauri::command]
pub fn create_class_makeup_session(
    database: tauri::State<'_, AppDatabase>,
    request: CreateClassMakeupSessionRequest,
) -> Result<AttendanceSessionDto, String> {
    validate_date_key(&request.makeup_date)?;
    validate_time_range(&request.start_time, &request.end_time)?;

    database.with_connection_mut(|connection| {
        let transaction = connection
            .transaction()
            .map_err(|error| format!("Không bắt đầu được transaction tạo buổi học bù: {error}"))?;
        let original = load_session_for_write(&transaction, request.original_session_id)?;

        if original.class_id != request.class_id {
            return Err("Buổi gốc không thuộc lớp đang chọn.".to_string());
        }
        if original.r#type != "regular" {
            return Err("Buổi gốc phải là một buổi học thường.".to_string());
        }

        validate_makeup_date(&transaction, request.class_id, &request.makeup_date)?;
        validate_no_existing_class_makeup(&transaction, request.original_session_id)?;
        validate_makeup_time_conflict(
            &transaction,
            &request.makeup_date,
            &request.start_time,
            &request.end_time,
        )?;

        transaction
            .execute(
                "INSERT INTO attendance_sessions
                 (class_id, session_date, start_time, end_time, session_index_in_week,
                  type, status, is_locked, makeup_for_session_id, note, created_at, updated_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, 'class_makeup', 'active', 0, ?6, ?7,
                         CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
                params![
                    request.class_id,
                    request.makeup_date,
                    request.start_time,
                    request.end_time,
                    original.session_index_in_week,
                    request.original_session_id,
                    normalize_optional_text(request.note.as_deref())
                ],
            )
            .map_err(|error| format!("Không tạo được buổi học bù: {error}"))?;
        let makeup_session_id = transaction.last_insert_rowid();

        transaction
            .execute(
                "UPDATE attendance_sessions
                 SET status = 'cancelled', is_locked = 1, updated_at = CURRENT_TIMESTAMP
                 WHERE id = ?1",
                params![request.original_session_id],
            )
            .map_err(|error| format!("Không chuyển được buổi gốc sang nghỉ: {error}"))?;
        upsert_official_attendance(&transaction, &original, "absent")?;
        clear_makeup_links_for_cancelled_session(&transaction, request.original_session_id)?;
        transaction
            .commit()
            .map_err(|error| format!("Không commit được buổi học bù: {error}"))?;

        load_session_dto(connection, makeup_session_id)
    })
}

#[tauri::command]
pub fn remove_class_makeup_session(
    database: tauri::State<'_, AppDatabase>,
    makeup_session_id: i64,
) -> Result<AttendanceSessionDto, String> {
    database.with_connection_mut(|connection| {
        let transaction = connection
            .transaction()
            .map_err(|error| format!("Không bắt đầu được transaction hủy buổi học bù: {error}"))?;
        let makeup_session = load_session_for_write(&transaction, makeup_session_id)?;

        if makeup_session.r#type != "class_makeup" {
            return Err("Buổi được chọn không phải buổi học bù cả lớp.".to_string());
        }
        let original_session_id = makeup_session
            .makeup_for_session_id
            .ok_or_else(|| "Buổi học bù không có liên kết tới buổi gốc.".to_string())?;

        transaction
            .execute(
                "DELETE FROM attendance_records WHERE session_id = ?1",
                params![makeup_session_id],
            )
            .map_err(|error| format!("Không xóa được điểm danh của buổi học bù: {error}"))?;
        // Buổi nhận không còn tồn tại: xóa các liên kết học bù trỏ về nó và trả ô gốc
        // của học sinh liên quan về Chưa điểm danh.
        transaction
            .execute(
                "DELETE FROM attendance_records
                 WHERE status = 'makeup'
                   AND (session_id, membership_id) IN (
                     SELECT original_session_id, original_membership_id
                     FROM student_makeup_records
                     WHERE receiving_session_id = ?1
                   )",
                params![makeup_session_id],
            )
            .map_err(|error| {
                format!("Không dọn được trạng thái học bù của buổi gốc liên quan: {error}")
            })?;
        transaction
            .execute(
                "DELETE FROM student_makeup_records WHERE receiving_session_id = ?1",
                params![makeup_session_id],
            )
            .map_err(|error| format!("Không xóa được liên kết học bù trỏ tới buổi này: {error}"))?;
        transaction
            .execute(
                "DELETE FROM attendance_sessions WHERE id = ?1",
                params![makeup_session_id],
            )
            .map_err(|error| format!("Không xóa được buổi học bù: {error}"))?;
        transaction
            .execute(
                "UPDATE attendance_sessions
                 SET status = 'active', is_locked = 0, updated_at = CURRENT_TIMESTAMP
                 WHERE id = ?1",
                params![original_session_id],
            )
            .map_err(|error| format!("Không mở lại được buổi học gốc: {error}"))?;
        transaction
            .commit()
            .map_err(|error| format!("Không commit được thao tác hủy buổi học bù: {error}"))?;

        load_session_dto(connection, original_session_id)
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

        // Đánh dấu luôn các học sinh học bù đang nhận ở buổi này (quy tắc Phase 4.5).
        transaction
            .execute(
                "UPDATE student_makeup_records
                 SET receiving_attendance_status = 'present', updated_at = CURRENT_TIMESTAMP
                 WHERE receiving_session_id = ?1",
                params![session_id],
            )
            .map_err(|error| format!("Không đánh dấu được học sinh học bù đi học: {error}"))?;

        transaction
            .commit()
            .map_err(|error| format!("Không commit được thao tác điểm danh cả lớp: {error}"))
    })
}

#[tauri::command]
pub fn list_student_makeup_options(
    database: tauri::State<'_, AppDatabase>,
    class_id: i64,
    original_session_id: i64,
    membership_id: i64,
    student_id: i64,
) -> Result<StudentMakeupOptionsDto, String> {
    database.with_connection_mut(|connection| {
        let original = load_session_dto(connection, original_session_id)?;

        if original.class_id != class_id {
            return Err("Buổi gốc không thuộc lớp đang chọn.".to_string());
        }
        if original.r#type != "regular" {
            return Err("Chỉ buổi học thường mới chọn được học bù theo học sinh.".to_string());
        }
        if original.status != "active" {
            return Err("Buổi gốc đang nghỉ, không thể chọn học bù.".to_string());
        }

        validate_membership_for_session(
            connection,
            membership_id,
            student_id,
            class_id,
            &original.session_date,
        )?;

        let (original_class_name, original_year_id, original_grade) =
            load_class_meta(connection, class_id)?;

        // Cùng tuần với buổi gốc.
        let week_start = week_start_of_date(connection, &original.session_date)?;
        let original_session_order =
            session_order_for_date(connection, class_id, &original.session_date)?;

        // Các lớp nhận tiềm năng: khác lớp, cùng năm học, cùng khối, đang hoạt động.
        let candidate_classes = {
            let mut statement = connection
                .prepare(
                    "SELECT id, name, start_month, end_month
                     FROM classes
                     WHERE id != ?1
                       AND academic_year_id = ?2
                       AND COALESCE(grade, 9) = ?3
                       AND is_archived = 0
                       AND status = 'active'",
                )
                .map_err(|error| {
                    format!("Không chuẩn bị được danh sách lớp nhận học bù: {error}")
                })?;
            let rows = statement
                .query_map(params![class_id, original_year_id, original_grade], |row| {
                    Ok((
                        row.get::<_, i64>(0)?,
                        row.get::<_, String>(1)?,
                        row.get::<_, String>(2)?,
                        row.get::<_, String>(3)?,
                    ))
                })
                .map_err(|error| format!("Không đọc được danh sách lớp nhận học bù: {error}"))?;
            collect_rows(rows, "Không parse được lớp nhận học bù")?
        };

        let mut options = Vec::new();

        for (receiving_class_id, receiving_class_name, start_month, end_month) in candidate_classes
        {
            // Materialize buổi thường của tuần này cho lớp nhận (gồm cả buổi đã qua,
            // vì học bù có thể ghi nhận cho quá khứ).
            let class_range = ClassRange {
                start_month,
                end_month,
            };
            materialize_regular_sessions(
                connection,
                receiving_class_id,
                &week_start,
                &class_range,
                true,
            )?;

            let week_end = sqlite_date(connection, &week_start, 6)?;
            let mut statement = connection
                .prepare(
                    "SELECT id, session_date, start_time, end_time, session_index_in_week,
                            type, status, is_locked
                     FROM attendance_sessions
                     WHERE class_id = ?1
                       AND session_date BETWEEN ?2 AND ?3
                       AND type = 'regular'
                       AND status = 'active'",
                )
                .map_err(|error| format!("Không chuẩn bị được buổi nhận học bù: {error}"))?;
            let rows = statement
                .query_map(params![receiving_class_id, week_start, week_end], |row| {
                    let is_locked: i64 = row.get(7)?;
                    Ok(StudentMakeupOptionDto {
                        receiving_class_id,
                        receiving_class_name: receiving_class_name.clone(),
                        receiving_session_id: row.get(0)?,
                        receiving_session_date: row.get(1)?,
                        start_time: row.get(2)?,
                        end_time: row.get(3)?,
                        session_index_in_week: row.get(4)?,
                        r#type: row.get(5)?,
                        status: row.get(6)?,
                        is_locked: is_locked != 0,
                    })
                })
                .map_err(|error| format!("Không đọc được buổi nhận học bù: {error}"))?;
            let class_options = collect_rows(rows, "Không parse được buổi nhận học bù")?;

            for option in class_options {
                // Bỏ qua nếu học sinh đã là thành viên chính thức của lớp nhận trong tháng đó.
                let option_month = month_from_date(&option.receiving_session_date)?;
                if is_official_member_in_month(
                    connection,
                    option.receiving_class_id,
                    student_id,
                    &option_month,
                )? {
                    continue;
                }

                let receiving_session_order = session_order_for_date(
                    connection,
                    option.receiving_class_id,
                    &option.receiving_session_date,
                )?;
                if receiving_session_order != original_session_order {
                    continue;
                }

                options.push(StudentMakeupOptionDto {
                    session_index_in_week: receiving_session_order,
                    ..option
                });
            }
        }

        options.sort_by(|first, second| {
            first
                .receiving_session_date
                .cmp(&second.receiving_session_date)
                .then(first.start_time.cmp(&second.start_time))
                .then(first.receiving_class_name.cmp(&second.receiving_class_name))
        });

        Ok(StudentMakeupOptionsDto {
            student_id,
            membership_id,
            original_class_id: class_id,
            original_class_name,
            original_session_id,
            original_session_date: original.session_date.clone(),
            session_index_in_week: original_session_order,
            options,
        })
    })
}

#[tauri::command]
pub fn create_student_makeup_record(
    database: tauri::State<'_, AppDatabase>,
    request: CreateStudentMakeupRecordRequest,
) -> Result<(), String> {
    database.with_connection_mut(|connection| {
        let transaction = connection
            .transaction()
            .map_err(|error| format!("Không bắt đầu được transaction học bù: {error}"))?;

        let original = load_session_dto(&transaction, request.original_session_id)?;
        let receiving = load_session_dto(&transaction, request.receiving_session_id)?;

        if original.r#type != "regular" {
            return Err("Chỉ buổi học thường mới chọn được học bù theo học sinh.".to_string());
        }
        if original.status != "active" {
            return Err("Buổi gốc đang nghỉ, không thể chọn học bù.".to_string());
        }
        if original.is_locked {
            return Err("Buổi gốc đang khóa. Vui lòng mở khóa trước khi chọn học bù.".to_string());
        }
        if receiving.status != "active" {
            return Err("Buổi nhận học bù đang nghỉ.".to_string());
        }
        if receiving.r#type != "regular" {
            return Err("Buổi nhận học bù phải là buổi học thường.".to_string());
        }
        if receiving.id == original.id {
            return Err("Buổi nhận học bù phải khác buổi gốc.".to_string());
        }
        if receiving.class_id == original.class_id {
            return Err("Buổi nhận học bù phải thuộc lớp khác.".to_string());
        }
        let original_session_order =
            session_order_for_date(&transaction, original.class_id, &original.session_date)?;
        let receiving_session_order =
            session_order_for_date(&transaction, receiving.class_id, &receiving.session_date)?;

        if receiving_session_order != original_session_order {
            return Err("Buổi nhận học bù phải cùng thứ tự buổi trong tuần.".to_string());
        }

        validate_membership_for_session(
            &transaction,
            request.original_membership_id,
            request.student_id,
            original.class_id,
            &original.session_date,
        )?;

        let (_, original_year_id, original_grade) =
            load_class_meta(&transaction, original.class_id)?;
        let (_, receiving_year_id, receiving_grade) =
            load_class_meta(&transaction, receiving.class_id)?;

        if original_year_id != receiving_year_id {
            return Err("Lớp nhận học bù phải cùng năm học với lớp gốc.".to_string());
        }
        if original_grade != receiving_grade {
            return Err("Lớp nhận học bù phải cùng khối với lớp gốc.".to_string());
        }
        ensure_class_active(&transaction, receiving.class_id)?;

        let receiving_month = month_from_date(&receiving.session_date)?;
        if is_official_member_in_month(
            &transaction,
            receiving.class_id,
            request.student_id,
            &receiving_month,
        )? {
            return Err(
                "Học sinh đã là thành viên chính thức của lớp nhận trong tháng này.".to_string(),
            );
        }

        // Giữ trạng thái ở lớp nhận nếu đổi lại đúng buổi nhận cũ; đổi buổi khác thì reset.
        let previous: Option<(i64, Option<String>)> = transaction
            .query_row(
                "SELECT receiving_session_id, receiving_attendance_status
                 FROM student_makeup_records
                 WHERE student_id = ?1 AND original_session_id = ?2",
                params![request.student_id, request.original_session_id],
                |row| Ok((row.get(0)?, row.get(1)?)),
            )
            .optional()
            .map_err(|error| format!("Không đọc được liên kết học bù cũ: {error}"))?;
        let preserved_status = match &previous {
            Some((previous_receiving_id, status))
                if *previous_receiving_id == request.receiving_session_id =>
            {
                status.clone()
            }
            _ => None,
        };

        transaction
            .execute(
                "INSERT INTO attendance_records
                 (session_id, membership_id, student_id, status, created_at, updated_at)
                 VALUES (?1, ?2, ?3, 'makeup', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                 ON CONFLICT(session_id, membership_id) DO UPDATE SET
                   student_id = excluded.student_id,
                   status = 'makeup',
                   updated_at = CURRENT_TIMESTAMP",
                params![
                    request.original_session_id,
                    request.original_membership_id,
                    request.student_id
                ],
            )
            .map_err(|error| format!("Không lưu được trạng thái học bù ở buổi gốc: {error}"))?;

        transaction
            .execute(
                "INSERT INTO student_makeup_records
                 (student_id, original_membership_id, original_class_id, original_session_id,
                  receiving_class_id, receiving_session_id, session_index_in_week,
                  receiving_attendance_status, note, created_at, updated_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                 ON CONFLICT(student_id, original_session_id) DO UPDATE SET
                   original_membership_id = excluded.original_membership_id,
                   original_class_id = excluded.original_class_id,
                   receiving_class_id = excluded.receiving_class_id,
                   receiving_session_id = excluded.receiving_session_id,
                   session_index_in_week = excluded.session_index_in_week,
                   receiving_attendance_status = excluded.receiving_attendance_status,
                   note = excluded.note,
                   updated_at = CURRENT_TIMESTAMP",
                params![
                    request.student_id,
                    request.original_membership_id,
                    original.class_id,
                    request.original_session_id,
                    receiving.class_id,
                    request.receiving_session_id,
                    original_session_order,
                    preserved_status,
                    normalize_optional_text(request.note.as_deref())
                ],
            )
            .map_err(|error| format!("Không lưu được liên kết học bù: {error}"))?;

        transaction
            .commit()
            .map_err(|error| format!("Không commit được học bù theo học sinh: {error}"))
    })
}

#[tauri::command]
pub fn remove_student_makeup_record(
    database: tauri::State<'_, AppDatabase>,
    request: RemoveStudentMakeupRecordRequest,
) -> Result<(), String> {
    database.with_connection_mut(|connection| {
        let transaction = connection
            .transaction()
            .map_err(|error| format!("Không bắt đầu được transaction hủy học bù: {error}"))?;

        let deleted = transaction
            .execute(
                "DELETE FROM student_makeup_records
                 WHERE original_session_id = ?1 AND original_membership_id = ?2",
                params![request.original_session_id, request.original_membership_id],
            )
            .map_err(|error| format!("Không xóa được liên kết học bù: {error}"))?;

        if deleted == 0 {
            return Err("Không tìm thấy liên kết học bù của học sinh này.".to_string());
        }

        // Ô gốc trở về Chưa điểm danh.
        transaction
            .execute(
                "DELETE FROM attendance_records
                 WHERE session_id = ?1 AND membership_id = ?2 AND status = 'makeup'",
                params![request.original_session_id, request.original_membership_id],
            )
            .map_err(|error| format!("Không dọn được trạng thái học bù ở buổi gốc: {error}"))?;

        transaction
            .commit()
            .map_err(|error| format!("Không commit được hủy học bù: {error}"))
    })
}

#[tauri::command]
pub fn set_receiving_makeup_attendance_status(
    database: tauri::State<'_, AppDatabase>,
    request: SetReceivingMakeupStatusRequest,
) -> Result<(), String> {
    if let Some(status) = request.status.as_deref() {
        if status != "present" && status != "absent" {
            return Err("Trạng thái của học sinh học bù chỉ có thể là Học hoặc Nghỉ.".to_string());
        }
    }

    database.with_connection_mut(|connection| {
        let receiving_session_id: i64 = connection
            .query_row(
                "SELECT receiving_session_id FROM student_makeup_records WHERE id = ?1",
                params![request.makeup_record_id],
                |row| row.get(0),
            )
            .optional()
            .map_err(|error| format!("Không đọc được liên kết học bù: {error}"))?
            .ok_or_else(|| "Không tìm thấy liên kết học bù.".to_string())?;

        let receiving = load_session_dto(connection, receiving_session_id)?;

        if receiving.status != "active" {
            return Err("Buổi nhận học bù đang nghỉ, không thể điểm danh.".to_string());
        }
        if receiving.is_locked {
            return Err("Buổi nhận học bù đang khóa. Vui lòng mở khóa trước.".to_string());
        }

        connection
            .execute(
                "UPDATE student_makeup_records
                 SET receiving_attendance_status = ?1, updated_at = CURRENT_TIMESTAMP
                 WHERE id = ?2",
                params![request.status, request.makeup_record_id],
            )
            .map_err(|error| format!("Không lưu được điểm danh học sinh học bù: {error}"))?;

        Ok(())
    })
}

/// Buổi bị hủy: gỡ học bù xuất phát từ buổi này (ô gốc đã bị ghi đè thành Nghỉ)
/// và đánh Nghỉ cho các học sinh học bù đang nhận ở buổi này.
fn clear_makeup_links_for_cancelled_session(
    connection: &Connection,
    session_id: i64,
) -> Result<(), String> {
    connection
        .execute(
            "DELETE FROM student_makeup_records WHERE original_session_id = ?1",
            params![session_id],
        )
        .map_err(|error| format!("Không gỡ được liên kết học bù của buổi nghỉ: {error}"))?;

    connection
        .execute(
            "UPDATE student_makeup_records
             SET receiving_attendance_status = 'absent', updated_at = CURRENT_TIMESTAMP
             WHERE receiving_session_id = ?1",
            params![session_id],
        )
        .map_err(|error| {
            format!("Không đánh dấu Nghỉ được học sinh học bù của buổi nghỉ: {error}")
        })?;

    Ok(())
}

fn list_receiving_makeup_rows(
    connection: &Connection,
    class_id: i64,
    session_ids: &[i64],
) -> Result<Vec<AttendanceReceivingMakeupRowDto>, String> {
    if session_ids.is_empty() {
        return Ok(Vec::new());
    }

    let placeholders = session_ids
        .iter()
        .map(|id| id.to_string())
        .collect::<Vec<_>>()
        .join(",");
    let sql = format!(
        "SELECT
           smr.id,
           smr.student_id,
           smr.original_membership_id,
           smr.original_class_id,
           oc.name,
           smr.original_session_id,
           os.session_date,
           smr.receiving_class_id,
           smr.receiving_session_id,
           smr.session_index_in_week,
           s.full_name,
           s.school_class,
           s.school,
           s.parent_phone,
           smr.receiving_attendance_status,
           smr.note
         FROM student_makeup_records smr
         JOIN students s ON s.id = smr.student_id
         JOIN classes oc ON oc.id = smr.original_class_id
         JOIN attendance_sessions os ON os.id = smr.original_session_id
         WHERE smr.receiving_class_id = ?1
           AND smr.receiving_session_id IN ({placeholders})
         ORDER BY s.full_name COLLATE NOCASE ASC, smr.id ASC"
    );

    let mut statement = connection
        .prepare(&sql)
        .map_err(|error| format!("Không chuẩn bị được danh sách học sinh học bù: {error}"))?;
    let rows = statement
        .query_map(params![class_id], |row| {
            Ok(AttendanceReceivingMakeupRowDto {
                makeup_record_id: row.get(0)?,
                student_id: row.get(1)?,
                original_membership_id: row.get(2)?,
                original_class_id: row.get(3)?,
                original_class_name: row.get(4)?,
                original_session_id: row.get(5)?,
                original_session_date: row.get(6)?,
                receiving_class_id: row.get(7)?,
                receiving_session_id: row.get(8)?,
                session_index_in_week: row.get(9)?,
                full_name: row.get(10)?,
                school_class: row.get(11)?,
                school: row.get(12)?,
                parent_phone: row.get(13)?,
                receiving_attendance_status: row.get(14)?,
                note: row.get(15)?,
            })
        })
        .map_err(|error| format!("Không đọc được danh sách học sinh học bù: {error}"))?;

    collect_rows(rows, "Không parse được học sinh học bù")
}

fn list_makeup_details(
    connection: &Connection,
    class_id: i64,
    session_ids: &[i64],
) -> Result<Vec<AttendanceMakeupDetailDto>, String> {
    if session_ids.is_empty() {
        return Ok(Vec::new());
    }

    let placeholders = session_ids
        .iter()
        .map(|id| id.to_string())
        .collect::<Vec<_>>()
        .join(",");
    let sql = format!(
        "SELECT
           smr.id,
           smr.original_membership_id,
           smr.original_session_id,
           smr.receiving_class_id,
           rc.name,
           smr.receiving_session_id,
           rs.session_date,
           rs.start_time,
           rs.end_time,
           smr.receiving_attendance_status
         FROM student_makeup_records smr
         JOIN classes rc ON rc.id = smr.receiving_class_id
         JOIN attendance_sessions rs ON rs.id = smr.receiving_session_id
         WHERE smr.original_class_id = ?1
           AND smr.original_session_id IN ({placeholders})"
    );

    let mut statement = connection
        .prepare(&sql)
        .map_err(|error| format!("Không chuẩn bị được chi tiết học bù: {error}"))?;
    let rows = statement
        .query_map(params![class_id], |row| {
            Ok(AttendanceMakeupDetailDto {
                makeup_record_id: row.get(0)?,
                original_membership_id: row.get(1)?,
                original_session_id: row.get(2)?,
                receiving_class_id: row.get(3)?,
                receiving_class_name: row.get(4)?,
                receiving_session_id: row.get(5)?,
                receiving_session_date: row.get(6)?,
                receiving_start_time: row.get(7)?,
                receiving_end_time: row.get(8)?,
                receiving_attendance_status: row.get(9)?,
            })
        })
        .map_err(|error| format!("Không đọc được chi tiết học bù: {error}"))?;

    collect_rows(rows, "Không parse được chi tiết học bù")
}

fn load_class_meta(connection: &Connection, class_id: i64) -> Result<(String, i64, i64), String> {
    connection
        .query_row(
            "SELECT name, academic_year_id, COALESCE(grade, 9)
             FROM classes
             WHERE id = ?1 AND is_archived = 0",
            params![class_id],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
        )
        .optional()
        .map_err(|error| format!("Không đọc được thông tin lớp: {error}"))?
        .ok_or_else(|| "Không tìm thấy lớp học.".to_string())
}

fn ensure_class_active(connection: &Connection, class_id: i64) -> Result<(), String> {
    let status: Option<String> = connection
        .query_row(
            "SELECT status FROM classes WHERE id = ?1 AND is_archived = 0",
            params![class_id],
            |row| row.get(0),
        )
        .optional()
        .map_err(|error| format!("Không kiểm tra được trạng thái lớp: {error}"))?;

    match status.as_deref() {
        Some("active") => Ok(()),
        Some(_) => Err("Lớp nhận học bù đã kết thúc.".to_string()),
        None => Err("Không tìm thấy lớp nhận học bù.".to_string()),
    }
}

fn is_official_member_in_month(
    connection: &Connection,
    class_id: i64,
    student_id: i64,
    month: &str,
) -> Result<bool, String> {
    let exists = connection
        .query_row(
            "SELECT cm.id
             FROM class_memberships cm
             JOIN students s ON s.id = cm.student_id
             WHERE cm.class_id = ?1
               AND cm.student_id = ?2
               AND s.is_archived = 0
               AND cm.joined_month <= ?3
               AND (cm.left_month IS NULL OR ?3 < cm.left_month)
             LIMIT 1",
            params![class_id, student_id, month],
            |row| row.get::<_, i64>(0),
        )
        .optional()
        .map_err(|error| format!("Không kiểm tra được thành viên lớp nhận: {error}"))?;

    Ok(exists.is_some())
}

/// Thứ 2 của tuần chứa ngày đã cho.
fn week_start_of_date(connection: &Connection, date: &str) -> Result<String, String> {
    let weekday: i64 = connection
        .query_row(
            "SELECT CAST(strftime('%w', ?1) AS INTEGER)",
            params![date],
            |row| row.get(0),
        )
        .map_err(|error| format!("Không tính được tuần của buổi học: {error}"))?;
    // %w: 0 = Chủ nhật ... 6 = Thứ 7; lùi về Thứ 2 đầu tuần.
    let offset = if weekday == 0 { -6 } else { 1 - weekday };
    let modifier = format!("{offset} days");
    connection
        .query_row("SELECT date(?1, ?2)", params![date, modifier], |row| {
            row.get(0)
        })
        .map_err(|error| format!("Không tính được ngày đầu tuần: {error}"))
}

fn materialize_regular_sessions(
    connection: &Connection,
    class_id: i64,
    week_start: &str,
    class_range: &ClassRange,
    include_past: bool,
) -> Result<(), String> {
    let schedules = list_schedules(connection, class_id)?;
    let today = current_local_date(connection)?;

    for (index, schedule) in schedules.iter().enumerate() {
        let offset = weekday_to_week_offset(schedule.weekday)?;
        let session_date = sqlite_date(connection, week_start, offset)?;
        let session_month = month_from_date(&session_date)?;

        if !include_past && session_date.as_str() < today.as_str() {
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

fn session_order_for_date(
    connection: &Connection,
    class_id: i64,
    session_date: &str,
) -> Result<i64, String> {
    let session_weekday = weekday_from_date(connection, session_date)?;
    let schedules = list_schedules(connection, class_id)?;

    schedules
        .iter()
        .position(|schedule| schedule.weekday == session_weekday)
        .map(|index| (index as i64) + 1)
        .ok_or_else(|| "Buổi học không còn khớp với lịch học hiện tại của lớp.".to_string())
}

fn list_schedules(connection: &Connection, class_id: i64) -> Result<Vec<ScheduleRow>, String> {
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
               AND type IN ('regular', 'class_makeup')
             ORDER BY session_date ASC, start_time ASC, id ASC",
        )
        .map_err(|error| format!("Không chuẩn bị được buổi điểm danh trong tuần: {error}"))?;

    let rows = statement
        .query_map(params![class_id, week_start, week_end], map_session_dto)
        .map_err(|error| format!("Không đọc được buổi điểm danh trong tuần: {error}"))?;

    collect_rows(rows, "Không parse được buổi điểm danh")
}

fn list_upcoming_makeup_sessions(
    connection: &Connection,
    class_id: i64,
) -> Result<Vec<AttendanceSessionDto>, String> {
    let mut statement = connection
        .prepare(
            "SELECT id, class_id, session_date, start_time, end_time, session_index_in_week,
                    type, status, is_locked, makeup_for_session_id
             FROM attendance_sessions
             WHERE class_id = ?1
               AND type = 'class_makeup'
               AND status = 'active'
               AND datetime(session_date || ' ' || end_time) >= datetime('now', 'localtime')
             ORDER BY session_date ASC, start_time ASC, id ASC",
        )
        .map_err(|error| format!("Không chuẩn bị được danh sách buổi học bù sắp tới: {error}"))?;
    let rows = statement
        .query_map(params![class_id], map_session_dto)
        .map_err(|error| format!("Không đọc được danh sách buổi học bù sắp tới: {error}"))?;

    collect_rows(rows, "Không parse được buổi học bù sắp tới")
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

fn upsert_official_attendance(
    connection: &Connection,
    session: &AttendanceSessionDto,
    status: &str,
) -> Result<(), String> {
    let session_month = month_from_date(&session.session_date)?;
    let memberships = list_eligible_memberships(connection, session.class_id, &session_month)?;

    for (membership_id, student_id) in memberships {
        connection
            .execute(
                "INSERT INTO attendance_records
                 (session_id, membership_id, student_id, status, created_at, updated_at)
                 VALUES (?1, ?2, ?3, ?4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                 ON CONFLICT(session_id, membership_id) DO UPDATE SET
                   student_id = excluded.student_id,
                   status = excluded.status,
                   updated_at = CURRENT_TIMESTAMP",
                params![session.id, membership_id, student_id, status],
            )
            .map_err(|error| format!("Không cập nhật được điểm danh cả lớp: {error}"))?;
    }

    Ok(())
}

fn list_eligible_memberships(
    connection: &Connection,
    class_id: i64,
    session_month: &str,
) -> Result<Vec<(i64, i64)>, String> {
    let mut statement = connection
        .prepare(
            "SELECT cm.id, cm.student_id
             FROM class_memberships cm
             JOIN students s ON s.id = cm.student_id
             WHERE cm.class_id = ?1
               AND s.is_archived = 0
               AND cm.joined_month <= ?2
               AND (cm.left_month IS NULL OR ?2 < cm.left_month)",
        )
        .map_err(|error| format!("Không chuẩn bị được danh sách học sinh của buổi học: {error}"))?;
    let rows = statement
        .query_map(params![class_id, session_month], |row| {
            Ok((row.get::<_, i64>(0)?, row.get::<_, i64>(1)?))
        })
        .map_err(|error| format!("Không đọc được danh sách học sinh của buổi học: {error}"))?;

    collect_rows(rows, "Không parse được học sinh của buổi học")
}

fn validate_makeup_date(
    connection: &Connection,
    class_id: i64,
    makeup_date: &str,
) -> Result<(), String> {
    let normalized_date = connection
        .query_row("SELECT date(?1)", params![makeup_date], |row| {
            row.get::<_, Option<String>>(0)
        })
        .map_err(|error| format!("Không kiểm tra được ngày học bù: {error}"))?;
    if normalized_date.as_deref() != Some(makeup_date) {
        return Err("Ngày học bù không hợp lệ.".to_string());
    }

    let today = current_local_date(connection)?;
    if makeup_date <= today.as_str() {
        return Err("Ngày học bù phải sau ngày hôm nay.".to_string());
    }

    let class_range = connection
        .query_row(
            "SELECT start_month, end_month
             FROM classes
             WHERE id = ?1 AND is_archived = 0 AND status = 'active'",
            params![class_id],
            |row| {
                Ok(ClassRange {
                    start_month: row.get(0)?,
                    end_month: row.get(1)?,
                })
            },
        )
        .optional()
        .map_err(|error| format!("Không đọc được thời gian của lớp học bù: {error}"))?
        .ok_or_else(|| "Chỉ lớp đang hoạt động mới có thể tạo buổi học bù.".to_string())?;
    let makeup_month = month_from_date(makeup_date)?;
    if makeup_month < class_range.start_month || makeup_month > class_range.end_month {
        return Err("Ngày học bù phải nằm trong thời gian học của lớp.".to_string());
    }

    Ok(())
}

fn validate_no_existing_class_makeup(
    connection: &Connection,
    original_session_id: i64,
) -> Result<(), String> {
    let exists = connection
        .query_row(
            "SELECT id FROM attendance_sessions
             WHERE makeup_for_session_id = ?1 AND type = 'class_makeup' LIMIT 1",
            params![original_session_id],
            |row| row.get::<_, i64>(0),
        )
        .optional()
        .map_err(|error| format!("Không kiểm tra được buổi học bù đã có: {error}"))?;

    if exists.is_some() {
        Err("Buổi học này đã có một buổi học bù cả lớp.".to_string())
    } else {
        Ok(())
    }
}

fn validate_makeup_time_conflict(
    connection: &Connection,
    makeup_date: &str,
    start_time: &str,
    end_time: &str,
) -> Result<(), String> {
    let schedule_conflict = connection
        .query_row(
            "SELECT c.name, cs.start_time, cs.end_time
             FROM class_schedules cs
             JOIN classes c ON c.id = cs.class_id
             WHERE c.is_archived = 0
               AND c.status = 'active'
               AND cs.weekday = CAST(strftime('%w', ?1) AS INTEGER)
               AND c.start_month <= substr(?1, 1, 7)
               AND substr(?1, 1, 7) <= c.end_month
               AND cs.start_time < ?3
               AND ?2 < cs.end_time
             ORDER BY cs.start_time ASC
             LIMIT 1",
            params![makeup_date, start_time, end_time],
            |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, String>(1)?,
                    row.get::<_, String>(2)?,
                ))
            },
        )
        .optional()
        .map_err(|error| format!("Không kiểm tra được lịch học cố định: {error}"))?;

    if let Some((class_name, conflict_start, conflict_end)) = schedule_conflict {
        return Err(format!(
            "Trùng lịch với {class_name}: {conflict_start} - {conflict_end}."
        ));
    }

    let session_conflict = connection
        .query_row(
            "SELECT c.name, ats.start_time, ats.end_time
             FROM attendance_sessions ats
             JOIN classes c ON c.id = ats.class_id
             WHERE c.is_archived = 0
               AND c.status = 'active'
               AND ats.session_date = ?1
               AND ats.status = 'active'
               AND ats.start_time < ?3
               AND ?2 < ats.end_time
             ORDER BY ats.start_time ASC
             LIMIT 1",
            params![makeup_date, start_time, end_time],
            |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, String>(1)?,
                    row.get::<_, String>(2)?,
                ))
            },
        )
        .optional()
        .map_err(|error| format!("Không kiểm tra được các buổi học đã tạo: {error}"))?;

    if let Some((class_name, conflict_start, conflict_end)) = session_conflict {
        return Err(format!(
            "Trùng buổi học của {class_name}: {conflict_start} - {conflict_end}."
        ));
    }

    Ok(())
}

fn validate_time_range(start_time: &str, end_time: &str) -> Result<(), String> {
    if !is_valid_time(start_time) || !is_valid_time(end_time) {
        return Err("Giờ học bù không hợp lệ, cần định dạng HH:MM.".to_string());
    }
    if end_time <= start_time {
        return Err("Giờ kết thúc phải sau giờ bắt đầu.".to_string());
    }

    Ok(())
}

fn is_valid_time(value: &str) -> bool {
    if value.len() != 5 || value.as_bytes().get(2) != Some(&b':') {
        return false;
    }

    let hour = value[..2].parse::<u8>();
    let minute = value[3..].parse::<u8>();
    matches!((hour, minute), (Ok(hour), Ok(minute)) if hour < 24 && minute < 60)
}

fn normalize_optional_text(value: Option<&str>) -> Option<String> {
    value
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(ToOwned::to_owned)
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

fn weekday_from_date(connection: &Connection, date: &str) -> Result<i64, String> {
    connection
        .query_row(
            "SELECT CAST(strftime('%w', ?1) AS INTEGER)",
            params![date],
            |row| row.get(0),
        )
        .map_err(|error| format!("Không tính được thứ của buổi học: {error}"))
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
            "Trạng thái Học bù cần chọn buổi nhận học bù. Vui lòng dùng chức năng chọn lớp học bù."
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
