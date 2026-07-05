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
    note: Option<String>,
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

struct SeedStudent {
    class_key: &'static str,
    full_name: &'static str,
    school_class: &'static str,
    school: &'static str,
    parent_phone: &'static str,
    status: &'static str,
    note: Option<&'static str>,
}

pub fn seed_student_data(database: &AppDatabase) -> Result<(), String> {
    database.with_connection_mut(|connection| {
        let student_count: i64 = connection
            .query_row("SELECT COUNT(*) FROM students", [], |row| row.get(0))
            .map_err(|error| format!("Không kiểm tra được dữ liệu học sinh: {error}"))?;
        let membership_count: i64 = connection
            .query_row("SELECT COUNT(*) FROM class_memberships", [], |row| {
                row.get(0)
            })
            .map_err(|error| format!("Không kiểm tra được dữ liệu lớp-học-sinh: {error}"))?;

        if student_count > 0 || membership_count > 0 {
            return Ok(());
        }

        let transaction = connection
            .transaction()
            .map_err(|error| format!("Không bắt đầu được seed học sinh: {error}"))?;

        for student in seed_students() {
            let class_id = seed_class_id(&transaction, student.class_key)?;

            transaction
                .execute(
                    "INSERT INTO students
                     (full_name, school_class, school, parent_phone, note, is_archived, created_at, updated_at)
                     VALUES (?1, ?2, ?3, ?4, ?5, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
                    params![
                        student.full_name,
                        student.school_class,
                        student.school,
                        student.parent_phone,
                        student.note
                    ],
                )
                .map_err(|error| {
                    format!("Không seed được học sinh {}: {error}", student.full_name)
                })?;
            let student_id = transaction.last_insert_rowid();

            transaction
                .execute(
                    "INSERT INTO class_memberships
                     (class_id, student_id, status, joined_at, left_at, note, created_at, updated_at)
                     VALUES (?1, ?2, ?3, NULL, NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
                    params![class_id, student_id, student.status],
                )
                .map_err(|error| {
                    format!(
                        "Không seed được membership cho học sinh {}: {error}",
                        student.full_name
                    )
                })?;
        }

        transaction
            .commit()
            .map_err(|error| format!("Không commit được seed học sinh: {error}"))
    })
}

pub fn count_active_students_by_class(
    connection: &Connection,
    class_id: i64,
) -> Result<i64, String> {
    connection
        .query_row(
            "SELECT COUNT(*)
             FROM class_memberships
             WHERE class_id = ?1 AND status = 'active'",
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

    database.with_connection_mut(|connection| {
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
                 (class_id, student_id, status, joined_at, left_at, note, created_at, updated_at)
                 VALUES (?1, ?2, 'active', CURRENT_DATE, NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
                params![request.class_id, student_id],
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

    database.with_connection_mut(|connection| {
        let left_at_update = if request.status == "paused" {
            "CURRENT_DATE"
        } else {
            "NULL"
        };
        let sql = format!(
            "UPDATE class_memberships
             SET status = ?1,
                 left_at = {left_at_update},
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = ?2"
        );
        let updated = connection
            .execute(&sql, params![request.status, request.membership_id])
            .map_err(|error| {
                format!("Không cập nhật được trạng thái học sinh trong lớp: {error}")
            })?;

        if updated == 0 {
            return Err("Không tìm thấy học sinh trong lớp.".to_string());
        }

        Ok(())
    })
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
               s.note
             FROM class_memberships cm
             JOIN students s ON s.id = cm.student_id
             WHERE cm.class_id = ?1 AND s.is_archived = 0
             ORDER BY cm.created_at ASC, s.full_name ASC",
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
               s.note
             FROM class_memberships cm
             JOIN students s ON s.id = cm.student_id
             WHERE cm.id = ?1 AND s.is_archived = 0",
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
        note: row.get(8)?,
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

fn seed_class_id(transaction: &rusqlite::Transaction<'_>, class_key: &str) -> Result<i64, String> {
    let class_name = match class_key {
        "van-9a" => "Văn 9 - Ôn thi vào 10",
        "van-8a" => "Văn 8 - Nâng cao",
        "van-8b" => "Văn 8 - Cơ bản",
        "van-9-old" => "Văn 9 - Khóa trước",
        _ => return Err(format!("Không nhận diện được lớp seed {class_key}.")),
    };

    transaction
        .query_row(
            "SELECT id FROM classes WHERE name = ?1 AND is_archived = 0 LIMIT 1",
            params![class_name],
            |row| row.get::<_, i64>(0),
        )
        .optional()
        .map_err(|error| format!("Không tìm được lớp seed {class_name}: {error}"))?
        .ok_or_else(|| format!("Không tìm thấy lớp seed {class_name}."))
}

fn seed_students() -> [SeedStudent; 9] {
    [
        SeedStudent {
            class_key: "van-9a",
            full_name: "Nguyễn Minh Anh",
            school_class: "9A1",
            school: "THCS Nguyễn Du",
            parent_phone: "0901 234 567",
            status: "active",
            note: Some("Viết văn tốt"),
        },
        SeedStudent {
            class_key: "van-9a",
            full_name: "Trần Quốc Bảo",
            school_class: "9A3",
            school: "THCS Lê Quý Đôn",
            parent_phone: "0912 345 678",
            status: "active",
            note: Some("Cần luyện mở bài"),
        },
        SeedStudent {
            class_key: "van-9a",
            full_name: "Phạm Gia Hân",
            school_class: "9A2",
            school: "THCS Nguyễn Du",
            parent_phone: "0988 222 111",
            status: "active",
            note: None,
        },
        SeedStudent {
            class_key: "van-9a",
            full_name: "Lê Hoàng Nam",
            school_class: "9A4",
            school: "THCS Trần Phú",
            parent_phone: "0934 555 666",
            status: "paused",
            note: Some("Nghỉ tạm 2 tuần"),
        },
        SeedStudent {
            class_key: "van-8a",
            full_name: "Đỗ Khánh Linh",
            school_class: "8B1",
            school: "THCS Nguyễn Du",
            parent_phone: "0909 888 777",
            status: "active",
            note: None,
        },
        SeedStudent {
            class_key: "van-8a",
            full_name: "Vũ Đức Minh",
            school_class: "8B2",
            school: "THCS Lý Thường Kiệt",
            parent_phone: "0977 123 456",
            status: "active",
            note: None,
        },
        SeedStudent {
            class_key: "van-8b",
            full_name: "Bùi Ngọc Mai",
            school_class: "8C1",
            school: "THCS Trần Phú",
            parent_phone: "0966 321 123",
            status: "active",
            note: None,
        },
        SeedStudent {
            class_key: "van-8b",
            full_name: "Hoàng Tuấn Kiệt",
            school_class: "8C2",
            school: "THCS Nguyễn Du",
            parent_phone: "0922 444 555",
            status: "active",
            note: None,
        },
        SeedStudent {
            class_key: "van-9-old",
            full_name: "Nguyễn Hải Long",
            school_class: "10A1",
            school: "THPT Chuyên Lê Hồng Phong",
            parent_phone: "0903 222 333",
            status: "active",
            note: None,
        },
    ]
}
