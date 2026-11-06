# Cài đặt Supabase và website

## 1. Chuẩn bị

Cài Node.js 22.16 trở lên (khuyến nghị LTS hiện hành). Mở terminal **tại Source Code (Final)**, nơi có package.json. `npm ci` dùng package-lock.json đã bàn giao. Không chạy file HTML trực tiếp.

```powershell
npm ci
Copy-Item .env.example .env.local
```

## 2. Tạo Supabase

Tạo project riêng cho production, chọn vùng gần Việt Nam và lưu mật khẩu database. Không dùng chung database production với bản thử nghiệm. Trong trang **Connect**, sao chép chuỗi PostgreSQL pooler; Vercel/serverless dùng transaction pooler cổng 6543. Migration/restore có thể dùng session pooler cổng 5432 để vận hành ổn định. Tham khảo [kết nối PostgreSQL chính thức](https://supabase.com/docs/guides/database/connecting-to-postgres).

Điền `.env.local`:

```dotenv
DATABASE_URL=postgresql://postgres.PROJECT_REF:MAT_KHAU_DB_DA_URL_ENCODE@HOST_POOLER:6543/postgres?sslmode=require
SUPABASE_URL=https://PROJECT_REF.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
APP_ORIGIN=http://localhost:3000
ADMIN_USER_ID=UUID_DIEN_SAU_BUOC_4
```

`SUPABASE_PUBLISHABLE_KEY` có thể là anon key legacy của project. Lấy trong Project Settings → API Keys. Database password là mật khẩu PostgreSQL, khác mật khẩu tài khoản quản trị thư viện. Ký tự đặc biệt trong mật khẩu URL phải được percent-encode. Không đưa `.env.local` lên GitHub, không dùng tiền tố NEXT_PUBLIC_ cho các biến này. Khóa bí mật không xuất hiện trong JS gửi về browser. Cách nạp env theo [Next.js](https://nextjs.org/docs/app/guides/environment-variables).

## 3. Tạo bảng: chọn một trong hai cách

**Cách A — SQL Editor, dễ thao tác:** vào SQL Editor của Supabase, New Query, mở và chạy lần lượt:

1. `supabase/migrations/001_library.sql`: schema, các bảng nghiệp vụ, seed ba ví số dư 0 và chính sách ban đầu.
2. `supabase/migrations/002_auth_attempts.sql`: giới hạn đăng nhập sai.
3. `supabase/migrations/003_ledger_guards.sql`: bảo vệ cọc/phân bổ nghĩa vụ, cột tương thích độc giả.
4. `supabase/migrations/004_excel_views.sql`: view đối chiếu workbook.
5. `supabase/migrations/005_admin_sessions.sql`: phiên máy chủ, timeout nhàn rỗi và thu hồi phiên.

Hoặc chạy file gộp `supabase/CAI_DAT_MOI.sql` **một lần trên project mới**. File không có DROP/TRUNCATE. Không chạy lại trên database đã có schema library. Mỗi migration chạy trong transaction; xem thông báo Success trước khi chuyển bước.

**Cách B — terminal:**

```powershell
node --env-file=.env.local scripts/migrate.mjs
```

Script ghi lịch sử/checksum migration. Không dùng lẫn hai cách trên cùng một database vì SQL Editor không tạo lịch sử cho script migration. Không sửa migration đã chạy; thay đổi sau này phải bằng file mới.

**Kiểm tra trong SQL Editor:**

```sql
select tablename, rowsecurity from pg_tables
where schemaname='library' order by tablename;
select code,display_name,opening_balance_vnd from library.wallets;
select version,company_term_months,walkin_term_months,walkin_deposit_vnd
from library.policy_versions;
select * from library.excel_dau_sach;
```

Trong Table Editor đổi schema từ public sang library nếu danh sách trống. Không thêm library vào Exposed schemas của Data API. Các bảng đều bật RLS, không có policy cấp browser role; backend dùng kết nối PostgreSQL phía server. Không thêm policy `using(true)`. Nguyên tắc theo [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security).

## 4. Tạo tài khoản admin duy nhất

Trong Supabase **Authentication → Users**, dùng chức năng tạo user bằng email/password của chính bạn. Xác nhận email bằng luồng Auth hoặc tùy chọn xác nhận trong Dashboard nếu có. Không có tài khoản/mật khẩu mặc định trong mã nguồn. Tắt đăng ký công khai trong Auth; để đăng nhập email/password hoạt động. Xem [Auth general configuration](https://supabase.com/docs/guides/auth/general-configuration).

Sao chép **User UID**, điền `ADMIN_USER_ID` trong `.env.local`, rồi:

```powershell
node --env-file=.env.local scripts/setup-admin.mjs
```

Nếu cài hoàn toàn qua SQL Editor, dùng UUID thật:

```sql
insert into library.admin_accounts(id)
select id from auth.users where id='THAY_BANG_UUID_CUA_BAN'::uuid;
select * from library.admin_accounts;
```

Phải có đúng một dòng. Chỉ tài khoản này được truy cập API quản trị; user Auth khác vẫn bị từ chối. Database có unique singleton để không tạo admin thứ hai. Mật khẩu/session do Supabase Auth quản lý, không tạo bảng password_hash riêng.

## 5. Chạy tại máy

```powershell
npm run dev
```

Mở `http://localhost:3000`, cổng quản trị `http://localhost:3000/#/login`. Đăng nhập bằng email/password bước 4. Dùng đúng localhost như APP_ORIGIN; không thay sang 127.0.0.1 trừ khi cập nhật APP_ORIGIN và khởi động lại.

Vào Cài đặt: điền tên, địa chỉ, hotline, URL Zalo thật; chọn hai quy tắc mất sách trước khi phát hành phiếu. Cấu hình link Drive ở phần Nội dung website. Khi chưa cấu hình, link/QR hiển thị đang cập nhật, không có mã QR giả.

## 6. Nhập dữ liệu sách theo Excel

Ở Đầu sách & Cuốn sách → Nhập/Xuất Excel: tải mẫu, điền hai sheet ĐẦU SÁCH và SÁCH, chọn Thêm mới, Kiểm tra & xem trước, sửa toàn bộ lỗi rồi Xác nhận nhập. Cập nhật thông tin bằng file xuất mới nhất và giữ VERSION. Không nhập các sheet tiền/độc giả/phiếu qua upload sách.

Workbook gốc hiện có DS001/DS001-001 chưa có tên và thông tin cuốn, nên chưa đủ nhập thành sách thật. Bổ sung dữ liệu thay vì nạp sách demo. Chi tiết [đối chiếu Excel](DOI_CHIEU_EXCEL.md).

## 7. Đưa lên Vercel

Đưa mã nguồn lên GitHub private theo quy trình của bạn. Trong Vercel tạo project từ repo, chọn framework **Next.js**, **Root Directory = Source Code (Final)**, Install `npm ci`, Build `npm run build`. Chọn Node.js phiên bản tương thích >=22.16.

Thêm bốn biến runtime `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `APP_ORIGIN` trong Project Settings → Environment Variables. `APP_ORIGIN` là URL HTTPS chính xác, không có dấu `/` cuối. Không cần ADMIN_USER_ID trên Vercel sau khi đã cấp quyền trong DB. Tạo deploy thử, xác định domain ổn định, cập nhật APP_ORIGIN rồi redeploy. Preview dùng project Supabase thử riêng và APP_ORIGIN tương ứng; không gán credential production vào Preview.

Xem [Vercel build/root directory](https://vercel.com/docs/builds/configure-a-build) và [biến môi trường](https://vercel.com/docs/environment-variables). Hướng dẫn này không tự publish hoặc tạo tài nguyên có phí trong tài khoản của bạn.

## 8. Kiểm tra trước khi nhập dữ liệu thật

Tạo một đầu sách thử có hai cuốn; tạo khách vãng lai; lập một phiếu hai cuốn, xác nhận thu 1.000.000đ. Trả một cuốn, kiểm tra cọc cuốn còn lại vẫn 500.000đ. Thử luồng nhận sách trước/quyết toán sau. Thử in A4/PDF. Đăng xuất và mở lại #/admin phải về login. Tab Network không được có token/secret hoặc dữ liệu độc giả ở API public. Tải backup và thử restore trên **project thử mới**, đối chiếu trước khi cho vận hành.

## Xử lý lỗi

| Lỗi | Kiểm tra |
|---|---|
| 403 Nguồn yêu cầu | APP_ORIGIN phải đúng protocol/host/port, không dấu / cuối; redeploy sau khi sửa |
| 401 đăng nhập | Email đã xác nhận, đúng password; publishable key cùng project với SUPABASE_URL |
| 403 quyền quản trị | UUID Auth phải có trong library.admin_accounts và active=true |
| Không thấy bảng | Chọn schema library; kiểm tra đủ năm SQL |
| Lỗi kết nối DB | Chuỗi Connect, mật khẩu URL-encode, cổng pooler, SSL và trạng thái project |
| Không xử lý mất | Hai quy tắc chưa chọn hoặc thiếu giá/trang/ngôn ngữ/phát hành trong snapshot lúc cho mượn |
| 409 VERSION | Dữ liệu đã đổi; tải lại/xuất Excel mới và xem lại báo giá |

Không sửa trực tiếp sổ tiền hoặc tắt trigger để bỏ qua lỗi.
