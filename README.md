# CJ FOODS ENTERPRISE - SALES NETWORK SYSTEM (SNS)
## IT SECURITY REVIEW & DEPLOYMENT PACKAGE (RELEASE V1.0)

---

### 1. SYSTEM OVERVIEW & ARCHITECTURE
CJ Foods Sales Network System (SNS) is an enterprise-grade multi-channel sales performance and access management platform designed according to international standards:
- **NIST SP 800-63B**: Identity & Password Security (Bcrypt Cost 12, Account Lockout after 5 failed attempts).
- **OWASP ASVS v4.0 (Level 3)**: Session Management with `HttpOnly; SameSite=Lax; Secure` Cookie (Impervious to XSS/F12 token theft).
- **NIST SP 800-207**: Zero Trust Adaptive Access Control (Intranet bypass 2FA vs External 4G mandatory Email OTP).
- **ISO/IEC 27001**: Immutable Audit Logging (`iam.audit_logs`).

The system is delivered as a containerized **Docker Compose** ecosystem running 4 isolated services on an internal virtual network (`standard_network`):
1. **NGINX Reverse Proxy (Port 8090)**: Public-facing gateway handling TLS termination, rate-limiting, and static serving.
2. **NestJS 12 Application Backend (Port 3000 internal)**: Modular TypeScript backend implementing business logic, Bcrypt verification, and RLS data filtering.
3. **Redis 8 In-Memory Cache (Port 6379 internal)**: Password-protected ephemeral store for 5-minute OTP lifecycle and token blacklists.
4. **PostgreSQL 18 Database (Port 5432 internal)**: Dedicated persistent relational database with multi-schema isolation (`iam`, `datamart`, `public`).

---

### 2. QUICK DEPLOYMENT GUIDE (FOR IT EVALUATION)

#### Prerequisites:
- Docker Desktop or Docker Engine 24.0+ with Docker Compose v2.
- 4GB RAM minimum (8GB recommended), 10GB free disk space.
- Port 8090 available on the host machine.

#### Installation Steps:
1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
2. (Optional) Configure SMTP credentials in `.env` if testing real external email dispatch. If left empty, the system runs in **Smart Security Simulation Mode** for local review.
3. Launch the complete container stack:
   ```bash
   docker compose up -d
   ```
   *(On Windows Server, you can simply double-click `scripts\start-system.bat`).*
4. Access the web application:
   ```
   http://localhost:8090
   ```
5. Default testing credentials:
   - **Administrator**: `admin` / `CjFoods@2026!`
   - **Executive BOD**: `bod_director` / `CjFoods@2026!`
   - **Channel Head**: `head_gt` / `CjFoods@2026!`
   - **Regional Director**: `rsm_north` / `CjFoods@2026!`
   - **Area Sales Manager**: `asm_danang` / `CjFoods@2026!`

---

### 3. TECHNICAL SPECIFICATIONS & NETWORK PORTS

| Service Name | Container Name | Internal Port | Host Port | Network Exposure |
| :--- | :--- | :--- | :--- | :--- |
| Perimeter Gateway | `standard_nginx` | 80 | **8090** | **Public to Host / LAN** |
| Core Backend API | `standard_backend` | 3000 | None | Isolated to `standard_network` |
| Ephemeral Cache | `standard_redis` | 6379 | None | Isolated to `standard_network` |
| Master Database | `standard_postgres`| 5432 | None | Isolated to `standard_network` |
| External SMTP Relay | Cloud Provider | 587 | None | Outbound TLS connection only |

---

### 4. INCLUDED DOCUMENTATION
- `docs/SECURITY_ARCHITECTURE.md`: Complete system architecture specification, flowcharts, and sequence diagrams.
- `docs/IT_SECURITY_CHECKLIST.md`: Verification checklist for corporate IT auditors.
- `docs/LEGAL_NOTICE_AND_IP.md`: Proprietary License, Intellectual Property Rights & Terms of Evaluation.
- `docs/HUONG_DAN_CAU_HINH_SMTP.md`: SMTP & email OTP configuration guide (`scripts/config-smtp.bat`).
