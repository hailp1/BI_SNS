# CJ FOODS ENTERPRISE ARCHITECTURE SPECIFICATION
## SYSTEM ARCHITECTURE, NETWORK ZONING & SECURITY MECHANISMS

---

### 1. OVERALL SYSTEM ARCHITECTURE (ENGLISH)

```mermaid
flowchart TD
    subgraph CLIENT_ZONE["📱 1. CLIENT TIER (USER ENDPOINTS)"]
        USER["👤 Enterprise Users / Administrators<br/>(Desktop, Laptop, Mobile Devices)"]
        WEBAPP["💻 WebApp Single Page Application (Port 8090)<br/>• 4-Channel Sales Analytics Dashboard<br/>• Adaptive Login Form (Email OTP Input)<br/>• IAM User Management & Excel Import/Export"]
        USER <--> WEBAPP
    end

    subgraph SERVER_ZONE["🖥️ 2. ENTERPRISE HOST SERVER (DOCKER COMPOSE STACK)"]
        subgraph DOCKER_STACK["🐳 DOCKER COMPOSE ECOSYSTEM (Isolated Network: standard_network)"]
            
            NGINX["🛡️ Container 1: NGINX 1.27 Perimeter Gateway (Port 8090)<br/>• Single Public Entry Point (TLS-ready template, CSP & Rate Limit)<br/>• Static Asset Serving & Gzip Compression<br/>• Secure Reverse Proxy to Internal Backend"]
            
            BACKEND["⚙️ Container 2: NestJS 10.3 Application & Security Engine<br/>• NIST SP 800-63B Bcrypt (Cost Factor 12) + Password Policy<br/>• Context-Aware Zero Trust (Intranet CIDR vs External 2FA/Email OTP)<br/>• OWASP ASVS HttpOnly Cookie + CSRF Origin Guard + RFC 7807<br/>• Server-side Row-Level Security (RLS) across 37 Datamart Datasets"]
            
            REDIS["⚡ Container 3: Redis 8 (AOF Persistent)<br/>• Ephemeral OTP 6-Digit Storage (TTL: 300s / 5 mins)<br/>• Revocation List & Real-Time Token Blacklist + Query Cache"]
            
            POSTGRES["💾 Container 4: PostgreSQL 18 Enterprise Database (592 MB)<br/>• Schema 'iam': Users, Roles/Permissions, Trusted Networks<br/>• Schema 'datamart': 37 Datasets / 2.57M Rows (Sales, Route Map, CTKM)<br/>• Schema 'iam.audit_logs': ISO/IEC 27001 Security Audit Trail"]
            
            VOLUME[("💽 Host Storage: Persistent Docker Volume (standard_pg_data)<br/>Guarantees zero data loss across restarts & outages")]
            
            POSTGRES --- VOLUME
        end
    end

    subgraph CLOUD_ZONE["☁️ 3. EXTERNAL ENTERPRISE CLOUD SERVICES"]
        SMTP_SERVER["✉️ SMTP Mail Relay Gateway (Port 587 TLS)<br/>(Google Workspace / Microsoft 365 / Corporate Exchange)"]
    end

    WEBAPP <-->|"HTTP / HTTPS Requests (Port 8090)"| NGINX
    NGINX <-->|"Internal Reverse Proxy Routing"| BACKEND

    BACKEND <-->|"Set / Verify OTP (5-Min Expiry)"| REDIS
    BACKEND <-->|"Query / Mutate User Data & RLS Dimensions"| POSTGRES

    BACKEND -->|"Dispatch OTP via TLS Port 587"| SMTP_SERVER
    SMTP_SERVER -.->|"Deliver Live Email OTP to Inbox"| USER
```

---

### 2. SƠ ĐỒ VẬN HÀNH TIẾNG VIỆT (VIETNAMESE WORKFLOW)

