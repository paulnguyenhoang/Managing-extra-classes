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
                 WHERE cm.class_id = ?1
                   AND s.is_archived = 0
                   AND cm.joined_month <= ?2
                   AND (cm.left_month IS NULL OR ?2 < cm.left_month)
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
        ensure_membership_eligible_for_month(
            connection,
            request.membership_id,
            request.class_id,
            request.student_id,
            &request.month,
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
        ensure_membership_eligible_for_month(
            connection,
            request.membership_id,
            request.class_id,
            request.student_id,
            &request.month,
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
        ensure_membership_eligible_for_month(
            connection,
            request.membership_id,
            request.class_id,
            request.student_id,
            &request.month,
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
        ensure_membership_eligible_for_month(
            connection,
            request.membership_id,
            request.class_id,
            request.student_id,
            &request.month,
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
    // Tháng hiện tại nằm ngoài thời gian học của lớp thì không tính nợ (trả 0);
    // membership chỉ tính khi active và đang thuộc lớp trong tháng hiện tại.
    connection
        .query_row(
            "SELECT COUNT(*)
             FROM class_memberships cm
             JOIN students s ON s.id = cm.student_id
             JOIN classes c ON c.id = cm.class_id
             LEFT JOIN payments p
               ON p.membership_id = cm.id
               AND p.month = strftime('%Y-%m', 'now', 'localtime')
             WHERE cm.class_id = ?1
               AND cm.status = 'active'
               AND s.is_archived = 0
               AND c.start_month <= strftime('%Y-%m', 'now', 'localtime')
               AND c.end_month >= strftime('%Y-%m', 'now', 'localtime')
               AND cm.joined_month <= strftime('%Y-%m', 'now', 'localtime')
               AND (cm.left_month IS NULL OR strftime('%Y-%m', 'now', 'localtime') < cm.left_month)
               AND (p.id IS NULL OR p.status = 'unpaid')",
            params![class_id],
            |row| row.get(0),
        )
        .map_err(|error| format!("Không đếm được học sinh chưa đóng học phí: {error}"))
}

#[tauri::command]
pub fn get_unpaid_months_for_membership(
    database: tauri::State<'_, AppDatabase>,
    membership_id: i64,
    left_month: String,
) -> Result<Vec<String>, String> {
    crate::months::validate_month(&left_month)
        .map_err(|_| "Tháng nghỉ không hợp lệ, cần định dạng YYYY-MM.".to_string())?;

    database.with_connection(|connection| {
        let membership = connection
            .query_row(
                "SELECT cm.joined_month, c.end_month
                 FROM class_memberships cm
                 JOIN classes c ON c.id = cm.class_id
                 WHERE cm.id = ?1",
                params![membership_id],
                |row| Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?)),
            )
            .optional()
            .map_err(|error| format!("Không đọc được thông tin học sinh trong lớp: {error}"))?
            .ok_or_else(|| "Không tìm thấy học sinh trong lớp.".to_string())?;

        let (joined_month, class_end_month) = membership;

        // Tính nợ từ joined_month đến tháng TRƯỚC left_month (left_month là exclusive),
        // không vượt quá tháng kết thúc của lớp.
        let last_month = crate::months::add_months(&left_month, -1)?;
        let last_month = if last_month > class_end_month {
            class_end_month
        } else {
            last_month
        };

        if last_month < joined_month {
            return Ok(Vec::new());
        }

        let months = crate::months::months_in_range(&joined_month, &last_month)?;
        let mut unpaid_months = Vec::new();

        for month in months {
            let settled: Option<String> = connection
                .query_row(
                    "SELECT status FROM payments
                     WHERE membership_id = ?1 AND month = ?2
                       AND status IN ('paid', 'waived')",
                    params![membership_id, month],
                    |row| row.get(0),
                )
                .optional()
                .map_err(|error| format!("Không kiểm tra được học phí tháng {month}: {error}"))?;

            if settled.is_none() {
                unpaid_months.push(month);
            }
        }

        Ok(unpaid_months)
    })
}

/// Học sinh phải "thuộc lớp trong tháng đó" mới thao tác học phí được:
/// joined_month <= month < left_month. Không yêu cầu membership đang active
/// để thầy vẫn ghi nhận trả nợ các tháng đã học của học sinh đã nghỉ.
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
            return Err(
                "Học sinh đã nghỉ lớp từ tháng này, không thể cập nhật học phí.".to_string(),
            );
        }
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
    crate::months::validate_month(month)
        .map_err(|_| "Tháng học phí không hợp lệ, cần định dạng YYYY-MM.".to_string())
}

