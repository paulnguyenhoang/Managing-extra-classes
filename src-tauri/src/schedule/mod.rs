use std::collections::HashMap;

use rusqlite::{params, Connection, OptionalExtension};
use serde::Serialize;

use crate::db::AppDatabase;

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct GlobalScheduleEventDto {
    id: String,
    source: String,
    session_id: Option<i64>,
    class_id: i64,
    class_name: String,
    grade: i64,
    date: String,
    weekday: i64,
    start_time: String,
    end_time: String,
    session_index_in_week: i64,
    #[serde(rename = "type")]
    kind: String,
    status: String,
    is_locked: Option<bool>,
    makeup_for_session_id: Option<i64>,
    class_start_month: String,
    class_end_month: String,
    class_status: String,
    monthly_fee: i64,
    student_count: i64,
    note: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GlobalScheduleMonthDto {
    academic_year_id: i64,
    month: String,
    events: Vec<GlobalScheduleEventDto>,
}

#[derive(Clone)]
struct ClassInfo {
    id: i64,
    name: String,
    grade: i64,
    start_month: String,
    end_month: String,
    status: String,
    monthly_fee: i64,
    student_count: i64,
}

struct ScheduleRow {
    weekday: i64,
    start_time: String,
    end_time: String,
}

struct PersistedSession {
    id: i64,
    class_id: i64,
    session_date: String,
    start_time: String,
    end_time: String,
    session_index_in_week: i64,
    kind: String,
    status: String,
    is_locked: bool,
    makeup_for_session_id: Option<i64>,
    note: Option<String>,
}

/// Lịch tổng hợp toàn app: CHỈ ĐỌC — sinh buổi từ class_schedules trong bộ nhớ,
/// overlay attendance_sessions đã có; KHÔNG materialize/ghi DB khi xem.
#[tauri::command]
pub fn list_global_schedule_month(
    database: tauri::State<'_, AppDatabase>,
    academic_year_id: i64,
    month: String,
) -> Result<GlobalScheduleMonthDto, String> {
    crate::months::validate_month(&month)
        .map_err(|_| "Tháng lịch học không hợp lệ, cần định dạng YYYY-MM.".to_string())?;

    database.with_connection(|connection| {
        let year_exists: Option<i64> = connection
            .query_row(
                "SELECT id FROM academic_years WHERE id = ?1",
                params![academic_year_id],
                |row| row.get(0),
            )
            .optional()
            .map_err(|error| format!("Không đọc được năm học: {error}"))?;

        if year_exists.is_none() {
            return Err("Không tìm thấy năm học.".to_string());
        }

        let classes = load_classes(connection, academic_year_id, &month)?;
        let month_dates = list_month_dates(connection, &month)?;

        // Sinh buổi thường từ lịch cố định cho các lớp có tháng nằm trong thời gian học.
        let mut events: Vec<GlobalScheduleEventDto> = Vec::new();
        let mut candidate_index: HashMap<(i64, String, i64), usize> = HashMap::new();

        for class in classes.values() {
            if month < class.start_month || month > class.end_month {
                continue;
            }

            let schedules = load_schedules(connection, class.id)?;
            for (index, schedule) in schedules.iter().enumerate() {
                let session_index = (index as i64) + 1;

                for (date, weekday) in &month_dates {
                    if *weekday != schedule.weekday {
                        continue;
                    }

                    let key = (class.id, date.clone(), session_index);
                    candidate_index.insert(key, events.len());
                    events.push(GlobalScheduleEventDto {
                        id: format!("schedule-{}-{}-{}", class.id, date, session_index),
                        source: "schedule".to_string(),
                        session_id: None,
                        class_id: class.id,
                        class_name: class.name.clone(),
                        grade: class.grade,
                        date: date.clone(),
                        weekday: *weekday,
                        start_time: schedule.start_time.clone(),
                        end_time: schedule.end_time.clone(),
                        session_index_in_week: session_index,
                        kind: "regular".to_string(),
                        status: "active".to_string(),
                        is_locked: None,
                        makeup_for_session_id: None,
                        class_start_month: class.start_month.clone(),
                        class_end_month: class.end_month.clone(),
                        class_status: class.status.clone(),
                        monthly_fee: class.monthly_fee,
                        student_count: class.student_count,
                        note: None,
                    });
                }
            }
        }

        // Overlay attendance_sessions đã persist trong tháng (kể cả lịch sử không còn khớp lịch).
        for session in load_persisted_sessions(connection, academic_year_id, &month)? {
            let Some(class) = classes.get(&session.class_id) else {
                continue;
            };

            let weekday = weekday_of_date(connection, &session.session_date)?;
            let event = persisted_session_event(&session, class, weekday);

            if session.kind == "regular" {
                let key = (
                    session.class_id,
                    session.session_date.clone(),
                    session.session_index_in_week,
                );

                if let Some(&index) = candidate_index.get(&key) {
                    events[index] = event;
                    continue;
                }

                // Lịch đã đổi thứ tự buổi: ghép theo cùng lớp/ngày nếu còn slot sinh từ lịch.
                let fallback = candidate_index
                    .iter()
                    .find(|((class_id, date, _), &index)| {
                        *class_id == session.class_id
                            && *date == session.session_date
                            && events[index].source == "schedule"
                    });
                if let Some((_, &index)) = fallback {
                    events[index] = event;
                    continue;
                }
            }

            events.push(event);
        }

        events.sort_by(|first, second| {
            first
                .date
                .cmp(&second.date)
                .then(first.start_time.cmp(&second.start_time))
                .then(first.end_time.cmp(&second.end_time))
                .then(first.grade.cmp(&second.grade))
                .then(first.class_name.cmp(&second.class_name))
        });

        Ok(GlobalScheduleMonthDto {
            academic_year_id,
            month,
            events,
        })
    })
}

fn persisted_session_event(
    session: &PersistedSession,
    class: &ClassInfo,
    weekday: i64,
) -> GlobalScheduleEventDto {
    GlobalScheduleEventDto {
        id: format!("session-{}", session.id),
        source: "attendance_session".to_string(),
        session_id: Some(session.id),
        class_id: class.id,
        class_name: class.name.clone(),
        grade: class.grade,
        date: session.session_date.clone(),
        weekday,
        start_time: session.start_time.clone(),
        end_time: session.end_time.clone(),
        session_index_in_week: session.session_index_in_week,
        kind: session.kind.clone(),
        status: session.status.clone(),
        is_locked: Some(session.is_locked),
        makeup_for_session_id: session.makeup_for_session_id,
        class_start_month: class.start_month.clone(),
        class_end_month: class.end_month.clone(),
        class_status: class.status.clone(),
        monthly_fee: class.monthly_fee,
        student_count: class.student_count,
        note: session.note.clone(),
    }
}

fn load_classes(
    connection: &Connection,
    academic_year_id: i64,
    month: &str,
) -> Result<HashMap<i64, ClassInfo>, String> {
    let mut statement = connection
        .prepare(
            "SELECT
               c.id,
               c.name,
               COALESCE(c.grade, 9),
               c.start_month,
               c.end_month,
               c.status,
               c.monthly_fee,
               (
                 SELECT COUNT(*)
                 FROM class_memberships cm
                 JOIN students s ON s.id = cm.student_id
                 WHERE cm.class_id = c.id
                   AND s.is_archived = 0
                   AND cm.joined_month <= ?2
                   AND (cm.left_month IS NULL OR ?2 < cm.left_month)
               )
             FROM classes c
             WHERE c.academic_year_id = ?1 AND c.is_archived = 0",
        )
        .map_err(|error| format!("Không chuẩn bị được truy vấn lớp học: {error}"))?;

    let rows = statement
        .query_map(params![academic_year_id, month], |row| {
            Ok(ClassInfo {
                id: row.get(0)?,
                name: row.get(1)?,
                grade: row.get(2)?,
                start_month: row.get(3)?,
                end_month: row.get(4)?,
                status: row.get(5)?,
                monthly_fee: row.get(6)?,
                student_count: row.get(7)?,
            })
        })
        .map_err(|error| format!("Không đọc được danh sách lớp học: {error}"))?;

    let mut result = HashMap::new();
    for row in rows {
        let class = row.map_err(|error| format!("Không parse được lớp học: {error}"))?;
        result.insert(class.id, class);
    }

    Ok(result)
}

/// Toàn bộ ngày trong tháng kèm weekday theo convention app (0 = Chủ nhật ... 6 = Thứ 7).
fn list_month_dates(connection: &Connection, month: &str) -> Result<Vec<(String, i64)>, String> {
    let mut statement = connection
        .prepare(
            "WITH RECURSIVE dates(d) AS (
               SELECT date(?1 || '-01')
               UNION ALL
               SELECT date(d, '+1 day')
               FROM dates
               WHERE d < date(?1 || '-01', '+1 month', '-1 day')
             )
             SELECT d, CAST(strftime('%w', d) AS INTEGER) FROM dates",
        )
        .map_err(|error| format!("Không chuẩn bị được danh sách ngày trong tháng: {error}"))?;

    let rows = statement
        .query_map(params![month], |row| Ok((row.get(0)?, row.get(1)?)))
        .map_err(|error| format!("Không đọc được danh sách ngày trong tháng: {error}"))?;

    let mut result = Vec::new();
    for row in rows {
        result.push(row.map_err(|error| format!("Không parse được ngày trong tháng: {error}"))?);
    }

    Ok(result)
}

