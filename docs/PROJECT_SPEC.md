# PROJECT_SPEC.md

## 1. Mục đích tài liệu

Tài liệu này ghi lại trạng thái hiện tại của ứng dụng dựa trên source code đang có trong `src/`, `package.json` và các file liên quan. Nội dung bên dưới mô tả những gì đã được triển khai thật trong frontend, cách dữ liệu mẫu và local state đang hoạt động, đồng thời tách riêng phần đề xuất cho backend/SQLite sau này.

Tài liệu này không mô tả kế hoạch cũ nếu code hiện tại không còn dùng nữa.

## 2. Tổng quan dự án hiện tại

- App type: ứng dụng desktop Tauri dùng React + TypeScript.
- Người dùng chính: giáo viên dạy Văn quản lý các lớp học thêm.
- Trạng thái frontend: đã có skeleton chính, login bằng mật khẩu local, trang tổng quan, trang chi tiết lớp với 4 tab lõi, sidebar và vài trang placeholder.
- Trạng thái persistence: đã có SQLite local qua Rust commands. Phase 1-4 hiện lưu được app settings/password, academic years, classes, class schedules, students và class memberships.
- Trạng thái mock/local state: `src/data/mockData.ts` vẫn còn dùng cho một phần dữ liệu mẫu và vài placeholder. Roster học sinh trong 4 tab chi tiết lớp đã lấy từ SQLite; records của Điểm danh/Nhập điểm/Học phí vẫn mock/local.

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
- @tanstack/react-table, exceljs, react-hook-form, zod, @hookform/resolvers: có trong dependency nhưng hiện chưa thấy được dùng trong các màn hình chính đã đọc.

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
    classApi.ts
    studentApi.ts
  lib/
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
- `src/features/schedule`, `src/features/tuition-dashboard`, `src/features/backup`, `src/features/settings`: các trang sidebar dạng placeholder.
- `src/services`: wrapper gọi Tauri commands cho dữ liệu đã nối SQLite.
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

Trang đã triển khai rõ nhất: `HomePage`, `ClassDetailPage` và 4 tab trong lớp. Các trang `Lịch học`, `Tổng hợp học phí`, `Sao lưu dữ liệu`, `Cài đặt` hiện là placeholder đơn giản.

## 6. Danh sách màn hình/trang hiện có

| Màn hình/trang | File/component chính | Mục đích | Trạng thái hiện tại | Ghi chú |
|---|---|---|---|---|
| Login | `src/features/auth/LoginPage.tsx` | Tạo/đăng nhập bằng mật khẩu local | implemented | Hash/salt lưu trong `app_settings` |
| App shell | `src/components/layout/AppShell.tsx` | Layout sau login | implemented | Header + sidebar + main scroll |
| Tổng quan/Home | `src/features/home/HomePage.tsx` | Xem năm học, summary, danh sách lớp | implemented | Năm học/lớp/lịch học lấy từ SQLite |
| Chi tiết lớp | `src/features/classes/ClassDetailPage.tsx` | Header lớp và tabs | implemented | Header lớp lưu tên, lịch học, học phí tháng vào SQLite |
| Tab Danh sách học sinh | `StudentListTab.tsx` | Xem/tìm/sửa/thêm học sinh | implemented | Load/save SQLite qua `students` và `class_memberships` |
| Tab Điểm danh | `AttendanceTab.tsx` | Điểm danh theo tuần | implemented | Roster SQLite qua `useClassStudents`, record local qua `useMockAttendance` |
| Tab Nhập điểm | `ScoresTab.tsx` | Bảng điểm theo tháng | implemented | Roster SQLite qua `useClassStudents`, score local qua `useMockScores` |
| Tab Học phí | `PaymentsTab.tsx` | Theo dõi học phí theo tháng | implemented | SQLite Phase 5: bảng `payments`, khóa `(membership_id, month)` |
| Lịch học | `SchedulePage.tsx` | Placeholder lịch tổng hợp | placeholder | Có card buổi học sắp tới mock |
| Tổng hợp học phí | `TuitionDashboardPage.tsx` | Placeholder dashboard học phí toàn app | placeholder | Summary card mock tĩnh |
| Sao lưu dữ liệu | `BackupPage.tsx` | Placeholder backup/restore | placeholder | Button disabled |
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
| Sao lưu dữ liệu | `backup` | `BackupPage` | placeholder |
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
  - badge unpaid/paid theo `unpaidCount`
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
- `studentCount` lấy từ số membership `active` trong SQLite. `unpaidCount` đếm thật từ bảng `payments` cho tháng hệ thống hiện tại: membership active, đang thuộc lớp trong tháng (joined/left), chưa có payment row hoặc row đang `unpaid`; `paid`/`waived` không tính. Nếu tháng hiện tại nằm ngoài `start_month..end_month` của lớp thì `unpaidCount = 0`.

## 10. Class Detail Header hiện tại

Header chi tiết lớp hiển thị:

- Nút quay lại danh sách lớp.
- Tên lớp.
- Lịch học.
- Card học phí tháng.

Có thể chỉnh sửa:

- Tên lớp: icon bút cạnh tên; bấm vào đổi sang input, có nút lưu/hủy. Enter cũng lưu.
- Lịch học: icon lịch mở `EditClassScheduleDialog`; chọn các ngày trong tuần và giờ bắt đầu/kết thúc.
- Học phí tháng: icon bút trong card học phí; bấm vào đổi sang input, có nút lưu/hủy. Enter cũng lưu.

Schedule behavior:

