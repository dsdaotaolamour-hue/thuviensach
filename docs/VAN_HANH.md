# Vận hành và bàn giao

## Sử dụng hằng ngày

1. Tra cứu độc giả bằng SĐT. +84 và dạng 0 được chuẩn hóa trùng nhau. Khách nội bộ/công ty thuộc nhóm không cọc; KTV chưa xác minh thuộc vãng lai.
2. Thêm đầu sách đủ metadata; không nhập giá/trang giả. Một cuốn là một mã riêng. Muốn sửa thông tin hàng loạt, xuất Excel mới, thay metadata và nhập Cập nhật với VERSION.
3. Lập phiếu chọn nhiều cuốn bằng Ctrl/Cmd hoặc chọn nhiều trên điện thoại. Server tính tháng theo lịch, không đổi thành 90/365 ngày. Xem cảnh báo, xác nhận cọc thực nhận, xem số tiền/hạn trước khi phát hành.
4. Danh sách phiếu hiển thị từng cuốn dưới cùng mã PM để trả riêng. Trả tốt/hư/mất lấy báo giá server. Hư cần người quyết định và lý do; mất dùng thông tin snapshot. Không gia hạn.
5. Nếu tiền chưa thu/hoàn, bỏ chọn Quyết toán ngay. Sách đã nhận sẽ về trạng thái vật lý đúng, nghĩa vụ/cọc còn chờ ở Tiền cọc & Ví. Không đánh dấu đã thu tiền khi chưa thực thu.
6. Sách mất còn phát hành phải nhận cuốn mới cùng tên/tác giả. Cuốn cũ giữ LOST; cuốn mới có mã khác, liên kết replacement_for_copy_id. Chưa nhận thì phiếu còn chờ.
7. Tiền: xem số dư ví từ dòng tiền, cọc giữ hộ từ sổ cọc. Trừ cọc không tăng số dư ví. Chuyển ví tạo hai vế; sai chuyển ví dùng bút toán đảo mới, không xóa dòng cũ.
8. Nhắc hạn nằm ở Tổng quan; bấm cập nhật để tạo các mốc trước 1 tháng/14/7/3 ngày và quá hạn. Tự gọi điện/Zalo, ghi liên hệ và kết quả. Không có gửi tin tự động.
9. In từ mục Mẫu phiếu, chọn **tài liệu đã phát hành**, rồi In/Lưu PDF A4 trong trình duyệt. Snapshot cũ không đổi khi sửa tên/chính sách.

KPI đầu sách và cuốn là khác nhau; một phiếu nhiều cuốn nên số dòng danh sách có thể lớn hơn số phiếu. Số tạm tính quá hạn không phải tiền đã thu.

## Bảo mật

Auth dùng Supabase password flow phía server; token nằm trong cookie HttpOnly/SameSite=Strict, HTTPS có Secure. Kiểm tra user với Supabase Auth rồi kiểm quyền trong bảng admin; không tin role từ browser. Giới hạn 10 lần thử đăng nhập cho email/nguồn trong 15 phút (ngoài rate-limit Supabase). Phiên lưu token hash tại máy chủ, hết hạn sau 30 phút không hoạt động hoặc tối đa 12 giờ. Đổi mật khẩu cần mật khẩu cũ và thu hồi toàn bộ phiên.

API mutation kiểm tra Origin, validate dữ liệu, dùng truy vấn tham số và transaction. Các thao tác lưu có Idempotency-Key; retry mạng dùng cùng key. Cùng key khác payload bị 409. Không dùng localStorage làm database. Giá trị hiển thị từ người dùng được escape HTML. Không cấp quyền schema library cho anon/authenticated. Dữ liệu công khai chỉ có mã/tên/tác giả/thể loại/mô tả/ảnh/số lượng; tracking chỉ tổng hợp event/target, không gửi số điện thoại hoặc nội dung tin nhắn.

Nhật ký, phiên bản chính sách, phiếu in và sổ tiền không sửa/xóa. Cọc không được rút quá giữ; phân bổ nghĩa vụ không quá số phải thu. Các trigger kiểm tra ngay trong database. Thông tin mật khẩu/token không vào audit/backup.

## Backup

