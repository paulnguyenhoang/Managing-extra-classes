# Backend Plan - Kế hoạch SQLite/backend

Tài liệu này lập kế hoạch triển khai SQLite/backend cho ứng dụng Tauri desktop quản lý lớp học thêm. Đây chỉ là kế hoạch, chưa triển khai database và chưa sửa app code.

Nguồn tham chiếu:

- `docs/PROJECT_SPEC.md`
- `docs/ATTENDANCE_MODEL.md`

## 1. Backend goals

Mục tiêu backend cho MVP:

- Lưu dữ liệu cục bộ trên máy tính Windows của giáo viên.
- Không phụ thuộc internet hoặc server ngoài.
- Thay thế mock/local state hiện tại bằng SQLite.
- Giữ UI React đơn giản: frontend gọi command/service, không tự xử lý SQL.
- Hỗ trợ dữ liệu cốt lõi:
  - Năm học
  - Lớp học
  - Lịch học
  - Học sinh
  - Thành viên học sinh trong lớp
  - Học phí
  - Điểm
  - Điểm danh
  - Học bù cả lớp
  - Học bù theo học sinh
- Hỗ trợ sao lưu/khôi phục file database sau khi schema ổn định.
- Chuẩn bị nền tảng để export Excel từ dữ liệu thật.

Nguyên tắc dữ liệu đã chốt:

- Không hard-delete học sinh trong sử dụng bình thường.
- Một học sinh có thể thuộc nhiều lớp.
- Trạng thái học sinh được lưu theo quan hệ học sinh-lớp, không lưu global trên `students`.
- Attendance statuses:
  - empty / Chưa điểm danh
  - present / Có học
  - absent / Nghỉ
  - makeup / Học bù
- Không có `late` / Đi muộn và không có `excused` / Có phép trong MVP.
- Class-level makeup là session type.
- Student-level makeup dùng `student_makeup_records`.
- Payment statuses:
  - unpaid
  - paid
  - waived
- Miễn giảm học phí phải có ghi chú.
- Payment record phải lưu số tiền của tháng đó, không phụ thuộc hoàn toàn vào học phí hiện tại của lớp.

## 2. SQLite approach recommendation for Tauri

Dự án hiện dùng Tauri v2. Khuyến nghị triển khai SQLite theo hướng backend Rust quản lý database, frontend gọi Tauri commands.

Khuyến nghị chính:

- Dùng SQLite file cục bộ trong app data directory của Tauri.
- Rust side chịu trách nhiệm:
  - Mở connection/pool.
  - Chạy migration.
  - Seed dữ liệu ban đầu nếu database mới.
  - Expose commands cho frontend.
  - Validate rule quan trọng trước khi ghi.
- React side chỉ gọi API/commands theo use-case:
  - `list_classes_by_year`
  - `create_class`
  - `update_class_schedule`
  - `list_students_by_class`
  - `save_attendance_record`
  - `create_student_makeup_record`
  - ...

Hai lựa chọn kỹ thuật hợp lý khi triển khai:

1. Rust commands + SQLite crate (`rusqlite` hoặc `sqlx`)
   - Phù hợp nếu muốn kiểm soát schema, migration, transaction và typed result chặt hơn.
   - Frontend không biết SQL.
   - Dễ enforce business rules trong service layer.

2. Tauri SQL plugin
   - Dễ gọi SQL từ frontend hơn, nhưng dễ làm rò rỉ business logic xuống UI.
   - Chỉ nên cân nhắc nếu app rất nhỏ và ít rule nghiệp vụ.

Khuyến nghị cho app này:

- Ưu tiên Rust commands + repository/service layer.
- Lý do: attendance, học phí miễn giảm, membership nhiều lớp, học bù theo học sinh đều có rule cần transaction và validate.
- Không đưa SQL trực tiếp vào React components.

Vị trí database gợi ý:

- Windows app data directory của Tauri, ví dụ:
  - `%APPDATA%/<app-name>/data.sqlite`
- Không đặt database trong thư mục source code.
- Backup/restore sau này sẽ copy/replace file database có kiểm tra version.

## 3. Final database entities

Entities chính cho MVP:

| Entity | Vai trò |
|---|---|
| app_settings | Lưu cấu hình app: năm học hiện tại, password hash, version |
| academic_years | Năm học |
| classes | Lớp học thêm |
| class_schedules | Lịch học cố định của lớp |
| students | Hồ sơ học sinh global |
| class_memberships | Quan hệ học sinh thuộc lớp, kèm trạng thái theo lớp |
| payments | Học phí theo tháng |
| score_columns | Cột/bài kiểm tra theo lớp và tháng |
| score_values | Điểm từng học sinh theo cột |
| attendance_sessions | Buổi học thực tế |
| attendance_records | Điểm danh học sinh chính thức theo session |
| student_makeup_records | Học bù theo từng học sinh |
| backup_logs | Metadata sao lưu/khôi phục, optional sau MVP |

Entities có thể để sau:

- audit_logs: lịch sử chỉnh sửa.
- fee_history: lịch sử học phí lớp nếu cần thống kê sâu.
- export_jobs: nếu export phức tạp hoặc cần lưu lịch sử file.

## 4. Proposed schema tables

SQLite dùng kiểu cơ bản:

- `TEXT` cho id, ngày ISO, datetime ISO, enum string.
- `INTEGER` cho tiền, boolean `0/1`, sort order.
- `REAL` cho điểm nếu cần, nhưng điểm cũng có thể lưu `TEXT` đã normalize để giữ input thập phân chính xác. MVP nên dùng `REAL`.

### app_settings