- `classItem.scheduleItems` là dữ liệu chính từ bảng `class_schedules`; `classItem.schedule` là text đã format để hiển thị/fallback.
- Khi vào detail, `ClassDetailPage` gọi `get_class_detail` để lấy bản DB mới nhất.
- Khi lưu lịch, gọi command `update_class_schedule`, xóa/ghi lại các row `class_schedules` của lớp hiện tại.
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

- Nút `"Xuất Excel"` chỉ hiển thị UI, chưa có behavior.

State/data source:

- Initial data từ command `list_students_by_class` qua `src/services/studentApi.ts` (DTO gồm `joinedMonth`/`leftMonth`).
- Backend `list_students_by_class` trả roster ổn định theo `full_name`, rồi `class_memberships.id`; frontend vẫn sort lại bằng helper chung trước khi render.
- `StudentListTab` tự giữ `students`, `newStudentIds`, `searchQuery`, `isEditing`, loading/error trong lúc thao tác.
- Khi `classId` đổi, tab load lại danh sách từ SQLite.
- Khi lưu, dòng mới gọi `create_student_for_class` (kèm `joinedMonth`); dòng hiện có gọi `update_student`. Trạng thái không còn lưu qua nút "Lưu cập nhật" — dùng pause/reactivate command ngay khi đổi.
- `update_class_membership_status` backend từ chối set `paused` (bắt buộc dùng `pause_student_membership` có leftMonth).
- Status `"Đang học"`/`"Đã nghỉ"` được lưu trên `class_memberships`, không lưu global trên `students`.
- Sau khi lưu, `ClassDetailPage` refresh class detail để `studentCount` trong header/Home đồng bộ theo active memberships.
- Hook `useClassStudents(classId)` là nguồn roster chung cho StudentListTab, AttendanceTab, ScoresTab và PaymentsTab.
- `ClassDetailPage` truyền trực tiếp DB `classId` dạng số xuống cả 4 tab; không còn mapping tạm từ DB class sang mock class id.

## 12. Tab Điểm danh hiện tại

Week navigation:

- Có nút `"Tuần trước"`, nút range tuần, `"Tuần sau"`.
- Range tuần dùng `formatDateRange(weekStart, getWeekEnd(weekStart))`.
- Bấm vào range tuần mở mini calendar.
- Mini calendar hiển thị tháng hiện tại, nút tháng trước/tháng sau, các tuần từ Thứ 2 đến Chủ nhật.
- Tuần đang chọn được highlight; hover vào tuần khác highlight hàng tuần; bấm tuần nào thì chuyển sang tuần đó.

Attendance columns:

- Cột buổi học được sinh động từ `scheduleItems` nhận từ `ClassDetailPage`.
- `getRegularSessionsForWeek(weekStart, scheduleItems)` tạo session theo ngày học trong tuần.
- Buổi học bù được thêm vào `makeupSessions` và chỉ hiện nếu date nằm trong tuần đang xem.
- Các session được sort theo ngày.
- Hàng học sinh chính thức được lọc theo membership lifecycle của từng session date rồi sort bằng `sortStudentsByVietnameseName`.
- Hàng học sinh học bù nhận vào lớp, nếu có, cũng được sort bằng cùng helper dựa trên `studentName`.

Today/current day:

- Nếu session date trùng hôm nay, header hiện badge `"Hôm nay"`.
- Date hiển thị dạng `dd/MM`.

Attendance statuses:

- Type `AttendanceStatus = "present" | "absent" | "makeup"`.
- Trạng thái rỗng/undefined hiển thị `"Chưa điểm danh"`.
- UI labels:
  - empty/undefined: Chưa điểm danh
  - `present`: Có học
  - `absent`: Nghỉ
  - `makeup`: Học bù
- Mỗi ô chỉ lưu một trạng thái duy nhất; hiển thị luôn suy ra từ trạng thái đó.
- MVP hiện tại không có `"Có phép"` và không có `"Đi muộn"`.
- Không còn legend trạng thái dạng text dài; UI hiện có chú thích màu ngày: Quá khứ, Hôm nay, Tương lai.
- `"Học bù"` có 2 khái niệm khác nhau trong code:
  - Class-level makeup: một session/cột học bù cả lớp (`session.isMakeup`) và header có badge `"Học bù cả lớp"`.
  - Student-level makeup: trạng thái `makeup` của một học sinh ở buổi gốc, có record liên kết sang lớp/buổi nhận học bù.

Cell behavior (nút trạng thái, không dùng click cycle):

- Buổi bị khóa: cell chỉ hiển thị badge trạng thái, không có nút.
- Buổi nghỉ (cancelled): cell hiển thị `"Nghỉ"` thống nhất một màu đỏ (giống badge Nghỉ của từng học sinh), không có nút, không sửa được cho đến khi hủy nghỉ.
- Buổi mở khóa: cell hiển thị các nút nhỏ theo ngữ cảnh, nút đang chọn được highlight:
  - Buổi thường + học sinh chính thức: `Có học` / `Nghỉ` / `Học bù`.
  - Buổi học bù cả lớp + học sinh chính thức: `Có học` / `Nghỉ` (không có `Học bù`).
  - Dòng học sinh học bù ở lớp nhận: `Có học` / `Nghỉ` (không có `Học bù`).
- Bấm lại nút đang chọn để bỏ trạng thái, quay về `"Chưa điểm danh"`.
- Bấm `Có học`/`Nghỉ`: set ngay bằng `setAttendanceStatus`; nếu ô đang `makeup` thì xóa liên kết học bù cũ qua `removeStudentMakeupRecordForOriginal`.
- Bấm `Học bù`: không set ngay mà mở dialog `"Chọn lớp học bù"`.
- Nếu cancel dialog học bù, giữ nguyên trạng thái cũ.
- Nếu confirm dialog học bù:
  - Tạo local `StudentMakeupRecord`.
  - Cell buổi gốc được set thành `makeup`.
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
- Student-level makeup hiện đã có UI và local state, nhưng vẫn là mock/in-memory, chưa persist database.

