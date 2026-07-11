# PROJECT_SPEC.md

## 1. Mục đích tài liệu

Tài liệu này ghi lại trạng thái hiện tại của ứng dụng dựa trên source code đang có trong `src/`, `package.json` và các file liên quan. Nội dung bên dưới mô tả những gì đã được triển khai thật trong frontend, cách dữ liệu mẫu và local state đang hoạt động, đồng thời tách riêng phần đề xuất cho backend/SQLite sau này.

Tài liệu này không mô tả kế hoạch cũ nếu code hiện tại không còn dùng nữa.

## 2. Tổng quan dự án hiện tại

- App type: ứng dụng desktop Tauri dùng React + TypeScript.
- Người dùng chính: giáo viên dạy Văn quản lý các lớp học thêm.
- Trạng thái frontend: đã có skeleton chính, login bằng mật khẩu local, trang tổng quan, trang chi tiết lớp với 4 tab lõi, sidebar và vài trang placeholder.
- Trạng thái persistence: đã có SQLite local qua Rust commands đến Phase 8: app settings/password, academic years, classes, class schedules, students, class memberships, payments, scores, class/membership month lifecycle, regular attendance, lock/unlock, cancel/restore, class-level makeup, student-level makeup và backup/restore.
- Trạng thái mock/local state: `src/data/mockData.ts` vẫn còn dùng cho một phần dữ liệu mẫu và vài placeholder. Roster học sinh trong 4 tab chi tiết lớp đã lấy từ SQLite; payments, scores, điểm danh buổi thường, học bù cả lớp và học bù theo học sinh đã persist SQLite. Backup/Restore đã functional từ Phase 8. Phase 9A đã có nền export Excel và export danh sách học sinh; Phase 9B đã có export học phí. Excel import và các export điểm/điểm danh vẫn chưa triển khai.

## 3. Tech stack đang dùng trong code

Các công nghệ/thư viện hiện diện trong `package.json`, config hoặc import thực tế:

- Tauri v2: app desktop.
- React 19: UI.
- TypeScript: type checking.
- Vite: dev/build frontend.
- Tailwind CSS v4: styling qua `src/App.css`.
- shadcn/ui: các component UI trong `src/components/ui/`.
- Radix UI: dùng qua `radix-ui`, ví dụ Tabs/Dialog/Select.
- lucide-react: icon.
- class-variance-authority, clsx, tailwind-merge: helper className và variant cho UI.
- tw-animate-css: animation CSS được import trong `App.css`.
- @fontsource-variable/geist: font được import trong `App.css`.
- @tanstack/react-table, react-hook-form, zod, @hookform/resolvers: có trong dependency nhưng hiện chưa thấy được dùng trong các màn hình chính đã đọc.
- exceljs: dùng ở frontend cho Phase 9A/9B export danh sách học sinh và học phí ra `.xlsx`.

## 4. Cấu trúc thư mục thực tế

```text
src/
  App.tsx
  App.css
  CODEX_UI_RULES.md
  main.tsx
  app/
    App.tsx
  components/
    common/
      EmptyState.tsx
    layout/
      AppShell.tsx
      Header.tsx
      Sidebar.tsx
    ui/
      badge.tsx
      button.tsx
      card.tsx
      dialog.tsx
      input.tsx
      label.tsx
      select.tsx
      table.tsx
      tabs.tsx
      textarea.tsx
  data/
    mockData.ts
  features/
    auth/
      LoginPage.tsx
    backup/
      BackupPage.tsx
    classes/
      ClassDetailPage.tsx
      components/
        AddMakeupSessionDialog.tsx
        AttendanceTab.tsx
        ConfirmPaidDialog.tsx
        EditClassScheduleDialog.tsx
        PaymentsTab.tsx
        ScoresTab.tsx
        StudentListTab.tsx
        TuitionWaiverDialog.tsx
      hooks/
        useClassStudents.ts
        useMockAttendance.ts
        useMockScores.ts
      utils/
        attendance.ts
        classSchedule.ts
        payments.ts
        scores.ts
    home/
      HomePage.tsx
      components/
        ClassCard.tsx
        CreateClassDialog.tsx
        YearSelector.tsx
    schedule/
      SchedulePage.tsx
    settings/
      SettingsPage.tsx
    tuition-dashboard/
      TuitionDashboardPage.tsx
  services/
    academicYearApi.ts
    attendanceApi.ts
    classApi.ts
    excelExportApi.ts
    studentApi.ts
  lib/
    excel/
      exportWorkbook.ts
      filename.ts
      worksheetStyle.ts
    format.ts
    utils.ts
  types/
    academic-year.ts
    attendance.ts
    class.ts
    payment.ts
    score.ts
    student.ts
```

- `src/app/App.tsx`: điều phối màn hình chính bằng local state, không dùng React Router.
- `src/App.tsx`: re-export `src/app/App.tsx`.
- `src/components/layout`: khung app sau login, header, sidebar.
- `src/components/ui`: shadcn/ui wrappers.
- `src/features/home`: trang tổng quan và card lớp.
- `src/features/classes`: trang chi tiết lớp, 4 tab lõi, hooks/utils cho điểm danh, điểm, học phí, lịch học.
- `src/features/schedule`, `src/features/tuition-dashboard`, `src/features/settings`: các trang sidebar dạng placeholder.
- `src/features/backup`: trang sao lưu/khôi phục SQLite (functional từ Phase 8).
- `src/services`: wrapper gọi Tauri commands cho dữ liệu đã nối SQLite.
- `src/lib/excel`: helper frontend dùng ExcelJS để tạo workbook, style worksheet và đặt tên file an toàn.
- `src/data/mockData.ts`: dữ liệu mẫu và selector/helper lấy dữ liệu.
- `src/types`: type dữ liệu domain.
- `src/lib`: helper format và className.

## 5. Điều hướng hiện tại

- Không dùng React Router.
- `src/app/App.tsx` dùng local state:
  - `screen`: `"login" | "class-detail" | SidebarScreen`.
  - `selectedClassId`.
  - `selectedYearId`.
  - `academicYears`.
  - `classOverviews`.
  - loading/error cho dữ liệu năm học/lớp.
- Login thành công chuyển `screen` sang `"home"`.
- Sau login, app render `AppShell` gồm `Header`, `Sidebar`, vùng nội dung chính.
- Sidebar gọi `onNavigate(screen)` để đổi các màn hình global.
- Trang Home mở chi tiết lớp bằng `onOpenClass(classId)`, set `selectedClassId` và `screen = "class-detail"`.
- Nút quay lại trong `ClassDetailPage` gọi `onBack`, reset `selectedClassId` và về `"home"`.
- Khi đang ở `class-detail`, sidebar active vẫn là `"home"`.
- Logout reset `selectedClassId` và quay về `"login"`.

Trang đã triển khai rõ nhất: `HomePage`, `ClassDetailPage`, 4 tab trong lớp và `BackupPage`. Các trang `Lịch học`, `Tổng hợp học phí`, `Cài đặt` hiện là placeholder đơn giản.

## 6. Danh sách màn hình/trang hiện có

| Màn hình/trang | File/component chính | Mục đích | Trạng thái hiện tại | Ghi chú |
|---|---|---|---|---|
| Login | `src/features/auth/LoginPage.tsx` | Tạo/đăng nhập bằng mật khẩu local | implemented | Hash/salt lưu trong `app_settings` |
| App shell | `src/components/layout/AppShell.tsx` | Layout sau login | implemented | Header + sidebar + main scroll |
| Tổng quan/Home | `src/features/home/HomePage.tsx` | Xem năm học, summary, danh sách lớp | implemented | Năm học/lớp/lịch học lấy từ SQLite |
| Chi tiết lớp | `src/features/classes/ClassDetailPage.tsx` | Header lớp và tabs | implemented | Header lớp lưu tên, lịch học, học phí tháng vào SQLite |
| Tab Danh sách học sinh | `StudentListTab.tsx` | Xem/tìm/sửa/thêm học sinh | implemented | Load/save SQLite qua `students` và `class_memberships` |
| Tab Điểm danh | `AttendanceTab.tsx` | Điểm danh theo tuần | implemented Phase 7C | Regular/class makeup + Có học/Nghỉ/Học bù + lock/cancel/restore lưu SQLite; receiving makeup rows lưu qua `student_makeup_records.receiving_attendance_status` |
| Tab Nhập điểm | `ScoresTab.tsx` | Bảng điểm theo tháng | implemented | SQLite Phase 6: `score_columns`/`score_values`, keyed theo membership/month |
| Tab Học phí | `PaymentsTab.tsx` | Theo dõi học phí theo tháng | implemented | SQLite Phase 5: bảng `payments`, khóa `(membership_id, month)` |
| Lịch học | `SchedulePage.tsx` | Placeholder lịch tổng hợp | placeholder | Có card buổi học sắp tới mock |
| Tổng hợp học phí | `TuitionDashboardPage.tsx` | Placeholder dashboard học phí toàn app | placeholder | Summary card mock tĩnh |
| Sao lưu dữ liệu | `BackupPage.tsx` | Sao lưu/khôi phục database SQLite | implemented | SQLite Phase 8: backup API, `backup_logs`, safety backup trước restore |
| Cài đặt | `SettingsPage.tsx` | Placeholder thiết lập | placeholder | Card mô tả tĩnh |

## 7. Login flow hiện tại

- UI gồm card giữa màn hình, icon sách, title đăng nhập hoặc tạo mật khẩu, input mật khẩu, nút hành động, hint `"Bản thử nghiệm dùng dữ liệu mẫu."`
- Lần đầu mở app nếu chưa có mật khẩu trong `app_settings`, UI hiển thị chế độ `"Tạo mật khẩu"` với nhập lại mật khẩu.
- Mật khẩu được lưu bằng hash + salt trong SQLite, không lưu plaintext.
- Khi đã có mật khẩu, LoginPage gọi `verify_password`; mật khẩu sai hiển thị lỗi tiếng Việt.
- Sau login, `App.tsx` chuyển sang màn hình `"home"`.
- Logout nằm ở `Header`, gọi `onLogout`, đưa app về login.
- Không persist login session sau restart; mở lại app cần nhập mật khẩu lại.

## 8. Sidebar/Nav hiện tại

Sidebar hiện có 5 item:

| Item | Screen value | Component mở ra | Trạng thái |
|---|---|---|---|
| Tổng quan | `home` | `HomePage` | functional |
| Lịch học | `schedule` | `SchedulePage` | placeholder |
| Học phí | `tuition-dashboard` | `TuitionDashboardPage` | placeholder |
| Sao lưu dữ liệu | `backup` | `BackupPage` | functional |
| Cài đặt | `settings` | `SettingsPage` | placeholder |