fn load_schedules(connection: &Connection, class_id: i64) -> Result<Vec<ScheduleRow>, String> {
    // CÙNG thứ tự với Attendance để session_index_in_week khớp nhau.
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

    let mut result = Vec::new();
    for row in rows {
        result.push(row.map_err(|error| format!("Không parse được lịch học: {error}"))?);
    }

    Ok(result)
}

fn load_persisted_sessions(
    connection: &Connection,
    academic_year_id: i64,
    month: &str,
) -> Result<Vec<PersistedSession>, String> {
    let mut statement = connection
        .prepare(
            "SELECT
               a.id, a.class_id, a.session_date, a.start_time, a.end_time,
               a.session_index_in_week, a.type, a.status, a.is_locked,
               a.makeup_for_session_id, a.note
             FROM attendance_sessions a
             JOIN classes c ON c.id = a.class_id
             WHERE c.academic_year_id = ?1
               AND c.is_archived = 0
               AND a.session_date >= date(?2 || '-01')
               AND a.session_date <= date(?2 || '-01', '+1 month', '-1 day')
             ORDER BY a.session_date ASC, a.start_time ASC, a.id ASC",
        )
        .map_err(|error| format!("Không chuẩn bị được truy vấn buổi học: {error}"))?;

    let rows = statement
        .query_map(params![academic_year_id, month], |row| {
            Ok(PersistedSession {
                id: row.get(0)?,
                class_id: row.get(1)?,
                session_date: row.get(2)?,
                start_time: row.get(3)?,
                end_time: row.get(4)?,
                session_index_in_week: row.get(5)?,
                kind: row.get(6)?,
                status: row.get(7)?,
                is_locked: row.get::<_, i64>(8)? != 0,
                makeup_for_session_id: row.get(9)?,
                note: row.get(10)?,
            })
        })
        .map_err(|error| format!("Không đọc được buổi học đã lưu: {error}"))?;

    let mut result = Vec::new();
    for row in rows {
        result.push(row.map_err(|error| format!("Không parse được buổi học: {error}"))?);
    }

    Ok(result)
}

fn weekday_of_date(connection: &Connection, date: &str) -> Result<i64, String> {
    connection
        .query_row(
            "SELECT CAST(strftime('%w', ?1) AS INTEGER)",
            params![date],
            |row| row.get(0),
        )
        .map_err(|error| format!("Không tính được thứ trong tuần của buổi học: {error}"))
}
