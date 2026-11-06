# Thư viện sách Ngành Spa — Supabase

Mã hoàn thiện phần kết nối backend từ giao diện Antigravity, lưu trong thư mục này. Giữ nguyên bản tham khảo tại `Antigravity Work Space`.

- [Cài Supabase, chạy máy và đưa lên Vercel](docs/CAI_DAT.md)
- [Đối chiếu từng sheet Excel và các khác biệt chính sách](docs/DOI_CHIEU_EXCEL.md)
- [Vận hành, backup/restore và giới hạn](docs/VAN_HANH.md)
- [API](docs/openapi.yaml)

Yêu cầu: Node.js 22.16+ hoặc Node.js LTS mới hơn; Supabase PostgreSQL + Auth. Không mở `index.html` bằng file:// vì hệ thống cần API server.

```powershell
npm ci
Copy-Item .env.example .env.local
# Điền .env.local trước các lệnh dưới
node --env-file=.env.local scripts/migrate.mjs
node --env-file=.env.local scripts/setup-admin.mjs
npm run dev
```

Kiểm tra: `npm test`; build production: `npm run build`.

Không cần service_role key trên trình duyệt; URL Supabase, publishable/anon key và chuỗi kết nối PostgreSQL đều chỉ được dùng phía server. Không có dữ liệu giao dịch demo và không tự tạo tài khoản/mật khẩu mặc định.
