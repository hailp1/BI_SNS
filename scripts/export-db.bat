@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul
cd /d "%~dp0.."

set "DB_USER=cj_sec_admin"
set "DB_NAME=cj_enterprise_db"

if exist ".env" (
    for /f "usebackq tokens=1,* delims==" %%A in (".env") do (
        set "KEY=%%A"
        set "VAL=%%B"
        if "!KEY!"=="POSTGRES_USER" set "DB_USER=!VAL!"
        if "!KEY!"=="POSTGRES_DB" set "DB_NAME=!VAL!"
    )
)

if not exist "backups" mkdir "backups"
set "OUT_FILE=backups\cj_enterprise_latest.dump"

echo =====================================================================
echo   CJ ENTERPRISE SNS - XUAT DATABASE POSTGRESQL (.DUMP NEN)
echo =====================================================================
echo [*] Dang kiem tra container standard_postgres...
docker ps --filter "name=standard_postgres" --filter "status=running" --format "{{.Names}}" | findstr /I "standard_postgres" >nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Container standard_postgres chua chay. Hay chay: docker compose up -d
    pause
    exit /b 1
)

echo [*] Dang xuat database "%DB_NAME%" bang pg_dump -Fc ...
docker exec standard_postgres pg_dump -U "%DB_USER%" -d "%DB_NAME%" -Fc -f /tmp/cj_enterprise_export.dump
if %ERRORLEVEL% neq 0 (
    echo [ERROR] pg_dump that bai!
    pause
    exit /b 1
)

docker cp standard_postgres:/tmp/cj_enterprise_export.dump "%OUT_FILE%.tmp"
if %ERRORLEVEL% neq 0 (
    docker exec standard_postgres rm -f /tmp/cj_enterprise_export.dump >nul 2>&1
    echo [ERROR] Khong the copy file dump tu container ra ngoai!
    pause
    exit /b 1
)
docker exec standard_postgres rm -f /tmp/cj_enterprise_export.dump >nul 2>&1
move /Y "%OUT_FILE%.tmp" "%OUT_FILE%" >nul

for %%F in ("%OUT_FILE%") do set "DUMP_BYTES=%%~zF"
echo [OK] Da xuat thanh cong: %CD%\%OUT_FILE% (!DUMP_BYTES! bytes)

set "SYNC_DIR=%~1"
if "%SYNC_DIR%"=="" (
    if exist "G:\My Drive\" set "SYNC_DIR=G:\My Drive\BI_SNS_Sync"
    if "%SYNC_DIR%"=="" if exist "G:\Drive cua toi\" set "SYNC_DIR=G:\Drive cua toi\BI_SNS_Sync"
    if "%SYNC_DIR%"=="" if exist "%USERPROFILE%\Google Drive\" set "SYNC_DIR=%USERPROFILE%\Google Drive\BI_SNS_Sync"
)

if not "%SYNC_DIR%"=="" (
    if not exist "%SYNC_DIR%" mkdir "%SYNC_DIR%" >nul 2>&1
    if exist "%SYNC_DIR%\" (
        echo [*] Dang dong bo sang thu muc Google Drive: "%SYNC_DIR%" ...
        copy /Y "%OUT_FILE%" "%SYNC_DIR%\cj_enterprise_latest.dump" >nul
        echo [OK] Da copy vao Google Drive Sync: "%SYNC_DIR%\cj_enterprise_latest.dump"
    ) else (
        echo [WARN] Khong truy cap duoc thu muc sync: "%SYNC_DIR%". Ban co the upload thu cong file "%OUT_FILE%".
    )
) else (
    echo [INFO] Khong phat hien o Google Drive Desktop ^(G:\^). Hay upload file "%OUT_FILE%" len Google Drive.
)

echo.
if "%CI%"=="" if "%NO_PAUSE%"=="" pause
endlocal