fn normalize_optional_text(value: Option<&str>) -> Option<String> {
    value
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(ToString::to_string)
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TuitionDashboardRowDto {
    class_id: i64,
    class_name: String,
    grade: i64,
    membership_id: i64,
    student_id: i64,
    full_name: String,
    school_class: String,
    school: String,
    parent_phone: String,
    status: String,
    amount: i64,
    paid_at: Option<String>,
    note: Option<String>,
    monthly_fee: i64,
    payment_id: Option<i64>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TuitionDashboardSummaryDto {
    total_students: i64,
    paid_count: i64,
    unpaid_count: i64,
    waived_count: i64,
    total_collected: i64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TuitionDashboardDto {
    academic_year_id: i64,
    month: String,
    rows: Vec<TuitionDashboardRowDto>,
    summary: TuitionDashboardSummaryDto,
}

/// Dashboard học phí toàn app: chỉ đọc, KHÔNG tạo payment row nào khi xem.
#[tauri::command]
pub fn list_tuition_dashboard(
    database: tauri::State<'_, AppDatabase>,
    academic_year_id: i64,
    month: String,
) -> Result<TuitionDashboardDto, String> {
    validate_month(&month)?;

    database.with_connection(|connection| {
        let year_range: Option<(String, String)> = connection
            .query_row(
                "SELECT starts_at, ends_at FROM academic_years WHERE id = ?1",
                params![academic_year_id],
                |row| Ok((row.get(0)?, row.get(1)?)),
            )
            .optional()
            .map_err(|error| format!("Không đọc được năm học: {error}"))?;

        let Some((starts_at, ends_at)) = year_range else {
            return Err("Không tìm thấy năm học.".to_string());
        };

        // Tháng ngoài năm học: trả kết quả rỗng thay vì lỗi (frontend chỉ chọn tháng trong năm).
        let year_start_month = starts_at.chars().take(7).collect::<String>();
        let year_end_month = ends_at.chars().take(7).collect::<String>();
        if month < year_start_month || month > year_end_month {
            return Ok(TuitionDashboardDto {
                academic_year_id,
                month,
                rows: Vec::new(),
                summary: TuitionDashboardSummaryDto {
                    total_students: 0,
                    paid_count: 0,
                    unpaid_count: 0,
                    waived_count: 0,
                    total_collected: 0,
                },
            });
        }

        let mut statement = connection
            .prepare(
                "SELECT
                   c.id,
                   c.name,
                   COALESCE(c.grade, 9),
                   c.monthly_fee,
                   cm.id,
                   s.id,
                   s.full_name,
                   s.school_class,
                   s.school,
                   s.parent_phone,
                   p.id,
                   p.status,
                   p.amount,
                   p.paid_at,
                   p.note
                 FROM classes c
                 JOIN class_memberships cm ON cm.class_id = c.id
                 JOIN students s ON s.id = cm.student_id
                 LEFT JOIN payments p
                   ON p.membership_id = cm.id AND p.month = ?2
                 WHERE c.academic_year_id = ?1
                   AND c.is_archived = 0
                   AND c.start_month <= ?2
                   AND ?2 <= c.end_month
                   AND s.is_archived = 0
                   AND cm.joined_month <= ?2
                   AND (cm.left_month IS NULL OR ?2 < cm.left_month)
                 ORDER BY COALESCE(c.grade, 9) ASC, c.name COLLATE NOCASE ASC,
                          s.full_name COLLATE NOCASE ASC, cm.id ASC",
            )
            .map_err(|error| format!("Không chuẩn bị được truy vấn tổng hợp học phí: {error}"))?;

        let mapped = statement
            .query_map(params![academic_year_id, month], |row| {
                Ok(TuitionDashboardRowDto {
                    class_id: row.get(0)?,
                    class_name: row.get(1)?,
                    grade: row.get(2)?,
                    monthly_fee: row.get(3)?,
                    membership_id: row.get(4)?,
                    student_id: row.get(5)?,
                    full_name: row.get(6)?,
                    school_class: row.get(7)?,
                    school: row.get(8)?,
                    parent_phone: row.get(9)?,
                    payment_id: row.get(10)?,
                    status: row
                        .get::<_, Option<String>>(11)?
                        .unwrap_or_else(|| "unpaid".to_string()),
                    amount: row.get::<_, Option<i64>>(12)?.unwrap_or(0),
                    paid_at: row.get(13)?,
                    note: row.get(14)?,
                })
            })
            .map_err(|error| format!("Không đọc được dữ liệu tổng hợp học phí: {error}"))?;

        let mut rows = Vec::new();
        for row in mapped {
            rows.push(
                row.map_err(|error| format!("Không parse được dữ liệu tổng hợp học phí: {error}"))?,
            );
        }

        let summary = TuitionDashboardSummaryDto {
            total_students: rows.len() as i64,
            paid_count: rows.iter().filter(|row| row.status == "paid").count() as i64,
            unpaid_count: rows.iter().filter(|row| row.status == "unpaid").count() as i64,
            waived_count: rows.iter().filter(|row| row.status == "waived").count() as i64,
            total_collected: rows
                .iter()
                .filter(|row| row.status == "paid" || row.status == "waived")
                .map(|row| row.amount)
                .sum(),
        };

        Ok(TuitionDashboardDto {
            academic_year_id,
            month,
            rows,
            summary,
        })
    })
}
