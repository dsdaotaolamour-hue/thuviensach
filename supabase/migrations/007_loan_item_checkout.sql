begin;
alter table library.loan_items
  add column if not exists checkout_on date,
  add column if not exists checkout_policy_id uuid references library.policy_versions(id);
create or replace view library.excel_chi_tiet_phieu with(security_invoker=true) as
select l.code "MÃ PHIẾU",c.code "MÃ SÁCH",i.title_snapshot->>'title' "TÊN ĐẦU SÁCH",(i.title_snapshot->>'cover_price_vnd')::bigint "GIÁ BÌA (đ)",i.deposit_required_vnd "CỌC DỰ KIẾN (đ)",r.code "MÃ ĐỌC GIẢ",coalesce(i.checkout_on,l.borrowed_on) "NGÀY MƯỢN",i.due_on "HẠN TRẢ",i.returned_on "NGÀY TRẢ THỰC TẾ",i.condition_out_note "TÌNH TRẠNG KHI MƯỢN",ri.outcome "KẾT QUẢ KHI TRẢ",
greatest(0,coalesce(i.returned_on,i.loss_confirmed_on,(now() at time zone 'Asia/Ho_Chi_Minh')::date)-i.due_on) "SỐ NGÀY TRỄ",
greatest(0,coalesce(i.returned_on,i.loss_confirmed_on,(now() at time zone 'Asia/Ho_Chi_Minh')::date)-i.due_on)*p.late_fee_vnd_per_day "PHẠT TRỄ (đ)",
coalesce((select sum(ch.amount_vnd) from library.charges ch where ch.loan_item_id=i.id and ch.type<>'LATE_FEE'),0) "PHẠT HƯ / MẤT (đ)",i.resolution_status "TRẠNG THÁI",i.condition_out_note "GHI CHÚ"
from library.loan_items i join library.loans l on l.id=i.loan_id join library.policy_versions p on p.id=coalesce(i.checkout_policy_id,l.policy_version_id) join library.readers r on r.id=l.reader_id join library.book_copies c on c.id=i.copy_id left join library.return_items ri on ri.loan_item_id=i.id;
commit;
