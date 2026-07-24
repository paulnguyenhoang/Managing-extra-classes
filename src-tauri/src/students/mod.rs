use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};

use crate::db::AppDatabase;

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StudentListItemDto {
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
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateStudentForClassRequest {
    class_id: i64,
    full_name: String,
    school_class: String,
    school: String,
    parent_phone: String,
    joined_month: String,
    note: Option<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PauseStudentMembershipRequest {
    membership_id: i64,
    left_month: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReactivateStudentMembershipRequest {
    membership_id: i64,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ArchiveStudentMembershipRequest {
    membership_id: i64,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateStudentRequest {
    student_id: i64,
    full_name: String,
    school_class: String,
    school: String,
    parent_phone: String,
    note: Option<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateClassMembershipStatusRequest {
    membership_id: i64,
    status: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportStudentRowInput {
    full_name: String,
    school_class: String,
    school: String,
    parent_phone: String,
    joined_month: String,
    status: String,
    left_month: Option<String>,
    note: Option<String>,
    matched_membership_id: Option<i64>,
    matched_student_id: Option<i64>,
    action: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportStudentsRequest {
    class_id: i64,
    rows: Vec<ImportStudentRowInput>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportStudentsSummaryDto {
    created_count: i64,
    updated_count: i64,
}

pub fn count_active_students_by_class(
    connection: &Connection,
    class_id: i64,
) -> Result<i64, String> {
    connection
        .query_row(
            "SELECT COUNT(*)
             FROM class_memberships
             WHERE class_id = ?1 AND status = 'active' AND COALESCE(is_archived, 0) = 0",
            params![class_id],
            |row| row.get(0),
        )
        .map_err(|error| format!("Không đếm được học sinh đang học: {error}"))
}

#[tauri::command]
pub fn list_students_by_class(
    database: tauri::State<'_, AppDatabase>,
    class_id: i64,
) -> Result<Vec<StudentListItemDto>, String> {
    database.with_connection(|connection| list_students_by_class_value(connection, class_id))
}

#[tauri::command]
pub fn create_student_for_class(
    database: tauri::State<'_, AppDatabase>,
    request: CreateStudentForClassRequest,
) -> Result<StudentListItemDto, String> {
    validate_student_name(&request.full_name)?;
    validate_class_exists(&database, request.class_id)?;
    crate::months::validate_month(&request.joined_month)
        .map_err(|_| "Tháng bắt đầu học không hợp lệ, cần định dạng YYYY-MM.".to_string())?;

    database.with_connection_mut(|connection| {
        let (class_start_month, class_end_month) =
            class_month_range(connection, request.class_id)?;

        if request.joined_month < class_start_month || request.joined_month > class_end_month {
            return Err(format!(
                "Tháng bắt đầu học phải nằm trong thời gian học của lớp ({} - {}).",
                crate::months::format_month_label(&class_start_month),
                crate::months::format_month_label(&class_end_month)
            ));
        }

        let full_name = request.full_name.trim().to_string();
        let school_class = request.school_class.trim().to_string();
        let school = request.school.trim().to_string();
        let parent_phone = request.parent_phone.trim().to_string();
        let note = normalize_optional_text(request.note.as_deref());

        let transaction = connection
            .transaction()
            .map_err(|error| format!("Không bắt đầu được transaction thêm học sinh: {error}"))?;

        transaction
            .execute(
                "INSERT INTO students
                 (full_name, school_class, school, parent_phone, note, is_archived, created_at, updated_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
                params![full_name, school_class, school, parent_phone, note],
            )
            .map_err(|error| format!("Không tạo được học sinh: {error}"))?;
        let student_id = transaction.last_insert_rowid();

        transaction
            .execute(
                "INSERT INTO class_memberships
                 (class_id, student_id, status, joined_at, left_at, note, joined_month, left_month, created_at, updated_at)
                 VALUES (?1, ?2, 'active', CURRENT_DATE, NULL, NULL, ?3, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
                params![request.class_id, student_id, request.joined_month],
            )
            .map_err(|error| format!("Không thêm học sinh vào lớp: {error}"))?;
        let membership_id = transaction.last_insert_rowid();

        transaction
            .commit()
            .map_err(|error| format!("Không commit được học sinh mới: {error}"))?;

        get_student_list_item(connection, membership_id)
    })
}

#[tauri::command]
pub fn update_student(
    database: tauri::State<'_, AppDatabase>,
    request: UpdateStudentRequest,
) -> Result<(), String> {
    validate_student_name(&request.full_name)?;

    database.with_connection_mut(|connection| {
        let updated = connection
            .execute(
                "UPDATE students
                 SET full_name = ?1,
                     school_class = ?2,
                     school = ?3,
                     parent_phone = ?4,
                     note = ?5,
                     updated_at = CURRENT_TIMESTAMP
                 WHERE id = ?6 AND is_archived = 0",
                params![
                    request.full_name.trim(),
                    request.school_class.trim(),
                    request.school.trim(),
                    request.parent_phone.trim(),
                    normalize_optional_text(request.note.as_deref()),
                    request.student_id
                ],
            )
            .map_err(|error| format!("Không cập nhật được học sinh: {error}"))?;

        if updated == 0 {
            return Err("Không tìm thấy học sinh.".to_string());
        }

        Ok(())
    })
}

#[tauri::command]
pub fn update_class_membership_status(
    database: tauri::State<'_, AppDatabase>,
    request: UpdateClassMembershipStatusRequest,
) -> Result<(), String> {
    validate_membership_status(&request.status)?;

    // Cho học sinh nghỉ bắt buộc phải có tháng nghỉ — dùng lệnh pause_student_membership.
    if request.status == "paused" {
        return Err(
            "Cho học sinh nghỉ cần chọn tháng bắt đầu nghỉ. Vui lòng dùng chức năng cho nghỉ."
                .to_string(),
        );
    }

    database.with_connection_mut(|connection| {
        let updated = connection
            .execute(
                "UPDATE class_memberships
                 SET status = 'active',
                     left_at = NULL,
                     left_month = NULL,
                     updated_at = CURRENT_TIMESTAMP
                 WHERE id = ?1",
                params![request.membership_id],
            )
            .map_err(|error| {
                format!("Không cập nhật được trạng thái học sinh trong lớp: {error}")
            })?;

        if updated == 0 {
            return Err("Không tìm thấy học sinh trong lớp.".to_string());
        }

        Ok(())
    })
}

#[tauri::command]
pub fn pause_student_membership(
    database: tauri::State<'_, AppDatabase>,
    request: PauseStudentMembershipRequest,
) -> Result<(), String> {
    crate::months::validate_month(&request.left_month)
        .map_err(|_| "Tháng nghỉ không hợp lệ, cần định dạng YYYY-MM.".to_string())?;

    database.with_connection_mut(|connection| {
        let membership = connection
            .query_row(
                "SELECT cm.joined_month, cm.class_id
                 FROM class_memberships cm
                 WHERE cm.id = ?1",
                params![request.membership_id],
                |row| Ok((row.get::<_, String>(0)?, row.get::<_, i64>(1)?)),
            )
            .optional()
            .map_err(|error| format!("Không đọc được thông tin học sinh trong lớp: {error}"))?
            .ok_or_else(|| "Không tìm thấy học sinh trong lớp.".to_string())?;

        let (joined_month, class_id) = membership;
        let (_, class_end_month) = class_month_range(connection, class_id)?;

        if request.left_month < joined_month {
            return Err("Tháng nghỉ không được trước tháng bắt đầu học.".to_string());
        }

        if request.left_month > class_end_month {
            return Err("Tháng nghỉ không được vượt quá thời gian học của lớp.".to_string());
        }

        connection
            .execute(
                "UPDATE class_memberships
                 SET status = 'paused',
                     left_month = ?1,
                     left_at = CURRENT_DATE,
                     updated_at = CURRENT_TIMESTAMP
                 WHERE id = ?2",
                params![request.left_month, request.membership_id],
            )
            .map_err(|error| format!("Không lưu được trạng thái nghỉ: {error}"))?;

        Ok(())
    })
}

#[tauri::command]
pub fn archive_student_membership(
    database: tauri::State<'_, AppDatabase>,
    request: ArchiveStudentMembershipRequest,
) -> Result<(), String> {
    database.with_connection_mut(|connection| {
        let transaction = connection
            .transaction()
            .map_err(|error| format!("Không bắt đầu được transaction xóa học sinh: {error}"))?;

        let membership: Option<(String, Option<String>, String, String)> = transaction
            .query_row(
                "SELECT cm.status, cm.left_month, cm.joined_month, c.end_month
                 FROM class_memberships cm
                 JOIN classes c ON c.id = cm.class_id
                 JOIN students s ON s.id = cm.student_id
                 WHERE cm.id = ?1
                   AND COALESCE(cm.is_archived, 0) = 0
                   AND s.is_archived = 0",
                params![request.membership_id],
                |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?)),
            )
            .optional()
            .map_err(|error| format!("Không đọc được học sinh cần xóa: {error}"))?;
        let (status, left_month, joined_month, class_end_month) = membership
            .ok_or_else(|| "Không tìm thấy học sinh trong danh sách lớp.".to_string())?;

        if status != "paused" {
            return Err("Chỉ có thể xóa học sinh đã nghỉ học.".to_string());
        }
        let left_month = left_month
            .ok_or_else(|| "Học sinh đã nghỉ nhưng chưa có tháng bắt đầu nghỉ.".to_string())?;
        let unpaid_months = unpaid_months_before_leaving(
            &transaction,
            request.membership_id,
            &joined_month,
            &left_month,
            &class_end_month,
        )?;

        if !unpaid_months.is_empty() {
            let labels = unpaid_months
                .iter()
                .map(|month| crate::months::format_month_label(month))
                .collect::<Vec<_>>()
                .join(", ");
            return Err(format!(
                "Chưa thể xóa học sinh vì còn nợ học phí: {labels}."
            ));
        }

        transaction
            .execute(
                "UPDATE class_memberships
                 SET is_archived = 1,
                     archived_at = CURRENT_TIMESTAMP,
                     updated_at = CURRENT_TIMESTAMP
                 WHERE id = ?1",
                params![request.membership_id],
            )
            .map_err(|error| format!("Không xóa được học sinh khỏi danh sách: {error}"))?;

        transaction
            .commit()
            .map_err(|error| format!("Không commit được thao tác xóa học sinh: {error}"))
    })
}

fn unpaid_months_before_leaving(
    connection: &Connection,
    membership_id: i64,
    joined_month: &str,
    left_month: &str,
    class_end_month: &str,
) -> Result<Vec<String>, String> {
    let last_month = crate::months::add_months(left_month, -1)?;
    let last_month = if last_month.as_str() > class_end_month {
        class_end_month.to_string()
    } else {
        last_month
    };

    if last_month.as_str() < joined_month {
        return Ok(Vec::new());
    }

    let months = crate::months::months_in_range(joined_month, &last_month)?;
    let mut unpaid_months = Vec::new();

    for month in months {
        let settled = connection
            .query_row(
                "SELECT 1 FROM payments
                 WHERE membership_id = ?1 AND month = ?2 AND status IN ('paid', 'waived')",
                params![membership_id, month],
                |row| row.get::<_, i64>(0),
            )
            .optional()
            .map_err(|error| format!("Không kiểm tra được học phí tháng {month}: {error}"))?;
        if settled.is_none() {
            unpaid_months.push(month);
        }
    }

    Ok(unpaid_months)
}

#[tauri::command]
pub fn reactivate_student_membership(
    database: tauri::State<'_, AppDatabase>,
    request: ReactivateStudentMembershipRequest,
) -> Result<(), String> {
    database.with_connection_mut(|connection| {
        let updated = connection
            .execute(
                "UPDATE class_memberships
                 SET status = 'active',
                     left_month = NULL,
                     left_at = NULL,
                     updated_at = CURRENT_TIMESTAMP
                 WHERE id = ?1",
                params![request.membership_id],
            )
            .map_err(|error| format!("Không kích hoạt lại được học sinh: {error}"))?;

        if updated == 0 {
            return Err("Không tìm thấy học sinh trong lớp.".to_string());
        }

        Ok(())
    })
}

#[tauri::command]
pub fn import_students_for_class(
    database: tauri::State<'_, AppDatabase>,
    request: ImportStudentsRequest,
) -> Result<ImportStudentsSummaryDto, String> {
    validate_class_exists(&database, request.class_id)?;

    if request.rows.is_empty() {
        return Err("Không có dòng nào để nhập.".to_string());
    }

    database.with_connection_mut(|connection| {
        let (class_start_month, class_end_month) = class_month_range(connection, request.class_id)?;

        let transaction = connection
            .transaction()
            .map_err(|error| format!("Không bắt đầu được transaction nhập học sinh: {error}"))?;

        let mut created_count = 0i64;
        let mut updated_count = 0i64;

        for (index, row) in request.rows.iter().enumerate() {
            let row_label = format!("Dòng {} ({})", index + 1, row.full_name.trim());

            validate_import_row(row, &class_start_month, &class_end_month)
                .map_err(|error| format!("{row_label}: {error}"))?;

            let full_name = row.full_name.trim().to_string();
            let school_class = row.school_class.trim().to_string();
            let school = row.school.trim().to_string();
            let parent_phone = row.parent_phone.trim().to_string();
            let note = normalize_optional_text(row.note.as_deref());
            let left_month = if row.status == "paused" {
                row.left_month.clone()
            } else {
                None
            };

            match row.action.as_str() {
                "create" => {
                    transaction
                        .execute(
                            "INSERT INTO students
                             (full_name, school_class, school, parent_phone, note, is_archived, created_at, updated_at)
                             VALUES (?1, ?2, ?3, ?4, ?5, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
                            params![full_name, school_class, school, parent_phone, note],
                        )
                        .map_err(|error| format!("{row_label}: không tạo được học sinh: {error}"))?;
                    let student_id = transaction.last_insert_rowid();

                    transaction
                        .execute(
                            "INSERT INTO class_memberships
                             (class_id, student_id, status, joined_at, left_at, note, joined_month, left_month, created_at, updated_at)
                             VALUES (?1, ?2, ?3, CURRENT_DATE, NULL, NULL, ?4, ?5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
                            params![
                                request.class_id,
                                student_id,
                                row.status,
                                row.joined_month,
                                left_month
                            ],
                        )
                        .map_err(|error| {
                            format!("{row_label}: không thêm được học sinh vào lớp: {error}")
                        })?;

                    created_count += 1;
                }
                "update" => {
                    let membership_id = row.matched_membership_id.ok_or_else(|| {
                        format!("{row_label}: thiếu thông tin học sinh cần cập nhật.")
                    })?;
                    let student_id = row.matched_student_id.ok_or_else(|| {
                        format!("{row_label}: thiếu thông tin học sinh cần cập nhật.")
                    })?;

                    let membership: Option<(i64, i64)> = transaction
                        .query_row(
                            "SELECT class_id, student_id FROM class_memberships WHERE id = ?1",
                            params![membership_id],
                            |db_row| Ok((db_row.get(0)?, db_row.get(1)?)),
                        )
                        .optional()
                        .map_err(|error| {
                            format!("{row_label}: không đọc được học sinh trong lớp: {error}")
                        })?;

                    let Some((membership_class_id, membership_student_id)) = membership else {
                        return Err(format!("{row_label}: không tìm thấy học sinh trong lớp."));
                    };

                    if membership_class_id != request.class_id
                        || membership_student_id != student_id
                    {
                        return Err(format!(
                            "{row_label}: thông tin học sinh không khớp với lớp hiện tại."
                        ));
                    }

                    transaction
                        .execute(
                            "UPDATE students
                             SET full_name = ?1,
                                 school_class = ?2,
                                 school = ?3,
                                 parent_phone = ?4,
                                 note = ?5,
                                 updated_at = CURRENT_TIMESTAMP
                             WHERE id = ?6 AND is_archived = 0",
                            params![full_name, school_class, school, parent_phone, note, student_id],
                        )
                        .map_err(|error| {
                            format!("{row_label}: không cập nhật được học sinh: {error}")
                        })?;

                    transaction
                        .execute(
                            "UPDATE class_memberships
                             SET status = ?1,
                                 joined_month = ?2,
                                 left_month = ?3,
                                 left_at = CASE WHEN ?1 = 'paused' THEN CURRENT_DATE ELSE NULL END,
                                 updated_at = CURRENT_TIMESTAMP
                             WHERE id = ?4",
                            params![row.status, row.joined_month, left_month, membership_id],
                        )
                        .map_err(|error| {
                            format!("{row_label}: không cập nhật được học sinh trong lớp: {error}")
                        })?;

                    updated_count += 1;
                }
                _ => {
                    return Err(format!("{row_label}: hành động nhập không hợp lệ."));
                }
            }
        }

        transaction
            .commit()
            .map_err(|error| format!("Không commit được dữ liệu nhập học sinh: {error}"))?;

        Ok(ImportStudentsSummaryDto {
            created_count,
            updated_count,
        })
    })
}

fn validate_import_row(
    row: &ImportStudentRowInput,
    class_start_month: &str,
    class_end_month: &str,
) -> Result<(), String> {
    validate_student_name(&row.full_name)?;
    validate_membership_status(&row.status)?;

    crate::months::validate_month(&row.joined_month)
        .map_err(|_| "tháng bắt đầu học không hợp lệ, cần định dạng YYYY-MM.".to_string())?;

    if row.joined_month.as_str() < class_start_month || row.joined_month.as_str() > class_end_month
    {
        return Err(format!(
            "tháng bắt đầu học phải nằm trong thời gian học của lớp ({} - {}).",
            crate::months::format_month_label(class_start_month),
            crate::months::format_month_label(class_end_month)
        ));
    }

    if row.status == "paused" {
        let left_month = row
            .left_month
            .as_deref()
            .ok_or_else(|| "học sinh đã nghỉ cần có tháng nghỉ.".to_string())?;

        crate::months::validate_month(left_month)
            .map_err(|_| "tháng nghỉ không hợp lệ, cần định dạng YYYY-MM.".to_string())?;

        if left_month < row.joined_month.as_str() {
            return Err("tháng nghỉ không được trước tháng bắt đầu học.".to_string());
        }

        if left_month > class_end_month {
            return Err("tháng nghỉ không được vượt quá thời gian học của lớp.".to_string());
        }
    }

    Ok(())
}

fn class_month_range(connection: &Connection, class_id: i64) -> Result<(String, String), String> {
    connection
        .query_row(
            "SELECT start_month, end_month FROM classes WHERE id = ?1 AND is_archived = 0",
            params![class_id],
            |row| Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?)),
        )
        .optional()
        .map_err(|error| format!("Không đọc được thời gian học của lớp: {error}"))?
        .ok_or_else(|| "Không tìm thấy lớp học.".to_string())
}

fn list_students_by_class_value(
    connection: &Connection,
    class_id: i64,
) -> Result<Vec<StudentListItemDto>, String> {
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
               AND COALESCE(cm.is_archived, 0) = 0
             ORDER BY s.full_name COLLATE NOCASE ASC, cm.id ASC",
        )
        .map_err(|error| format!("Không chuẩn bị được truy vấn học sinh: {error}"))?;

    let rows = statement
        .query_map(params![class_id], map_student_list_item)
        .map_err(|error| format!("Không đọc được danh sách học sinh: {error}"))?;

    collect_rows(rows, "Không parse được học sinh")
}

fn get_student_list_item(
    connection: &Connection,
    membership_id: i64,
) -> Result<StudentListItemDto, String> {
    connection
        .query_row(
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
             WHERE cm.id = ?1
               AND s.is_archived = 0
               AND COALESCE(cm.is_archived, 0) = 0",
            params![membership_id],
            map_student_list_item,
        )
        .optional()
        .map_err(|error| format!("Không đọc được học sinh vừa tạo: {error}"))?
        .ok_or_else(|| "Không tìm thấy học sinh vừa tạo.".to_string())
}

fn map_student_list_item(row: &rusqlite::Row<'_>) -> rusqlite::Result<StudentListItemDto> {
    let membership_id: i64 = row.get(0)?;
    let student_id: i64 = row.get(1)?;

    Ok(StudentListItemDto {
        id: student_id.clone(),
        membership_id,
        student_id,
        class_id: row.get(2)?,
        full_name: row.get(3)?,
        school_class: row.get(4)?,
        school: row.get(5)?,
        parent_phone: row.get(6)?,
        status: row.get(7)?,
        joined_month: row.get(8)?,
        left_month: row.get(9)?,
        note: row.get(10)?,
    })
}

fn validate_class_exists(database: &AppDatabase, class_id: i64) -> Result<(), String> {
    database.with_connection(|connection| {
        let class_id = connection
            .query_row(
                "SELECT id FROM classes WHERE id = ?1 AND is_archived = 0",
                params![class_id],
                |row| row.get::<_, i64>(0),
            )
            .optional()
            .map_err(|error| format!("Không kiểm tra được lớp học: {error}"))?;

        class_id
            .map(|_| ())
            .ok_or_else(|| "Không tìm thấy lớp học.".to_string())
    })
}

fn validate_student_name(full_name: &str) -> Result<(), String> {
    if full_name.trim().is_empty() {
        return Err("Họ tên học sinh không được để trống.".to_string());
    }

    Ok(())
}

fn validate_membership_status(status: &str) -> Result<(), String> {
    match status {
        "active" | "paused" => Ok(()),
        _ => Err("Trạng thái học sinh không hợp lệ.".to_string()),
    }
}

fn normalize_optional_text(value: Option<&str>) -> Option<String> {
    value
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(ToString::to_string)
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