```mermaid
flowchart TD
    subgraph KHOI1["1. GIAO DIỆN WEBAPP (TRÌNH DUYỆT NGƯỜI DÙNG)"]
        direction LR
        U["👤 Người Dùng / Admin"] <--> W["💻 WebApp (Port 8090)<br/>• Đăng nhập & Nhập OTP<br/>• Quản trị IAM / Xem báo cáo<br/>• Nút Import & Export Excel"]
    end

    subgraph KHOI2["2. MÁY CHỦ BẢO MẬT & XỬ LÝ (SERVER BACKEND)"]
        direction TB
        B["⚙️ Backend NestJS 10.3 & Nginx 1.27 Gateway<br/>• Nhận diện Mạng Trong vs Mạng Ngoài (Zero Trust)<br/>• Kiểm tra quyền hạn RBAC / Lọc dữ liệu RLS (37 datasets)<br/>• Cookie HttpOnly + CSRF Origin Guard + CSP + RFC 7807"]
        M["✉️ Tổng Đài SMTP (Gmail/Office 365)<br/>Bắn mã OTP thật về Email nhân viên"]
        R["⚡ Bộ Nhớ Tạm Redis 8 (AOF)<br/>Giữ mã OTP 5 phút, Token Blacklist & Query Cache"]
    end

    subgraph KHOI3["3. CƠ SỞ DỮ LIỆU LƯU TRỮ TRÊN SERVER (POSTGRESQL 18)"]
        direction TB
        DU["👥 Bảng CSDL iam.users<br/>Quản lý tài khoản, Bcrypt 12, Email OTP & 2FA"]
        DD["📊 Schema datamart (37 bảng / 2.57M dòng)<br/>Doanh thu 4 kênh, Route Map DMS & Tracking CTKM"]
        DL["📋 Bảng iam.audit_logs<br/>Lưu vết lịch sử thao tác (ISO 27001)"]
        V["💾 Ổ ĐĨA MÁY CHỦ & SYNC GOOGLE DRIVE (.dump)<br/>Volume standard_pg_data + export-db / restore-db Windows ↔ Ubuntu"]
    end

    W <-->|"Gửi yêu cầu Đăng nhập / Nhập / Xuất"| B
    B -->|"Kích hoạt gửi OTP khi ở mạng ngoài"| M
    B <-->|"Lưu & So khớp OTP"| R
    M -.->|"Gửi thư OTP thật"| U

    B <-->|"Truy vấn & Cập nhật User"| DU
    B <-->|"Đọc & Ghi dữ liệu kinh doanh"| DD
    B -->|"Ghi nhật ký kiểm toán"| DL

    DU & DD & DL --- V
```

---

### 3. DATABASE IMPORT & EXPORT WORKFLOWS

#### A. Nhập Dữ Liệu Hàng Loạt (Excel Import -> Database):
1. Admin tải lên file Excel danh sách người dùng (`.xlsx`).
2. WebApp đọc định dạng và hiển thị bảng Xem Trước (Preview).
3. Admin bấm "Tiến Hành Import".
4. Dữ liệu gửi đến `POST /api/v1/users/bulk-import`.
5. Backend mã hóa mật khẩu Bcrypt 12, thực hiện Upsert vào `iam.users` trong PostgreSQL.
6. Ghi nhật ký kiểm toán vào `iam.audit_logs`.

#### B. Xuất Dữ Liệu & Phân Quyền Hàng Dọc (Row-Level Security):
1. Người dùng bấm "Xuất Excel" trên giao diện.
2. Server xác thực danh tính người dùng qua HttpOnly Cookie.
3. Server áp dụng bộ lọc RLS:
   - Admin/BOD: Toàn quốc 4 kênh.
   - RSM: Chỉ miền phụ trách.
   - ASM: Chỉ vùng phụ trách.
   - GSBH/NPP: Chỉ NPP hoặc chi nhánh phụ trách.
4. Truy vấn CSDL PostgreSQL và trả về file Excel chuẩn hóa dữ liệu cho người dùng.
