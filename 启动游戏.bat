@echo off
chcp 65001 >nul
title 神之手：最后的防线 - 本地测试服务器

echo.
echo ========================================
echo   神之手：最后的防线
echo   God Hand: Last Defense
echo ========================================
echo.
echo 正在启动本地服务器...
echo 服务器地址: http://localhost:8888
echo.
echo 按 Ctrl+C 可停止服务器
echo ========================================
echo.

:: 延迟3秒后自动打开浏览器
start "" cmd /c "timeout /t 3 /nobreak >nul && start http://localhost:8888"

:: 启动服务器
npx -y serve . -p 8888

pause