- Item global `"Học sinh"` không còn trong sidebar.
- Sidebar chỉ đổi màn hình bằng local state, không đổi URL.
- Khi click item trong sidebar lúc đang ở chi tiết lớp, app thoát khỏi chi tiết lớp vì `selectedClassId` bị reset.

## 9. Home/Tổng quan hiện tại

Đã có trong code:

- Greeting `"Xin chào thầy"` và heading `"Hôm nay mình quản lý lớp nào?"`
- Bộ chọn năm học `YearSelector`, dữ liệu từ SQLite qua command `list_academic_years`.
- Tab khối (segmented control) `"Khối 8"` / `"Khối 9"`:
  - Lọc danh sách class card theo khối đang chọn.
  - Summary cards tính theo khối đang chọn.
  - Mặc định chọn Khối 9 nếu năm học có lớp Khối 9, ngược lại Khối 8.
  - Đổi năm học giữ nguyên khối thầy đã chọn; nếu khối không có lớp thì hiển thị empty state.
  - `selectedGrade` được giữ ở `App.tsx` (không phải state cục bộ của HomePage) nên mở chi tiết lớp rồi quay lại vẫn ở đúng tab khối. Khi mở một lớp, `selectedGrade` được đặt theo `grade` của lớp đó.
- Summary cards:
  - Tổng số lớp
  - Tổng số học sinh
  - Chưa đóng học phí tháng này
- Nút `"Tạo lớp mới"` mở `CreateClassDialog`.
- Danh sách lớp dùng `ClassCard`.
- Mỗi class card hiển thị:
  - tên lớp
  - lịch học từ `class_schedules`, format qua `formatScheduleLines`
  - thời gian học từ `startMonth` đến `endMonth`, đồng bộ khi sửa trong ClassDetail
  - số học sinh
  - học phí tháng
  - badge học phí theo tháng hệ thống hiện tại: `"Chưa mở lớp"` nếu chưa tới `startMonth`, `"Đã kết thúc"` nếu đã qua `endMonth`, còn trong tháng đang học thì hiển thị `{unpaidCount} chưa đóng` hoặc `"Đủ học phí"`.
- Nếu khối/năm học không có lớp, dùng `EmptyState`.
- Click class card gọi `onOpenClass(classId)` để mở `ClassDetailPage`.
- Không hiển thị database ID cho người dùng; STT nếu có luôn tính từ `index + 1`.

Create class hiện tại:

- Dialog fields: `Tên lớp`, `Khối` (select Khối 8/Khối 9), `Học phí tháng`, `Tháng bắt đầu`, `Tháng kết thúc`, `Lịch học`.
- Tháng bắt đầu/kết thúc mặc định theo khoảng ngày của năm học đang chọn; options là các tháng trong năm học; validate bắt buộc và start <= end.
- Không còn field `Ghi chú` trong dialog tạo lớp.
- Lịch học dùng bộ chọn checkbox từng thứ + giờ bắt đầu/kết thúc (component `ScheduleItemsEditor`, dùng chung với `EditClassScheduleDialog`), không còn nhập text tự do.
- Validation: tên lớp bắt buộc, khối phải là 8 hoặc 9, học phí là số nguyên không âm, phải chọn ít nhất một buổi học.
- UI cũng kiểm tra giờ kết thúc sau giờ bắt đầu và không trùng khoảng giờ với các lớp đã load trong năm học đang xem, kể cả khác khối. Rule này hiện ở frontend, chưa có service/constraint backend riêng.
- Khi lưu, gọi command `create_class`, insert vào bảng `classes` (gồm `grade`) và `class_schedules`.
- Class mới được append vào `classOverviews` ở `App.tsx` từ response DB.
- Khối mặc định trong dialog là khối đang chọn trên Home.

Hạn chế:

- Không có sửa/xóa/archive lớp ở Home.
- Lớp tạo mới chưa có học sinh cho đến khi thêm ở tab Danh sách học sinh.
- `studentCount` lấy từ số membership `active` trong SQLite. `unpaidCount` đếm thật từ bảng `payments` cho tháng hệ thống hiện tại: membership active, đang thuộc lớp trong tháng (joined/left), chưa có payment row hoặc row đang `unpaid`; `paid`/`waived` không tính. Nếu tháng hiện tại nằm ngoài `start_month..end_month` của lớp thì `unpaidCount = 0`; Home card vẫn dựa thêm vào `startMonth/endMonth` để hiển thị `"Chưa mở lớp"` hoặc `"Đã kết thúc"` thay vì hiểu nhầm là đủ học phí.

## 10. Class Detail Header hiện tại

Header chi tiết lớp hiển thị:

- Nút quay lại danh sách lớp.
- Tên lớp.
- Lịch học.
- Thời gian học `startMonth - endMonth`.
- Badge/trạng thái lớp nếu lớp đã kết thúc.
- Card học phí tháng.

Có thể chỉnh sửa:

- Tên lớp: icon bút cạnh tên; bấm vào đổi sang input, có nút lưu/hủy. Enter cũng lưu.
- Lịch học: icon lịch mở `EditClassScheduleDialog`; chọn các ngày trong tuần và giờ bắt đầu/kết thúc.
- Học phí tháng: icon bút trong card học phí; bấm vào đổi sang input, có nút lưu/hủy. Enter cũng lưu.
- Thời gian học: icon bút mở dialog cập nhật `startMonth/endMonth`; nút `"Kết thúc lớp"` mở dialog chọn tháng kết thúc thực tế và set `status = completed`.

Schedule behavior:

- `classItem.scheduleItems` là dữ liệu chính từ bảng `class_schedules`; `classItem.schedule` là text đã format để hiển thị/fallback.
- Khi vào detail, `ClassDetailPage` gọi `get_class_detail` để lấy bản DB mới nhất.
- Khi lưu lịch, gọi command `update_class_schedule`, xóa/ghi lại các row `class_schedules` của lớp hiện tại.
- Sau khi lưu lịch, backend dọn các `attendance_sessions` regular từ ngày hiện tại trở đi nếu session đó chưa có `attendance_records`; các buổi quá khứ không bị xóa/ghi lại.
- Vì vậy nếu đổi một ngày học tương lai trong tuần hiện tại, tab Điểm danh tuần đó cập nhật theo lịch mới; nếu ngày bị đổi và ngày mới đều đã qua trong tuần hiện tại, lịch mới chỉ áp dụng từ các tuần sau.
- Nếu nhiều ngày có cùng giờ, `formatScheduleLines` gộp chung một dòng, ví dụ `"Thứ 3, Thứ 6 - 18:00 đến 20:00"`.
- Nếu các ngày khác giờ, sẽ tách thành nhiều dòng.
- Lịch học trong header được truyền xuống `AttendanceTab` bằng prop `scheduleItems`, nên cột điểm danh đồng bộ với lịch đang chỉnh trong phiên hiện tại.
- Dialog sửa lịch kiểm tra giờ kết thúc sau giờ bắt đầu và không trùng khoảng giờ với các lớp khác đã load trong năm học. Rule này hiện ở frontend, chưa được enforce ở Rust command.

State/persistence:

- Cập nhật tên, lịch, học phí gọi các command `update_class_name`, `update_class_schedule`, `update_class_monthly_fee`.
- Response DB được merge vào `classOverviews` ở `App.tsx`, nên Home và ClassDetail đồng bộ trong phiên chạy.
- Các thay đổi header lớp persist trong SQLite sau restart.

Hạn chế:

- Không có validation chi tiết cho giờ học ngoài việc input type time cung cấp.
- Không có lịch sử thay đổi học phí.

## 11. Tab Danh sách học sinh hiện tại

Table columns:

- STT
- Họ tên
- Lớp ở trường
- Trường
- SĐT phụ huynh
- Bắt đầu học (joinedMonth, hiển thị MM/YYYY)
- Trạng thái (kèm "Nghỉ từ MM/YYYY" và badge "Còn nợ X tháng" nếu có)
- Ghi chú

Search/filter:

- Ô tìm kiếm lọc local theo tên, lớp ở trường, trường, SĐT phụ huynh, ghi chú và nhãn trạng thái.
- Không debounce, không gọi backend.

Sorting:

- Danh sách hiển thị được sort bằng helper chung `sortStudentsByVietnameseName` sau search/filter.
- Quy tắc sort frontend: tên gọi tiếng Việt/từ cuối trước, sau đó fullName, rồi membershipId/studentId để ổn định.
- STT vẫn là `index + 1` của danh sách sau search/filter/sort, không dùng database ID.

Add student:

- Nút `"Thêm học sinh"` không mở dialog.
- Khi bấm, thêm một dòng mới trực tiếp vào table với fields rỗng, `status: "active"`, `classId` hiện tại.
- Dòng mới có select `"Tháng bắt đầu học"`; mặc định là tháng hiện tại nếu nằm trong thời gian học của lớp, ngược lại là tháng bắt đầu của lớp; options giới hạn trong khoảng start/end của lớp.
- Dòng mới tự đưa tab vào edit mode.
- Dòng mới có icon thùng rác cạnh STT để xóa dòng mới.
- Icon thùng rác chỉ xuất hiện cho các dòng mới chưa lưu, không xuất hiện với học sinh đã lưu trong DB.
- Dòng mới không có select trạng thái (luôn tạo active); cho nghỉ dùng flow riêng sau khi lưu.

Edit/update:

- Nút `"Cập nhật"` chuyển sang edit mode.
- Trong edit mode có thể sửa: họ tên, lớp ở trường, trường, SĐT phụ huynh, ghi chú.
- Nút đổi thành `"Lưu cập nhật"`; bấm lưu thoát edit mode và clear danh sách `newStudentIds`, khiến dòng mới thành dòng bình thường.

Cho học sinh nghỉ / học lại (Phase 5.5):

