@echo off
title Online Retail DWM System - Launcher
echo =======================================================================
echo Online Retail Customer Segmentation and Product Recommendation System
echo Data Warehousing & Data Mining Academic Project Launcher
echo =======================================================================
echo.

echo [1/4] Verifying project environment...
where python >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [WARNING] 'python' command not found in PATH. Please verify Python 3.10+ is installed.
)

where java >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [WARNING] 'java' command not found in PATH. Please verify Java 17+ is installed.
)

where npm >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [WARNING] 'npm' command not found in PATH. Please verify Node.js 18+ is installed.
)

echo.
echo [2/4] Starting Python FastAPI Data Mining Engine (Port 8000)...
start "Python FastAPI Engine (Port 8000)" cmd /k "cd /d \"%~dp0python-service\" && run.bat"
timeout /t 3 /nobreak >nul

echo [3/4] Starting Spring Boot 3 Backend (Port 8080)...
start "Spring Boot Backend (Port 8080)" cmd /k "cd /d \"%~dp0backend\" && run.bat"
timeout /t 6 /nobreak >nul

echo [4/4] Starting React + Vite Frontend (Port 5173)...
start "React Vite Frontend (Port 5173)" cmd /k "cd /d \"%~dp0frontend\" && run.bat"
timeout /t 3 /nobreak >nul

echo.
echo =======================================================================
echo All services launched!
echo.
echo Web Application: http://localhost:5173
echo Spring Boot API: http://localhost:8080/api/dashboard/stats
echo Python FastAPI:  http://localhost:8000/docs
echo =======================================================================
echo Opening application in browser...
start http://localhost:5173

pause
