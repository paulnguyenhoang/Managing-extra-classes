use std::collections::{HashMap, HashSet};

use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};

use crate::db::AppDatabase;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ScoreColumnDto {
    id: i64,
    class_id: i64,
    month: String,
    label: String,
    sort_order: i64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ScoreSheetRowDto {
    membership_id: i64,
    student_id: i64,
    class_id: i64,
    full_name: String,
    school_class: String,
    school: String,
    parent_phone: String,
    membership_status: String,
    joined_month: String,
    left_month: Option<String>,
    values_by_column_id: HashMap<i64, Option<f64>>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ScoreSheetDto {
    class_id: i64,
    month: String,
    columns: Vec<ScoreColumnDto>,
    rows: Vec<ScoreSheetRowDto>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AddScoreColumnRequest {
    class_id: i64,
    month: String,
    label: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RenameScoreColumnRequest {
    column_id: i64,
    label: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DeleteScoreColumnRequest {
    column_id: i64,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveScoreValueInput {
    column_id: i64,
    membership_id: i64,
    student_id: i64,
    value: Option<f64>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveScoreValuesRequest {
    class_id: i64,
    month: String,
    values: Vec<SaveScoreValueInput>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportScoreColumnInput {
    existing_column_id: Option<i64>,
    label: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportScoreRowInput {
    membership_id: i64,
    student_id: i64,
    values: Vec<Option<f64>>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportScoreSheetRequest {
    class_id: i64,
    month: String,
    columns: Vec<ImportScoreColumnInput>,
    deleted_column_ids: Vec<i64>,
    rows: Vec<ImportScoreRowInput>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportScoreSummaryDto {
    created_column_count: i64,
    updated_column_count: i64,
    deleted_column_count: i64,
}

#[tauri::command]
pub fn list_score_sheet(
    database: tauri::State<'_, AppDatabase>,
    class_id: i64,
    month: String,
) -> Result<ScoreSheetDto, String> {
    validate_month(&month)?;

    database.with_connection(|connection| build_score_sheet(connection, class_id, &month))
}

#[tauri::command]
pub fn add_score_column(
    database: tauri::State<'_, AppDatabase>,
    request: AddScoreColumnRequest,
) -> Result<ScoreSheetDto, String> {
    validate_month(&request.month)?;
    validate_label(&request.label)?;

    database.with_connection_mut(|connection| {
        let (start_month, end_month) = class_month_range(connection, request.class_id)?;

        if request.month < start_month || request.month > end_month {
            return Err(format!(
                "Tháng bài kiểm tra phải nằm trong thời gian học của lớp ({} - {}).",
                crate::months::format_month_label(&start_month),
                crate::months::format_month_label(&end_month)
            ));
        }

        connection
            .execute(
                "INSERT INTO score_columns
                 (class_id, month, label, sort_order, created_at, updated_at)
                 VALUES (
                   ?1, ?2, ?3,
                   COALESCE((SELECT MAX(sort_order) + 1 FROM score_columns WHERE class_id = ?1 AND month = ?2), 0),
                   CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
                 )",
                params![request.class_id, request.month, request.label.trim()],
            )
            .map_err(|error| format!("Không thêm được bài kiểm tra: {error}"))?;

        build_score_sheet(connection, request.class_id, &request.month)
    })
}

#[tauri::command]
pub fn rename_score_column(
    database: tauri::State<'_, AppDatabase>,
    request: RenameScoreColumnRequest,
) -> Result<(), String> {
    validate_label(&request.label)?;

    database.with_connection_mut(|connection| {
        let updated = connection
            .execute(
                "UPDATE score_columns
                 SET label = ?1, updated_at = CURRENT_TIMESTAMP
                 WHERE id = ?2",
                params![request.label.trim(), request.column_id],
            )
            .map_err(|error| format!("Không đổi tên được bài kiểm tra: {error}"))?;

        if updated == 0 {
            return Err("Không tìm thấy bài kiểm tra.".to_string());
        }

        Ok(())
    })
}

#[tauri::command]
pub fn delete_score_column(
    database: tauri::State<'_, AppDatabase>,
    request: DeleteScoreColumnRequest,
) -> Result<(), String> {
    database.with_connection_mut(|connection| {
        let transaction = connection
            .transaction()
            .map_err(|error| format!("Không bắt đầu được transaction xóa cột điểm: {error}"))?;

        transaction
            .execute(
                "DELETE FROM score_values WHERE column_id = ?1",
                params![request.column_id],
            )
            .map_err(|error| format!("Không xóa được điểm trong cột: {error}"))?;

        let deleted = transaction
            .execute(
                "DELETE FROM score_columns WHERE id = ?1",
                params![request.column_id],
            )
            .map_err(|error| format!("Không xóa được cột điểm: {error}"))?;

        if deleted == 0 {
            return Err("Không tìm thấy bài kiểm tra.".to_string());
        }

        transaction
            .commit()
            .map_err(|error| format!("Không commit được xóa cột điểm: {error}"))
    })
}

#[tauri::command]
pub fn save_score_values(
    database: tauri::State<'_, AppDatabase>,
    request: SaveScoreValuesRequest,
) -> Result<(), String> {
    validate_month(&request.month)?;

    for value in &request.values {
        if let Some(score) = value.value {
            if !(0.0..=10.0).contains(&score) {
                return Err(
                    "Điểm phải là số từ 0 đến 10. Có thể để trống nếu chưa có điểm.".to_string(),
                );
            }
        }
    }

    database.with_connection_mut(|connection| {
        // Cột phải thuộc đúng lớp/tháng của sheet đang lưu.
        let valid_column_ids: HashSet<i64> = {
            let mut statement = connection
                .prepare("SELECT id FROM score_columns WHERE class_id = ?1 AND month = ?2")
                .map_err(|error| format!("Không chuẩn bị được truy vấn cột điểm: {error}"))?;
            let ids = statement
                .query_map(params![request.class_id, request.month], |row| {
                    row.get::<_, i64>(0)
                })
                .map_err(|error| format!("Không đọc được cột điểm: {error}"))?;

            let mut result = HashSet::new();
            for id in ids {
                result.insert(id.map_err(|error| format!("Không parse được cột điểm: {error}"))?);
            }
            result
        };

        let mut checked_memberships: HashSet<i64> = HashSet::new();

        for value in &request.values {
            if !valid_column_ids.contains(&value.column_id) {
                return Err("Cột điểm không thuộc lớp/tháng đang lưu.".to_string());
            }

            if checked_memberships.insert(value.membership_id) {
                ensure_membership_eligible_for_month(
                    connection,
                    value.membership_id,
                    request.class_id,
                    value.student_id,
                    &request.month,
                )?;
            }
        }

        let transaction = connection
            .transaction()
            .map_err(|error| format!("Không bắt đầu được transaction lưu điểm: {error}"))?;

        for value in &request.values {
            match value.value {
                Some(score) => {
                    transaction
                        .execute(
                            "INSERT INTO score_values
                             (column_id, membership_id, student_id, value, created_at, updated_at)
                             VALUES (?1, ?2, ?3, ?4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                             ON CONFLICT(column_id, membership_id) DO UPDATE SET
                               value = excluded.value,
                               updated_at = CURRENT_TIMESTAMP",
                            params![
                                value.column_id,
                                value.membership_id,
                                value.student_id,
                                score
                            ],
                        )
                        .map_err(|error| format!("Không lưu được điểm: {error}"))?;
                }
                None => {
                    // Điểm trống: chỉ set NULL nếu row đã tồn tại, không tạo row thừa.
                    transaction
                        .execute(
                            "UPDATE score_values
                             SET value = NULL, updated_at = CURRENT_TIMESTAMP
                             WHERE column_id = ?1 AND membership_id = ?2",
                            params![value.column_id, value.membership_id],
                        )
                        .map_err(|error| format!("Không xóa được điểm: {error}"))?;
                }
            }
        }

        transaction
            .commit()
            .map_err(|error| format!("Không commit được lưu điểm: {error}"))
    })
}

#[tauri::command]
pub fn import_score_sheet(
    database: tauri::State<'_, AppDatabase>,
    request: ImportScoreSheetRequest,
) -> Result<ImportScoreSummaryDto, String> {
    validate_month(&request.month)?;

    // Validate labels và điểm trước khi mở transaction; backend không tin frontend.
    let mut normalized_labels: HashSet<String> = HashSet::new();
    for column in &request.columns {
        validate_label(&column.label)?;

        let normalized = column.label.trim().to_lowercase();
        if !normalized_labels.insert(normalized) {
            return Err(format!(
                "Tên cột điểm bị trùng: \"{}\".",
                column.label.trim()
            ));
        }
    }

    for row in &request.rows {
        if row.values.len() != request.columns.len() {
            return Err("Số điểm trong dòng không khớp với số cột điểm.".to_string());
        }

        for value in row.values.iter().flatten() {
            if !(0.0..=10.0).contains(value) {
                return Err(
                    "Điểm phải là số từ 0 đến 10. Có thể để trống nếu chưa có điểm.".to_string(),
                );
            }
        }
    }

    database.with_connection_mut(|connection| {
        let (start_month, end_month) = class_month_range(connection, request.class_id)?;
        if request.month < start_month || request.month > end_month {
            return Err(format!(
                "Tháng bảng điểm phải nằm trong thời gian học của lớp ({} - {}).",
                crate::months::format_month_label(&start_month),
                crate::months::format_month_label(&end_month)
            ));
        }

        // Toàn bộ cột hiện tại phải được file cover (giữ lại hoặc xóa) — chặn file cũ/lệch state.
        let current_column_ids: HashSet<i64> = {
            let mut statement = connection
                .prepare("SELECT id FROM score_columns WHERE class_id = ?1 AND month = ?2")
                .map_err(|error| format!("Không chuẩn bị được truy vấn cột điểm: {error}"))?;
            let ids = statement
                .query_map(params![request.class_id, request.month], |row| {
                    row.get::<_, i64>(0)
                })
                .map_err(|error| format!("Không đọc được cột điểm: {error}"))?;

            let mut result = HashSet::new();
            for id in ids {
                result.insert(id.map_err(|error| format!("Không parse được cột điểm: {error}"))?);
            }
            result
        };

        let mut covered_column_ids: HashSet<i64> = HashSet::new();
        for column in &request.columns {
            if let Some(column_id) = column.existing_column_id {
                if !current_column_ids.contains(&column_id) {
                    return Err("Cột điểm không thuộc lớp/tháng đang nhập.".to_string());
                }
                if !covered_column_ids.insert(column_id) {
                    return Err("Cột điểm bị lặp lại trong dữ liệu nhập.".to_string());
                }
            }
        }
        for column_id in &request.deleted_column_ids {
            if !current_column_ids.contains(column_id) {
                return Err("Cột điểm cần xóa không thuộc lớp/tháng đang nhập.".to_string());
            }
            if !covered_column_ids.insert(*column_id) {
                return Err("Cột điểm bị lặp lại trong dữ liệu nhập.".to_string());
            }
        }
        if covered_column_ids != current_column_ids {
            return Err(
                "Dữ liệu cột điểm không khớp với bảng điểm hiện tại. Vui lòng chọn lại file."
                    .to_string(),
            );
        }

        // Danh sách học sinh trong file phải khớp đúng roster hợp lệ của tháng.
        let eligible_membership_ids: HashSet<i64> = {
            let mut statement = connection
                .prepare(
                    "SELECT cm.id
                     FROM class_memberships cm
                     JOIN students s ON s.id = cm.student_id
                     WHERE cm.class_id = ?1
                       AND s.is_archived = 0
                       AND cm.joined_month <= ?2
                       AND (cm.left_month IS NULL OR ?2 < cm.left_month)",
                )
                .map_err(|error| format!("Không chuẩn bị được truy vấn học sinh: {error}"))?;
            let ids = statement
                .query_map(params![request.class_id, request.month], |row| {
                    row.get::<_, i64>(0)
                })
                .map_err(|error| format!("Không đọc được danh sách học sinh: {error}"))?;

            let mut result = HashSet::new();
            for id in ids {
                result.insert(id.map_err(|error| format!("Không parse được học sinh: {error}"))?);
            }
            result
        };

        let mut request_membership_ids: HashSet<i64> = HashSet::new();
        for row in &request.rows {
            if !request_membership_ids.insert(row.membership_id) {
                return Err("Học sinh bị lặp lại trong dữ liệu nhập.".to_string());
            }
            ensure_membership_eligible_for_month(
                connection,
                row.membership_id,
                request.class_id,
                row.student_id,
                &request.month,
            )?;
        }
        if request_membership_ids != eligible_membership_ids {
            return Err(
                "Danh sách học sinh trong file không khớp với lớp/tháng hiện tại. Vui lòng xuất lại file mới."
                    .to_string(),
            );
        }

        let transaction = connection
            .transaction()
            .map_err(|error| format!("Không bắt đầu được transaction nhập bảng điểm: {error}"))?;

        let mut created_column_count = 0i64;
        let mut updated_column_count = 0i64;

        // Xóa cột thiếu trong file trước (đã confirm ở preview): xóa điểm rồi xóa cột.
        for column_id in &request.deleted_column_ids {
            transaction
                .execute(
                    "DELETE FROM score_values WHERE column_id = ?1",
                    params![column_id],
                )
                .map_err(|error| format!("Không xóa được điểm trong cột: {error}"))?;
            transaction
                .execute(
                    "DELETE FROM score_columns WHERE id = ?1 AND class_id = ?2 AND month = ?3",
                    params![column_id, request.class_id, request.month],
                )
                .map_err(|error| format!("Không xóa được cột điểm: {error}"))?;
        }

        // Cột giữ lại/đổi tên + cột mới; sort_order theo đúng thứ tự cột trong file.
        let mut resolved_column_ids: Vec<i64> = Vec::with_capacity(request.columns.len());
        for (index, column) in request.columns.iter().enumerate() {
            let sort_order = index as i64;
            let label = column.label.trim();

            match column.existing_column_id {
                Some(column_id) => {
                    transaction
                        .execute(
                            "UPDATE score_columns
                             SET label = ?1, sort_order = ?2, updated_at = CURRENT_TIMESTAMP
                             WHERE id = ?3 AND class_id = ?4 AND month = ?5",
                            params![label, sort_order, column_id, request.class_id, request.month],
                        )
                        .map_err(|error| format!("Không cập nhật được cột điểm: {error}"))?;
                    updated_column_count += 1;
                    resolved_column_ids.push(column_id);
                }
                None => {
                    transaction
                        .execute(
                            "INSERT INTO score_columns
                             (class_id, month, label, sort_order, created_at, updated_at)
                             VALUES (?1, ?2, ?3, ?4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
                            params![request.class_id, request.month, label, sort_order],
                        )
                        .map_err(|error| format!("Không thêm được cột điểm: {error}"))?;
                    created_column_count += 1;
                    resolved_column_ids.push(transaction.last_insert_rowid());
                }
            }
        }

        for row in &request.rows {
            for (index, value) in row.values.iter().enumerate() {
                let column_id = resolved_column_ids[index];

                match value {
                    Some(score) => {
                        transaction
                            .execute(
                                "INSERT INTO score_values
                                 (column_id, membership_id, student_id, value, created_at, updated_at)
                                 VALUES (?1, ?2, ?3, ?4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                                 ON CONFLICT(column_id, membership_id) DO UPDATE SET
                                   value = excluded.value,
                                   updated_at = CURRENT_TIMESTAMP",
                                params![column_id, row.membership_id, row.student_id, score],
                            )
                            .map_err(|error| format!("Không lưu được điểm: {error}"))?;
                    }
                    None => {
                        // Điểm trống/"-": set NULL nếu row đã tồn tại, không tạo row thừa.
                        transaction
                            .execute(
                                "UPDATE score_values
                                 SET value = NULL, updated_at = CURRENT_TIMESTAMP
                                 WHERE column_id = ?1 AND membership_id = ?2",
                                params![column_id, row.membership_id],
                            )
                            .map_err(|error| format!("Không xóa được điểm: {error}"))?;
                    }
                }
            }
        }

        transaction
            .commit()
            .map_err(|error| format!("Không commit được nhập bảng điểm: {error}"))?;

        Ok(ImportScoreSummaryDto {
            created_column_count,
            updated_column_count,
            deleted_column_count: request.deleted_column_ids.len() as i64,
        })
    })
}

fn build_score_sheet(
    connection: &Connection,
    class_id: i64,
    month: &str,
) -> Result<ScoreSheetDto, String> {
    let columns = {
        let mut statement = connection
            .prepare(
                "SELECT id, class_id, month, label, sort_order
                 FROM score_columns
                 WHERE class_id = ?1 AND month = ?2
                 ORDER BY sort_order ASC, id ASC",
            )
            .map_err(|error| format!("Không chuẩn bị được truy vấn cột điểm: {error}"))?;

        let rows = statement
            .query_map(params![class_id, month], |row| {
                Ok(ScoreColumnDto {
                    id: row.get(0)?,
                    class_id: row.get(1)?,
                    month: row.get(2)?,
                    label: row.get(3)?,
                    sort_order: row.get(4)?,
                })
            })
            .map_err(|error| format!("Không đọc được cột điểm: {error}"))?;

        let mut result = Vec::new();
        for row in rows {
            result.push(row.map_err(|error| format!("Không parse được cột điểm: {error}"))?);
        }
        result
    };

    // Điểm của các cột thuộc lớp/tháng, gom theo membership.
    let mut values_by_membership: HashMap<i64, HashMap<i64, Option<f64>>> = HashMap::new();
    {
        let mut statement = connection
            .prepare(
                "SELECT sv.membership_id, sv.column_id, sv.value
                 FROM score_values sv
                 JOIN score_columns sc ON sc.id = sv.column_id
                 WHERE sc.class_id = ?1 AND sc.month = ?2",
            )
            .map_err(|error| format!("Không chuẩn bị được truy vấn điểm: {error}"))?;

        let rows = statement
            .query_map(params![class_id, month], |row| {
                Ok((
                    row.get::<_, i64>(0)?,
                    row.get::<_, i64>(1)?,
                    row.get::<_, Option<f64>>(2)?,
                ))
            })
            .map_err(|error| format!("Không đọc được điểm: {error}"))?;

        for row in rows {
            let (membership_id, column_id, value) =
                row.map_err(|error| format!("Không parse được điểm: {error}"))?;
            values_by_membership
                .entry(membership_id)
                .or_default()
                .insert(column_id, value);
        }
    }

    // Roster hợp lệ trong tháng: cùng rule lifecycle với PaymentsTab.
    let rows = {
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
                   cm.left_month
                 FROM class_memberships cm
                 JOIN students s ON s.id = cm.student_id
                 WHERE cm.class_id = ?1
                   AND s.is_archived = 0
                   AND cm.joined_month <= ?2
                   AND (cm.left_month IS NULL OR ?2 < cm.left_month)
                 ORDER BY s.full_name ASC, cm.id ASC",
            )
            .map_err(|error| format!("Không chuẩn bị được truy vấn học sinh: {error}"))?;

        let mapped = statement
            .query_map(params![class_id, month], |row| {
                Ok((
                    row.get::<_, i64>(0)?,
                    row.get::<_, i64>(1)?,
                    row.get::<_, i64>(2)?,
                    row.get::<_, String>(3)?,
                    row.get::<_, String>(4)?,
                    row.get::<_, String>(5)?,
                    row.get::<_, String>(6)?,
                    row.get::<_, String>(7)?,
                    row.get::<_, String>(8)?,
                    row.get::<_, Option<String>>(9)?,
                ))
            })
            .map_err(|error| format!("Không đọc được danh sách học sinh: {error}"))?;

        let mut result = Vec::new();
        for row in mapped {
            let (
                membership_id,
                student_id,
                row_class_id,
                full_name,
                school_class,
                school,
                parent_phone,
                membership_status,
                joined_month,
                left_month,
            ) = row.map_err(|error| format!("Không parse được học sinh: {error}"))?;

            result.push(ScoreSheetRowDto {
                membership_id,
                student_id,
                class_id: row_class_id,
                full_name,
                school_class,
                school,
                parent_phone,
                membership_status,
                joined_month,
                left_month,
                values_by_column_id: values_by_membership
                    .remove(&membership_id)
                    .unwrap_or_default(),
            });
        }
        result
    };

    Ok(ScoreSheetDto {
        class_id,
        month: month.to_string(),
        columns,
        rows,
    })
}

fn ensure_membership_eligible_for_month(
    connection: &Connection,
    membership_id: i64,
    class_id: i64,
    student_id: i64,
    month: &str,
) -> Result<(), String> {
    let membership = connection
        .query_row(
            "SELECT cm.joined_month, cm.left_month
             FROM class_memberships cm
             JOIN students s ON s.id = cm.student_id
             WHERE cm.id = ?1 AND cm.class_id = ?2 AND cm.student_id = ?3 AND s.is_archived = 0",
            params![membership_id, class_id, student_id],
            |row| Ok((row.get::<_, String>(0)?, row.get::<_, Option<String>>(1)?)),
        )
        .optional()
        .map_err(|error| format!("Không kiểm tra được học sinh trong lớp: {error}"))?
        .ok_or_else(|| "Không tìm thấy học sinh trong lớp này.".to_string())?;

    let (joined_month, left_month) = membership;

    if month < joined_month.as_str() {
        return Err("Học sinh chưa bắt đầu học trong tháng này.".to_string());
    }

    if let Some(left_month) = left_month {
        if month >= left_month.as_str() {
            return Err("Học sinh đã nghỉ lớp từ tháng này, không thể nhập điểm.".to_string());
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

fn validate_month(month: &str) -> Result<(), String> {
    crate::months::validate_month(month)
        .map_err(|_| "Tháng bảng điểm không hợp lệ, cần định dạng YYYY-MM.".to_string())
}

fn validate_label(label: &str) -> Result<(), String> {
    if label.trim().is_empty() {
        return Err("Tên bài kiểm tra không được để trống.".to_string());
    }

    Ok(())
}
