# Kết quả kiểm tra bàn giao — 05/11/2026

Node.js portable 22.16.0; Next.js 16.4.5; React 19.3.1; pg 8.16.3; ExcelJS 4.4.0. package-lock.json khóa bộ thư viện đã cài.

**npm test: 12/12 qua, 0 lỗi.**

| Ca | Nội dung |
|---|---|
| 1 | Hạn cuối tháng/năm nhuận và chuẩn hóa số điện thoại |
| 2 | Thực thi migration SQL; một admin; bảng bật RLS; lịch sử bất biến; đủ 13 sheet gốc |
| 3 | Phiếu nhiều cuốn, idempotency, từ chối cuốn đã mượn và key khác payload |
| 4 | Trả từng phần: 15.000đ phí, 485.000đ hoàn, giữ 500.000đ cuốn còn lại; snapshot không đổi |
| 5 | Chính sách mới không thay phiếu cũ; từ chối thiếu căn cứ mất/hư |
| 6 | Excel export→validate→commit; VERSION cũ bị từ chối; giữ ISBN số 0 đầu; sequence không trùng |
| 7 | DTO public chỉ có trường sách được phép, không lộ độc giả/tiền |
| 8 | Nhận sách trước/quyết toán sau, tồn kho đúng và giữ nghĩa vụ/cọc |
| 9 | Chuyển ví cân bằng; đảo bằng bút toán mới; cấm đảo lặp |
| 10 | API từ chối chưa đăng nhập, sai Origin và user Auth không phải admin |
| 11 | Khởi tạo public UI, chặn admin route, escape HTML/XSS, đủ form bindings |
| 12 | Admin rỗng render được cả bảy tab, không phát sinh sách/độc giả mẫu |

**npm run build: qua.** Các route: `/`, `/assets/[...path]`, `/api/v1/[...path]`, `/api/qr`.

**npm run smoke: qua.** Khởi động production HTTP tạm thời, kiểm trang HTML, JS/CSS, QR PNG và chặn path traversal, sau đó dừng server.

Bản Excel đối chiếu nguyên byte được đính kèm trong tests/fixtures. SHA-256: `849ff30857bd1ec5a210549475f8c4e0269fcd047689e36787bca47c0b2bad58`.

Giới hạn kiểm chứng: PostgreSQL cục bộ trong PGlite, DOM trong jsdom; kiểm quyền Supabase Auth dùng response giả lập trong test. Chưa chạy với Supabase/Vercel thật hoặc máy in thật; chưa chứng nhận hiệu năng tải lớn hay race hai kết nối PostgreSQL độc lập. Restore cloud cần thử trên project mới theo VAN_HANH.md. Các giới hạn chức năng được ghi riêng trong tài liệu vận hành.
