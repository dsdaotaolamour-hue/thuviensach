# HƯỚNG DẪN TÍCH HỢP GIAO DIỆN & HỆ THỐNG THƯ VIỆN SÁCH SPA LAMOUR

> Tài liệu bàn giao giao diện gốc. Backend/Supabase đã được tích hợp trong phiên bản hiện tại; hướng dẫn cài đặt và trạng thái chức năng mới nằm tại [README.md](README.md). Các đoạn mô tả đăng nhập tức thì/local demo bên dưới là lịch sử thiết kế, không phải cách vận hành hiện tại.
**Đơn vị thiết kế & lập trình Frontend + Nghiệp vụ:** Antigravity  
**Đối tác tích hợp Auth/Backend tiếp theo:** Codex (ChatGPT)

---

## 1. Cấu trúc File trong `Antigravity Work Space` & `Source Code (Final)`
- `index.html`: Chứa toàn bộ cấu trúc giao diện đa trang (SPA Router):
  - **Trang 01 (`#/` - `page-home`)**: Landing Page **Thư Viện Sách Ngành Spa Lamour** (Hero, 3 Card Chính sách, Bộ lọc tra cứu kho sách, Grid Card Sách tỉ lệ 3:4, Modal Popup sao chép tin nhắn mẫu & mở Zalo OA).
  - **Trang 02 (`#/isov-standard` - `page-isov`)**: Landing Page **Dự Án ISOV Korea Standard Spa** (Hero, 4 Trụ cột, Interactive Tabs 3 hạng Standard / Gold / Diamond, Thư viện ảnh phân theo năm 2024 / 2025 / 2026 kèm link Google Drive, CTA Zalo OA).
  - **Trang 03 (`#/lamour-data` - `page-data`)**: Landing Page **Kho Dữ Liệu Online Lamour** (Hero QR Drive tổng, Bento Grid 4 thư mục cốt lõi, Hướng dẫn 2 bước Add shortcut to Drive, Kênh Zalo yêu cầu tài liệu).
  - **Trang 04 (`#/login` - `page-login`)**: Giao diện **Đăng Nhập Quản Trị** (Hiện tại bấm nút `Đăng Nhập Hệ Thống` sẽ gọi hàm `handleInstantLogin(event)` để vào thẳng trang Admin không cần xác thực, chờ Codex gắn Auth thực tế).
  - **Trang 05 (`#/admin` - `page-admin`)**: **Hệ Thống Quản Trị Thư Viện Bên Trong** gồm 7 phân hệ chuẩn `Book1_hoanchinh.xlsx` & `Quy trình Mượn – Trả – Thu hồi`:
    1. **Tổng Quan (`dashboard`)**: KPI Đầu sách/Bản sao, Độc giả, Phiếu đang mượn/Quá hạn, Số dư 3 Ví (Momo, Ngân hàng, Tiền mặt), Cảnh báo nhắc hạn trước 01 tháng & 10 Nguyên tắc nhân viên.
    2. **Đầu Sách & Bản Sao (`books`)**: Quản lý bảng `ĐẦU SÁCH` (`DSxxx`) và `SÁCH` (`DSxxx-001`), tự động đếm số lượng Có sẵn / Đang mượn / Đang sửa, bật/tắt hiển thị Web.
    3. **Phiếu Mượn – Trả & Thu Hồi (`loans`)**: Lập phiếu mượn tự tính hạn trả (Khách Lamour 12 tháng / 0đ cọc; Khách vãng lai 03 tháng / 500.000đ cọc), Modal đối soát trả sách tự tính phí trễ (`5.000đ/ngày/cuốn`), bồi thường sách mất/hỏng (đang phát hành +20.000đ phí KT, ngừng phát hành đền 3 lần giá bìa, không giá gốc 1.000đ/trang TV hoặc 10.000đ/trang NN) và khấu trừ/hoàn cọc.
    4. **Hồ Sơ Độc Giả (`readers`)**: Quản lý độc giả với Số điện thoại là định danh chính.
    5. **Tiền Cọc, Ví & Sổ Hoạt Động (`wallets`)**: Quản lý 3 ví thanh toán và lịch sử biến động quỹ cọc.
    6. **Mẫu Phiếu In A4 (`print`)**: Xem trước và in / xuất PDF Phiếu Mượn & Phiếu Trả chuẩn khổ A4.
    7. **Cài Đặt & Nhật Ký (`settings`)**: Cấu hình tham số hệ thống và Audit Log (chỉ ghi thêm, không xóa).

## 2. Điểm kết nối (Hook) dành cho Codex khi làm phần Xác thực (Authentication)
- Trong file `assets/js/app.js`, hàm `handleInstantLogin(e)` và `handleLogout()` đã được tách biệt rõ ràng.
- Codex có thể thay thế logic trong `handleInstantLogin(e)` bằng API xác thực (JWT / Session / Bcrypt) và kiểm tra quyền trước khi gọi `navigateTo('admin')`.
