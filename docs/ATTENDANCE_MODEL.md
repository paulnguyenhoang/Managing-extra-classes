# Attendance Model - Mô hình điểm danh MVP

Tài liệu này mô tả mô hình điểm danh đã chốt cho MVP trước khi triển khai SQLite/backend.

Ứng dụng quản lý lớp học thêm cho giáo viên dạy Văn, nên mô hình điểm danh cần đơn giản, dễ thao tác trong lúc dạy, và đủ rõ để lưu dữ liệu lâu dài.

## 1. Purpose

Mục tiêu của mô hình điểm danh:

- Quản lý điểm danh theo từng buổi học của từng lớp.
- Hỗ trợ buổi học bình thường, buổi nghỉ cả lớp, và buổi học bù cả lớp.
- Hỗ trợ trường hợp một học sinh nghỉ ở lớp gốc rồi học bù ở lớp khác.
- Giữ trạng thái đủ đơn giản cho MVP, tránh quá nhiều loại vắng mặt.
- Chuẩn bị cấu trúc rõ ràng để sau này triển khai SQLite/backend.

## 2. Attendance statuses

Trạng thái điểm danh của một học sinh trong một buổi học:

| Code | Nhãn UI | Ý nghĩa |
|---|---|---|
| empty | Chưa điểm danh | Chưa nhập trạng thái cho học sinh ở buổi đó |
| present | Có học | Học sinh có tham gia buổi học |
| absent | Nghỉ | Học sinh không tham gia buổi học |
| makeup | Học bù | Học sinh của lớp gốc học bù ở một lớp/buổi khác |

MVP không có các trạng thái sau:

- `late` / Đi muộn
- `excused` / Có phép

Lý do: với lớp học thêm, MVP ưu tiên thao tác nhanh và dễ hiểu. Nếu sau này cần phân biệt nghỉ có phép, đi muộn, hoặc lý do nghỉ, có thể bổ sung bằng ghi chú hoặc mở rộng model sau.

## 3. Session types

Một buổi học là một `attendance_session`.

Các loại session đề xuất:

| Type | Nhãn UI | Ý nghĩa |
|---|---|---|
| regular | Buổi học thường | Buổi học sinh ra từ lịch cố định của lớp |
| class_makeup | Học bù cả lớp | Buổi học bù được tạo cho cả lớp, thường để bù một buổi đã nghỉ |

Lưu ý:

- `class_makeup` là khái niệm ở cấp buổi học/session.
- `makeup` trong attendance status là khái niệm ở cấp học sinh.
- Hai khái niệm này khác nhau và không nên gộp làm một trong database.

## 4. Session statuses

Một session cũng cần trạng thái riêng, độc lập với trạng thái từng học sinh.

Các session status đề xuất:

| Status | Nhãn UI | Ý nghĩa |
|---|---|---|
| active | Đang học | Buổi học diễn ra bình thường |
| cancelled | Nghỉ | Cả lớp nghỉ buổi này |

MVP có thể lưu thêm trạng thái khóa chỉnh sửa:

- `is_locked = true`: không cho sửa điểm danh nếu chưa mở khóa.
- `is_locked = false`: cho phép sửa điểm danh.

Gợi ý rule:

- Buổi đã qua có thể tự khóa.
- Giáo viên vẫn có thể mở khóa thủ công nếu cần sửa lại.

## 5. Class-level makeup flow

Class-level makeup là học bù cho cả lớp.

Luồng đề xuất:

1. Giáo viên đánh dấu một buổi học thường là nghỉ.
2. Session gốc được cập nhật `status = cancelled`.
3. Giáo viên tạo một buổi học bù cho cả lớp.
4. Buổi học bù được lưu thành một session riêng với `type = class_makeup`.
5. Nếu buổi học bù dùng để bù cho một buổi nghỉ cụ thể, session học bù có thể lưu `makeup_for_session_id`.
6. Trong buổi học bù cả lớp, học sinh vẫn được điểm danh bằng các trạng thái bình thường:
   - Chưa điểm danh
   - Có học
   - Nghỉ
   - Học bù

Ví dụ:

- Lớp Văn 9 nghỉ buổi Thứ 3.
- Giáo viên tạo buổi học bù vào Chủ nhật.
- Chủ nhật là một `attendance_session` riêng, `type = class_makeup`.
- Học sinh trong lớp Văn 9 được điểm danh ở buổi Chủ nhật như một buổi học bình thường.

## 6. Student-level makeup flow

Student-level makeup là học bù theo từng học sinh.

Trường hợp:

- Một học sinh nghỉ ở lớp gốc.
- Học sinh đó qua học bù ở một lớp khác trong cùng tuần.
- Buổi nhận học bù phải tương ứng cùng thứ tự buổi trong tuần.

Quy tắc quan trọng:

- Receiving session phải có cùng `session_index_in_week`.
- Học sinh học bù không trở thành học sinh chính thức của lớp nhận.
- Lớp gốc hiển thị trạng thái của học sinh là `makeup` / Học bù.
- Lớp nhận hiển thị học sinh đó ở một khu vực riêng, ví dụ `"Học sinh học bù"`.

Ví dụ:

- Class 9A session 1 là Thứ 2.
- Class 9B session 1 là Thứ 3.
- Một học sinh 9A nghỉ Thứ 2.
- Học sinh đó có thể học bù ở 9B Thứ 3 vì cùng là session 1 trong tuần.

Khi xác nhận học bù:

1. Buổi gốc của học sinh được set `attendance_status = makeup`.
2. Tạo một `student_makeup_record` liên kết:
   - Học sinh
   - Lớp gốc
   - Session gốc
   - Lớp nhận
   - Session nhận
   - Thứ tự buổi trong tuần
3. Ở lớp nhận, học sinh xuất hiện như một extra makeup row.
4. Extra makeup row có thể được điểm danh:
   - Chưa điểm danh
   - Có học
   - Nghỉ

Nếu giáo viên hủy trạng thái học bù ở buổi gốc, backend nên xử lý đồng bộ record liên quan ở lớp nhận.

## 7. UI behavior

UI điểm danh nên hoạt động như sau:

- Mỗi tuần hiển thị các cột buổi học tương ứng với lịch của lớp.
- Header cột hiển thị thứ, ngày, badge hôm nay nếu có.
- Buổi học bù cả lớp hiển thị badge `"Học bù cả lớp"`.
- Buổi cả lớp nghỉ hiển thị trạng thái nghỉ ở cấp session.
- Ô điểm danh của học sinh chính thức cycle theo thứ tự:
  - Chưa điểm danh -> Có học -> Nghỉ -> Học bù -> Chưa điểm danh
- Khi chuyển sang `"Học bù"`, UI nên mở dialog chọn lớp/buổi học bù.
- Nếu hủy dialog, giữ nguyên trạng thái cũ.
- Nếu xác nhận dialog, buổi gốc hiển thị `"Học bù"` và có thể hiển thị chi tiết:
  - Học bù tại lớp nào
  - Ngày nào
- Ở lớp nhận, học sinh học bù hiển thị trong section riêng:
  - `"Học sinh học bù"`
- Row học bù ở lớp nhận không nằm trong danh sách học sinh chính thức.
- Row học bù ở lớp nhận chỉ cần điểm danh:
  - Chưa điểm danh
  - Có học
  - Nghỉ

Các nút UI trong MVP:

- Tuần trước
- Chọn tuần bằng lịch mini
- Tuần sau
- Thêm buổi học bù
- Đánh dấu cả lớp đi học
- Xuất Excel, UI only trong MVP
- Khóa/mở khóa buổi học
- Đánh dấu buổi học nghỉ/hủy nghỉ với xác nhận

## 8. Proposed database tables

Đây là đề xuất schema ban đầu, chưa phải implementation cuối cùng.

### attendance_sessions

Lưu từng buổi học thực tế.

Fields đề xuất:

| Field | Type gợi ý | Ghi chú |
|---|---|---|
| id | text/uuid | Khóa chính |
| class_id | text | Lớp sở hữu session |
| session_date | text/date | Ngày học |
| start_time | text | Giờ bắt đầu |
| end_time | text | Giờ kết thúc |
| session_index_in_week | integer | Thứ tự buổi trong tuần của lớp |
| type | text | `regular` hoặc `class_makeup` |
| status | text | `active` hoặc `cancelled` |
| is_locked | boolean | Khóa chỉnh sửa điểm danh |
| makeup_for_session_id | text/null | Nếu là buổi học bù cả lớp cho một session đã nghỉ |
| note | text/null | Ghi chú buổi học |
| created_at | text/datetime | Metadata |
| updated_at | text/datetime | Metadata |