Receiving makeup students:

- Khi xem lớp/buổi nhận học bù, nếu có `StudentMakeupRecord` trỏ về class/session hiện tại, table hiện thêm section `"Học sinh học bù"`.
- Dòng học sinh học bù không thêm vào danh sách học sinh chính thức của lớp nhận.
- Dòng học sinh học bù chỉ có nút `Có học` / `Nghỉ`; trạng thái có thể là empty/present/absent.
- Không cho dòng học sinh học bù chọn `"Học bù"` tiếp.
- Các cell không phải session nhận học bù hiển thị `"-"`.
- Trường hợp đặc biệt: nếu học sinh nghỉ buổi học bù cả lớp và qua lớp khác học, giáo viên đánh dấu `"Nghỉ"` ở buổi bù cả lớp rồi quay lại buổi gốc đánh dấu `"Học bù"`; record học bù liên kết với buổi gốc, không liên kết buổi bù cả lớp.

Lock/unlock behavior:

- `unlockedSessionIds` giữ danh sách session đang mở khóa.
- Mặc định session bị khóa vì id chưa nằm trong `unlockedSessionIds`.
- Nút `"Mở khóa"` thêm id vào `unlockedSessionIds`.
- Nút `"Khóa"` xóa id khỏi `unlockedSessionIds`.
- Khi session bị khóa, cell chỉ hiển thị badge trạng thái, không hiển thị nút điểm danh.
- Buổi học bù cả lớp mới tạo được mở khóa sẵn.

Cancel session behavior:

- Header session có icon `CalendarX`.
- Bấm icon mở dialog xác nhận.
- Nếu chưa nghỉ: dialog hỏi xác nhận lớp nghỉ; confirm ghi trạng thái `absent`/Nghỉ cho toàn bộ học sinh chính thức và các dòng học bù của buổi đó (như tick Nghỉ từng người), gỡ liên kết học bù của học sinh đang `makeup`, rồi gọi `cancelSession(sessionId)`.
- `cancelSession` thêm session vào `cancelledSessionIds` và xóa khỏi `unlockedSessionIds`.
- Khi session nghỉ, tất cả cell hiển thị badge `"Nghỉ"` màu đỏ; trạng thái Nghỉ đã được ghi vào từng học sinh nên mở khóa vẫn giữ Nghỉ.
- Bấm icon lần nữa khi đã nghỉ mở dialog hủy trạng thái nghỉ; confirm gọi `restoreCancelledSession(sessionId)`, xóa khỏi cancelled và mở khóa session; trạng thái Nghỉ từng học sinh giữ nguyên để thầy chỉnh lại.

Makeup session:

- Nút `"Thêm buổi học bù"` mở `AddMakeupSessionDialog`.
- Fields: ngày học bù, giờ bắt đầu, giờ kết thúc, bù cho buổi nào (bắt buộc chọn). Trong dialog, ngày học bù nằm riêng một dòng; giờ bắt đầu và giờ kết thúc nằm ngang hàng để dễ so sánh.
- Khi đã chọn ngày, UI hiển thị hint gọn về tình trạng khung giờ: đang trống, trùng lớp nào, hoặc giờ kết thúc chưa hợp lệ.
- Validation khi lưu:
  - Phải chọn buổi gốc cần bù.
  - Giờ kết thúc phải sau giờ bắt đầu.
  - Ngày học bù phải sau ngày hôm nay; lỗi: `"Ngày học bù phải sau ngày hôm nay."` Input date có `min` là ngày mai.
  - Không được trùng khoảng giờ với lịch cố định của các lớp đang có trong danh sách đã load, kể cả khác khối.
  - Không cho trùng khoảng giờ với buổi học bù cả lớp đã có của chính lớp đó trong mock state.
- Khi lưu hợp lệ:
  - Thêm một `WeeklySession` local với `classId`, `startTime`, `endTime`, `isMakeup: true`, `makeupForSessionId` trỏ về buổi gốc.
  - Buổi gốc tự động chuyển sang trạng thái nghỉ (cancelled) và bị khóa.
  - Buổi học bù mới được mở khóa sẵn để điểm danh.
- Nếu ngày học bù nằm trong tuần đang xem thì session hiện thành cột mới.
- Header có badge `"Học bù cả lớp"` nếu `session.isMakeup`.
- Header buổi học bù có nút `"Hủy buổi bù"` với dialog xác nhận; khi xác nhận: xóa buổi bù, khôi phục buổi gốc về buổi học bình thường, xóa dữ liệu điểm danh của buổi bù.
- `ClassDetailPage` nhận danh sách buổi học bù cả lớp sắp tới từ `AttendanceTab` và hiển thị thêm dòng `"Học bù cả lớp: ..."` trong khung thông tin lớp cho đến khi qua giờ kết thúc buổi bù. Đây vẫn là state mock/local, không persist sau reload/restart.
- Đây là class-level makeup, tức khái niệm session-level, khác với trạng thái student-level `makeup`.

Quick action:

- Nút `"Đánh dấu cả lớp đi học"` nằm cạnh `"Thêm buổi học bù"`.
- Chỉ enabled nếu tuần đang xem có session trùng hôm nay và session đó không bị nghỉ.
- Khi bấm, gọi `markSessionForStudents` để set học sinh chính thức thành `"present"` cho session hôm nay, kèm cả các dòng học sinh học bù đang nhận ở buổi hôm nay.
- Áp dụng cả khi buổi hôm nay là buổi học bù cả lớp.
- Không áp dụng cho session đã nghỉ.

