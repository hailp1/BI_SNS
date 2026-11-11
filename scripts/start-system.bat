@echo off
chcp 65001 >nul
title CJ Foods Enterprise - System Launcher

echo =====================================================================
echo    CJ FOODS ENTERPRISE STANDARD SYSTEM - ONE-CLICK LAUNCHER
echo =====================================================================
echo.

echo [1/3] Dang kiem tra ket noi Docker Engine...
docker info >nul 2>&1
if %errorlevel% neq 0 goto DOCKER_NOT_RUNNING

goto DOCKER_OK

:DOCKER_NOT_RUNNING
echo.
echo =====================================================================
echo [CANH BAO] DOCKER ENGINE CHUA DUOC KHOI DONG!
echo =====================================================================
echo.
echo Vui long mo ung dung Docker Desktop tren may truoc khi chay he thong.
echo Sau khi Docker hien Engine running, nhap dup lai file scripts\start-system.bat nay.
echo.
echo =====================================================================
echo.
pause
exit /b 1

:DOCKER_OK
echo [OK] Docker Engine dang hoat dong tot!
echo.
echo [2/3] Dang khoi dong cac cum container (Nginx, Backend, Redis, Postgres)...
docker compose -p cj_enterprise_standard -f "%~dp0..\docker-compose.yml" up -d
if %errorlevel% neq 0 (
    echo.
    echo [LOI] Khong the khoi dong Docker Compose!
    pause
    exit /b 1
)

echo.
echo Kiem tra trang thai cac dich vu:
docker ps --filter "name=standard_"

echo.
echo [3/3] Mo he thong tren trinh duyet...
start http://localhost:8090

echo.
echo =====================================================================
echo  HE THONG DA KHOI DONG THANH CONG TAI: http://localhost:8090
echo  Tai khoan dang nhap Test: admin / <xem cau hinh trong .env hoac doi mat khau sau khi dang nhap>
echo =====================================================================
pause

