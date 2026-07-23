# Quản lý lớp học thêm

Ứng dụng desktop Windows để quản lý lớp học thêm cho giáo viên dạy Văn. App được xây bằng Tauri + React + TypeScript, dữ liệu lưu cục bộ bằng SQLite trên máy tính của giáo viên.

## Mục tiêu

- Quản lý lớp học thêm đơn giản, dễ nhìn, phù hợp cho giáo viên sử dụng hằng ngày.
- Lưu dữ liệu trên máy tính, không phụ thuộc cloud/server trong MVP.
- Hỗ trợ sao lưu/khôi phục để tránh mất dữ liệu.
- Hỗ trợ quy trình Excel thân thiện với giáo viên.

## Tính năng chính

- Đăng nhập bằng mật khẩu cục bộ.
- Quản lý năm học, lớp học, lịch học và học phí tháng.
- Quản lý danh sách học sinh theo từng lớp.
- Điểm danh theo tuần, gồm buổi học thường, nghỉ cả lớp, học bù cả lớp và học bù theo học sinh (đơn lẻ hoặc cố định hằng tuần).
- Nhập điểm theo tháng với các cột bài kiểm tra linh hoạt.
- Theo dõi học phí theo tháng với trạng thái `Chưa đóng`, `Đã đóng`, `Miễn giảm`.
- Lịch học tổng hợp theo tháng.
- Tổng hợp học phí toàn bộ các lớp.
- Sao lưu và khôi phục file SQLite.
- Xuất Excel danh sách học sinh, học phí và bảng điểm.
- Nhập Excel danh sách học sinh và bảng điểm.

## Công nghệ sử dụng

- Tauri v2
- React + TypeScript + Vite
- Tailwind CSS v4
- shadcn/ui
- lucide-react
- ExcelJS
- Rust + rusqlite
- SQLite local database

## Cấu trúc chính

```text
src/
  app/                 App và điều hướng local
  components/          UI dùng chung và layout
  features/            Các màn hình/tính năng chính
  lib/                 Helper frontend
  types/               TypeScript types

src-tauri/
  src/                 Rust commands, services, repositories
  migrations/          SQLite migrations

docs/
  PROJECT_SPEC.md      Mô tả hiện trạng ứng dụng
  BACKEND_PLAN.md      Kế hoạch/backend schema
  ATTENDANCE_MODEL.md  Mô hình điểm danh
```

## Chạy môi trường phát triển

Cài dependencies:

```bash
pnpm install
```

Chạy app Tauri ở local:

```bash
pnpm tauri dev
```

Build frontend:

```bash
pnpm run build
```

## Build bản cài đặt Windows

```bash
pnpm tauri build
```

File cài đặt Windows được tạo trong:

```text
src-tauri/target/release/bundle/nsis/
```

## Dữ liệu local

SQLite là nguồn dữ liệu chính của app. File database nằm trong app data directory của Tauri, ví dụ trên Windows:

```text
%APPDATA%\com.hoangvu.managingextraclasses\data.sqlite
```

Mật khẩu đăng nhập được lưu bằng `password_hash` và `password_salt` trong bảng `app_settings`, không lưu plaintext.

Bản build mới không tự tạo dữ liệu mẫu. Nếu máy tính đã từng chạy bản cũ, dữ liệu cũ vẫn còn trong app data directory và app sẽ tiếp tục dùng file `data.sqlite` đó.

## Sao lưu và khôi phục

Trang `Sao lưu dữ liệu` cho phép:

- Tạo file sao lưu `.sqlite`.
- Mở thư mục sao lưu.
- Chọn file sao lưu để kiểm tra.
- Khôi phục dữ liệu sau khi xác nhận.

Khi cần hỗ trợ, có thể gửi file sao lưu cho developer để kiểm tra và sửa dữ liệu cục bộ.

## Ghi chú phát triển

- App hiện là single-user local desktop app.
- Không có cloud sync/server trong MVP.
- Không hard-delete học sinh trong luồng sử dụng thông thường.
- STT hiện trên UI được tính theo thứ tự hiển thị, không dùng database id.
- Các quy tắc UI riêng cho dự án nằm trong `src/CODEX_UI_RULES.md`.

## Chưa hoàn tất / dự kiến sau

- Import Excel học phí.
- Export/import Excel điểm danh.
- Đóng gói quy trình phát hành cuối cùng cho người dùng không kỹ thuật.