Export:

- Nút `"Xuất Excel"` chỉ hiển thị UI, chưa có behavior.

State/data source:

- Students lấy từ `useClassStudents(classId)` qua SQLite; roster chính thức được lọc theo `joinedMonth`/`leftMonth` của từng session rồi sort trước khi render.
- Attendance state nằm trong `useMockAttendance`: `attendance`, `cancelledSessionIds`, `unlockedSessionIds`, `makeupSessions`, `studentMakeupRecords`.
- Hook hiện dùng module-level mock stores để giữ dữ liệu qua unmount/remount trong cùng renderer session.
- Không dùng `attendanceSessions` và `attendanceRecords` trong `mockData.ts` cho UI AttendanceTab hiện tại.

Hạn chế:

- Không có lưu database.
- Không có note theo buổi hoặc theo record trong UI hiện tại.
- Student-level makeup, class-level makeup, lock/unlock và trạng thái nghỉ đều chỉ là mock/local.
- Dữ liệu module-level có thể giữ khi chuyển tab/class trong cùng phiên renderer, nhưng không phải persistence thật sau reload/restart.

## 13. Tab Nhập điểm hiện tại

Month selector:

- Có select tháng từ `scoreMonths`: `2026-05`, `2026-06`, `2026-07`, `2026-08`.
- Default selected month là `scoreMonths[2]` tức `2026-07`.
- Đổi tháng reset edit mode, reset draft từ saved state.

Score table:

- Columns:
  - STT
  - Họ tên
  - dynamic score columns của tháng đang chọn
- Không còn cột ghi chú trong UI ScoresTab hiện tại.

Dynamic columns:

- `useMockScores` tạo monthly sheets riêng theo tháng dựa trên roster SQLite truyền vào.
- ScoresTab vẫn mock/local, nhưng danh sách tháng hiện lấy theo `class.startMonth..class.endMonth` và có nút tháng trước/tháng sau quanh select tháng.
- Score state dùng `membershipId` dạng string làm key local cho từng học sinh trong lớp.
- Lớp chưa có cột điểm sẽ hiện empty state an toàn.

Add test behavior:

- Nút `"Thêm bài kiểm tra"` gọi `addColumn`.
- Không mở dialog.
- Tạo cột mới id `score-column-${Date.now()}`, label `"Bài kiểm tra mới"`.
- Tự chuyển sang edit mode.
- Tạo ô điểm rỗng cho tất cả học sinh.

View/edit mode:

- View mode: cell điểm là text, empty hiển thị `"-"`.
- Buttons view mode: `"Thêm bài kiểm tra"`, `"Cập nhật"`, `"Xuất bảng điểm"`.
- Edit mode: header cột có input sửa tên bài kiểm tra và nút xóa cột; score cells là input.
- Buttons edit mode: `"Lưu thay đổi"`, `"Hủy"`.

Delete score column:

- Trong edit mode, nút thùng rác ở header cột mở dialog.
- Text xác nhận: `"Bạn có chắc muốn xóa cột điểm này? Toàn bộ điểm trong cột sẽ bị xóa."`
- Confirm xóa cột khỏi draft sheet.

Save/cancel:

- `"Lưu thay đổi"` validate sheet hiện tại.
- Nếu hợp lệ, normalize và lưu vào `savedSheets`, cập nhật `draftSheets`, thoát edit mode.
- `"Hủy"` discard draft và quay lại saved state.

Score validation:

- Input chỉ nhận giá trị phù hợp regex trong `canUseScoreInput`.
- Cho phép trống.
- Điểm hợp lệ khi save: số từ 0 đến 10.
- Cho phép thập phân, normalize dấu phẩy thành dấu chấm khi lưu.
- Nếu invalid, hiển thị lỗi: `"Điểm phải là số từ 0 đến 10. Có thể để trống nếu chưa có điểm."`

Export:

- Nút `"Xuất bảng điểm"` chỉ hiển thị UI, chưa có behavior.

State/data source:

- Students lấy từ `useClassStudents(classId)` qua SQLite.
- Bảng điểm render học sinh đã sort bằng `sortStudentsByVietnameseName`; STT vẫn là `index + 1` sau sort.
- Score sheet hiện tại không dùng `scoreColumns` và `scoreRecords` trong `mockData.ts`; nó dùng `createInitialScoreSheets` trong `features/classes/utils/scores.ts`.
- State nằm trong `useMockScores`, mất khi reload/restart; đổi class reset theo DB `classId` và roster hiện tại.

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

- Backend trả về dòng cho MỌI membership active của lớp trong tháng; nếu chưa có payment row thì trả dòng ảo `unpaid`, `amount = 0`, `paymentId = null`.
- Không tự insert row unpaid khi chỉ xem tháng; row chỉ được tạo khi có thao tác (lazy upsert).

Note behavior:

- Cột ghi chú là input inline, lưu khi blur hoặc Enter (chỉ ghi DB khi giá trị thay đổi).
- Sửa note khi chưa có payment row sẽ tạo row `unpaid` kèm note (`update_payment_note`).

Export:

- Nút `"Xuất Excel"` chỉ hiển thị UI, chưa có behavior.

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

