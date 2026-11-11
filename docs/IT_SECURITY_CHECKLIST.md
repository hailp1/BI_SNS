# BẢNG KIỂM TRA TIÊU CHUẨN AN NINH DÀNH CHO IT
## IT SECURITY COMPLIANCE VERIFICATION CHECKLIST

| Mục Đánh Giá | Tiêu Chuẩn Quốc Tế | Cơ Chế Thực Hiện Trong Hệ Thống | Kết Quả Đánh Giá |
| :--- | :--- | :--- | :---: |
| **Mã Hóa Mật Khẩu** | NIST SP 800-63B | Mật khẩu hash một chiều bằng Bcrypt với Cost Factor 12. Không bao giờ lưu văn bản rõ (plaintext). | **ĐẠT (PASS)** |
| **Chống Tấn Công Dò Mật Khẩu** | NIST SP 800-63B | Tự động khóa tài khoản 30 phút sau 5 lần nhập sai liên tiếp. Áp dụng Rate Limit 5 request/s trên Nginx. | **ĐẠT (PASS)** |
| **Bảo Vệ Phiên Làm Việc** | OWASP ASVS v4.0 Level 3 | Access Token lưu trong Cookie `HttpOnly; SameSite=Lax; Secure`. JavaScript không thể đọc trộm qua F12. | **ĐẠT (PASS)** |
| **Xác Thực Đa Yếu Tố Thích Ứng** | Zero Trust (NIST SP 800-207) | Tự động nhận diện IP nội bộ (`iam.trusted_networks`). Truy cập từ Internet bên ngoài bắt buộc xác thực 2FA. | **ĐẠT (PASS)** |
| **Gửi Mã OTP An Toàn** | RFC 6409 | Gửi thư điện tử qua Port 587 kết hợp mã hóa TLS (STARTTLS), xác thực danh tính máy chủ. | **ĐẠT (PASS)** |
| **Cô Lập Mạng Cơ Sở Dữ Liệu** | Enterprise Network Zoning | PostgreSQL và Redis chạy hoàn toàn trong mạng ảo Docker `standard_network`, không mở port ra Internet. | **ĐẠT (PASS)** |
| **Nhật Ký Kiểm Toán** | ISO/IEC 27001 | Mọi thao tác đăng nhập, sửa email, đổi pass, import file được lưu vĩnh viễn trong `iam.audit_logs`. | **ĐẠT (PASS)** |
| **Phân Quyền Dữ Liệu Hàng Dọc** | Principle of Least Privilege | Row-Level Security (RLS) lọc cứng tại Backend trước khi dữ liệu trả về cho người dùng 4 kênh. | **ĐẠT (PASS)** |
