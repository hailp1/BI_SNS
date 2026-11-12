# BẢNG KIỂM TRA TIÊU CHUẨN AN NINH DÀNH CHO IT
## IT SECURITY COMPLIANCE VERIFICATION CHECKLIST

| Mục Đánh Giá | Tiêu Chuẩn Quốc Tế | Cơ Chế Thực Hiện Trong Hệ Thống | Kết Quả Đánh Giá |
| :--- | :--- | :--- | :---: |
| **Mã Hóa & Độ Mạnh Mật Khẩu** | NIST SP 800-63B | Mật khẩu hash một chiều bằng Bcrypt với Cost Factor 12; `PasswordPolicy` yêu cầu tối thiểu 8 ký tự và ≥ 3/4 nhóm ký tự (hoa, thường, số, đặc biệt). | **ĐẠT (PASS)** |
| **Chống Tấn Công Dò Mật Khẩu** | NIST SP 800-63B | Tự động khóa tài khoản 30 phút sau 5 lần nhập sai liên tiếp. Áp dụng Rate Limit 5 request/s cho `/login` trên Nginx và NestJS Throttler. | **ĐẠT (PASS)** |
| **Bảo Vệ Phiên Làm Việc** | OWASP ASVS v4.0 | Access Token lưu trong Cookie `HttpOnly; SameSite=Lax`, tự động gắn `Secure` khi bật HTTPS qua `nginx/nginx-tls.conf.template` (môi trường LAN mặc định chạy HTTP `:8090`). Có Redis Blacklist thu hồi token khi đăng xuất. | **ĐẠT (Bật TLS khi Public)** |
| **Chống Giả Mạo Request (CSRF) & XSS** | OWASP CSRF / CSP | Middleware kiểm tra `Origin` trên mọi request thay đổi dữ liệu (`POST/PUT/PATCH/DELETE`); Nginx áp dụng `Content-Security-Policy`, `X-Frame-Options: SAMEORIGIN`, `nosniff`. | **ĐẠT (PASS)** |
| **Xác Thực Đa Yếu Tố Thích Ứng** | Zero Trust (NIST SP 800-207) | Tự động nhận diện IP nội bộ (`iam.trusted_networks`); chặn bypass `network_mode=company` ở Production. Truy cập từ Internet yêu cầu Email OTP hoặc TOTP 2FA (yêu cầu user đã cập nhật Email/2FA). | **ĐẠT (Cần phủ đủ Email user)** |
| **Gửi Mã OTP An Toàn** | RFC 6409 | Gửi thư điện tử qua Port 587 kết hợp mã hóa TLS (STARTTLS), xác thực danh tính máy chủ. | **ĐẠT (PASS)** |
| **Cô Lập Mạng & Bền Vững Cache** | Enterprise Network Zoning | PostgreSQL 18 và Redis 8 (`--appendonly yes`) chạy hoàn toàn trong mạng ảo Docker `standard_network`, không mở port ra Internet. | **ĐẠT (PASS)** |
| **Che Giấu Lỗi Hệ Thống** | RFC 7807 Problem Details | `ProblemDetailsFilter` chuẩn hóa lỗi HTTP và ẩn stack trace / thông tin nội bộ khỏi response trả về client. | **ĐẠT (PASS)** |
| **Nhật Ký Kiểm Toán** | ISO/IEC 27001 | Mọi thao tác đăng nhập, sửa email, đổi pass, import/export được lưu trong `iam.audit_logs`. | **ĐẠT (PASS)** |
| **Phân Quyền Dữ Liệu Hàng Dọc** | Principle of Least Privilege | Row-Level Security (RLS) lọc cứng tại Backend cho 37 dataset, Overview/Channel Summary, Daily Trend, Route Map và CTKM; chặn truy cập chéo kênh/địa bàn (`403`). | **ĐẠT (PASS)** |