### attendance_records

Lưu điểm danh của học sinh trong một session.

Fields đề xuất:

| Field | Type gợi ý | Ghi chú |
|---|---|---|
| id | text/uuid | Khóa chính |
| session_id | text | Buổi học |
| student_id | text | Học sinh |
| class_id | text | Lớp đang hiển thị session |
| status | text/null | `present`, `absent`, `makeup`, hoặc null/không có record cho Chưa điểm danh |
| note | text/null | Ghi chú riêng |
| created_at | text/datetime | Metadata |
| updated_at | text/datetime | Metadata |

Ghi chú:

- Có thể không tạo record khi trạng thái là Chưa điểm danh.
- Hoặc có thể tạo record với `status = null`; cần chốt trước khi làm backend.
- Với học sinh học bù ở lớp nhận, có thể dùng `attendance_records` nếu có field phân biệt record chính thức/guest, hoặc dùng bảng riêng.

### student_makeup_records

Lưu quan hệ học bù theo từng học sinh.

Fields đề xuất:

| Field | Type gợi ý | Ghi chú |
|---|---|---|
| id | text/uuid | Khóa chính |
| student_id | text | Học sinh học bù |
| original_class_id | text | Lớp gốc |
| original_session_id | text | Buổi học bị nghỉ ở lớp gốc |
| receiving_class_id | text | Lớp nhận học bù |
| receiving_session_id | text | Buổi nhận học bù |
| session_index_in_week | integer | Thứ tự buổi tương ứng trong tuần |
| receiving_attendance_status | text/null | Trạng thái ở lớp nhận: null, `present`, `absent` |
| note | text/null | Ghi chú nếu cần |
| created_at | text/datetime | Metadata |
| updated_at | text/datetime | Metadata |

Ghi chú:

- `student_makeup_records` giúp tách rõ học bù theo học sinh khỏi roster chính thức của lớp nhận.
- Nếu dùng `receiving_attendance_status`, có thể không cần tạo `attendance_records` riêng cho học sinh guest.
- Nếu muốn thống nhất mọi điểm danh vào `attendance_records`, bảng này có thể chỉ giữ link, còn trạng thái ở lớp nhận lưu bằng attendance record có flag guest.

## 9. Suggested MVP scope

MVP nên giữ phạm vi sau:

- Chỉ dùng 4 trạng thái:
  - Chưa điểm danh
  - Có học
  - Nghỉ
  - Học bù
- Không thêm Có phép hoặc Đi muộn.
- Cho phép tạo session học bù cả lớp.
- Cho phép đánh dấu cả lớp nghỉ với xác nhận.
- Cho phép học sinh học bù ở lớp khác nếu cùng `session_index_in_week`.
- Cho phép điểm danh học sinh học bù ở lớp nhận là Có học hoặc Nghỉ.
- Chưa cần lưu lịch sử chỉnh sửa chi tiết.
- Chưa cần phân quyền người dùng.
- Chưa cần xử lý phức tạp như học bù khác tuần, học bù nhiều lần cho cùng một buổi, hoặc học bù không cùng nội dung.

## 10. Later improvements

Các cải tiến có thể cân nhắc sau MVP:

- Thêm lý do nghỉ bằng ghi chú hoặc danh mục lý do.
- Thêm trạng thái Đi muộn nếu thực sự cần.
- Thêm trạng thái Có phép nếu giáo viên muốn phân biệt với Nghỉ thường.
- Cho phép học bù khác tuần nếu giáo viên xác nhận thủ công.
- Cho phép override `session_index_in_week` khi nội dung bài học tương đương.
- Lưu lịch sử chỉnh sửa điểm danh.
- Hiển thị timeline học bù của từng học sinh.
- Cảnh báo nếu một học sinh đã học bù cho cùng một buổi.
- Cảnh báo nếu lớp nhận học bù quá đông.
- Export Excel theo tuần/tháng với cả học sinh chính thức và học sinh học bù.
- Báo cáo học sinh nghỉ nhiều hoặc còn thiếu buổi học bù.
