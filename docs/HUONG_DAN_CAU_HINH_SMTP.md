==============================================================================
HƯỚNG DẪN THIẾT LẬP MÁY CHỦ EMAIL SMTP CHO HỆ THỐNG CJ FOODS SNS
==============================================================================

File cấu hình ".env" nằm ngay tại thư mục: d:\CJ_Enterprise_SNS\.env (hoac .env tai thu muc goc du an)

1. **TRÊN WINDOWS**:
   - Nhấn tổ hợp phím `Windows + R`, dán `notepad d:\CJ_Enterprise_SNS\.env` rồi Enter (hoặc nhấp đúp `scripts\config-smtp.bat`).
   - File `.env` nằm ở thư mục gốc dự án (bật *Hidden items* trong File Explorer nếu bị ẩn).

2. **TRÊN UBUNTU / LINUX**:
   - Mở Terminal tại thư mục dự án rồi sửa file cấu hình:
     `nano .env`
   - Sau khi điền thông tin SMTP và lưu lại, nạp lại biến môi trường cho backend:
     `docker compose up -d standard_backend`

3. **CẤU HÌNH MẪU** (`SMTP_TLS_REJECT_UNAUTHORIZED=true` mặc định):

--- NẾU DÙNG GMAIL / GOOGLE WORKSPACE (@cjfoods.com.vn) ---
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=email_cua_ban@gmail.com
SMTP_PASS=xxxx yyyy zzzz wwww   (Mật khẩu ứng dụng 16 ký tự của Google)
SMTP_FROM="CJ Foods SNS Security" <email_cua_ban@gmail.com>

--- NẾU DÙNG MICROSOFT 365 / OUTLOOK CÔNG TY ---
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=notification@cjfoods.com.vn
SMTP_PASS=MatKhauMailCongTy
SMTP_FROM="CJ Foods SNS Security" <notification@cjfoods.com.vn>
==============================================================================

