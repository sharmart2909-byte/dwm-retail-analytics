@echo off
echo =======================================================================
echo Initializing MySQL Database for Online Retail Data Warehouse
echo =======================================================================

set MYSQL_CMD=mysql
where mysql >nul 2>nul
if %ERRORLEVEL% neq 0 (
    if exist "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" (
        set MYSQL_CMD="C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"
    ) else (
        echo [ERROR] MySQL CLI not found. Please ensure MySQL 8 is installed and in PATH.
        pause
        exit /b 1
    )
)

echo [1/2] Creating database schema and star schema tables...
%MYSQL_CMD% -u root -p < schema.sql
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Schema creation failed. Please verify MySQL root password.
    pause
    exit /b 1
)

echo [2/2] Loading seed data into star schema...
%MYSQL_CMD% -u root -p retail_dw < seed_data.sql
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Seed data loading failed.
    pause
    exit /b 1
)

echo.
echo =======================================================================
echo MySQL retail_dw database initialized successfully!
echo =======================================================================
pause
