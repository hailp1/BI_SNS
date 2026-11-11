@echo off
chcp 65001 >nul
echo =====================================================================
echo    CJ FOODS ENTERPRISE - SAO LUU DU LIEU DATABASE TRON GOI
echo =====================================================================
echo.
echo Dang trich xuat toan bo Database tu container standard_postgres...
docker exec standard_postgres pg_dump -U cj_sec_admin -d cj_enterprise_db -f /tmp/backup_live.sql
docker cp standard_postgres:/tmp/backup_live.sql "%~dp0database\real_database_dump.sql"

echo.
echo Da sao luu thanh cong file Database moi nhat tai:
echo %~dp0database\real_database_dump.sql
echo.
pause
