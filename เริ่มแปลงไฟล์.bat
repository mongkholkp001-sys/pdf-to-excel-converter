@echo off
title สพร. Document to Excel Converter
echo =======================================================
echo     กำลังเริ่มต้นระบบแปลงไฟล์ สพร. (Document to Excel)
echo =======================================================
echo.
echo [1/2] กำลังเปิดหน้าแอปพลิเคชันบนเว็บเบราว์เซอร์...
start http://localhost:3000
echo [2/2] กำลังเริ่มต้นเซิร์ฟเวอร์หลังบ้าน...
node server.js
pause
