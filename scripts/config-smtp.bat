@echo off
chcp 65001 >nul
title CẤU HÌNH MÁY CHỦ EMAIL SMTP - CJ FOODS ENTERPRISE

echo ==============================================================================
echo   CÔNG CỤ THIẾT LẬP CẤU HÌNH EMAIL SMTP (ZERO TRUST 2FA) - CJ FOODS
echo ==============================================================================
echo.
echo Đang mở file cấu hình .env bằng Notepad...
echo Vui lòng điền thông tin SMTP của bạn, bấm Ctrl + S để LƯU, rồi ĐÓNG Notepad.
echo.

start /wait notepad "%~dp0..\.env"

echo.
echo ==============================================================================
echo Đang áp dụng cấu hình mới vào hệ thống máy chủ...
echo ==============================================================================
cd /d "%~dp0.."
docker compose up -d standard_backend

echo.
echo Kiểm tra trạng thái kết nối SMTP trong nhật ký hệ thống:
echo ------------------------------------------------------------------------------
timeout /t 2 >nul
docker logs standard_backend --tail 15
echo ------------------------------------------------------------------------------
echo.
echo Hoàn tất! Bấm phím bất kỳ để thoát.
pause >nul