- File: `src/features/backup/BackupPage.tsx`.
- UI: title `"Sao lưu dữ liệu"`, description về sao lưu định kỳ.
- Buttons disabled: `"Sao lưu dữ liệu"`, `"Khôi phục dữ liệu"`, `"Mở thư mục dữ liệu"`.
- Không có behavior.
- Trạng thái: placeholder.

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
- Quan hệ: class thuộc academic year qua `academicYearId` số; class có nhiều `class_schedules`; student dùng `class_memberships`; payment/score/attendance records vẫn mock/local nhưng roster trong tab dùng DB `classId` số.

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
- UI AttendanceTab hiện tại không dùng trực tiếp các array này; nó sinh session từ schedule và giữ record trong `useMockAttendance`.
- `useMockAttendance` dùng key `${sessionId}:${studentKey}` để lưu trạng thái; AttendanceTab truyền `membershipId` dạng string làm `studentKey` cho học sinh chính thức.
- Helper type trong `features/classes/utils/attendance.ts`:
  - `WeeklySession`: session sinh từ lịch học hoặc session học bù cả lớp (`classId?`, `date`, `startTime`, `endTime`, `isMakeup`, `makeupForSessionId`).
  - `MakeupSessionInput`: input tạo học bù cả lớp gồm `classId`, `date`, `startTime`, `endTime`, `makeupForSessionId`.
  - `StudentMakeupRecord`: liên kết học sinh từ buổi gốc sang class/session nhận học bù.
  - `StudentMakeupSessionOption`: option hiển thị trong dialog chọn lớp học bù.
- `useMockAttendance` giữ thêm module-level mock stores:
  - `mockAttendanceState`
  - `mockCancelledSessionIds`
  - `mockUnlockedSessionIds`
  - `mockMakeupSessions`
  - `mockStudentMakeupRecords`

### Score data

- Types trong `src/types/score.ts`:
  - `ScoreType = "essay" | "short" | "oral" | "midterm" | "final" | "mock_exam" | "other"`.
  - `ScoreColumn = { id, classId, label, type?, testDate?, weight?, note? }`.
  - `ScoreRecord = { id, columnId, studentId, value, note? }`.
- `mockData.ts` vẫn có `scoreColumns` và `scoreRecords` kiểu cũ.
- ScoresTab hiện tại không dùng `ScoreType`, không dùng hệ số, không dùng formal score types.
- ScoresTab dùng `MonthlyScoreSheet` local trong `features/classes/utils/scores.ts`:
  - `MonthlyScoreColumn = { id, label }`
  - `MonthlyScoreSheet = { columns, valuesByStudentId }`
  - `MonthlyScoreSheets = Record<string, MonthlyScoreSheet>`
- Months: `2026-05`, `2026-06`, `2026-07`, `2026-08`.

### Payment data

- SQLite Phase 5: bảng `payments` (migration `005_payments`), khóa duy nhất `(membership_id, month)`.
- Fields DB: `id`, `membership_id`, `class_id`, `student_id`, `month` (YYYY-MM), `status`, `amount`, `paid_at`, `note`, timestamps.
- Status type: `"paid" | "unpaid" | "waived"` (CHECK constraint trong DB).
- Rules: unpaid lưu `amount = 0`, `paid_at = NULL`; paid lưu snapshot học phí tháng + ngày đóng; waived lưu số thực thu và BẮT BUỘC note; amount không âm và waived <= học phí lớp.
- Type frontend: `PaymentRow` trong `src/types/payment.ts` (DTO trả về từ `list_payments_by_class_month`, gồm cả thông tin roster).
- Type `Payment` cũ (string id) vẫn còn cho `mockData.ts`, không dùng trong PaymentsTab nữa.
- Frontend API: `src/services/paymentApi.ts`.
- Quan hệ: payment gắn với `class_memberships` qua `membership_id`; membership phải active mới thao tác được học phí.

### Settings/other data

- SQLite `app_settings` hiện lưu password hash/salt và `current_academic_year_id`.
- Settings page chỉ render card tĩnh trong component.
- Backup page chỉ render action tĩnh disabled.

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
- AttendanceTab/useMockAttendance:
  - `weekStart`, `weekPickerOpen`, `visibleCalendarMonth`, `pendingCancelSession`, `pendingStudentMakeup`, `selectedStudentMakeupSessionId` ở tab.
  - `attendance`, `cancelledSessionIds`, `unlockedSessionIds`, `makeupSessions`, `studentMakeupRecords` ở hook/module-level mock store.
- ScoresTab/useMockScores:
  - `selectedMonth`, `savedSheets`, `draftSheets`, `isEditing`, `errorMessage`.
- PaymentsTab:
  - `selectedMonth`, `filter`, `searchQuery`, `pendingPaidRow`, `pendingWaivedRow`, `rows` (load từ DB), `noteDrafts`, loading/saving/error.
- State của năm học/lớp/lịch học/học sinh-membership được load lại từ SQLite sau restart.
- Học phí đã persist qua SQLite (Phase 5). State của điểm danh và điểm trong các tab vẫn là local/mock và reset khi reload/restart.
- Một số state reset khi đổi class hoặc đổi month.

## 18. UI action inventory

