# Quy tắc UI cho Codex

File này ghi các quy tắc cần giữ khi chỉnh giao diện app quản lý lớp học thêm.

## Kiểm tra sau khi code

- Không tự chạy `pnpm tauri dev` sau khi code xong. Người dùng sẽ tự chạy lệnh này khi cần mở app.
- Khi cần kiểm tra nhanh, ưu tiên chạy `pnpm run build` để bắt lỗi TypeScript/build.

## Layout chung

- Không để `body` hoặc `#root` tạo thanh cuộn ngoài cửa sổ Tauri.
- Vùng nội dung chính trong `AppShell` phải được cuộn dọc bằng `overflow-y-auto`.
- Không dùng `overflow-hidden` trên page nếu page có nội dung có thể dài hơn chiều cao cửa sổ.
- Luôn đặt `min-w-0` cho vùng nội dung nằm trong flex/grid để chữ, card và bảng không làm vỡ layout.

## Responsive

- Ưu tiên layout tự co bằng `auto-fit`, `minmax(...)`, `flex-wrap` thay vì ép số cột cố định.
- Khi cửa sổ hẹp, ẩn chữ phụ hoặc icon phụ bằng breakpoint Tailwind, ví dụ `hidden sm:inline`.
- Không để tiêu đề bị bóp thành từng chữ. Nếu thiếu chỗ, cho cụm điều khiển xuống hàng hoặc xếp section thành một cột.
- Card phải dùng `break-words`, `truncate`, `shrink-0`, hoặc `min-w-0` phù hợp để tránh tràn nội dung.

## Trang Home

- Bộ chọn năm học và nút tạo lớp được phép xuống hàng khi hẹp.
- Cụm điều khiển bên phải của Home phải căn phải; nút chính như `Tạo lớp mới` không được bám trái trong cột điều khiển.
- Summary card và class card dùng grid tự chia cột theo độ rộng.
- Danh sách lớp phải cuộn được khi chiều cao cửa sổ không đủ.

## Trang chi tiết lớp

- Header chi tiết lớp không được ép tiêu đề và summary card nằm cùng hàng khi vùng nội dung hẹp.
- Summary card của lớp dùng grid tự co, không đặt `min-width` lớn cố định.
- Tabs không được hiện scrollbar hoặc nút cuộn lên/xuống kiểu Windows. Tab nên là segmented control đều cột, active rõ ràng, hover không làm mất tương phản chữ.
- Bảng nhiều cột phải giữ độ rộng đọc được và cuộn ngang trong khung bảng, không ép cột nhỏ quá mức.