- Đổi trạng thái áp dụng NGAY qua command riêng, không đợi "Lưu cập nhật".
- Chọn `"Đã nghỉ"` KHÔNG đổi ngay mà mở dialog `"Cho học sinh nghỉ"`:
  - Hiển thị học sinh + tháng bắt đầu học.
  - Field bắt buộc `"Tháng bắt đầu nghỉ"` (leftMonth): từ joinedMonth đến class.endMonth.
  - Giải thích: `"Tháng nghỉ là tháng đầu tiên học sinh không còn học lớp này."`
  - Trước khi xác nhận, gọi `get_unpaid_months_for_membership` để liệt kê các tháng chưa đóng học phí (từ joinedMonth đến tháng trước leftMonth); nếu leftMonth = joinedMonth thì không có tháng nợ cần kiểm tra. Nếu có nợ hiển thị cảnh báo `"Học sinh còn chưa đóng học phí các tháng: ..."` + `"Vẫn xác nhận nghỉ?"`.
  - Vẫn cho phép xác nhận nghỉ dù còn nợ (chỉ cảnh báo, không chặn).
  - Xác nhận gọi `pause_student_membership` (status = paused, left_month set).
- Chọn `"Đang học"` cho học sinh đã nghỉ gọi `reactivate_student_membership` (status = active, left_month = NULL).
- Badge `"Còn nợ X tháng"` cho học sinh đã nghỉ được tính từ bảng `payments` mỗi lần load, không lưu tay — đóng thêm học phí sẽ tự giảm nợ.

Delete/archive/mark inactive:

- Không có xóa học sinh hiện có.
- Không có archive/hard delete học sinh hiện có.
- Trạng thái học sinh có 2 giá trị trong type:
  - `active`: hiển thị `"Đang học"`
  - `paused`: hiển thị `"Đã nghỉ"` trong tab này

Export:

- Nút `"Xuất Excel"` đã có behavior thật từ Phase 9A.
- Export dùng dữ liệu đang hiển thị trong bảng sau khi search/filter local; không dùng database id làm STT, STT trong file = row index + 1.
- Nếu đang có dòng học sinh mới chưa lưu, UI chặn export và yêu cầu bấm `"Lưu cập nhật"` trước.
- Frontend tạo workbook `.xlsx` bằng ExcelJS, gọi command Rust `save_excel_file` để mở native save dialog và ghi file.
- File export hiện gồm các cột: STT, Họ tên, Lớp ở trường, Trường, SĐT phụ huynh, Bắt đầu học, Trạng thái, Tháng nghỉ, Ghi chú.
- SĐT được format dạng dễ đọc trong Excel nhưng vẫn giữ dạng text để không mất số 0 đầu.

State/data source:

- Initial data từ command `list_students_by_class` qua `src/services/studentApi.ts` (DTO gồm `joinedMonth`/`leftMonth`).
- Backend `list_students_by_class` trả roster ổn định theo `full_name`, rồi `class_memberships.id`; frontend vẫn sort lại bằng helper chung trước khi render.
- `StudentListTab` tự giữ `students`, `newStudentIds`, `searchQuery`, `isEditing`, loading/error trong lúc thao tác.
- Khi `classId` đổi, tab load lại danh sách từ SQLite.
- Khi lưu, dòng mới gọi `create_student_for_class` (kèm `joinedMonth`); dòng hiện có gọi `update_student`. Trạng thái không còn lưu qua nút "Lưu cập nhật" — dùng pause/reactivate command ngay khi đổi.
- `update_class_membership_status` backend từ chối set `paused` (bắt buộc dùng `pause_student_membership` có leftMonth).
- Status `"Đang học"`/`"Đã nghỉ"` được lưu trên `class_memberships`, không lưu global trên `students`.
- Sau khi lưu, `ClassDetailPage` refresh class detail để `studentCount` trong header/Home đồng bộ theo active memberships.
- Hook `useClassStudents(classId)` là nguồn roster chung cho StudentListTab, ScoresTab và PaymentsTab. AttendanceTab Phase 7C nhận roster chính thức, rows học bù nhận vào lớp và trạng thái điểm danh từ command `get_attendance_week`.
- `ClassDetailPage` truyền trực tiếp DB `classId` dạng số xuống cả 4 tab; không còn mapping tạm từ DB class sang mock class id.

## 12. Tab Điểm danh hiện tại

Week navigation:

- Có nút `"Tuần trước"`, nút range tuần, `"Tuần sau"`.
- Range tuần dùng `formatDateRange(weekStart, getWeekEnd(weekStart))`.
- Bấm vào range tuần mở mini calendar.
- Mini calendar hiển thị tháng hiện tại, nút tháng trước/tháng sau, các tuần từ Thứ 2 đến Chủ nhật.
- Tuần đang chọn được highlight; hover vào tuần khác highlight hàng tuần; bấm tuần nào thì chuyển sang tuần đó.

Attendance columns:

- Phase 7B: `AttendanceTab` gọi command `get_attendance_week(classId, weekStart)` và nhận cả session `regular` lẫn `class_makeup` trong tuần.
- Backend materialize các `attendance_sessions` loại `regular` từ `class_schedules` khi mở tuần.
- Backend chỉ materialize session theo lịch hiện tại cho ngày hiện tại/tương lai; ngày quá khứ chỉ hiển thị session đã từng được sinh/lưu trước đó.
- Khi sửa lịch, session regular từ ngày hiện tại trở đi chưa có record sẽ được dọn để lần mở tuần tiếp theo sinh lại theo lịch mới; session quá khứ không bị rewrite.
- Frontend map session DB về `WeeklySession` để giữ UI cũ.
- Buổi học bù cả lớp đã persist trong `attendance_sessions` với `type = class_makeup` và `makeup_for_session_id` trỏ về buổi gốc.
- Response tuần kèm `upcomingMakeupSessions` của lớp để khung thông tin lớp tiếp tục hiện ngày/giờ buổi bù sắp tới dù đang xem tuần khác; buổi đã qua giờ kết thúc không còn được trả về danh sách này.
- Hàng học sinh chính thức lấy từ response `officialRows` của `get_attendance_week`, đã lọc theo membership lifecycle của từng session date rồi sort bằng `sortStudentsByVietnameseName`.
- Hàng học sinh học bù nhận vào lớp vẫn thuộc mock/local nếu còn state trong phiên renderer.

Today/current day:

- Nếu session date trùng hôm nay, header hiện badge `"Hôm nay"`.
- Date hiển thị dạng `dd/MM`.

Attendance statuses:

- Type UI vẫn là `AttendanceStatus = "present" | "absent" | "makeup"`.
- Backend Phase 7C persist đủ `present`/`absent`/`makeup` trong `attendance_records`; `makeup` chỉ được ghi qua `create_student_makeup_record` kèm liên kết `student_makeup_records`.
- Trạng thái rỗng/undefined hiển thị `"Chưa điểm danh"`; trong DB nghĩa là không có row `attendance_records`.
- UI labels:
  - empty/undefined: Chưa điểm danh
  - `present`: Có học
  - `absent`: Nghỉ
  - `makeup`: Học bù
- Mỗi ô chỉ lưu một trạng thái duy nhất; hiển thị luôn suy ra từ trạng thái đó.
- MVP hiện tại không có `"Có phép"` và không có `"Đi muộn"`.
- Không còn legend trạng thái dạng text dài; UI hiện có chú thích màu ngày: Quá khứ, Hôm nay, Tương lai.
- `"Học bù"` có 2 khái niệm khác nhau trong code:
  - Class-level makeup: một session/cột học bù cả lớp (`session.isMakeup`) và header có badge `"Học bù cả lớp"`, đã persist trong Phase 7B.
  - Student-level makeup: trạng thái `makeup` của một học sinh ở buổi gốc, liên kết sang lớp/buổi nhận qua bảng `student_makeup_records` (Phase 7C, migration `010_student_makeup`).

Cell behavior (nút trạng thái, không dùng click cycle):

- Buổi bị khóa: cell chỉ hiển thị badge trạng thái, không có nút.
- Buổi nghỉ (cancelled): cell hiển thị `"Nghỉ"` thống nhất một màu đỏ (giống badge Nghỉ của từng học sinh), không có nút, không sửa được cho đến khi hủy nghỉ.
- Buổi mở khóa: cell hiển thị các nút nhỏ theo ngữ cảnh, nút đang chọn được highlight:
  - Buổi thường DB + học sinh chính thức: `Có học` / `Nghỉ` / `Học bù` (persist SQLite).
  - Buổi học bù cả lớp + học sinh chính thức: `Có học` / `Nghỉ` (không có `Học bù`).
  - Dòng học sinh học bù ở lớp nhận: `Có học` / `Nghỉ` (không có `Học bù`).
- Bấm lại nút đang chọn để bỏ trạng thái, quay về `"Chưa điểm danh"`.
- Bấm `Có học`/`Nghỉ` ở buổi DB: gọi command `set_attendance_status` và refresh lại `get_attendance_week`.
- Bấm lại nút đang chọn ở buổi DB: gửi status `null`, backend xóa row `attendance_records`, UI quay về `"Chưa điểm danh"`.
- Bấm `Học bù` ở buổi thường DB: mở dialog DB-backed (`list_student_makeup_options`); xác nhận gọi `create_student_makeup_record` (transaction: ô gốc = makeup + upsert record); hủy dialog giữ nguyên trạng thái. Bấm lại nút Học bù đang chọn mở xác nhận `"Hủy học bù cho học sinh này?"` rồi gọi `remove_student_makeup_record` (ô gốc về Chưa điểm danh).
- Nếu cancel dialog học bù, giữ nguyên trạng thái cũ.
- Nếu confirm dialog học bù:
  - Backend tạo/upsert `student_makeup_records` và set cell buổi gốc thành `makeup`.
  - Cell có helper text dạng `"Học bù tại [Tên lớp] - [ngày]"`.

Student-level makeup dialog:

- Dialog title: `"Chọn lớp học bù"`.
- Readonly info:
  - Học sinh
  - Lớp gốc
  - Buổi gốc
  - Thứ tự buổi, ví dụ `"Buổi 1 trong tuần"`
- Danh sách lớp/buổi học bù lấy từ `getEligibleDbStudentMakeupSessions`.
- Điều kiện hiện tại của eligible session:
  - Chỉ lấy lớp khác `sourceClassId`.
  - Chỉ lấy lớp cùng `academicYearId` với lớp gốc.
  - Chỉ lấy lớp CÙNG KHỐI (`grade`) với lớp gốc.
  - Chỉ lấy buổi có cùng thứ tự trong tuần với buổi gốc.
  - Dựa trên `availableClasses` truyền từ `ClassDetailPage`, hiện là class overview đã load từ SQLite.
- Dialog chọn lớp học bù đã tách sang `features/classes/components/attendance/StudentMakeupDialog.tsx` và hiển thị option dạng danh sách/card để tránh tràn text dài.
  - Không giới hạn quá khứ/tương lai: cho phép ghi học bù buổi đã qua (khi quên cập nhật), miễn cùng tuần và cùng thứ tự buổi. Giới hạn tương lai chỉ áp dụng cho việc tạo buổi học bù cả lớp.
