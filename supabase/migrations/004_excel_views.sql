-- Read-only projections of the original workbook. Formula columns stay computed.
begin;
create view library.excel_dau_sach with(security_invoker=true) as
select t.code "MÃ ĐẦU SÁCH",t.title "TÊN ĐẦU SÁCH",t.authors "TÁC GIẢ",g.name "THỂ LOẠI",t.publisher "NHÀ XUẤT BẢN",t.language "NGÔN NGỮ",t.acquired_on "NGÀY NHẬP",t.cover_url "LINK ẢNH BÌA",t.description "MÔ TẢ SÁCH",t.publication_year "NĂM XUẤT BẢN",t.isbn "ISBN",t.cover_price_vnd "GIÁ BÌA (đ)",case when t.show_on_web then 'Có' else 'Không' end "HIỂN THỊ WEB",
count(c.id) filter(where c.status not in ('LOST','RETIRED')) "TỔNG SỐ CUỐN",count(c.id) filter(where c.status='READY') "CÓ SẴN",count(c.id) filter(where c.status='ON_LOAN') "ĐANG MƯỢN",count(c.id) filter(where c.status='REPAIR') "ĐANG SỬA"
from library.book_titles t left join library.book_categories g on g.id=t.category_id left join library.book_copies c on c.title_id=t.id group by t.id,g.name;
create view library.excel_sach with(security_invoker=true) as
select c.code "MÃ SÁCH",c.physical_condition "TÌNH TRẠNG",c.media_type "LOẠI",c.status "TRẠNG THÁI",c.shelf_location "VỊ TRÍ KỆ",c.acquired_on "NGÀY NHẬP",c.condition_note "GHI CHÚ",t.code "MÃ ĐẦU SÁCH",t.title "TÊN ĐẦU SÁCH" from library.book_copies c join library.book_titles t on t.id=c.title_id;
create view library.deposit_balances with(security_invoker=true) as
select i.id loan_item_id,coalesce(sum(case when d.direction='INCREASE' then d.amount_vnd else -d.amount_vnd end),0) held from library.loan_items i left join library.deposit_entries d on d.loan_item_id=i.id group by i.id;
create view library.excel_doc_gia with(security_invoker=true) as
select r.code "MÃ ĐỌC GIẢ",r.full_name "HỌ VÀ TÊN ĐỌC GIẢ",r.phone_display "SỐ ĐIỆN THOẠI",r.national_id_ciphertext "SỐ CĂN CƯỚC CÔNG DÂN (MÃ HÓA)",r.reader_category "LOẠI KHÁCH",r.account_status "TRẠNG THÁI TÀI KHOẢN",r.email "EMAIL",r.address "ĐỊA CHỈ",r.registered_on "NGÀY ĐĂNG KÝ",r.notes "GHI CHÚ",
count(i.id) filter(where i.resolution_status='OPEN') "SÁCH ĐANG MƯỢN",coalesce(sum(b.held),0) "CỌC ĐANG GIỮ (đ)"
from library.readers r left join library.loans l on l.reader_id=r.id left join library.loan_items i on i.loan_id=l.id left join library.deposit_balances b on b.loan_item_id=i.id group by r.id;
create view library.excel_phieu_muon with(security_invoker=true) as
select l.code "MÃ PHIẾU",r.code "MÃ ĐỌC GIẢ",l.reader_snapshot->>'full_name' "TÊN ĐỌC GIẢ",l.borrowed_on "NGÀY MƯỢN",l.due_on "HẠN TRẢ",l.delivery_method "HÌNH THỨC NHẬN",count(i.id) "SỐ CUỐN",count(i.id) filter(where i.resolution_status='OPEN') "CHƯA TRẢ",coalesce(sum(i.deposit_required_vnd),0) "CỌC PHẢI THU (đ)",
coalesce((select sum(d.amount_vnd) from library.deposit_entries d join library.loan_items x on x.id=d.loan_item_id where x.loan_id=l.id and d.purpose='COLLECT'),0) "CỌC ĐÃ THU (đ)",coalesce(sum(b.held),0) "CỌC CÒN GIỮ (đ)",string_agg(distinct w.display_name,', ') "VÍ NHẬN CỌC",l.status "TRẠNG THÁI PHIẾU",l.created_by "NGƯỜI LẬP PHIẾU",l.notes "GHI CHÚ"
from library.loans l join library.readers r on r.id=l.reader_id left join library.loan_items i on i.loan_id=l.id left join library.deposit_balances b on b.loan_item_id=i.id left join library.wallets w on w.id=i.deposit_wallet_id group by l.id,r.code;
create view library.excel_chi_tiet_phieu with(security_invoker=true) as
select l.code "MÃ PHIẾU",c.code "MÃ SÁCH",i.title_snapshot->>'title' "TÊN ĐẦU SÁCH",(i.title_snapshot->>'cover_price_vnd')::bigint "GIÁ BÌA (đ)",i.deposit_required_vnd "CỌC DỰ KIẾN (đ)",r.code "MÃ ĐỌC GIẢ",l.borrowed_on "NGÀY MƯỢN",i.due_on "HẠN TRẢ",i.returned_on "NGÀY TRẢ THỰC TẾ",i.condition_out_note "TÌNH TRẠNG KHI MƯỢN",ri.outcome "KẾT QUẢ KHI TRẢ",
greatest(0,coalesce(i.returned_on,i.loss_confirmed_on,(now() at time zone 'Asia/Ho_Chi_Minh')::date)-i.due_on) "SỐ NGÀY TRỄ",
greatest(0,coalesce(i.returned_on,i.loss_confirmed_on,(now() at time zone 'Asia/Ho_Chi_Minh')::date)-i.due_on)*p.late_fee_vnd_per_day "PHẠT TRỄ (đ)",
coalesce((select sum(ch.amount_vnd) from library.charges ch where ch.loan_item_id=i.id and ch.type<>'LATE_FEE'),0) "PHẠT HƯ / MẤT (đ)",i.resolution_status "TRẠNG THÁI",i.condition_out_note "GHI CHÚ"
from library.loan_items i join library.loans l on l.id=i.loan_id join library.policy_versions p on p.id=l.policy_version_id join library.readers r on r.id=l.reader_id join library.book_copies c on c.id=i.copy_id left join library.return_items ri on ri.loan_item_id=i.id;
create view library.excel_hoat_dong with(security_invoker=true) as
select t.code "MÃ GIAO DỊCH",extract(day from t.occurred_at at time zone 'Asia/Ho_Chi_Minh') "NGÀY",extract(month from t.occurred_at at time zone 'Asia/Ho_Chi_Minh') "THÁNG",extract(year from t.occurred_at at time zone 'Asia/Ho_Chi_Minh') "NĂM",r.code "MÃ ĐỌC GIẢ",l.code "MÃ PHIẾU MƯỢN",t.type "LOẠI HOẠT ĐỘNG",t.amount_vnd "SỐ TIỀN",
(select string_agg(distinct w.display_name,', ') from library.cash_entries e join library.wallets w on w.id=e.wallet_id where e.transaction_id=t.id) "HÌNH THỨC",t.created_by "NGƯỜI XỬ LÝ",t.reason "GHI CHÚ",t.transfer_reference "MÃ THAM CHIẾU CK",
coalesce((select sum(case when d.direction='INCREASE' then d.amount_vnd else -d.amount_vnd end) from library.deposit_entries d where d.transaction_id=t.id),0) "ẢNH HƯỞNG QUỸ CỌC",
coalesce((select sum(case when e.direction='IN' then e.amount_vnd else -e.amount_vnd end) from library.cash_entries e where e.transaction_id=t.id),0) "TIỀN VÀO/RA VÍ",t.occurred_at "NGÀY ĐẦY ĐỦ"
from library.financial_transactions t left join library.readers r on r.id=t.reader_id left join library.loans l on l.id=t.loan_id;
create view library.excel_vi_thanh_toan with(security_invoker=true) as
select w.code "MÃ VÍ",w.display_name "TÊN HIỂN THỊ",w.type "LOẠI",w.account_holder "CHỦ TÀI KHOẢN",w.account_number "SỐ TÀI KHOẢN / SĐT",w.bank_name "NGÂN HÀNG",w.qr_url "LINK ẢNH QR",w.active "TRẠNG THÁI",w.opening_balance_vnd "SỐ DƯ ĐẦU KỲ (đ)",
w.opening_balance_vnd+coalesce((select sum(case when e.direction='IN' then e.amount_vnd else -e.amount_vnd end) from library.cash_entries e where e.wallet_id=w.id),0) "SỐ DƯ HIỆN TẠI (đ)",
coalesce((select sum(b.held) from library.deposit_balances b join library.loan_items i on i.id=b.loan_item_id where i.deposit_wallet_id=w.id),0) "CỌC ĐANG GIỮ TẠI ĐÂY (đ)",w.notes "GHI CHÚ" from library.wallets w;
revoke all on all tables in schema library from public;
commit;