```sql
CREATE TABLE app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

Keys gợi ý:

- `current_academic_year_id`
- `password_hash`
- `password_salt`
- `schema_version`

### academic_years

```sql
CREATE TABLE academic_years (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  starts_at TEXT NOT NULL,
  ends_at TEXT NOT NULL,
  is_current INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

Index/constraint:

- Chỉ nên có một năm học current. SQLite có thể enforce bằng partial unique index:

```sql
CREATE UNIQUE INDEX idx_academic_years_one_current
ON academic_years (is_current)
WHERE is_current = 1;
```

### classes

```sql
CREATE TABLE classes (
  id TEXT PRIMARY KEY,
  academic_year_id TEXT NOT NULL,
  name TEXT NOT NULL,
  monthly_fee INTEGER NOT NULL DEFAULT 0,
  room TEXT,
  note TEXT,
  is_archived INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (academic_year_id) REFERENCES academic_years(id)
);
```

### class_schedules

```sql
CREATE TABLE class_schedules (
  id TEXT PRIMARY KEY,
  class_id TEXT NOT NULL,
  weekday INTEGER NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (class_id) REFERENCES classes(id)
);
```

Notes:

- `weekday`: 0-6 hoặc 1-7 cần chốt. Khuyến nghị dùng 0-6 như TypeScript hiện tại nếu code đang dùng `WeekdayIndex`.
- `sort_order` giúp xác định thứ tự buổi trong tuần nếu cần override.
- `session_index_in_week` có thể tính từ schedule đã sort, nhưng khi tạo `attendance_sessions` nên lưu lại snapshot.

### students

```sql
CREATE TABLE students (
  id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  school_class TEXT,
  school TEXT,
  parent_phone TEXT,
  note TEXT,
  is_archived INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

Notes:

- Không hard-delete học sinh trong normal flow.
- `is_archived` chỉ dùng nếu học sinh không còn dùng ở bất kỳ lớp nào.
- Trạng thái đang học/đã nghỉ không nằm ở đây, vì một học sinh có thể thuộc nhiều lớp.

### class_memberships

```sql
CREATE TABLE class_memberships (
  id TEXT PRIMARY KEY,
  class_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  joined_at TEXT,
  left_at TEXT,
  note TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (class_id) REFERENCES classes(id),
  FOREIGN KEY (student_id) REFERENCES students(id)
);
```

Allowed `status`:

- `active`
- `paused`

Index/constraint:

```sql
CREATE UNIQUE INDEX idx_class_memberships_unique
ON class_memberships (class_id, student_id);
```

Notes:

- Nếu học sinh đã nghỉ lớp, update membership `status = 'paused'`.
- Không xóa membership trong normal flow để giữ lịch sử học phí, điểm, điểm danh.

### payments

```sql
CREATE TABLE payments (
  id TEXT PRIMARY KEY,
  membership_id TEXT NOT NULL,
  class_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  month TEXT NOT NULL,
  status TEXT NOT NULL,
  amount INTEGER NOT NULL DEFAULT 0,
  paid_at TEXT,
  note TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (membership_id) REFERENCES class_memberships(id),
  FOREIGN KEY (class_id) REFERENCES classes(id),
  FOREIGN KEY (student_id) REFERENCES students(id)
);
```

Allowed `status`:

- `unpaid`
- `paid`
- `waived`

Index/constraint:

```sql
CREATE UNIQUE INDEX idx_payments_membership_month
ON payments (membership_id, month);
```

Rules:

- `month` format: `YYYY-MM`.
- `amount` là số tiền thực tế của tháng đó.
- Khi `status = paid`, `amount` thường bằng học phí tháng tại thời điểm đóng.
- Khi `status = waived`, `amount` có thể từ 0 đến học phí tháng.
- Khi `status = waived`, `note` nên bắt buộc ở service layer.
- Khi `status = unpaid`, `amount = 0`, `paid_at = NULL`.

### score_columns

```sql
CREATE TABLE score_columns (
  id TEXT PRIMARY KEY,
  class_id TEXT NOT NULL,
  month TEXT NOT NULL,
  label TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (class_id) REFERENCES classes(id)
);
```

Notes:

- ScoresTab hiện là bảng điểm theo tháng, không dùng formal score type/hệ số.
- `label` là tên bài kiểm tra tự do, ví dụ `"Bài văn số 1"`, `"Đọc hiểu"`.

### score_values

```sql
CREATE TABLE score_values (
  id TEXT PRIMARY KEY,
  column_id TEXT NOT NULL,
  membership_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  value REAL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (column_id) REFERENCES score_columns(id),
  FOREIGN KEY (membership_id) REFERENCES class_memberships(id),
  FOREIGN KEY (student_id) REFERENCES students(id)
);
```

Index/constraint:

```sql
CREATE UNIQUE INDEX idx_score_values_unique
ON score_values (column_id, membership_id);
```

Rules:

- `value` có thể NULL nếu chưa có điểm.
- Nếu có value, phải nằm trong khoảng 0-10.

### attendance_sessions

```sql
CREATE TABLE attendance_sessions (
  id TEXT PRIMARY KEY,
  class_id TEXT NOT NULL,
  session_date TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  session_index_in_week INTEGER NOT NULL,
  type TEXT NOT NULL DEFAULT 'regular',
  status TEXT NOT NULL DEFAULT 'active',
  is_locked INTEGER NOT NULL DEFAULT 1,
  makeup_for_session_id TEXT,
  content TEXT,
  note TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (class_id) REFERENCES classes(id),
  FOREIGN KEY (makeup_for_session_id) REFERENCES attendance_sessions(id)
);
```

Allowed `type`:

- `regular`
- `class_makeup`

Allowed `status`:

- `active`
- `cancelled`

Rules:

- Class-level makeup là một row riêng với `type = 'class_makeup'`.
- Nếu học bù cho một buổi nghỉ cụ thể, lưu `makeup_for_session_id`.
- `session_index_in_week` dùng để matching student-level makeup.
- Session quá khứ có thể tự khóa bằng service rule.

### attendance_records

```sql
CREATE TABLE attendance_records (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  membership_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  status TEXT,
  note TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (session_id) REFERENCES attendance_sessions(id),
  FOREIGN KEY (membership_id) REFERENCES class_memberships(id),
  FOREIGN KEY (student_id) REFERENCES students(id)
);
```

Allowed `status`:

- `NULL` hoặc không có row: Chưa điểm danh
- `present`
- `absent`
- `makeup`

Index/constraint:

```sql
CREATE UNIQUE INDEX idx_attendance_records_unique
ON attendance_records (session_id, membership_id);
```

Rules:

- Học sinh chính thức của lớp dùng `membership_id` của lớp đó.
- Khi status chuyển sang `makeup`, service phải tạo hoặc cập nhật `student_makeup_records`.
- Khi status rời khỏi `makeup`, service phải xử lý xóa/hủy link học bù tương ứng.

### student_makeup_records

```sql
CREATE TABLE student_makeup_records (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  original_membership_id TEXT NOT NULL,
  original_class_id TEXT NOT NULL,
  original_session_id TEXT NOT NULL,
  receiving_class_id TEXT NOT NULL,
  receiving_session_id TEXT NOT NULL,
  session_index_in_week INTEGER NOT NULL,
  receiving_attendance_status TEXT,
  note TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (student_id) REFERENCES students(id),
  FOREIGN KEY (original_membership_id) REFERENCES class_memberships(id),
  FOREIGN KEY (original_class_id) REFERENCES classes(id),
  FOREIGN KEY (original_session_id) REFERENCES attendance_sessions(id),
  FOREIGN KEY (receiving_class_id) REFERENCES classes(id),
  FOREIGN KEY (receiving_session_id) REFERENCES attendance_sessions(id)
);
```

Allowed `receiving_attendance_status`:

- `NULL`: Chưa điểm danh ở lớp nhận
- `present`: Có học
- `absent`: Nghỉ

Index/constraint:

```sql
CREATE UNIQUE INDEX idx_student_makeup_original
ON student_makeup_records (student_id, original_session_id);
```

Rules:

- Không thêm học sinh học bù vào `class_memberships` của lớp nhận.
- Receiving class/session hiển thị học sinh này như extra row.
- Receiving session phải cùng `session_index_in_week`.
- MVP nên giới hạn trong cùng tuần và cùng năm học.

### backup_logs

```sql
CREATE TABLE backup_logs (
  id TEXT PRIMARY KEY,
  action TEXT NOT NULL,
  file_path TEXT NOT NULL,
  status TEXT NOT NULL,
  message TEXT,
  created_at TEXT NOT NULL
);
```

Allowed `action`:

- `backup`
- `restore`

Allowed `status`:

- `success`
- `failed`

## 5. Relationships

Quan hệ chính:

- `academic_years` 1-n `classes`
- `classes` 1-n `class_schedules`
- `students` n-n `classes` thông qua `class_memberships`
- `class_memberships` 1-n `payments`
- `classes` 1-n `score_columns`
- `score_columns` 1-n `score_values`
- `class_memberships` 1-n `score_values`
- `classes` 1-n `attendance_sessions`
- `attendance_sessions` 1-n `attendance_records`
- `class_memberships` 1-n `attendance_records`
- `attendance_sessions` 1-n `student_makeup_records` qua `original_session_id`
- `attendance_sessions` 1-n `student_makeup_records` qua `receiving_session_id`

Quan hệ nghiệp vụ cần lưu ý:

- Một học sinh có thể có nhiều `class_memberships`.
- Trạng thái `active/paused` là trạng thái của membership, không phải của student.
- Payment gắn với membership theo tháng.
- Score gắn với membership để giữ đúng lớp học tại thời điểm nhập điểm.
- Attendance record gắn với membership của lớp gốc.
- Student-level makeup không tạo membership ở lớp nhận.
- Class-level makeup là một attendance session riêng.

## 6. Migration/seed strategy

Migration strategy:

- Tạo thư mục migration ở Rust side, ví dụ `src-tauri/migrations`.
- Mỗi migration có số thứ tự:
  - `001_init.sql`
  - `002_add_attendance.sql`
  - ...
- Lưu version đã chạy trong bảng metadata hoặc dùng migration tool của crate được chọn.
- Migration phải chạy khi app khởi động, trước khi frontend gọi dữ liệu.
- Migration phải idempotent ở mức ứng dụng: migration đã chạy thì không chạy lại.

Seed strategy:

- Phase đầu có thể seed dữ liệu tương đương mock hiện tại để app có data demo.
- Chỉ seed khi database mới hoàn toàn.
- Seed tối thiểu:
  - Academic years: 2025-2026 current, 2024-2025, 2026-2027.
  - Classes: Văn 9, Văn 8, Văn 7 theo mock.
  - Class schedules theo lịch hiện tại.
  - Students và memberships.
  - Payments mẫu theo tháng 05/2026-08/2026.
  - Scores mẫu theo tháng.
- Không seed lại nếu người dùng đã có dữ liệu thật.

Data migration từ mock sang DB:

- Có thể làm một script/import command riêng trong quá trình phát triển.
- Sau khi DB ổn, frontend không nên đọc trực tiếp `mockData.ts` nữa.
- Không cần migrate local state runtime hiện tại vì đó chỉ là mock.

## 7. Repository/service architecture

Kiến trúc khuyến nghị:

```text
React UI
  -> frontend api wrappers
  -> Tauri commands
  -> Rust services
  -> repositories
  -> SQLite
```

Rust side đề xuất:

```text
src-tauri/src/
  db/
    mod.rs
    connection.rs
    migrations.rs
  repositories/
    academic_year_repository.rs
    class_repository.rs
    student_repository.rs
    payment_repository.rs
    score_repository.rs
    attendance_repository.rs
    settings_repository.rs
  services/
    class_service.rs
    student_service.rs
    payment_service.rs
    score_service.rs
    attendance_service.rs
    backup_service.rs
  commands/
    class_commands.rs
    student_commands.rs
    payment_commands.rs
    score_commands.rs
    attendance_commands.rs
    settings_commands.rs
```

Frontend side đề xuất:

```text
src/
  services/
    academicYearApi.ts
    classApi.ts
    studentApi.ts
    paymentApi.ts
    scoreApi.ts
    attendanceApi.ts
    settingsApi.ts
```

Quy tắc phân lớp:

- Repository chỉ làm SQL và mapping row.
- Service xử lý business rules, validation, transaction.
- Command nhận input từ frontend, gọi service, trả DTO.
- UI không gọi SQL trực tiếp.
- UI không tự quyết định rule phức tạp như học bù có hợp lệ hay không.

Ví dụ service rules:

- `PaymentService.markPaid`:
  - Validate membership tồn tại.
  - Set status `paid`.
  - Set amount theo input hoặc học phí snapshot.
  - Set paid_at.
- `PaymentService.applyWaiver`:
  - Validate amount từ 0 đến học phí tháng.
  - Bắt buộc note.
- `AttendanceService.setOfficialAttendanceStatus`:
  - Validate session không cancelled.
  - Validate session unlocked hoặc user đã mở khóa.
  - Nếu status `makeup`, phải có receiving session hợp lệ.
  - Transaction: update attendance record + upsert student makeup record.
- `AttendanceService.cancelSession`:
  - Update session status `cancelled`.
  - Lock session.
  - Không xóa attendance records cũ.

## 8. Implementation phases

Thứ tự triển khai đã chốt:

### Phase 1. SQLite setup only

Mục tiêu:

- Thêm dependency SQLite ở Rust side.
- Tạo DB connection.
- Tạo migration runner.
- Tạo database file ở app data directory.
- Chạy migration init.
- Chưa nối UI thật.

Deliverables:

- App khởi động tạo được DB file.
- Có bảng metadata/settings tối thiểu.
- Có test migration chạy được trên DB tạm.

### Phase 2. App settings/local password

Mục tiêu:

- Lưu password local dạng hash + salt.
- Lưu năm học hiện tại.
- Chuẩn bị settings service.

Deliverables:

- Login dùng local password thật.
- Có flow set/change password sau này.
- App nhớ năm học hiện tại.

### Phase 3. Academic years/classes/class schedules

Mục tiêu:

- Lưu năm học, lớp, lịch học.
- Home đọc lớp từ DB.
- Class detail sửa tên lớp, học phí, lịch học qua DB.

Deliverables:

- Home không phụ thuộc `mockData.ts` cho class list.
- Tạo lớp mới insert DB.
- Lịch học lưu vào `class_schedules`.
- AttendanceTab nhận schedule từ DB-backed class detail.

### Phase 4. Students/class memberships

Mục tiêu:

- Tách student global và membership theo lớp.
- Không hard-delete học sinh trong normal use.
- Trạng thái đang học/đã nghỉ lưu ở `class_memberships`.

Deliverables:

- StudentListTab đọc/ghi từ DB.
- Thêm học sinh tạo `students` + `class_memberships`.
- Nếu học sinh có sẵn, sau này có thể gán vào lớp khác.
- Cập nhật trạng thái membership.

### Phase 5. Payments

Mục tiêu:

- Lưu học phí theo tháng.
- Hỗ trợ status `unpaid`, `paid`, `waived`.
- Lưu amount theo tháng.
- Miễn giảm có note.

Deliverables:

- PaymentsTab đọc dữ liệu theo month từ DB.
- Confirm paid update DB.
- Waiver dialog lưu amount/note.
- Search/filter dùng data DB đã load.
- Summary tính từ DB data.

### Phase 6. Scores

Mục tiêu:

- Lưu cột điểm động theo tháng.
- Lưu điểm theo membership.
- Không dùng formal score type/hệ số trong MVP.

Deliverables:

- ScoresTab đọc cột/điểm theo class/month.
- Thêm/sửa/xóa cột điểm qua transaction.
- Lưu điểm validate 0-10.

### Phase 7. Attendance

Mục tiêu:

- Lưu sessions, records, class-level makeup, student-level makeup.
- Hỗ trợ lock/unlock, cancel/restore session.
- Hỗ trợ extra makeup rows ở lớp nhận.

Deliverables:

- AttendanceTab query week từ DB.
- Sinh hoặc materialize sessions theo lịch.
- Set status official student.
- Tạo class-level makeup session.
- Tạo student-level makeup record.
- Receiving class hiển thị học sinh học bù.
- Transaction cho mọi thao tác học bù.

### Phase 8. Backup/restore

Mục tiêu:

- Sao lưu database file.
- Khôi phục database file an toàn.
- Ghi log backup/restore.

Deliverables:

- Button sao lưu hoạt động.
- Button khôi phục có confirm và kiểm tra file hợp lệ.
- Mở thư mục dữ liệu.

### Phase 9. Excel export

Mục tiêu:

- Export từ dữ liệu DB thật.
- Ưu tiên export từng tab trước.

Deliverables:

- Export danh sách học sinh.
- Export học phí theo tháng.
- Export bảng điểm theo tháng.
- Export điểm danh theo tuần/tháng.

## 9. Testing checklist

SQLite/setup:

- App tạo DB file đúng app data directory.
- Migration chạy đúng thứ tự.
- Migration không chạy lại nếu đã applied.
- App xử lý được DB file chưa tồn tại.
- App báo lỗi rõ nếu DB bị khóa/hỏng.

Settings/login:

- Password rỗng không hợp lệ.
- Password hash không lưu plaintext.
- Đổi năm học current lưu lại sau restart.

Classes/schedules:

- Tạo lớp mới xuất hiện ở Home.
- Sửa tên lớp đồng bộ Home và ClassDetail.
- Sửa học phí lớp không làm mất payment cũ.
- Sửa lịch học cập nhật AttendanceTab.
- Lịch nhiều ngày cùng giờ hiển thị gọn.
- Lịch khác giờ hiển thị tách dòng.

Students/memberships:

- Thêm học sinh tạo membership active.
- Một học sinh có thể thuộc nhiều lớp.
- Cập nhật trạng thái active/paused theo lớp.
- Không hard-delete học sinh hiện có.
- Search student vẫn đúng.

Payments:

- Chọn tháng khác không làm mất state tháng cũ.
- Chọn paid phải confirm.
- Paid set amount và paid_at đúng.
- Unpaid set amount 0 và clear paid_at.
- Waived validate amount 0 đến học phí tháng.
- Waived bắt buộc note.
- Summary đúng theo filter/month.
- Amount của payment cũ không đổi khi học phí lớp thay đổi sau này.

Scores:

- Tháng chưa có cột hiển thị empty state.
- Thêm cột điểm lưu đúng sort order.
- Xóa cột xóa/ẩn value liên quan đúng rule.
- Điểm chỉ cho phép 0-10.
- Hủy edit không ghi DB.
- Save dùng transaction.

Attendance:

- Week navigation query đúng session.
- Regular sessions sinh theo `class_schedules`.
- Session quá khứ khóa theo rule đã chốt.
- Mở khóa cho phép sửa.
- Cancel session không xóa attendance records cũ.
- Restore session giữ lại dữ liệu cũ.
- Class-level makeup tạo session `class_makeup`.
- Official attendance statuses chỉ là empty/present/absent/makeup.
- Không có late/excused trong DB/UI.
- Chọn makeup mở flow chọn receiving session.
- Receiving session phải cùng `session_index_in_week`.
- Student-level makeup tạo `student_makeup_records`.
- Lớp nhận hiển thị extra row, không tạo membership mới.
- Extra row ở lớp nhận chỉ nhận empty/present/absent.
- Chuyển khỏi makeup ở lớp gốc xử lý record lớp nhận đúng.

Backup/restore:

- Backup tạo file copy hợp lệ.
- Restore từ file hợp lệ.
- Không restore khi app đang ghi DB.
- Có confirm trước restore.
- Có log success/failed.

Excel export:

- Export không làm thay đổi DB.
- File mở được bằng Excel.
- Tiếng Việt không lỗi font.
- Dữ liệu export khớp filter/tháng/tuần đang xem.

## 10. Risks and decisions

### Decisions đã chốt

- Dữ liệu lưu local bằng SQLite.
- Dùng Rust commands + `rusqlite` cho SQLite.
- Không dùng Tauri SQL plugin cho MVP.
- Không hard-delete học sinh trong normal use.
- Một học sinh có thể thuộc nhiều lớp.
- Student status lưu theo `class_memberships`.
- `weekday` lưu dạng 0-6 để khớp `WeekdayIndex` hiện tại trong TypeScript.
- Attendance statuses chỉ gồm empty/present/absent/makeup.
- Với `"Chưa điểm danh"`, không tạo row trong `attendance_records`; không có row nghĩa là empty.
- Không có late/excused trong MVP.
- Regular attendance sessions có thể được materialize khi mở tuần hoặc khi có thao tác đầu tiên.
- Sửa lịch học không rewrite các attendance sessions trong quá khứ.
- Class-level makeup là `attendance_sessions.type = class_makeup`.
- Student-level makeup dùng `student_makeup_records`.
- Payment statuses là unpaid/paid/waived.
- Payment amount lưu theo từng tháng.
- Payment `unpaid` lưu `amount = 0` trong DB; UI có thể hiển thị riêng học phí dự kiến nếu cần.
- Miễn giảm học phí cần note.

### Decisions cần chốt thêm

- Khi sửa lịch học, các session tương lai đã sinh có cập nhật theo lịch mới không.
- Học sinh paused có còn hiện trong payments/scores/attendance tháng hiện tại không.
- Student-level makeup có bắt buộc cùng năm học không.
- Student-level makeup có được override khác `session_index_in_week` không.
- Khi restore cancelled session, có giữ toàn bộ attendance cũ không. Hiện spec đang nghiêng về giữ.

### Risks

- Attendance là phần phức tạp nhất vì có session sinh từ lịch, nghỉ, lock, học bù cả lớp, học bù theo học sinh.
- Nếu không tách service layer, rule học bù dễ bị rải vào UI và khó migrate.
- Nếu dùng hard delete, dữ liệu payment/score/attendance dễ mất liên kết.
- Nếu payment không lưu amount theo tháng, sửa học phí lớp sẽ làm sai lịch sử thu tiền.
- Nếu class membership không tách riêng, một học sinh học nhiều lớp sẽ khó quản lý.
- Nếu không có transaction cho student-level makeup, có thể lệch giữa lớp gốc và lớp nhận.
- Nếu backup/restore làm sớm trước khi schema ổn định, dễ phải xử lý migration file backup phức tạp.

### Recommendation tổng kết

Triển khai backend theo từng phase nhỏ, bắt đầu bằng SQLite setup và migration rỗng trước. Không nối toàn bộ UI cùng lúc. Mỗi domain nên có repository/service riêng, ưu tiên Payments và Scores trước Attendance vì Attendance có nhiều rule liên kết hơn.