- Student-level makeup đã persist SQLite: options từ backend (khác lớp, cùng năm học, cùng khối, lớp active, cùng session_index_in_week, cùng tuần, buổi nhận regular/active, quá khứ hay tương lai đều được, loại trừ lớp mà học sinh đã là thành viên chính thức trong tháng đó).

Receiving makeup students:

- Khi xem lớp/buổi nhận học bù, nếu có `StudentMakeupRecord` trỏ về class/session hiện tại, table hiện thêm section `"Học sinh học bù"`.
- Dòng học sinh học bù không thêm vào danh sách học sinh chính thức của lớp nhận.
- Dòng học sinh học bù chỉ có nút `Có học` / `Nghỉ`; trạng thái có thể là empty/present/absent.
- Không cho dòng học sinh học bù chọn `"Học bù"` tiếp.
- Các cell không phải session nhận học bù hiển thị `"-"`.
- Trường hợp đặc biệt: nếu học sinh nghỉ buổi học bù cả lớp và qua lớp khác học, giáo viên đánh dấu `"Nghỉ"` ở buổi bù cả lớp rồi quay lại buổi gốc đánh dấu `"Học bù"`; record học bù liên kết với buổi gốc, không liên kết buổi bù cả lớp.

Lock/unlock behavior:

- Với buổi thường DB, lock state dùng `attendance_sessions.is_locked`.
- Mặc định session DB mới materialize có `is_locked = 1`.
- Nút `"Mở khóa"` gọi command `toggle_attendance_lock(sessionId, false)`.
- Nút `"Khóa"` gọi command `toggle_attendance_lock(sessionId, true)`.
- Khi session bị khóa, cell chỉ hiển thị badge trạng thái, không hiển thị nút điểm danh.
- Lock/unlock áp dụng cho cả buổi thường và buổi học bù cả lớp đang hoạt động. Buổi đã nghỉ không cho đổi lock.

Cancel session behavior:

- Header session có icon `CalendarX`.
- Bấm icon ở buổi thường đang hoạt động mở xác nhận rồi gọi `cancel_attendance_session`.
- Hủy buổi đặt `status = cancelled`, `is_locked = 1` và upsert `absent` cho toàn bộ học sinh chính thức hợp lệ của ngày đó.
- Bấm lại icon ở buổi đã nghỉ mở xác nhận khôi phục rồi gọi `restore_attendance_session`; session trở lại `active`, mở khóa, nhưng các record `absent` vẫn giữ để thầy tự chỉnh.
- Nếu buổi gốc đang có buổi học bù cả lớp, backend yêu cầu hủy buổi bù thay vì khôi phục trực tiếp buổi gốc.

Makeup session:

- Nút `"Thêm buổi học bù"` mở `AddMakeupSessionDialog`.
- Fields: ngày học bù, giờ bắt đầu, giờ kết thúc, bù cho buổi nào (bắt buộc chọn). Trong dialog, ngày học bù nằm riêng một dòng; giờ bắt đầu và giờ kết thúc nằm ngang hàng để dễ so sánh.
- Khi đã chọn ngày, UI hiển thị hint gọn về tình trạng khung giờ: đang trống, trùng lớp nào, hoặc giờ kết thúc chưa hợp lệ.
- Khi lưu, `AttendanceTab` gọi `create_class_makeup_session`; backend kiểm tra ngày sau hôm nay, thời gian lớp, khoảng giờ hợp lệ, không có buổi bù trùng cho cùng buổi gốc và không overlap lịch/session của mọi lớp đang hoạt động.
- Transaction tạo session `class_makeup`, chuyển buổi gốc sang nghỉ/khóa và ghi `absent` cho học sinh chính thức của buổi gốc.
- Cột học bù hiển thị badge `"Học bù cả lớp"`; học sinh chính thức chỉ có `Có học`/`Nghỉ`/empty và lưu trong `attendance_records`.
- `"Hủy buổi bù"` gọi `remove_class_makeup_session`: xóa records + session học bù, mở khóa/khôi phục buổi gốc, nhưng giữ nguyên các record Nghỉ của buổi gốc.
- Luồng class-level makeup chính không còn ghép `mockMakeupSessions` vào các session DB.
- Đây là class-level makeup, tức khái niệm session-level, khác với trạng thái student-level `makeup`.

Quick action:

- Nút `"Đánh dấu cả lớp đi học"` nằm cạnh `"Thêm buổi học bù"`.
- Chỉ enabled nếu tuần đang xem có session DB trùng hôm nay, session không nghỉ, đang mở khóa, và có học sinh hợp lệ trong ngày đó.
- Khi bấm, gọi command `mark_session_present(sessionId)` để upsert `present` cho toàn bộ học sinh chính thức hợp lệ của session hôm nay, rồi refresh lại `get_attendance_week`.
- Áp dụng cả khi buổi hôm nay là buổi học bù cả lớp.
- Không áp dụng cho session đã nghỉ.

Export:

- Nút `"Xuất Excel"` chỉ hiển thị UI, chưa có behavior.

State/data source:

- Students lấy từ `useClassStudents(classId)` qua SQLite; roster chính thức được lọc theo `joinedMonth`/`leftMonth` của từng session rồi sort trước khi render.
- Session thường, session học bù cả lớp, lock, cancel/restore và điểm danh học sinh chính thức lấy/lưu bằng SQLite.
- AttendanceTab không còn dùng `useMockAttendance`; toàn bộ điểm danh (gồm học bù theo học sinh) đọc/ghi SQLite.
- Không dùng `attendanceSessions` và `attendanceRecords` trong `mockData.ts` cho UI AttendanceTab hiện tại.

Hạn chế:

- Phase 7A-7C lưu buổi thường, buổi học bù cả lớp, lock/unlock, cancel/restore, trạng thái `present`/`absent`/`makeup` cho học sinh chính thức và trạng thái lớp nhận trong `student_makeup_records.receiving_attendance_status`.
- Không có note theo buổi hoặc theo record trong UI hiện tại.
- Student-level makeup đã persist SQLite (Phase 7C); dòng `"Học sinh học bù"` ở lớp nhận và trạng thái Học/Nghỉ của dòng đó sống sót sau reload/restart.

## 13. Tab Nhập điểm hiện tại

Trạng thái: đã nối SQLite (Phase 6). Cột điểm lưu trong `score_columns`, điểm lưu trong `score_values`, khóa theo `(column_id, membership_id)`.

Month selector:

- Select tháng sinh từ `monthsInRange(classStartMonth, classEndMonth)` — khoảng thời gian học của lớp, không hardcode.
- Default selected month là tháng hiện tại clamp vào range; nếu range lớp đổi làm tháng đang chọn rơi ra ngoài, tab tự reset về tháng hợp lệ.
- Có nút tháng trước/tháng sau quanh select; đổi tháng load lại sheet từ DB và reset edit mode.

Score table:

- Columns:
  - STT
  - Họ tên
  - dynamic score columns của tháng đang chọn (từ `score_columns`)
- Roster là các membership HỢP LỆ trong tháng đang chọn (cùng rule lifecycle với PaymentsTab: `joined_month <= month < left_month`); học sinh đang học hiện từ tháng bắt đầu học, học sinh đã nghỉ vẫn hiện ở các tháng đã học và không hiện từ `leftMonth`.
- Mặc định rows sort bằng `sortStudentsByVietnameseName`; STT = `index + 1` sau sort.
- View mode hỗ trợ click header cột điểm để sort UI-only theo điểm: lần 1 giảm dần, lần 2 tăng dần, lần 3 quay về sort tên tiếng Việt. Học sinh cùng điểm fallback theo tên tiếng Việt; điểm trống/NULL luôn nằm cuối cả hai chiều sort.
- Click header `"Họ tên"` trong view mode reset về sort tên mặc định.
- Edit mode không sort theo cột điểm; khi vào edit mode tab reset về sort tên để tránh nhầm khi nhập/sửa điểm.
- Nếu tháng đang chọn chưa có cột bài kiểm tra nào, tab vẫn hiển thị bảng danh sách học sinh hợp lệ; chỉ chưa có cột điểm động.

Load/data source:

- Đổi classId hoặc tháng gọi command `list_score_sheet(classId, month)` — backend trả columns + rows (kèm `valuesByColumnId`).
- ScoresTab không còn dùng `useMockScores` (file còn lại nhưng không được ScoresTab dùng nữa).
- Có loading state và thông báo lỗi tiếng Việt; nút lưu bị disable khi đang lưu.
- Cột điểm và điểm persist sau reload/restart.

Add test behavior:

- Nút `"Thêm bài kiểm tra"` gọi command `add_score_column` (label mặc định `"Bài kiểm tra mới"`, `sort_order = max + 1`, validate tháng trong range lớp).
- Backend trả sheet mới; tab vào edit mode.

View/edit mode:

- View mode: cell điểm là text, empty hiển thị `"-"`.
- Buttons view mode: `"Thêm bài kiểm tra"`, `"Cập nhật"` (disable khi chưa có cột), `"Xuất bảng điểm"`.
- Edit mode: header cột có input sửa tên bài kiểm tra và nút xóa cột; score cells là input.
- Buttons edit mode: `"Lưu thay đổi"`, `"Hủy"`.
- Draft dạng thưa: chỉ giữ ô/tên cột đã sửa; hiển thị = draft đè lên giá trị DB.

Delete score column:

- Trong edit mode, nút thùng rác ở header cột mở dialog.
- Text xác nhận: `"Bạn có chắc muốn xóa cột điểm này? Toàn bộ điểm trong cột sẽ bị xóa."`
- Confirm gọi `delete_score_column` — backend transaction xóa `score_values` liên quan rồi xóa cột — sau đó refresh sheet; draft của các cột còn lại được giữ.

Save/cancel:

- `"Lưu thay đổi"`: validate mọi ô hiển thị; đổi tên cột qua `rename_score_column` (chỉ cột có thay đổi); lưu toàn bộ điểm qua `save_score_values` (batch, transaction, upsert theo `(column_id, membership_id)`); refresh từ DB và thoát edit mode.
- Điểm trống lưu NULL nếu row đã tồn tại, không tạo row thừa.
- `"Hủy"` discard draft và quay lại giá trị DB.

Score validation:

- Input chỉ nhận giá trị phù hợp regex trong `canUseScoreInput`.
- Cho phép trống (NULL trong DB).
- Điểm hợp lệ khi save: số từ 0 đến 10 (validate ở UI, service layer và CHECK constraint trong DB).
- Cho phép thập phân, normalize dấu phẩy thành dấu chấm khi lưu.
- Nếu invalid, hiển thị lỗi: `"Điểm phải là số từ 0 đến 10. Có thể để trống nếu chưa có điểm."`

Export:

- Nút `"Xuất bảng điểm"` chỉ hiển thị UI, chưa có behavior.

## 14. Tab Học phí hiện tại

Trạng thái: đã nối SQLite (Phase 5). Payment rows lưu trong bảng `payments`, khóa theo `(membership_id, month)`.

Month selector (Phase 5.5):

- Danh sách tháng sinh từ `monthsInRange(class.startMonth, class.endMonth)` (`src/lib/months.ts`) — không còn hardcode/cửa sổ trượt.
- Có nút tháng trước/tháng sau quanh select tháng; nút trước tắt ở tháng đầu lớp, nút sau tắt ở tháng cuối lớp.
- Default là tháng hiện tại clamp vào khoảng start/end của lớp.
- Nếu sửa thời gian học của lớp làm tháng đang chọn rơi ra ngoài khoảng, tab tự reset về tháng hợp lệ.
- Payment row nằm ngoài khoảng mới (nếu có) vẫn giữ trong DB, chỉ không hiển thị trong PaymentsTab.

Eligibility theo tháng (Phase 5.5):

- `list_payments_by_class_month` chỉ trả học sinh "thuộc lớp trong tháng đó": `joined_month <= month` và (`left_month IS NULL` hoặc `month < left_month`).
- Học sinh vào lớp muộn không xuất hiện ở các tháng trước joinedMonth; học sinh đã nghỉ không xuất hiện từ leftMonth trở đi nhưng VẪN xuất hiện ở các tháng đã học (để thầy ghi nhận trả nợ).
- Thao tác học phí không yêu cầu membership đang active, chỉ yêu cầu tháng nằm trong khoảng joined/left của học sinh.

Search:

- Ô `"Tìm nhanh tên học sinh..."` lọc client-side theo `fullName` trên dữ liệu đã load từ DB.
- Sau khi search/filter trạng thái, rows học phí được sort bằng `sortStudentsByVietnameseName`; STT vẫn là `index + 1` của rows đang hiển thị.

Filter:

- Select filter:
  - Tất cả
  - Chưa đóng
  - Đã đóng
  - Miễn giảm
- Filter dùng `filterPaymentRows`.

Summary cards:

- Đã đóng
- Chưa đóng
- Miễn giảm
- Tổng đã thu

Lưu ý: type/helper `PaymentSummary` vẫn có `totalStudents`, nhưng UI hiện tại không render card tổng học sinh.

Table columns:

- STT
- Họ tên
- Trạng thái
- Số tiền
- Ngày đóng
- Ghi chú

Payment statuses:

- Type `PaymentStatus = "paid" | "unpaid" | "waived"`.
- UI labels:
  - `paid`: Đã đóng
  - `unpaid`: Chưa đóng
  - `waived`: Miễn giảm
- Select trạng thái tích hợp màu trong trigger qua `paymentSelectClasses`.

Status change behavior:

- Chọn `"Đã đóng"` không đổi ngay; mở `ConfirmPaidDialog`.
- Dialog xác nhận gồm tên học sinh, tháng, học phí tháng của lớp.
- Confirm gọi command `set_payment_paid`:
  - `status = paid`
  - `amount` = snapshot học phí tháng của lớp tại thời điểm đóng
  - `paid_at` = ngày hiện tại (SQLite `date('now','localtime')`)
- Chọn `"Chưa đóng"` gọi ngay `set_payment_unpaid`:
  - `status = unpaid`, `amount = 0`, `paid_at = NULL`
  - note được giữ nguyên trong DB
- Chọn `"Miễn giảm"` mở `TuitionWaiverDialog`.
- Dialog miễn giảm hiển thị readonly: học sinh, tháng, học phí lớp.
- Form miễn giảm gồm: số tiền thực thu, ghi chú (BẮT BUỘC — UI disable nút Lưu và backend trả lỗi nếu thiếu).
- Validation: amount >= 0 và <= monthlyFee (cả UI lẫn service layer).
- Lưu gọi `set_payment_waived`:
  - `status = waived`, `amount` theo input, `note` theo input
  - `paid_at` là hôm nay nếu amount > 0, ngược lại NULL.
- Sau mỗi thao tác, tab refresh lại danh sách từ DB; control trạng thái bị disable trong lúc đang lưu.

Amount behavior:

- Backend trả về dòng cho mọi membership thuộc lớp trong tháng đang xem theo lifecycle (`joined_month <= month` và `left_month IS NULL` hoặc `month < left_month`); nếu chưa có payment row thì trả dòng ảo `unpaid`, `amount = 0`, `paymentId = null`.
- Không tự insert row unpaid khi chỉ xem tháng; row chỉ được tạo khi có thao tác (lazy upsert).

Note behavior:

- Cột ghi chú là input inline, lưu khi blur hoặc Enter (chỉ ghi DB khi giá trị thay đổi).
- Sửa note khi chưa có payment row sẽ tạo row `unpaid` kèm note (`update_payment_note`).

Export:

- Nút `"Xuất Excel"` đã có behavior thật từ Phase 9B.
- Export tạo workbook `.xlsx` sheet `"Học phí"` bằng ExcelJS và lưu qua Rust command `save_excel_file`.
- Export đúng các dòng đang hiển thị sau selected month, status filter, search và sort tên tiếng Việt.
- STT trong Excel = row index + 1 sau filter/search/sort; không export `paymentId`, `membershipId`, `studentId`, `classId`.
- Workbook có title `"Bảng học phí"`, metadata lớp/tháng/học phí tháng/ngày xuất/bộ lọc/tìm kiếm, và summary `"Tổng hợp theo danh sách đang hiển thị"`.
- Summary trong file tính theo rows được export, không phải toàn bộ tháng nếu đang filter/search.
- Export không ghi DB, không tạo payment row ảo thành row thật, không sửa note/status/amount.
- Nếu người dùng hủy save dialog thì không báo lỗi.

State/data source:

- Dòng học phí load từ command `list_payments_by_class_month(classId, month)` — backend join `class_memberships` + `students` + LEFT JOIN `payments`.
- Đổi classId hoặc tháng sẽ load lại từ DB; có loading state và thông báo lỗi tiếng Việt.
- `monthlyFee` cho dialog lấy từ prop `monthlyFeeOverride` từ ClassDetail header (backend tự đọc lại fee khi ghi).
- Summary cards tính từ dữ liệu DB đang load; "Tổng đã thu" = tổng amount của paid + waived.
- STT tính theo `index + 1` của dòng đang hiển thị sau search/filter/sort, không dùng database ID.
- Dữ liệu học phí persist sau reload/restart.

## 15. Các trang/sidebar page khác hiện tại

### Lịch học

- File: `src/features/schedule/SchedulePage.tsx`.
- UI: title `"Lịch học"`, description `"Lịch tổng hợp các lớp theo tháng/tuần sẽ được phát triển sau."`
- Có card `"Buổi học sắp tới"` với 3 session mock tĩnh.
- Không có tương tác thật.
- Trạng thái: placeholder.

### Học phí dashboard/global page

- File: `src/features/tuition-dashboard/TuitionDashboardPage.tsx`.
- UI: title `"Tổng hợp học phí"`, description `"Dashboard tổng hợp học phí theo tháng sẽ được phát triển sau."`
- Có 4 summary card mock tĩnh: đã thu tháng này, chưa đóng, miễn giảm, số lớp theo dõi.
- Không liên kết với `PaymentsTab`.
- Trạng thái: placeholder.

### Sao lưu dữ liệu

- File: `src/features/backup/BackupPage.tsx`, API `src/services/backupApi.ts`, backend `src-tauri/src/backup/mod.rs`.
- Card thông tin database: đường dẫn `data.sqlite`, dung lượng, phiên bản schema (migration mới nhất), lần sao lưu/khôi phục gần nhất, nút `"Mở thư mục dữ liệu"`.
- Card sao lưu: `"Sao lưu ngay"` tạo file `quan-ly-lop-hoc-them-backup-YYYYMMDD-HHMMSS.sqlite` trong `<app_data_dir>/backups/` bằng SQLite backup API (an toàn với WAL, file mở được độc lập bằng DB Browser); `"Mở thư mục sao lưu"`; hiển thị kết quả sao lưu gần nhất (tên file, dung lượng, thời gian).
- Card khôi phục: `"Chọn file khôi phục"` mở native file picker (.sqlite), file được validate trước (SQLite hợp lệ, `PRAGMA integrity_check`, đủ bảng bắt buộc, schema không mới hơn app); `"Khôi phục dữ liệu"` chỉ enable khi file hợp lệ và luôn có confirm dialog.
- Restore: tạo safety backup `pre-restore-YYYYMMDD-HHMMSS.sqlite` trước, rồi copy backup VÀO live connection bằng SQLite backup API (không thay file, không cần restart), chạy lại migrations nếu backup từ schema cũ hơn.
- Sau restore thành công: dialog `"Khôi phục thành công"`, App reset state, tải lại năm học/lớp từ DB và quay về trang chủ (không cần khởi động lại ứng dụng).
- Mọi lần backup/restore đều ghi `backup_logs` (success/failed kèm message); card lịch sử hiển thị các log mới nhất.
- Trạng thái: implemented (Phase 8).

### Cài đặt

- File: `src/features/settings/SettingsPage.tsx`.
- UI: title `"Cài đặt"`, description `"Các thiết lập ứng dụng sẽ được phát triển sau."`
- Card tĩnh:
  - Đổi mật khẩu
  - Năm học hiện tại
  - Thông tin ứng dụng
- Không có form hoặc behavior.
- Trạng thái: placeholder.

## 16. Data và type hiện tại

### Academic year data

- File seed/mock cũ: `src/data/mockData.ts`.
- Type: `AcademicYear` trong `src/types/academic-year.ts`.
- Fields: `id`, `label`, `startsAt`, `endsAt`, `isCurrent`.
- SQLite Phase 3 có bảng `academic_years` dùng `INTEGER PRIMARY KEY AUTOINCREMENT`; seed DB mới chỉ tạo `Năm học 2026 - 2027` và đặt năm này là current. Không seed `2025-2026` hoặc `2024-2025`; năm tương lai sẽ do tính năng thêm năm học tạo sau.
- Frontend hiện gọi `list_academic_years` và `get_current_academic_year_id`.

### Class data

