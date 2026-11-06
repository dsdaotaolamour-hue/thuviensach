# Đối chiếu Book1_hoanchinh.xlsx

Nguồn: `Tham Khảo/Book1_hoanchinh.xlsx`, 13 sheet. Báo cáo máy đọc tại `excel-original-schema.json` liệt kê nguyên văn từng cột, vị trí và cột công thức. Chạy `node scripts/inspect-excel.mjs` để kiểm tra lại. Không dùng dữ liệu demo của giao diện làm dữ liệu vận hành.

| Sheet gốc | Nơi lưu / cách tính |
|---|---|
| TỔNG QUAN | Truy vấn tổng hợp từ sách, độc giả, phiếu và sổ tiền; không tạo bản sao KPI |
| ĐẦU SÁCH | `book_titles`, `book_categories`; view `excel_dau_sach` |
| SÁCH | `book_copies`; view `excel_sach` |
| ĐỌC GIẢ | `readers`; view `excel_doc_gia` |
| PHIẾU MƯỢN | `loans` + tổng hợp `loan_items`; view `excel_phieu_muon` |
| CHI TIẾT PHIẾU | `loan_items`, `return_items`, `charges`; view `excel_chi_tiet_phieu` |
| HOẠT ĐỘNG | `financial_transactions`, `cash_entries`, `deposit_entries`, `charge_allocations`; view `excel_hoat_dong` |
| VÍ THANH TOÁN | `wallets` + sổ tiền; view `excel_vi_thanh_toan` |
| MẪU PHIẾU IN | `print_documents.snapshot`: dữ liệu cố định lúc phát hành, in A4 từ trình duyệt |
| CÀI ĐẶT | `system_settings`, `policy_versions` |
| DANH MỤC | `book_categories`, trường ngôn ngữ/tình trạng và constraint trạng thái nghiệp vụ |
| NHẬT KÝ | `audit_logs`: chỉ thêm, có before/after, lý do, actor và request UUID |
| HƯỚNG DẪN | Tài liệu bàn giao, không phải bảng nghiệp vụ |

Mọi bảng trên thuộc schema **library**, không phải public. Mã đọc được như DS001, DS001-001, DG001, PM001, GD001 là unique; quan hệ dùng UUID. STT, cột tra cứu, tổng số, số đang mượn, tồn, số dư và ảnh hưởng ví được tính, không lưu trùng công thức Excel. View dùng trạng thái kỹ thuật READY/ON_LOAN...; giao diện và file xuất chuyển thành tiếng Việt.

## Các cột cần chú ý

- ĐẦU SÁCH: giữ đủ tên/tác giả/thể loại/NXB/ngôn ngữ/ngày nhập/URL bìa/mô tả/năm/ISBN/giá bìa/hiển thị web. ISBN là chuỗi để giữ số 0 đầu. Bổ sung số trang, tình trạng phát hành, nhóm đơn giá trang và VERSION phục vụ quy trình mới. Giá và số trang chưa biết là NULL, không tạo giá/số trang giả.
- SÁCH: giữ riêng `physical_condition` (tình trạng), `media_type` (loại), `status` (trạng thái), kệ, ngày nhập, ghi chú. Mã đầu sách/tên đầu sách tra bằng FK. Sách mất/thanh lý vẫn giữ lịch sử, không tính tổng sở hữu.
- ĐỌC GIẢ: giữ email, địa chỉ, ngày đăng ký, trạng thái tài khoản, ghi chú. Số điện thoại chuẩn hóa unique; +84 và số 0 đầu là cùng một người. Cột CCCD của Excel có vị trí tương thích `national_id_ciphertext`, không thu trên form mặc định; không nhập CCCD thô. `legacy_reader_type` dành cho nhãn cũ khi chuyển đổi có kiểm soát.
- PHIẾU MƯỢN: `delivery_method` giữ hình thức nhận; số cuốn/chưa trả/cọc dự kiến/đã thu/còn giữ tính theo các dòng; một phiếu có nhiều cuốn và được trả từng phần.
- CHI TIẾT PHIẾU: lưu snapshot tên/giá/trang/ngôn ngữ/tình trạng phát hành và chính sách. THỨ TỰ/KHÓA phụ của Excel được thay bằng khóa UUID và index. Phí chưa trả là dự tính; chỉ khi xử lý mới phát sinh nghĩa vụ thực tế.
- HOẠT ĐỘNG: ngày/tháng/năm lấy từ `occurred_at` theo Asia/Ho_Chi_Minh; mã tham chiếu CK có trường riêng. Khấu trừ cọc giảm tiền giữ hộ nhưng **không** tạo dòng tiền vào ví lần nữa. Chuyển ví có hai vế, tổng dòng tiền bằng 0.
- VÍ: số tài khoản/SĐT lưu text. Số dư đầu kỳ mặc định 0 đúng workbook, không lấy số dư demo 2/10/3 triệu. Có đủ chủ tài khoản, ngân hàng, QR, trạng thái và ghi chú.

## Khác biệt nghiệp vụ được công khai

Workbook cũ có Thường/VIP, hạn 14/30 ngày, Gia hạn và công thức tỷ lệ hư/mất. Đặc tả mới cùng quy trình mượn–trả quy định nhóm công ty/nội bộ 12 tháng không cọc; vãng lai 3 tháng, cọc 500.000đ/cuốn; không gia hạn; trễ 5.000đ/ngày/cuốn. Bản triển khai dùng **cấu trúc Excel + chính sách mới**. Không tuyên bố sao chép nguyên công thức cũ.

Không suy diễn Thường/VIP thành nhóm mới. Nếu có dữ liệu độc giả cũ, cần phân loại thực tế trước khi chuyển. Workbook hiện tại chỉ có DS001/DS001-001 chưa có tên/tình trạng, không đủ tạo dữ liệu sách thật; nhập sẽ báo lỗi theo dòng. Ba ví V01/V02/V03 được khởi tạo số dư 0.

Mất sách: ngừng phát hành có giá bìa = 3 lần giá; không giá = theo trang/ngôn ngữ; còn phát hành = thay sách + phí kỹ thuật. Hai quy tắc chưa chốt trong đặc tả nằm ở Cài đặt: ngày ngừng phí trễ khi mất và ưu tiên thay sách/đơn giá khi không có giá gốc. Để trống sẽ chặn trường hợp cần quy tắc đó. Phiếu cũ giữ phiên bản lúc phát hành; cần quyết định trước khi lập phiếu vận hành.

## Nhập/xuất

Chỉ hai sheet sách được nhập. Các sheet độc giả, phiếu, tiền, ví và nhật ký trong workbook đầy đủ **không bị ghi vào database khi upload**. Bản xuất giữ nguyên 18 cột đầu ĐẦU SÁCH và 10 cột đầu SÁCH; các cột mở rộng nằm phía sau.

Chế độ Thêm mới: mã không trùng, tên đầu sách bắt buộc, cuốn mới chỉ Có sẵn. Chế độ Cập nhật: mã đã tồn tại và VERSION phải khớp file xuất hiện tại; trạng thái vòng đời cuốn không được thay bằng Excel. Sai bất kỳ dòng nào thì không commit. Chấp nhận công thức sẵn có ở cột chỉ đọc; từ chối công thức ở cột nhập, macro, liên kết workbook ngoài, file >5MB, giải nén >40MB, >2.000 dòng thực. File xuất vô hiệu hóa dữ liệu bắt đầu =,+,-,@ để không thực thi công thức.
