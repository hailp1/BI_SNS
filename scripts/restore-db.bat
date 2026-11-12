@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul
cd /d "%~dp0.."

set "DB_USER=cj_sec_admin"
set "DB_NAME=cj_enterprise_db"
set "REDIS_PASS="

if exist ".env" (
    for /f "usebackq tokens=1,* delims==" %%A in (".env") do (
        set "KEY=%%A"
        set "VAL=%%B"
        if "!KEY!"=="POSTGRES_USER" set "DB_USER=!VAL!"
        if "!KEY!"=="POSTGRES_DB" set "DB_NAME=!VAL!"
        if "!KEY!"=="REDIS_PASSWORD" set "REDIS_PASS=!VAL!"
    )
)

set "DUMP_FILE=%~1"
if "%DUMP_FILE%"=="" if exist "backups\cj_enterprise_latest.dump" set "DUMP_FILE=backups\cj_enterprise_latest.dump"
if "%DUMP_FILE%"=="" if exist "G:\My Drive\BI_SNS_Sync\cj_enterprise_latest.dump" set "DUMP_FILE=G:\My Drive\BI_SNS_Sync\cj_enterprise_latest.dump"
if "%DUMP_FILE%"=="" if exist "G:\Drive cua toi\BI_SNS_Sync\cj_enterprise_latest.dump" set "DUMP_FILE=G:\Drive cua toi\BI_SNS_Sync\cj_enterprise_latest.dump"
if "%DUMP_FILE%"=="" if exist "%USERPROFILE%\Google Drive\BI_SNS_Sync\cj_enterprise_latest.dump" set "DUMP_FILE=%USERPROFILE%\Google Drive\BI_SNS_Sync\cj_enterprise_latest.dump"

if "%DUMP_FILE%"=="" (
    echo [ERROR] Khong tim thay file .dump!
    echo Hay dat file vao "backups\cj_enterprise_latest.dump" hoac keo-tha file .dump vao restore-db.bat.
    pause
    exit /b 1
)
if not exist "%DUMP_FILE%" (
    echo [ERROR] Khong ton tai file: "%DUMP_FILE%"
    pause
    exit /b 1
)

echo =====================================================================
echo   CJ ENTERPRISE SNS - KHOI PHUC DATABASE POSTGRESQL TU FILE .DUMP
echo =====================================================================
echo [*] File nguon: "%DUMP_FILE%"

echo [1/4] Kiem tra va dam bao Docker stack dang chay...
docker compose up -d standard_postgres standard_redis >nul 2>&1
timeout /t 3 /nobreak >nul

echo [2/4] Tam dung standard_backend de tranh giu lock DB...
docker compose stop standard_backend >nul 2>&1

echo [3/4] Dang nap file .dump vao PostgreSQL (%DB_NAME%)...
docker cp "%DUMP_FILE%" standard_postgres:/tmp/restore.dump
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Khong the copy file vao container standard_postgres!
    docker compose start standard_backend >nul 2>&1
    pause
    exit /b 1
)

docker exec standard_postgres pg_restore -U "%DB_USER%" -d "%DB_NAME%" --clean --if-exists --no-owner --no-privileges /tmp/restore.dump
set "RESTORE_RC=%ERRORLEVEL%"
docker exec standard_postgres rm -f /tmp/restore.dump >nul 2>&1

if %RESTORE_RC% neq 0 (
    echo [WARN] pg_restore tra ve ma %RESTORE_RC% (mot so canh bao DROP khi DB moi co the bo qua neu du lieu duoi day du).
)

echo [4/4] Khoi dong lai backend & xoa cache Redis...
docker compose start standard_backend
if not "%REDIS_PASS%"=="" (
    docker exec standard_redis redis-cli --no-auth-warning -a "%REDIS_PASS%" FLUSHDB >nul 2>&1
)

echo.
echo [*] Kiem tra so lieu sau khi nap:
docker exec standard_postgres psql -U "%DB_USER%" -d "%DB_NAME%" -c "SELECT meta_value AS data_refresh_date FROM datamart.etl_metadata WHERE meta_key='data_refresh_date'; SELECT COUNT(*) AS total_datasets, COALESCE(SUM(row_count),0) AS total_rows FROM datamart.etl_dataset_stats; SELECT COUNT(*) AS total_users FROM iam.users;"

echo.
echo [OK] Hoan tat! Truy cap: http://localhost:8090 (nhan Ctrl+F5 neu trinh duyet da mo truoc do).
if "%CI%"=="" if "%NO_PAUSE%"=="" pause
endlocal