- Type: `ExtraClass` và `ClassOverview` trong `src/types/class.ts`.
- Fields: `id`, `academicYearId`, `name`, `grade`, `startMonth`, `endMonth`, `status` (active/completed), `schedule`, `scheduleItems`, `monthlyFee`, `room`, `note?`, `studentCount`, `unpaidCount`.
- Phase 5.5 (migration `006_class_month_lifecycle`): `classes` có `start_month`/`end_month`/`status`; `class_memberships` có `joined_month` (tháng đầu học) và `left_month` (tháng ĐẦU TIÊN không còn học — exclusive; NULL nếu đang học). Sau schema change này nên reset `data.sqlite` dev để có seed sạch.
- ClassDetail header hiển thị `"Thời gian học: MM/YYYY - MM/YYYY"`, có dialog sửa khoảng tháng (`update_class_month_range`) và hành động `"Kết thúc lớp"` (`complete_class` — chọn tháng kết thúc thực tế, status → completed, hiển thị badge `"Đã kết thúc"`).
- `grade` lưu trong bảng `classes` (INTEGER, migration `004_class_grade`); MVP chỉ dùng Khối 8 và Khối 9.
- Type phụ:
  - `WeekdayIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6`
  - `ClassScheduleItem = { weekday, startTime, endTime }`
  - `ClassGrade = 8 | 9`
- SQLite Phase 3 có bảng `classes` và `class_schedules`, đều dùng id số tự tăng; `classes.academic_year_id` và `class_schedules.class_id` là foreign key số.
- Seed DB hiện tạo các lớp mẫu Văn 9/Văn 8 trong năm học 2026-2027 nếu bảng năm học/lớp đang rỗng; các lớp dùng `startMonth = 2026-08` và `endMonth = 2027-07`. Nếu database dev còn năm/lớp cũ, có thể xóa `data.sqlite`, `data.sqlite-wal`, `data.sqlite-shm` để seed lại sạch.
- `studentCount` trong class overview đếm membership `active` từ SQLite; `unpaidCount` đếm từ bảng `payments` theo tháng hệ thống hiện tại (thiếu row hoặc `unpaid` = chưa đóng).
- Quan hệ: class thuộc academic year qua `academicYearId` số; class có nhiều `class_schedules`; student dùng `class_memberships`; payment/score records và attendance records đã persist SQLite theo DB `classId` số. Attendance regular sessions, lock/unlock, cancel/restore, class-level makeup và student-level makeup đều đã persist đến Phase 7C.

### Student data

- SQLite Phase 4 có bảng `students` và `class_memberships`, đều dùng id số tự tăng; `class_memberships.class_id` và `class_memberships.student_id` là foreign key số.
- Type `Student` trong `src/types/student.ts` vẫn giữ shape UI cũ cho mockData và một số helper cũ.
- Type `ClassStudentRosterItem` là roster DB dùng chung cho các tab chi tiết lớp.
- Type `StudentListItem` thêm `membershipId` và `studentId` cho tab Danh sách học sinh.
- DTO tab Danh sách học sinh gồm: `membershipId`, `studentId`, `classId`, `fullName`, `schoolClass`, `school`, `parentPhone`, `status`, `note?`.
- Status type: `"active" | "paused"`.
- Status thuộc `class_memberships`, không thuộc student global.
- Một học sinh có thể thuộc nhiều lớp về mặt schema, nhưng UI hiện tại chỉ tạo một membership cho lớp đang mở.
- Seed Phase 4 đưa 9 học sinh mock ban đầu vào SQLite nếu `students` và `class_memberships` đều đang trống; SQLite tự sinh `students.id` và `class_memberships.id`.
- `mockData.ts` vẫn có danh sách học sinh cũ nhưng các tab chi tiết lớp hiện không dùng nó làm roster chính.

### Attendance data

- Types trong `src/types/attendance.ts`:
  - `AttendanceStatus = "present" | "absent" | "makeup"`.
  - `AttendanceSession = { id, classId, date, content?, note? }`.
  - `AttendanceRecord = { id, sessionId, studentId, status, note? }`.
- Empty/undefined không nằm trong `AttendanceStatus`; UI dùng nó để hiển thị `"Chưa điểm danh"`.
- Labels hiện tại:
  - empty/undefined: Chưa điểm danh
  - `present`: Có học
  - `absent`: Nghỉ
  - `makeup`: Học bù
- Không còn `"excused"`, `"late"`, `"Có phép"` hoặc `"Đi muộn"` trong MVP attendance model hiện tại.
- `mockData.ts` có `attendanceSessions` và `attendanceRecords`.
- UI AttendanceTab hiện tại không dùng trực tiếp các array này; session và record điểm danh lấy/lưu qua SQLite bằng `get_attendance_week` và các command attendance.
- `useMockAttendance` còn tồn tại trong source nhưng không còn là nguồn dữ liệu cho AttendanceTab hiện tại.
- Helper type trong `features/classes/utils/attendance.ts`:
  - `WeeklySession`: session sinh từ lịch học hoặc session học bù cả lớp (`classId?`, `date`, `startTime`, `endTime`, `isMakeup`, `makeupForSessionId`).
  - `MakeupSessionInput`: input tạo học bù cả lớp gồm `classId`, `date`, `startTime`, `endTime`, `makeupForSessionId`.
  - `StudentMakeupRecord`: liên kết học sinh từ buổi gốc sang class/session nhận học bù.
  - `StudentMakeupSessionOption`: option hiển thị trong dialog chọn lớp học bù.
- Các store mock/module-level cũ không còn quyết định dữ liệu điểm danh đang render trong ClassDetailPage.

### Score data

- SQLite Phase 6 (migration `007_scores`):
  - `score_columns`: `id`, `class_id`, `month` (YYYY-MM), `label`, `sort_order`, timestamps. Cột điểm thuộc lớp + tháng.
  - `score_values`: `id`, `column_id`, `membership_id`, `student_id`, `value REAL` (NULL hoặc 0-10, CHECK trong DB), timestamps. Unique `(column_id, membership_id)`.
- Điểm keyed theo `membership_id` (không dùng student_id đơn lẻ vì một học sinh có thể thuộc nhiều lớp).
- DTO frontend trong `src/types/score.ts`: `ScoreColumnDto`, `ScoreSheetRow` (kèm roster + `valuesByColumnId`), `ScoreSheetDto`, input types cho add/rename/save.
- Frontend API: `src/services/scoreApi.ts` (`listScoreSheet`, `addScoreColumn`, `renameScoreColumn`, `deleteScoreColumn`, `saveScoreValues`).
- Type `ScoreColumn`/`ScoreRecord` cũ (string id) vẫn còn cho `mockData.ts`; `useMockScores`/`createInitialScoreSheets` không còn được ScoresTab dùng.
- ScoresTab không dùng `ScoreType`, không dùng hệ số.

### Payment data

- SQLite Phase 5: bảng `payments` (migration `005_payments`), khóa duy nhất `(membership_id, month)`.
- Fields DB: `id`, `membership_id`, `class_id`, `student_id`, `month` (YYYY-MM), `status`, `amount`, `paid_at`, `note`, timestamps.
- Status type: `"paid" | "unpaid" | "waived"` (CHECK constraint trong DB).
- Rules: unpaid lưu `amount = 0`, `paid_at = NULL`; paid lưu snapshot học phí tháng + ngày đóng; waived lưu số thực thu và BẮT BUỘC note; amount không âm và waived <= học phí lớp.
- Type frontend: `PaymentRow` trong `src/types/payment.ts` (DTO trả về từ `list_payments_by_class_month`, gồm cả thông tin roster).
- Type `Payment` cũ (string id) vẫn còn cho `mockData.ts`, không dùng trong PaymentsTab nữa.
- Frontend API: `src/services/paymentApi.ts`.
- Quan hệ: payment gắn với `class_memberships` qua `membership_id`; thao tác học phí yêu cầu membership thuộc lớp trong tháng đó theo `joined_month/left_month`, không bắt buộc membership còn active để vẫn ghi nhận trả nợ tháng đã học.

### Settings/other data

- SQLite `app_settings` hiện lưu password hash/salt và `current_academic_year_id`.
- Settings page chỉ render card tĩnh trong component.
- BackupPage đã functional từ Phase 8: sao lưu/khôi phục SQLite, validate file, safety backup, log `backup_logs`, reload app state sau restore.

## 17. Current state management

- Không có global state library.
- Không dùng React Router.
- `src/app/App.tsx` giữ state cấp app:
  - `screen`
  - `selectedClassId`
  - `selectedYearId`
  - `academicYears`
  - `classOverviews`
  - loading/error cho school data
- Home:
  - nhận `academicYears`, `classOverviews`, `selectedYearId` từ App.
  - đổi năm học gọi command lưu năm hiện tại rồi load lại lớp theo năm.
  - tạo lớp mới gọi `create_class`, sau đó cập nhật `classOverviews` ở App.
- ClassDetailPage:
  - giữ local draft cho tên lớp, học phí, lịch học.
  - khi mở detail gọi `get_class_detail`.
  - lưu thay đổi gọi command DB, sau đó gọi `onClassUpdate` để cập nhật `classOverviews` ở App.
- StudentListTab:
  - giữ `students`, `newStudentIds`, `searchQuery`, `isEditing`, loading/error/save state.
  - load danh sách từ SQLite khi `classId` đổi.
  - lưu thay đổi vào SQLite qua `studentApi`.
- AttendanceTab:
  - `weekStart`, `weekPickerOpen`, `visibleCalendarMonth`, `pendingCancelSession`, `pendingStudentMakeup`, `selectedStudentMakeupSessionId`, loading/error state ở tab.
  - Buổi học thường, buổi học bù cả lớp, điểm danh học sinh chính thức, dòng học sinh học bù nhận vào lớp và helper học bù lấy từ SQLite qua `get_attendance_week`.
  - Trạng thái `present`/`absent` ghi SQLite qua `set_attendance_status`; bỏ trạng thái thì xóa row `attendance_records`.
  - Trạng thái `makeup` đi qua `create_student_makeup_record`; trạng thái lớp nhận đi qua `set_receiving_makeup_attendance_status`.
- ScoresTab:
  - `selectedMonth`, `sheet`, `isLoading`, `isSaving`, `isEditing`, `errorMessage`, `draftLabels`, `draftValues`, `pendingDeleteColumn`.
  - sheet load từ SQLite qua `list_score_sheet`; draft chỉ tồn tại trong phiên edit.
