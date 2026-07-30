@echo off
title CCTV POLICE9 - Web Server
cd /d "%~dp0"
echo.
echo CCTV POLICE9 กำลังเริ่มทำงาน...
start "CCTV POLICE9" /b node serve-local.js
timeout /t 2 /nobreak >nul
start "" http://localhost:3000/login.html
echo.
echo เปิดระบบแล้ว กรุณาอย่าปิดหน้าต่างนี้ขณะใช้งาน
echo หากต้องการหยุดระบบ ให้ปิดหน้าต่างนี้
pause >nul
