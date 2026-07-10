# Attendance Model - Mô hình điểm danh MVP

Tài liệu này mô tả mô hình điểm danh MVP. SQLite đã triển khai đến Phase 7B cho buổi thường, nghỉ/khôi phục và học bù cả lớp; học bù theo từng học sinh vẫn thuộc Phase 7C.

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

Quy tắc một trạng thái duy nhất:

- Mỗi ô học sinh/buổi học chỉ lưu đúng một trạng thái tại một thời điểm: `present`, `absent`, `makeup` hoặc empty.
- Không lưu nhiều boolean kiểu `isPresent`/`isAbsent`/`isMakeup`.
- Hiển thị luôn suy ra từ trường trạng thái duy nhất này.

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

Quy tắc khi hủy buổi (cancel):

- Phase 7B hủy buổi ghi trạng thái `absent`/Nghỉ cho toàn bộ học sinh chính thức hợp lệ ở buổi đó, giống việc tick Nghỉ từng học sinh.
- Dòng học sinh học bù đang nhận chưa được xử lý ở Phase 7B vì student-level makeup chưa persist; phần này thuộc Phase 7C.
- Vì trạng thái Nghỉ đã ghi vào từng học sinh, mở khóa hoặc khôi phục buổi vẫn giữ Nghỉ; giáo viên chỉnh lại từng em nếu cần.

MVP có thể lưu thêm trạng thái khóa chỉnh sửa:

- `is_locked = true`: không cho sửa điểm danh nếu chưa mở khóa.
- `is_locked = false`: cho phép sửa điểm danh.

Gợi ý rule:

- Buổi đã qua có thể tự khóa.
- Giáo viên vẫn có thể mở khóa thủ công nếu cần sửa lại.

## 5. Class-level makeup flow

Class-level makeup là học bù cho cả lớp.

Luồng đã chốt:

1. Giáo viên tạo một buổi học bù cho cả lớp và bắt buộc chọn buổi gốc cần bù.
2. Session gốc tự động chuyển `status = cancelled` khi buổi học bù được tạo.
3. Buổi học bù được lưu thành một session riêng với `type = class_makeup`, có `start_time`, `end_time`, và lưu `makeup_for_session_id` trỏ về buổi gốc.
4. Ngày học bù phải sau ngày hôm nay. Lỗi hiển thị: `"Ngày học bù phải sau ngày hôm nay."`
5. Giờ kết thúc phải sau giờ bắt đầu.
6. Backend kiểm tra buổi học bù không trùng khoảng giờ với lịch cố định và attendance session đang hoạt động của mọi lớp active trong DB, kể cả khác khối.
7. Trong buổi học bù cả lớp, học sinh chính thức chỉ được điểm danh:
   - Chưa điểm danh
   - Có học
   - Nghỉ
8. Buổi học bù cả lớp KHÔNG có lựa chọn `"Học bù"` cho từng học sinh, để tránh học bù đệ quy/khó hiểu.

Hủy buổi học bù cả lớp:

1. Header buổi học bù có hành động `"Hủy buổi bù"` với dialog xác nhận:
   - `"Hủy buổi học bù này?"`
   - `"Buổi gốc sẽ được mở lại như buổi học bình thường."`
2. Khi xác nhận hủy:
   - Buổi học bù bị xóa khỏi danh sách session.
   - Buổi gốc được khôi phục, không còn trạng thái nghỉ.
   - Dữ liệu điểm danh đã nhập cho buổi học bù được xóa.
   - Các record Nghỉ đã ghi ở buổi gốc được giữ nguyên để giáo viên kiểm tra và chỉnh lại.
   - Các buổi khác không bị ảnh hưởng.

Ví dụ:

- Lớp Văn 9 nghỉ buổi Thứ 3.
- Giáo viên tạo buổi học bù vào Chủ nhật, chọn buổi gốc Thứ 3; buổi Thứ 3 tự chuyển sang nghỉ.
- Chủ nhật là một `attendance_session` riêng, `type = class_makeup`.
- Học sinh trong lớp Văn 9 được điểm danh ở buổi Chủ nhật với hai lựa chọn Có học/Nghỉ.

## 6. Student-level makeup flow

Student-level makeup là học bù theo từng học sinh.

Trường hợp:

- Một học sinh nghỉ ở lớp gốc.
- Học sinh đó qua học bù ở một lớp khác trong cùng tuần.
- Buổi nhận học bù phải tương ứng cùng thứ tự buổi trong tuần.

Quy tắc quan trọng:

- Lớp nhận học bù phải CÙNG KHỐI với lớp gốc (ví dụ học sinh Khối 9 chỉ học bù ở lớp Khối 9 khác).
- Lớp nhận phải cùng năm học với lớp gốc.
- Receiving session phải có cùng `session_index_in_week`.
- Receiving session KHÔNG bị giới hạn quá khứ/tương lai: thầy có thể ghi học bù cho buổi đã qua nếu quên cập nhật, miễn cùng tuần và cùng thứ tự buổi (ví dụ lớp Thứ 4/Chủ nhật bù Chủ nhật bằng buổi Thứ 5 của lớp Thứ 2/Thứ 5).
- Lưu ý: giới hạn "phải trong tương lai" chỉ áp dụng khi TẠO buổi học bù cả lớp (class-level), không áp dụng cho học bù theo học sinh.
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
4. Extra makeup row chỉ được điểm danh:
   - Chưa điểm danh
   - Có học
   - Nghỉ
5. Extra makeup row KHÔNG có lựa chọn `"Học bù"` — không cho học bù tiếp từ một buổi học bù.

Nếu giáo viên hủy trạng thái học bù ở buổi gốc, backend nên xử lý đồng bộ record liên quan ở lớp nhận.

Trường hợp đặc biệt đã chốt:

- Nếu lớp có buổi học bù cả lớp nhưng một học sinh không tham gia được buổi bù đó mà qua học ở lớp khác:
  - Trong buổi học bù cả lớp, học sinh đó được đánh dấu `"Nghỉ"`.
  - Giáo viên quay lại buổi gốc bị nghỉ và đánh dấu học sinh đó là `"Học bù"` sang lớp/buổi khác.
  - `student_makeup_record` phải liên kết với buổi gốc, KHÔNG liên kết với buổi học bù cả lớp.

## 7. UI behavior

UI điểm danh hoạt động như sau:

- Mỗi tuần hiển thị các cột buổi học tương ứng với lịch của lớp.
- Header cột hiển thị thứ, ngày, badge hôm nay nếu có.
- Buổi học bù cả lớp hiển thị badge `"Học bù cả lớp"`.
- Buổi cả lớp nghỉ hiển thị trạng thái nghỉ ở cấp session.
- Ô điểm danh dùng các nút trạng thái rõ ràng, KHÔNG dùng click cycle:
  - Buổi bị khóa: chỉ hiển thị badge trạng thái, không hiển thị nút.
  - Buổi mở khóa và không nghỉ: hiển thị các nút nhỏ theo ngữ cảnh.
  - Chỉ một trạng thái được chọn tại một thời điểm; nút đang chọn được highlight.
  - Bấm lại nút đang chọn để bỏ trạng thái, quay về Chưa điểm danh.
- Quy tắc nút theo loại buổi/dòng:
  - Buổi thường + học sinh chính thức ở Phase 7B: Có học / Nghỉ; Học bù được bật khi Phase 7C persist student-level makeup.
  - Buổi nghỉ (cancelled): không có nút, mọi ô hiển thị `"Nghỉ"` thống nhất một màu đỏ, giống hệt khi tick Nghỉ từng học sinh.
  - Buổi học bù cả lớp + học sinh chính thức: Có học / Nghỉ.
  - Dòng học sinh học bù ở lớp nhận: Có học / Nghỉ.
- Trạng thái `"Nghỉ"` dùng chung một màu đỏ ở mọi cấp (session nghỉ và học sinh nghỉ); phân biệt nội bộ bằng session.status vs attendance.status, không phân biệt bằng màu.
- Bấm `"Có học"` hoặc `"Nghỉ"`: set trạng thái ngay và xóa record học bù cũ của ô đó nếu có.
- Bấm `"Học bù"`: mở dialog chọn lớp/buổi học bù; chưa set trạng thái.
- Nếu hủy dialog, giữ nguyên trạng thái cũ.
- Nếu xác nhận dialog, buổi gốc hiển thị `"Học bù"` và chi tiết:
  - Học bù tại lớp nào
  - Ngày nào
- Ở lớp nhận, học sinh học bù hiển thị trong section riêng:
  - `"Học sinh học bù"`
- Row học bù ở lớp nhận không nằm trong danh sách học sinh chính thức.

Các nút UI trong MVP:

- Tuần trước
- Chọn tuần bằng lịch mini
- Tuần sau
- Thêm buổi học bù: bắt buộc chọn buổi gốc, ngày phải sau hôm nay, có giờ bắt đầu/giờ kết thúc ngang hàng trong form, validate không trùng khoảng giờ với lịch lớp đã load, hiển thị hint khung giờ trống/trùng sau khi chọn ngày, buổi gốc tự chuyển nghỉ
- Hủy buổi bù: trên header buổi học bù cả lớp, có xác nhận, khôi phục buổi gốc
- Đánh dấu cả lớp đi học: chỉ áp dụng cho buổi hôm nay chưa nghỉ và đã mở khóa; áp dụng cả buổi học bù cả lớp; Phase 7B chỉ cập nhật học sinh chính thức
- Xuất Excel, UI only trong MVP
- Khóa/mở khóa buổi học
- Đánh dấu buổi học nghỉ/hủy nghỉ với xác nhận

## 8. Proposed database tables

Phase 7A-7B đã triển khai SQLite cho `attendance_sessions` regular/class_makeup, cancel/restore và `attendance_records` official `present`/`absent`. `student_makeup_records` vẫn là scope Phase 7C.

### attendance_sessions

Lưu từng buổi học thực tế.

Fields đề xuất:

| Field | Type gợi ý | Ghi chú |
|---|---|---|
| id | integer autoincrement | Khóa chính nội bộ |
| class_id | integer | Lớp sở hữu session |
| session_date | text/date | Ngày học |
| start_time | text | Giờ bắt đầu |
| end_time | text | Giờ kết thúc |
| session_index_in_week | integer | Thứ tự buổi trong tuần của lớp |
| type | text | `regular` hoặc `class_makeup` |
| status | text | `active` hoặc `cancelled` |
| is_locked | boolean | Khóa chỉnh sửa điểm danh |
| makeup_for_session_id | integer/null | Nếu là buổi học bù cả lớp cho một session đã nghỉ |
| note | text/null | Ghi chú buổi học |
| created_at | text/datetime | Metadata |
| updated_at | text/datetime | Metadata |

### attendance_records

Lưu điểm danh của học sinh trong một session.

Fields đề xuất:

| Field | Type gợi ý | Ghi chú |
|---|---|---|
| id | integer autoincrement | Khóa chính nội bộ |
| session_id | integer | Buổi học |
| membership_id | integer | Membership chính thức của học sinh trong lớp sở hữu session |
| student_id | integer | Học sinh, lưu kèm để query/report thuận tiện |
| status | text | `present`, `absent`, `makeup`; Chưa điểm danh không tạo row |
| note | text/null | Ghi chú riêng |
| created_at | text/datetime | Metadata |
| updated_at | text/datetime | Metadata |

Ghi chú:

- Theo quyết định backend hiện tại, không tạo record khi trạng thái là Chưa điểm danh; không có row nghĩa là empty.
- Học sinh chính thức dùng `membership_id` của lớp đó, không dùng database id làm STT.
- Với học sinh học bù ở lớp nhận, trạng thái có học/nghỉ có thể lưu trong `student_makeup_records.receiving_attendance_status` như backend plan hiện đề xuất, thay vì tạo membership mới ở lớp nhận.

### student_makeup_records

Lưu quan hệ học bù theo từng học sinh.

Fields đề xuất:

| Field | Type gợi ý | Ghi chú |
|---|---|---|
| id | integer autoincrement | Khóa chính nội bộ |
| student_id | integer | Học sinh học bù |
| original_membership_id | integer | Membership của học sinh ở lớp gốc |
| original_class_id | integer | Lớp gốc |
| original_session_id | integer | Buổi học bị nghỉ ở lớp gốc |
| receiving_class_id | integer | Lớp nhận học bù |
| receiving_session_id | integer | Buổi nhận học bù |
| session_index_in_week | integer | Thứ tự buổi tương ứng trong tuần |
| receiving_attendance_status | text/null | Trạng thái ở lớp nhận: null, `present`, `absent` |
| note | text/null | Ghi chú nếu cần |
| created_at | text/datetime | Metadata |
| updated_at | text/datetime | Metadata |

Ghi chú:

- `student_makeup_records` giúp tách rõ học bù theo học sinh khỏi roster chính thức của lớp nhận.
- Nếu dùng `receiving_attendance_status`, có thể không cần tạo `attendance_records` riêng cho học sinh guest.
- Nếu muốn thống nhất mọi điểm danh vào `attendance_records`, bảng này có thể chỉ giữ link, còn trạng thái ở lớp nhận lưu bằng attendance record có flag guest; hiện Backend Plan nghiêng về lưu trạng thái receiving ngay trong `student_makeup_records`.

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