- PaymentsTab:
  - `selectedMonth`, `filter`, `searchQuery`, `pendingPaidRow`, `pendingWaivedRow`, `rows` (load từ DB), `noteDrafts`, loading/saving/exporting/error/success.
- State của năm học/lớp/lịch học/học sinh-membership được load lại từ SQLite sau restart.
- Học phí đã persist qua SQLite (Phase 5). Điểm đã persist qua SQLite (Phase 6). Điểm danh đã persist đến Phase 7C cho regular/class makeup, `present`/`absent`/`makeup`, lock/unlock, cancel/restore và student-level makeup.
- Một số state reset khi đổi class hoặc đổi month.

## 18. UI action inventory

| UI action | Where it appears | Current implemented behavior | Current data affected | Persistence | Future DB note |
|---|---|---|---|---|---|
| Login | LoginPage | Tạo/verify mật khẩu qua command settings | `screen`, `app_settings` | SQLite | Không persist session sau restart |
| Logout | Header | Quay về login, reset selected class | `screen`, `selectedClassId` | local only | Có thể clear session/app lock |
| Select sidebar item | Sidebar | Đổi screen local | `screen`, `selectedClassId` | local only | Không cần DB trực tiếp |
| Select academic year | HomePage | Đổi năm đang xem, lưu current year, load lớp theo năm | `selectedYearId`, `classOverviews`, `app_settings.current_academic_year_id` | SQLite | `studentCount` lấy từ memberships; `unpaidCount` lấy từ bảng payments theo tháng hiện tại |
| Create class | CreateClassDialog | Validate bắt buộc lịch, giờ hợp lệ, không trùng giờ với lớp đã load; gọi `create_class`, insert class (gồm grade) + schedules | `classes`, `class_schedules`, `classOverviews` | SQLite | Khối chọn từ select 8/9, không còn field ghi chú; backend chưa enforce trùng lịch |
| Select grade tab | HomePage | Lọc class cards và summary theo Khối 8/Khối 9 | UI only | none | Grade đọc từ `classes.grade` |
| Open class card | ClassCard/HomePage | Mở ClassDetailPage | `selectedClassId`, `screen` | local only | Điều hướng theo class id |
| Back to home | ClassDetailPage | Về Home | `selectedClassId`, `screen` | local only | Không cần DB |
| Edit class name | ClassDetail header | Sửa tên bằng input, gọi `update_class_name` | `classes.name`, `classOverviews.name` | SQLite | Home và detail đồng bộ từ response |
| Edit class schedule | EditClassScheduleDialog | Chọn ngày/giờ, validate không trùng giờ với lớp khác đã load, gọi `update_class_schedule`, AttendanceTab nhận schedule mới | `class_schedules`, `classOverviews.scheduleItems` | SQLite | Attendance sessions đã sinh không bị rewrite; backend chưa enforce trùng lịch |
| Edit monthly fee | ClassDetail header | Sửa fee bằng input, gọi `update_class_monthly_fee` | `classes.monthly_fee`, `classOverviews.monthlyFee` | SQLite | Payment cũ giữ amount snapshot đã lưu |
| Search student | StudentListTab | Lọc table local trên dữ liệu đã load từ DB | UI only | none | Query/filter backend khi data lớn |
| Add student | StudentListTab | Thêm dòng mới inline, lưu tạo `students` + `class_memberships` | `students`, `class_memberships` | SQLite khi bấm Lưu cập nhật | Có thể thêm validate nâng cao sau |
| Remove new student row | StudentListTab | Xóa dòng mới chưa lưu bằng icon thùng rác | local `students`, `newStudentIds` | local only | Nếu đã persist cần delete draft hoặc rollback |
| Edit student | StudentListTab | Sửa fields và status trong edit mode, bấm lưu gọi DB | `students`, `class_memberships.status` | SQLite | Update student/class membership/status |
| Export student Excel | StudentListTab | Tạo workbook `.xlsx` từ danh sách học sinh đang hiển thị, mở native save dialog qua Rust command `save_excel_file` | UI rows đã load từ `students` + `class_memberships` | Không ghi DB | Phase 9A; STT tính từ row hiển thị, cancel dialog không đổi UI |
| Navigate week | AttendanceTab | Tuần trước/sau hoặc chọn tuần trong mini calendar; gọi `get_attendance_week`, backend materialize buổi thường nếu thiếu | `weekStart`, `attendance_sessions`, `attendance_records` | SQLite read/write session lazily | Week mở lần đầu có thể tạo session regular |
| Add class-level makeup session | AttendanceTab/AddMakeupSessionDialog | Gọi `create_class_makeup_session`; transaction tạo `class_makeup`, hủy/khóa buổi gốc và ghi Nghỉ cho roster hợp lệ | `attendance_sessions`, `attendance_records` | SQLite | Backend chặn trùng lịch/session toàn bộ lớp active và trùng makeup của cùng buổi gốc |
| Remove class-level makeup session | AttendanceTab | Xác nhận rồi gọi `remove_class_makeup_session`; xóa records/session bù và mở lại buổi gốc | `attendance_sessions`, `attendance_records` | SQLite | Record Nghỉ của buổi gốc được giữ lại |
| Mark today present | AttendanceTab | Nếu có session DB hôm nay, active, đã mở khóa và có học sinh hợp lệ, gọi `mark_session_present` | `attendance_records` | SQLite | Batch upsert `present` cho học sinh chính thức hợp lệ |
| Cancel/restored session | AttendanceTab | Xác nhận rồi gọi `cancel_attendance_session`/`restore_attendance_session`; cancel ghi Nghỉ cả lớp và khóa, restore mở khóa nhưng giữ records | `attendance_sessions`, `attendance_records` | SQLite | Không restore trực tiếp khi còn class_makeup liên kết |
| Lock/unlock session | AttendanceTab | Toggle lock session DB qua `toggle_attendance_lock`; cell chỉ sửa được khi mở khóa | `attendance_sessions.is_locked` | SQLite | Session regular mới mặc định locked |
| Set official attendance status | AttendanceTab | Nút Học/Nghỉ ghi DB qua `set_attendance_status` (tự gỡ liên kết học bù cũ); bấm lại trạng thái đang chọn gửi `null` để xóa row | `attendance_records`, `student_makeup_records` | SQLite | Học bù đi qua dialog riêng |
| Confirm student-level makeup | AttendanceTab dialog | `create_student_makeup_record`: ô gốc = makeup + upsert record, atomic | `attendance_records`, `student_makeup_records` | SQLite | Options từ `list_student_makeup_options` |
| Remove student-level makeup | AttendanceTab | Bấm lại nút Học bù đang chọn -> dialog xác nhận -> `remove_student_makeup_record` (xóa record + record makeup ở ô gốc) | `attendance_records`, `student_makeup_records` | SQLite | Đổi sang Học/Nghỉ cũng tự gỡ record |
| Set receiving makeup student status | AttendanceTab receiving class | Nút Học/Nghỉ (bấm lại = Chưa điểm danh) gọi `set_receiving_makeup_attendance_status` | `student_makeup_records.receiving_attendance_status` | SQLite | Không tạo attendance_records/membership cho học sinh khách |
| Export attendance Excel | AttendanceTab | Chưa có behavior | none | none | Export sheet theo week/class |
| Change score month | ScoresTab | Load sheet tháng mới từ DB, thoát edit | `selectedMonth`, `sheet` | SQLite | `list_score_sheet(classId, month)` |
| Add score column/test | ScoresTab | Gọi `add_score_column`, nhận sheet mới, vào edit mode | `score_columns` | SQLite | Validate tháng trong range lớp, sort_order = max + 1 |
| Edit score column label | ScoresTab | Input header trong edit mode (draft), lưu khi bấm Lưu thay đổi | `score_columns.label` | SQLite khi lưu | `rename_score_column` chỉ gọi cho cột có thay đổi |
| Delete score column | ScoresTab | Dialog confirm, gọi `delete_score_column` | `score_columns`, `score_values` | SQLite | Transaction xóa values rồi xóa cột |
| Edit score value | ScoresTab | Input điểm trong edit mode (draft thưa) | draft local | local đến khi lưu | Validate 0-10 khi nhập và khi lưu |
| Save scores | ScoresTab | Validate, gọi `save_score_values` batch, refresh từ DB | `score_values` | SQLite | Transaction upsert theo `(column_id, membership_id)`; trống = NULL |
| Cancel score edit | ScoresTab | Discard draft, quay về giá trị DB | draft local | none | Không ghi DB |
| Export score Excel | ScoresTab | Chưa có behavior | none | none | Export score sheet |
| Change payment month | PaymentsTab | Chuyển month state và load lại rows SQLite | `selectedMonth`, `rows` | SQLite read | Query `payments` by class/month |
| Search payment student | PaymentsTab | Lọc tên học sinh local | UI only | none | Search/filter khi data lớn |
| Filter payment status | PaymentsTab | Lọc rows local | UI only | none | Query/filter |
| Change status to paid | PaymentsTab | Mở confirm, confirm gọi `set_payment_paid` (snapshot fee + paid_at) | `payments` | SQLite | Refresh list sau khi lưu |
| Change status to unpaid | PaymentsTab | Gọi `set_payment_unpaid` (amount 0, paid_at NULL, giữ note) | `payments` | SQLite | Refresh list sau khi lưu |
| Change status to waived | PaymentsTab | Mở waiver dialog (note bắt buộc), gọi `set_payment_waived` | `payments` | SQLite | Validate amount 0..fee ở UI và service |
| Edit payment note | PaymentsTab | Input inline, lưu khi blur/Enter qua `update_payment_note` | `payments` | SQLite | Tạo row unpaid kèm note nếu chưa có row |
| Export payment Excel | PaymentsTab | Tạo workbook `.xlsx` từ học phí đang hiển thị theo tháng/filter/search/sort, mở native save dialog qua `save_excel_file` | UI rows đã load từ `payments` + virtual unpaid rows | Không ghi DB | Phase 9B; summary trong file theo visible rows, STT tính từ row hiển thị |
| Sao lưu ngay | BackupPage | Gọi `create_backup`, tạo file backup trong thư mục backups | `backup_logs` | SQLite | Verify file sau khi tạo |
| Chọn file khôi phục | BackupPage | Native picker + `validate_backup_file` | none | SQLite (read-only) | Restore disable nếu file không hợp lệ |
| Khôi phục dữ liệu | BackupPage | Confirm dialog + `restore_backup` (safety backup + copy vào live connection + migrations) | tất cả bảng + `backup_logs` | SQLite | App reload dữ liệu, về Home |
| Mở thư mục dữ liệu/sao lưu | BackupPage | `open_app_data_folder` / `open_backup_folder` qua opener plugin | none | none | none |
| Settings cards | SettingsPage | Static only | none | none | Implement settings later |

