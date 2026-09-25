@echo off
setlocal

:: Settings
set BIN_DIR=bin
set APP_NAME=rtu-server
set MAIN_FILE=cmd/api/main.go
set LDFLAGS=-s -w

echo ========================================
echo   Building Go Server Binaries
echo ========================================

:: Clean previous builds
if exist %BIN_DIR% (
    echo [CLEAN] Removing previous builds...
    rd /s /q %BIN_DIR%
)
mkdir %BIN_DIR%

:: Build for Windows
echo [1/2] Building for Windows (amd64)...
set GOOS=windows
set GOARCH=amd64
set CGO_ENABLED=0
go build -ldflags="%LDFLAGS%" -o %BIN_DIR%/%APP_NAME%-windows.exe %MAIN_FILE%
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Windows build failed!
    pause
    exit /b %errorlevel%
)

:: Build for Linux
echo [2/2] Building for Linux (amd64)...
set GOOS=linux
set GOARCH=amd64
set CGO_ENABLED=0
go build -ldflags="%LDFLAGS%" -o %BIN_DIR%/%APP_NAME%-linux %MAIN_FILE%
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Linux build failed!
    pause
    exit /b %errorlevel%
)

echo.
echo ========================================
echo   Build Complete! 
echo ========================================
echo Binaries locations:
echo - %BIN_DIR%/%APP_NAME%-windows.exe
echo - %BIN_DIR%/%APP_NAME%-linux
echo.
pause
