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

for /f %%I in ('powershell -NoProfile -Command "Get-Date -Format yyyyMMdd_HHmmss"') do set "TS=%%I"
set "OUT_FILE=backups\cj_enterprise_%TS%.sql"

echo [*] Dang sao luu co so du lieu PostgreSQL (%DB_NAME%)...
docker exec standard_postgres pg_dump -U "%DB_USER%" -d "%DB_NAME%" --clean --if-exists > "%OUT_FILE%"
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Sao luu that bai! Kiem tra container standard_postgres dang chay.
    if exist "%OUT_FILE%" del "%OUT_FILE%"
    exit /b 1
)

echo [OK] Da sao luu thanh cong vao: %OUT_FILE%
endlocal