| UI action | Where it appears | Current implemented behavior | Current data affected | Persistence | Future DB note |
|---|---|---|---|---|---|
| Login | LoginPage | Tạo/verify mật khẩu qua command settings | `screen`, `app_settings` | SQLite | Không persist session sau restart |
| Logout | Header | Quay về login, reset selected class | `screen`, `selectedClassId` | local only | Có thể clear session/app lock |
| Select sidebar item | Sidebar | Đổi screen local | `screen`, `selectedClassId` | local only | Không cần DB trực tiếp |
| Select academic year | HomePage | Đổi năm đang xem, lưu current year, load lớp theo năm | `selectedYearId`, `classOverviews`, `app_settings.current_academic_year_id` | SQLite | `studentCount` lấy từ memberships; payments chưa ảnh hưởng summary |
| Create class | CreateClassDialog | Validate bắt buộc lịch, giờ hợp lệ, không trùng giờ với lớp đã load; gọi `create_class`, insert class (gồm grade) + schedules | `classes`, `class_schedules`, `classOverviews` | SQLite | Khối chọn từ select 8/9, không còn field ghi chú; backend chưa enforce trùng lịch |
| Select grade tab | HomePage | Lọc class cards và summary theo Khối 8/Khối 9 | UI only | none | Grade đọc từ `classes.grade` |
| Open class card | ClassCard/HomePage | Mở ClassDetailPage | `selectedClassId`, `screen` | local only | Điều hướng theo class id |
| Back to home | ClassDetailPage | Về Home | `selectedClassId`, `screen` | local only | Không cần DB |
| Edit class name | ClassDetail header | Sửa tên bằng input, gọi `update_class_name` | `classes.name`, `classOverviews.name` | SQLite | Home và detail đồng bộ từ response |
| Edit class schedule | EditClassScheduleDialog | Chọn ngày/giờ, validate không trùng giờ với lớp khác đã load, gọi `update_class_schedule`, AttendanceTab nhận schedule mới | `class_schedules`, `classOverviews.scheduleItems` | SQLite | Attendance records chưa nối DB; backend chưa enforce trùng lịch |
| Edit monthly fee | ClassDetail header | Sửa fee bằng input, gọi `update_class_monthly_fee` | `classes.monthly_fee`, `classOverviews.monthlyFee` | SQLite | Payment records chưa nối DB |
| Search student | StudentListTab | Lọc table local trên dữ liệu đã load từ DB | UI only | none | Query/filter backend khi data lớn |
| Add student | StudentListTab | Thêm dòng mới inline, lưu tạo `students` + `class_memberships` | `students`, `class_memberships` | SQLite khi bấm Lưu cập nhật | Có thể thêm validate nâng cao sau |
| Remove new student row | StudentListTab | Xóa dòng mới chưa lưu bằng icon thùng rác | local `students`, `newStudentIds` | local only | Nếu đã persist cần delete draft hoặc rollback |
| Edit student | StudentListTab | Sửa fields và status trong edit mode, bấm lưu gọi DB | `students`, `class_memberships.status` | SQLite | Update student/class membership/status |
| Export student Excel | StudentListTab | Chưa có behavior | none | none | Dùng Excel export sau |
| Navigate week | AttendanceTab | Tuần trước/sau hoặc chọn tuần trong mini calendar | `weekStart` | local only | Có thể query session theo week |
| Add class-level makeup session | AttendanceTab/AddMakeupSessionDialog | Validate ngày, giờ bắt đầu/kết thúc, buổi gốc, không trùng giờ với lớp đã load; thêm session `"Học bù cả lớp"`, buổi gốc chuyển nghỉ | `makeupSessions`, `cancelledSessionIds`, `unlockedSessionIds` | local only | Insert `attendance_sessions` type makeup, link tới buổi gốc, backend cần enforce trùng giờ |
| Remove class-level makeup session | AttendanceTab | Nút `"Hủy buổi bù"` với xác nhận; xóa buổi bù, khôi phục buổi gốc | `makeupSessions`, `cancelledSessionIds`, `unlockedSessionIds`, `attendance` | local only | Delete/cancel makeup session, restore original |
| Mark today present | AttendanceTab | Nếu có session hôm nay chưa nghỉ, set học sinh chính thức thành present | `attendance` | local only | Batch update attendance_records |
| Cancel/restored session | AttendanceTab | Dialog xác nhận nghỉ/hủy nghỉ, lock/unlock tương ứng | `cancelledSessionIds`, `unlockedSessionIds` | local only | Session status cancelled/restored |
| Lock/unlock session | AttendanceTab | Toggle khả năng sửa cell | `unlockedSessionIds` | local only | Cần field locked hoặc rule theo date |
| Set official attendance status | AttendanceTab | Nút Có học/Nghỉ/Học bù theo ngữ cảnh; Học bù mở dialog chọn lớp; bấm lại nút đang chọn để bỏ trạng thái | `attendance`, `pendingStudentMakeup` | local only | Upsert attendance_record, có thể cần transaction khi chọn makeup |
| Confirm student-level makeup | AttendanceTab dialog | Tạo liên kết học bù và set buổi gốc thành makeup | `attendance`, `studentMakeupRecords` | local only | Có thể cần bảng `student_makeup_records` hoặc link trong attendance record |
| Remove student-level makeup by cycling off | AttendanceTab | Khi cell đang makeup chuyển sang status khác, xóa liên kết học bù cũ | `attendance`, `studentMakeupRecords` | local only | Cần delete/update record liên kết và xử lý attendance ở lớp nhận |
| Set receiving makeup student status | AttendanceTab receiving class | Dòng học sinh học bù chỉ có nút Có học/Nghỉ | `attendance` | local only | Lưu attendance cho học sinh khách nhưng không thêm vào roster chính thức |
| Export attendance Excel | AttendanceTab | Chưa có behavior | none | none | Export sheet theo week/class |
| Change score month | ScoresTab | Chuyển sheet tháng, thoát edit | `selectedMonth`, draft | local only | Query score columns/values by month |
| Add score column/test | ScoresTab | Thêm cột mới, vào edit mode | `draftSheets` | local only | Insert score column |
| Edit score column label | ScoresTab | Input header trong edit mode | `draftSheets.columns` | local only | Update score column |
| Delete score column | ScoresTab | Dialog confirm, xóa cột khỏi draft | `draftSheets` | local only | Delete/archive column and values |
| Edit score value | ScoresTab | Input điểm trong edit mode | `draftSheets.valuesByStudentId` | local only | Upsert score_values |
| Save scores | ScoresTab | Validate, normalize, save draft vào saved | `savedSheets`, `draftSheets` | local only | Transaction update columns/values |
| Cancel score edit | ScoresTab | Discard draft | `draftSheets` | local only | Rollback client draft |
| Export score Excel | ScoresTab | Chưa có behavior | none | none | Export score sheet |
| Change payment month | PaymentsTab | Chuyển month state | `selectedMonth` | local only | Query payment_records by month |
| Search payment student | PaymentsTab | Lọc tên học sinh local | UI only | none | Search/filter khi data lớn |
| Filter payment status | PaymentsTab | Lọc rows local | UI only | none | Query/filter |
| Change status to paid | PaymentsTab | Mở confirm, confirm gọi `set_payment_paid` (snapshot fee + paid_at) | `payments` | SQLite | Refresh list sau khi lưu |
| Change status to unpaid | PaymentsTab | Gọi `set_payment_unpaid` (amount 0, paid_at NULL, giữ note) | `payments` | SQLite | Refresh list sau khi lưu |
| Change status to waived | PaymentsTab | Mở waiver dialog (note bắt buộc), gọi `set_payment_waived` | `payments` | SQLite | Validate amount 0..fee ở UI và service |
| Edit payment note | PaymentsTab | Input inline, lưu khi blur/Enter qua `update_payment_note` | `payments` | SQLite | Tạo row unpaid kèm note nếu chưa có row |
| Export payment Excel | PaymentsTab | Chưa có behavior | none | none | Export payment sheet |
| Backup buttons | BackupPage | Disabled | none | none | Implement backup/restore later |
| Settings cards | SettingsPage | Static only | none | none | Implement settings later |

