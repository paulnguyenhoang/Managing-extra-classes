use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};

use crate::db::AppDatabase;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PaymentRowDto {
    membership_id: i64,
    student_id: i64,
    class_id: i64,
    full_name: String,
    school_class: String,
    school: String,
    parent_phone: String,
    membership_status: String,
    payment_id: Option<i64>,
    month: String,
    status: String,
    amount: i64,
    paid_at: Option<String>,
    note: Option<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PaymentActionRequest {
    membership_id: i64,
    class_id: i64,
    student_id: i64,
    month: String,
    amount: Option<i64>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PaymentWaiverRequest {
    membership_id: i64,
    class_id: i64,
    student_id: i64,
    month: String,
    amount: i64,
    note: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PaymentNoteRequest {
    membership_id: i64,
    class_id: i64,
    student_id: i64,
    month: String,
    note: String,
}

#[tauri::command]
pub fn list_payments_by_class_month(
    database: tauri::State<'_, AppDatabase>,
    class_id: i64,
    month: String,
) -> Result<Vec<PaymentRowDto>, String> {
    validate_month(&month)?;

    database.with_connection(|connection| {
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
                   p.id,
                   p.status,
                   p.amount,
                   p.paid_at,
                   p.note
                 FROM class_memberships cm
                 JOIN students s ON s.id = cm.student_id
                 LEFT JOIN payments p
                   ON p.membership_id = cm.id AND p.month = ?2
                 WHERE cm.class_id = ?1 AND cm.status = 'active' AND s.is_archived = 0
                 ORDER BY cm.created_at ASC, s.full_name ASC",
            )
            .map_err(|error| format!("Không chuẩn bị được truy vấn học phí: {error}"))?;

        let rows = statement
            .query_map(params![class_id, month], |row| {
                let payment_id: Option<i64> = row.get(8)?;

                Ok(PaymentRowDto {
                    membership_id: row.get(0)?,
                    student_id: row.get(1)?,
                    class_id: row.get(2)?,
                    full_name: row.get(3)?,
                    school_class: row.get(4)?,
                    school: row.get(5)?,
                    parent_phone: row.get(6)?,
                    membership_status: row.get(7)?,
                    payment_id,
                    month: month.clone(),
                    status: row
                        .get::<_, Option<String>>(9)?
                        .unwrap_or_else(|| "unpaid".to_string()),
                    amount: row.get::<_, Option<i64>>(10)?.unwrap_or(0),
                    paid_at: row.get(11)?,
                    note: row.get(12)?,
                })
            })
            .map_err(|error| format!("Không đọc được dữ liệu học phí: {error}"))?;

        let mut result = Vec::new();
        for row in rows {
            result.push(row.map_err(|error| format!("Không parse được dữ liệu học phí: {error}"))?);
        }

        Ok(result)
    })
}

#[tauri::command]
pub fn set_payment_paid(
    database: tauri::State<'_, AppDatabase>,
    request: PaymentActionRequest,
) -> Result<(), String> {
    validate_month(&request.month)?;

    database.with_connection_mut(|connection| {
        ensure_active_membership(
            connection,
            request.membership_id,
            request.class_id,
            request.student_id,
        )?;

        let monthly_fee = class_monthly_fee(connection, request.class_id)?;
        let amount = request.amount.unwrap_or(monthly_fee);

        if amount < 0 {
            return Err("Số tiền học phí không được nhỏ hơn 0.".to_string());
        }

        connection
            .execute(
                "INSERT INTO payments
                 (membership_id, class_id, student_id, month, status, amount, paid_at, note, created_at, updated_at)
                 VALUES (?1, ?2, ?3, ?4, 'paid', ?5, date('now', 'localtime'), NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                 ON CONFLICT(membership_id, month) DO UPDATE SET
                   status = 'paid',
                   amount = excluded.amount,
                   paid_at = date('now', 'localtime'),
                   updated_at = CURRENT_TIMESTAMP",
                params![
                    request.membership_id,
                    request.class_id,
                    request.student_id,
                    request.month,
                    amount
                ],
            )
            .map_err(|error| format!("Không lưu được trạng thái đã đóng: {error}"))?;

        Ok(())
    })
}

#[tauri::command]
pub fn set_payment_unpaid(
    database: tauri::State<'_, AppDatabase>,
    request: PaymentActionRequest,
) -> Result<(), String> {
    validate_month(&request.month)?;

    database.with_connection_mut(|connection| {
        ensure_active_membership(
            connection,
            request.membership_id,
            request.class_id,
            request.student_id,
        )?;

        // Giữ nguyên note khi chuyển về chưa đóng, khớp hành vi UI trước đây.
        connection
            .execute(
                "INSERT INTO payments
                 (membership_id, class_id, student_id, month, status, amount, paid_at, note, created_at, updated_at)
                 VALUES (?1, ?2, ?3, ?4, 'unpaid', 0, NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                 ON CONFLICT(membership_id, month) DO UPDATE SET
                   status = 'unpaid',
                   amount = 0,
                   paid_at = NULL,
                   updated_at = CURRENT_TIMESTAMP",
                params![
                    request.membership_id,
                    request.class_id,
                    request.student_id,
                    request.month
                ],
            )
            .map_err(|error| format!("Không lưu được trạng thái chưa đóng: {error}"))?;

        Ok(())
    })
}

#[tauri::command]
pub fn set_payment_waived(
    database: tauri::State<'_, AppDatabase>,
    request: PaymentWaiverRequest,
) -> Result<(), String> {
    validate_month(&request.month)?;

    let note = request.note.trim();
    if note.is_empty() {
        return Err("Miễn giảm học phí cần có ghi chú.".to_string());
    }

    if request.amount < 0 {
        return Err("Số tiền thực thu không được nhỏ hơn 0.".to_string());
    }

    database.with_connection_mut(|connection| {
        ensure_active_membership(
            connection,
            request.membership_id,
            request.class_id,
            request.student_id,
        )?;

        let monthly_fee = class_monthly_fee(connection, request.class_id)?;
        if request.amount > monthly_fee {
            return Err("Số tiền thực thu không được lớn hơn học phí tháng của lớp.".to_string());
        }

        let paid_at: Option<String> = if request.amount > 0 {
            connection
                .query_row("SELECT date('now', 'localtime')", [], |row| row.get(0))
                .optional()
                .map_err(|error| format!("Không đọc được ngày hiện tại: {error}"))?
        } else {
            None
        };

        connection
            .execute(
                "INSERT INTO payments
                 (membership_id, class_id, student_id, month, status, amount, paid_at, note, created_at, updated_at)
                 VALUES (?1, ?2, ?3, ?4, 'waived', ?5, ?6, ?7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                 ON CONFLICT(membership_id, month) DO UPDATE SET
                   status = 'waived',
                   amount = excluded.amount,
                   paid_at = excluded.paid_at,
                   note = excluded.note,
                   updated_at = CURRENT_TIMESTAMP",
                params![
                    request.membership_id,
                    request.class_id,
                    request.student_id,
                    request.month,
                    request.amount,
                    paid_at,
                    note
                ],
            )
            .map_err(|error| format!("Không lưu được miễn giảm học phí: {error}"))?;

        Ok(())
    })
}

#[tauri::command]
pub fn update_payment_note(
    database: tauri::State<'_, AppDatabase>,
    request: PaymentNoteRequest,
) -> Result<(), String> {
    validate_month(&request.month)?;

    database.with_connection_mut(|connection| {
        ensure_active_membership(
            connection,
            request.membership_id,
            request.class_id,
            request.student_id,
        )?;

        let note = normalize_optional_text(Some(request.note.as_str()));

        connection
            .execute(
                "INSERT INTO payments
                 (membership_id, class_id, student_id, month, status, amount, paid_at, note, created_at, updated_at)
                 VALUES (?1, ?2, ?3, ?4, 'unpaid', 0, NULL, ?5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                 ON CONFLICT(membership_id, month) DO UPDATE SET
                   note = excluded.note,
                   updated_at = CURRENT_TIMESTAMP",
                params![
                    request.membership_id,
                    request.class_id,
                    request.student_id,
                    request.month,
                    note
                ],
            )
            .map_err(|error| format!("Không lưu được ghi chú học phí: {error}"))?;

        Ok(())
    })
}

pub fn count_unpaid_by_class_current_month(
    connection: &Connection,
    class_id: i64,
) -> Result<i64, String> {
    connection
        .query_row(
            "SELECT COUNT(*)
             FROM class_memberships cm
             JOIN students s ON s.id = cm.student_id
             LEFT JOIN payments p
               ON p.membership_id = cm.id
               AND p.month = strftime('%Y-%m', 'now', 'localtime')
             WHERE cm.class_id = ?1
               AND cm.status = 'active'
               AND s.is_archived = 0
               AND (p.id IS NULL OR p.status = 'unpaid')",
            params![class_id],
            |row| row.get(0),
        )
        .map_err(|error| format!("Không đếm được học sinh chưa đóng học phí: {error}"))
}

fn ensure_active_membership(
    connection: &Connection,
    membership_id: i64,
    class_id: i64,
    student_id: i64,
) -> Result<(), String> {
    let status = connection
        .query_row(
            "SELECT cm.status
             FROM class_memberships cm
             JOIN students s ON s.id = cm.student_id
             WHERE cm.id = ?1 AND cm.class_id = ?2 AND cm.student_id = ?3 AND s.is_archived = 0",
            params![membership_id, class_id, student_id],
            |row| row.get::<_, String>(0),
        )
        .optional()
        .map_err(|error| format!("Không kiểm tra được học sinh trong lớp: {error}"))?
        .ok_or_else(|| "Không tìm thấy học sinh trong lớp này.".to_string())?;

    if status != "active" {
        return Err("Học sinh đã tạm nghỉ lớp, không thể cập nhật học phí.".to_string());
    }

    Ok(())
}

fn class_monthly_fee(connection: &Connection, class_id: i64) -> Result<i64, String> {
    connection
        .query_row(
            "SELECT monthly_fee FROM classes WHERE id = ?1 AND is_archived = 0",
            params![class_id],
            |row| row.get(0),
        )
        .optional()
        .map_err(|error| format!("Không đọc được học phí lớp: {error}"))?
        .ok_or_else(|| "Không tìm thấy lớp học.".to_string())
}

fn validate_month(month: &str) -> Result<(), String> {
    let bytes = month.as_bytes();
    let is_valid = bytes.len() == 7
        && bytes[..4].iter().all(u8::is_ascii_digit)
        && bytes[4] == b'-'
        && bytes[5..].iter().all(u8::is_ascii_digit)
        && matches!(&month[5..], "01" | "02" | "03" | "04" | "05" | "06" | "07" | "08" | "09" | "10" | "11" | "12");

    if is_valid {
        Ok(())
    } else {
        Err("Tháng học phí không hợp lệ, cần định dạng YYYY-MM.".to_string())
    }
}

fn normalize_optional_text(value: Option<&str>) -> Option<String> {
    value
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(ToString::to_string)
}