Vào Cài đặt → Backup, nhập lại mật khẩu để tải JSON gồm manifest/schemaVersion/checksum và các bảng nghiệp vụ. File chứa thông tin độc giả; cất vào nơi riêng được mã hóa, không đăng lên GitHub/Drive công khai. Không có backup tự động khi chưa cấu hình nơi lưu riêng; UI nói rõ trạng thái đó.

Khôi phục **vào project/database mới**, không ghi đè database đang chạy:

1. Tạo Supabase thử/mới, chạy đủ năm migration, tạo/gắn admin mới.
2. Tạo `.env.restore` trỏ vào database mới, cùng biến Auth của project mới. Giữ nguyên database cũ để đối chiếu.
3. Kiểm tra file:

```powershell
node --env-file=.env.restore scripts/restore.mjs DUONG_DAN_BACKUP.json
```

4. Sau khi kiểm checksum/row counts, nạp:

```powershell
node --env-file=.env.restore scripts/restore.mjs DUONG_DAN_BACKUP.json --commit-empty-database
```

Script từ chối nếu database đã có sách/độc giả/phiếu/lịch sử. Restore chạy trong transaction, giữ UUID nghiệp vụ, gán các actor lịch sử vào admin mới, đặt lại sequence theo mã lớn nhất và ghi audit restore. Các lỗi quan hệ/constraint khiến rollback toàn bộ. Password/token không được restore.

5. So sánh số dòng, tổng cọc, số dư và phiếu in; thử đăng nhập và tra cứu trước khi đổi env Vercel sang database mới. Giữ file và database cũ cho đến khi kiểm tra xong. Không dùng script để trộn hai database hoặc rollback đè giao dịch mới.

## Phạm vi và giới hạn cần biết

- Bản này tích hợp giao diện hiện có với Next.js API, Supabase Auth/PostgreSQL; không dựng lại toàn bộ giao diện theo danh sách màn hình đề xuất trong đặc tả. Import/export, nội dung, backup và nhắc hạn được bố trí trong các tab hiện có.
- Chỉnh sửa metadata sách qua Excel có VERSION; giao diện không có editor riêng cho từng trường độc giả. Không có import lịch sử độc giả/phiếu/tiền từ Excel.
- Đảo chuyển ví đã có UI và sổ đảo; sửa sai phí/cọc sau quyết toán, miễn nợ và điều chỉnh hạn trả không có workflow tự phục vụ. Không tự sửa SQL trên production; cần xây luồng điều chỉnh kèm reauthentication trước khi áp dụng nghiệp vụ đó.
- Quy tắc mất tính trễ đến ngày giải quyết yêu cầu nhận sách thay thế cùng lần chốt để tránh tự chốt phí trước ngày hoàn tất. Nếu muốn ghi mất rồi tiếp tục tính phí đến ngày nhận sau, cần mở rộng workflow. Quy tắc ngừng tại ngày xác nhận mất hỗ trợ chờ nhận sách thay thế.
- Nội dung quản trị gồm hero từng trang và các link Drive/Zalo; chưa có trình biên tập tự do/gallery upload. Ảnh/PDF/Excel không lưu dạng binary trong DB. QR được tạo thật từ URL, không phụ thuộc dịch vụ QR ngoài.
- In dùng chức năng PDF của trình duyệt và font hệ thống có tiếng Việt, chưa có bộ PDF server nhúng font riêng. Cần kiểm bản in bằng trình duyệt/máy in thực tế.
- Backup thủ công và restore DB mới có script; chưa có cron/retention/offsite backup hay restore trực tiếp trong website.
- Admin state tải trọn dữ liệu quản trị; phù hợp kho nhỏ, chưa có pagination server cho từng module. Khi dữ liệu lớn cần bổ sung phân trang và tìm kiếm server.
- Không triển khai AI Gemini, mượn/giữ chỗ/thanh toán online hoặc gửi Zalo tự động.

## Kiểm chứng

`npm test` dùng PostgreSQL chạy trong PGlite để thực thi migration, transaction, constraint/trigger, tính phí, Excel round-trip và API authorization giả lập Auth; test DOM kiểm tra khởi tạo UI và form/XSS. `npm run build` xác nhận build Next.js production.

Chưa có credentials Supabase thật nên không thể xác nhận đăng nhập/kết nối/restore trên project của chủ hệ thống. Kết quả local không thay thế bước chạy thử cuối trong tài khoản Supabase/Vercel thực tế. Không có tài nguyên cloud nào được tự tạo hoặc publish trong lần bàn giao này.