## 19. Current limitations / chưa có

- SQLite/database đã có cho settings/password, academic years, classes, class schedules, students và class memberships; các domain còn lại chưa nối DB.
- Điểm danh và điểm vẫn là mock/local; reload/restart mất các thay đổi trong hai tab đó. Học phí đã lưu SQLite.
- AttendanceTab, ScoresTab và PaymentsTab đã dùng roster SQLite qua `useClassStudents`. AttendanceTab vẫn lưu record mock/local nhưng lọc roster chính thức theo từng session date bằng `joinedMonth <= sessionMonth` và `(leftMonth is null OR sessionMonth < leftMonth)`; Scores records vẫn mock/local; Payments records đã persist SQLite.
- Chưa có app lock/session persist sau restart dù password hash đã lưu trong DB.
- Chưa có React Router.
- Chưa có Excel export thật dù nhiều nút export đã hiện.
- Chưa có backup/restore thật.
- Trang Lịch học global chỉ là placeholder.
- Trang Tổng hợp học phí global chỉ là placeholder.
- Trang Cài đặt chỉ là placeholder.
- StudentListTab đã đồng bộ `studentCount` active membership với Home/ClassDetail sau khi lưu; các tab điểm danh/điểm/học phí hiện đọc cùng DB roster nhưng chưa lưu records.
- Chưa có phân quyền hoặc nhiều người dùng.
- Chưa có xử lý hard delete/archive học sinh hiện có.
- Chưa có lưu lịch sử học phí theo tháng.
- Attendance MVP không có `"Có phép"` và không có `"Đi muộn"`; nếu muốn dùng lại cần xác nhận model mới.
- Class-level makeup và student-level makeup đã được tách trong UI/code, nhưng vẫn chỉ là mock/local.
- Student-level makeup hiện đã có flow chọn lớp/buổi nhận học bù và hiển thị dòng `"Học sinh học bù"` ở lớp nhận, nhưng chưa có persistence thật.
- Danh sách lớp/buổi đủ điều kiện học bù theo học sinh hiện lấy từ `availableClasses` đã load từ SQLite, lọc cùng năm học/cùng khối/cùng thứ tự buổi và loại chính lớp hiện tại. Tuy nhiên record học bù tạo ra vẫn chỉ nằm ở mock/local state.
- Validation trùng lịch khi tạo/sửa lớp và tạo buổi học bù cả lớp hiện chạy ở frontend dựa trên danh sách lớp đã load; Rust command/database chưa có service rule hay constraint để chặn nếu bị gọi trực tiếp.
- Dữ liệu attendance module-level có thể giữ qua unmount/remount trong cùng phiên renderer, nhưng reload/restart app vẫn mất.
- Chưa có transaction/service backend cho payments, scores, attendance.

## 20. Database status / future candidates based on current code

Một phần đã implemented ở SQLite Phase 1-4, các phần còn lại vẫn là candidate cho phase sau:

| Entity | Trạng thái hiện tại |
|---|---|
| `app_settings` | Implemented: lưu password hash/salt và năm học hiện tại |
| `academic_years` | Implemented Phase 3: Home có bộ chọn năm học và class thuộc năm học |
| `classes` | Implemented Phase 3: lưu tên lớp, học phí tháng, phòng, ghi chú, năm học |
| `class_schedules` | Implemented Phase 3: Header lớp sửa ngày trong tuần, giờ bắt đầu/kết thúc; AttendanceTab sinh session theo lịch; UI hiện kiểm tra trùng giờ với lớp đã load |
| `students` | Implemented Phase 4: lưu thông tin học sinh, không hard delete trong flow hiện tại |
| `class_memberships` | Implemented Phase 4: quan hệ học sinh-lớp, status active/paused thuộc membership |
| `attendance_sessions` | Lưu buổi học thực tế, buổi nghỉ, buổi học bù cả lớp, ngày học, giờ bắt đầu/kết thúc, lock/cancel state, link optional tới buổi gốc |
| `attendance_records` | Lưu trạng thái điểm danh từng học sinh từng session: empty/none, `present`, `absent`, `makeup` |
| `student_makeup_records` | Lưu flow học bù theo học sinh: buổi/lớp gốc, lớp/session nhận học bù, thứ tự buổi trong tuần; hoặc gộp vào attendance schema nếu thiết kế khác |
| `makeup_attendance_records` hoặc field liên kết | Nếu học sinh học bù ở lớp nhận cần lưu trạng thái có học/nghỉ riêng mà không thêm vào roster chính thức |
| `score_columns` | Lưu các bài kiểm tra theo class/month, tên cột có thể sửa |
| `score_values` | Lưu điểm từng học sinh từng cột |
| `payments` | Implemented Phase 5: học phí theo membership/month, status unpaid/paid/waived, amount snapshot, paid_at, note |
| `backup_logs` hoặc metadata backup | Nếu muốn hiển thị lịch sử sao lưu sau này |

## 21. Suggested backend integration order

1. SQLite/data access setup: đã triển khai Phase 1.
2. App settings/login: đã triển khai Phase 2 cho password local và current academic year.
3. Academic years/classes/class schedules: đã triển khai Phase 3 cho Home, ClassDetail header và AttendanceTab schedule props.
4. Students/class membership: đã triển khai Phase 4 cho StudentListTab, active student count, và P0 dùng chung DB roster cho Attendance/Scores/Payments.
5. Payments: cấu trúc theo tháng rõ, ít phụ thuộc lịch học, có flow confirm/waiver cụ thể.
6. Scores: cần lưu cột động theo tháng và điểm theo học sinh.
7. Attendance: phức tạp hơn vì liên quan lịch học, session phát sinh, lock/cancel/makeup.
8. Backup/restore: nên làm sau khi schema ổn định.
9. Excel export: làm sau khi nguồn dữ liệu thật ổn định để export đúng data.

## 22. Questions to confirm before backend

- Đã xác nhận: xóa học sinh không hard delete trong normal use; UI hiện tại chỉ cho xóa dòng mới chưa lưu.
- Đã xác nhận: một học sinh có thể thuộc nhiều lớp qua `class_memberships`.
- Đã xác nhận: trạng thái `"Đã nghỉ"` là trạng thái theo từng lớp, lưu ở `class_memberships`.
- Tạo học sinh inline hiện validate bắt buộc họ tên; có cần bắt buộc thêm SĐT không?
- Sửa lịch học có ảnh hưởng đến các buổi điểm danh đã qua không?
- Có cần sinh sẵn `attendance_sessions` theo lịch hay chỉ sinh khi mở tuần/điểm danh?
- Buổi nghỉ nên lưu như một trạng thái của session hay tạo attendance record `"Nghỉ"` cho từng học sinh?
- Đã chốt: hủy buổi (cancel) ghi Nghỉ cho toàn bộ học sinh của buổi đó; khi mở khóa/khôi phục, trạng thái Nghỉ từng học sinh giữ nguyên.
- Class-level makeup có cần bắt buộc link tới một buổi nghỉ gốc không, hay có thể là một buổi học bù độc lập?
- Đã chốt trong plan: student-level makeup dùng bảng riêng `student_makeup_records`; cần chốt thêm trạng thái lớp nhận sẽ lưu trong bảng này hay qua attendance record guest.
- Ở buổi/lớp nhận học bù, trạng thái có học/nghỉ của học sinh khách nên lưu chung trong `attendance_records` hay bảng riêng?
- Khi học sinh chuyển khỏi trạng thái `"Học bù"` ở buổi gốc, backend có xóa record ở lớp nhận học bù không?
- Điều kiện chọn lớp học bù có luôn là cùng năm học và cùng thứ tự buổi trong tuần không, hay thầy cần override thủ công?
- Học sinh học bù có được chọn sang lớp khác khối/lệch nội dung nếu thầy muốn không?
- Đã chốt cho backend: rule chống trùng lịch nên áp dụng trên toàn bộ lớp active trong DB vì chỉ có một giáo viên dạy. UI hiện mới kiểm tra theo danh sách lớp của năm học đang load, nên cần hardening ở Rust service.
- Buổi học bù cả lớp có được đặt cùng ngày học cố định nếu không trùng khoảng giờ không? UI hiện cho phép nếu không overlap.
- Đã chốt: MVP bỏ hẳn `"Có phép"` và `"Đi muộn"`, không lưu ẩn trong backend.
- Button `"Đánh dấu cả lớp đi học"` có áp dụng cho học sinh `"Đã nghỉ"` không?
- Buổi đã qua có tự khóa không, và ai được mở khóa?
- Học phí `"Chưa đóng"` nên hiển thị amount là 0 hay học phí dự kiến?
- Miễn giảm có bắt buộc ghi chú không?
- Học phí có cần lưu theo mức phí tại thời điểm tháng đó không nếu sau này sửa học phí lớp?
- Có cần lịch sử chỉnh sửa học phí/điểm danh/điểm không?
- Có cần xác nhận khi đổi trạng thái điểm danh từng cell không, hay click đổi ngay là đủ?
- Backup sẽ lưu vào thư mục nào, có cho người dùng chọn đường dẫn không?
- Excel export cần mẫu file cố định hay chỉ xuất bảng đang xem?