## 19. Current limitations / chưa có

- SQLite/database đã có cho settings/password, academic years, classes, class schedules, students, class memberships, payments, scores, class/membership month lifecycle, attendance Phase 7C và backup/restore Phase 8.
- Điểm danh buổi thường và buổi học bù cả lớp đã lưu SQLite cho `present`/`absent`/`makeup`; `"Chưa điểm danh"` không tạo row. Lock/unlock, cancel/restore, class-level makeup và student-level makeup đã persist.
- AttendanceTab, ScoresTab và PaymentsTab đã dùng roster SQLite. AttendanceTab nhận roster chính thức từ `get_attendance_week`, lọc theo từng session date bằng `joinedMonth <= sessionMonth` và `(leftMonth is null OR sessionMonth < leftMonth)`.
- Chưa có app lock/session persist sau restart dù password hash đã lưu trong DB.
- Chưa có React Router.
- Đã có export Excel thật cho danh sách học sinh ở `StudentListTab` và học phí ở `PaymentsTab`; export bảng điểm, điểm danh và toàn bộ import Excel vẫn chưa triển khai.
- Trang Lịch học global chỉ là placeholder.
- Trang Tổng hợp học phí global chỉ là placeholder.
- Trang Cài đặt chỉ là placeholder.
- StudentListTab đã đồng bộ `studentCount` active membership với Home/ClassDetail sau khi lưu; các tab điểm danh/điểm/học phí hiện đọc cùng DB roster, trong đó điểm danh buổi thường/điểm/học phí đã lưu records theo từng domain.
- Chưa có phân quyền hoặc nhiều người dùng.
- Chưa có xử lý hard delete/archive học sinh hiện có.
- Chưa có lưu lịch sử học phí theo tháng.
- Attendance MVP không có `"Có phép"` và không có `"Đi muộn"`; nếu muốn dùng lại cần xác nhận model mới.
- Class-level makeup và student-level makeup đều đã persist bằng SQLite (Phase 7B/7C).
- Student-level makeup: dòng `"Học sinh học bù"` ở lớp nhận đọc từ `get_attendance_week` (receivingMakeupRows); helper text ô gốc đọc từ makeupDetails.
- Danh sách buổi nhận học bù do backend tính (`list_student_makeup_options`), không phụ thuộc mockData/availableClasses; lớp tạo trong DB hiển thị đúng.
- Validation trùng lịch khi tạo/sửa lớp và tạo buổi học bù cả lớp hiện chạy ở frontend dựa trên danh sách lớp đã load; Rust command/database chưa có service rule hay constraint để chặn nếu bị gọi trực tiếp.
- AttendanceTab không dùng mockData/useMockAttendance làm nguồn điểm danh; reload/restart vẫn giữ dữ liệu attendance SQLite đã persist.
- Attendance Phase 7C đã có transaction backend cho cancel/restore, class-level makeup và student-level makeup.

## 20. Database status / future candidates based on current code

Phần lõi đã implemented ở SQLite đến Phase 8 (gồm backup/restore). Phase 9A đã có nền export Excel và export danh sách học sinh; Phase 9B đã có export học phí. Các export/import Excel còn lại vẫn là candidate cho phase sau:

| Entity | Trạng thái hiện tại |
|---|---|
| `app_settings` | Implemented: lưu password hash/salt và năm học hiện tại |
| `academic_years` | Implemented Phase 3: Home có bộ chọn năm học và class thuộc năm học |
| `classes` | Implemented Phase 3 + 5.5: lưu tên lớp, khối, học phí tháng, phòng, ghi chú, năm học, `start_month`, `end_month`, `status` |
| `class_schedules` | Implemented Phase 3: Header lớp sửa ngày trong tuần, giờ bắt đầu/kết thúc; AttendanceTab sinh session theo lịch; UI hiện kiểm tra trùng giờ với lớp đã load |
| `students` | Implemented Phase 4: lưu thông tin học sinh, không hard delete trong flow hiện tại |
| `class_memberships` | Implemented Phase 4 + 5.5: quan hệ học sinh-lớp, status active/paused, `joined_month`, `left_month` exclusive thuộc membership |
| `attendance_sessions` | Implemented Phase 7B: regular sinh lười từ schedule; class_makeup liên kết buổi gốc; lưu type/status/lock và cancel/restore |
| `attendance_records` | Implemented Phase 7C cho học sinh chính thức ở regular/class_makeup: lưu `present`/`absent`/`makeup`; không có row nghĩa là empty. `makeup` theo học sinh được ghi qua `create_student_makeup_record` |
| `student_makeup_records` | Implemented Phase 7C: lưu flow học bù theo học sinh, gồm buổi/lớp gốc, lớp/session nhận học bù, thứ tự buổi trong tuần và `receiving_attendance_status` |
| `makeup_attendance_records` hoặc field liên kết | Không dùng bảng riêng trong MVP; trạng thái học sinh khách ở lớp nhận lưu trong `student_makeup_records.receiving_attendance_status` |
| `score_columns` | Implemented Phase 6: bài kiểm tra theo class/month, label sửa được, sort_order |
| `score_values` | Implemented Phase 6: điểm từng membership từng cột, NULL hoặc 0-10, unique `(column_id, membership_id)` |
| `payments` | Implemented Phase 5: học phí theo membership/month, status unpaid/paid/waived, amount snapshot, paid_at, note |
| `backup_logs` | Implemented Phase 8: log backup/restore (action, file_path, status, message, created_at), hiển thị ở BackupPage |

## 21. Suggested backend integration order

1. Phase 1 SQLite/data access setup: đã triển khai.
2. Phase 2 App settings/login: đã triển khai cho password local và current academic year.
3. Phase 3 Academic years/classes/class schedules: đã triển khai cho Home, ClassDetail header và AttendanceTab schedule props.
4. Phase 4 Students/class membership: đã triển khai cho StudentListTab, active student count.
5. P0: đã triển khai chuẩn hóa DB `classId`/roster cho Attendance/Scores/Payments.
6. Phase 5 Payments: đã triển khai SQLite.
7. Phase 5.5 Class/membership month lifecycle: đã triển khai.
8. Phase 5.6 Lifecycle UX cleanup: đã triển khai.
9. Phase 6 Scores: đã triển khai SQLite cho cột động theo tháng và điểm theo membership.
10. Phase 7A Attendance regular sessions: đã triển khai.
11. Phase 7B Attendance cancel/restore + class-level makeup: đã triển khai.
12. Phase 7C Student-level makeup: đã triển khai.
13. Phase 8 Backup/restore: đã triển khai.
14. Phase 9A Excel export foundation + Student List export: đã triển khai.
15. Phase 9B Payment export: đã triển khai.
16. Phase 9C+ Excel export/import còn lại: next planned.

## 22. Questions to confirm before backend

- Đã xác nhận: xóa học sinh không hard delete trong normal use; UI hiện tại chỉ cho xóa dòng mới chưa lưu.
- Đã xác nhận: một học sinh có thể thuộc nhiều lớp qua `class_memberships`.
- Đã xác nhận: trạng thái `"Đã nghỉ"` là trạng thái theo từng lớp, lưu ở `class_memberships`.
- Tạo học sinh inline hiện validate bắt buộc họ tên; có cần bắt buộc thêm SĐT không?
- Sửa lịch học có ảnh hưởng đến các buổi điểm danh đã qua không?
- Đã chốt/đã làm Phase 7A: `attendance_sessions` regular được sinh khi mở tuần bằng `get_attendance_week`; không sinh toàn bộ trước.
- Đã làm Phase 7B: buổi nghỉ lưu `session.status = cancelled`, đồng thời ghi `absent` cho toàn bộ học sinh chính thức hợp lệ; khôi phục giữ nguyên các record Nghỉ.
- Class-level makeup có cần bắt buộc link tới một buổi nghỉ gốc không, hay có thể là một buổi học bù độc lập?
- Đã chốt/đã làm Phase 7C: student-level makeup dùng bảng riêng `student_makeup_records`; trạng thái lớp nhận lưu trong `receiving_attendance_status`.
- Ở buổi/lớp nhận học bù, học sinh khách không tạo membership và không tạo `attendance_records`; trạng thái Có học/Nghỉ nằm trong `student_makeup_records.receiving_attendance_status`.
- Đã làm Phase 7C: khi học sinh chuyển khỏi trạng thái `"Học bù"` ở buổi gốc, backend gỡ liên kết học bù tương ứng.
- Điều kiện chọn lớp học bù có luôn là cùng năm học và cùng thứ tự buổi trong tuần không, hay thầy cần override thủ công?
- Học sinh học bù có được chọn sang lớp khác khối/lệch nội dung nếu thầy muốn không?
- Đã chốt cho backend: rule chống trùng lịch nên áp dụng trên toàn bộ lớp active trong DB vì chỉ có một giáo viên dạy. UI hiện mới kiểm tra theo danh sách lớp của năm học đang load, nên cần hardening ở Rust service.
- Buổi học bù cả lớp có được đặt cùng ngày học cố định nếu không trùng khoảng giờ không? UI hiện cho phép nếu không overlap.
- Đã chốt: MVP bỏ hẳn `"Có phép"` và `"Đi muộn"`, không lưu ẩn trong backend.
- Đã làm Phase 7A: Button `"Đánh dấu cả lớp đi học"` chỉ áp dụng cho học sinh chính thức hợp lệ theo lifecycle membership của session date.
- Đã làm Phase 7A: regular session mới mặc định khóa; UI cho mở/khóa bằng command `toggle_attendance_lock`. Cần chốt thêm rule tự khóa theo ngày nếu muốn chặt hơn.
- Học phí `"Chưa đóng"` nên hiển thị amount là 0 hay học phí dự kiến?
- Miễn giảm có bắt buộc ghi chú không?
- Học phí có cần lưu theo mức phí tại thời điểm tháng đó không nếu sau này sửa học phí lớp?
- Có cần lịch sử chỉnh sửa học phí/điểm danh/điểm không?
- Có cần xác nhận khi đổi trạng thái điểm danh từng cell không, hay click đổi ngay là đủ?
- Backup sẽ lưu vào thư mục nào, có cho người dùng chọn đường dẫn không?
- Các export Excel còn lại cần mẫu file cố định hay chỉ xuất bảng đang xem; Excel import danh sách học sinh cần chốt template cố định.
