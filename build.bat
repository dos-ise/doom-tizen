@echo off
echo ================================================
echo Building and extracting Doom.wgt from Docker
echo ================================================
echo.

echo [1/6] Building Docker image...
docker build -t doom-tizen .
if errorlevel 1 (
    echo ERROR: Docker image build failed!
    pause
    exit /b 1
)

echo [2/6] Creating temporary container...
docker create --name doom-tmp doom-tizen
if errorlevel 1 (
    echo ERROR: Failed to create container!
    pause
    exit /b 1
)

echo [3/6] Starting container...
docker start doom-tmp
if errorlevel 1 (
    echo ERROR: Failed to start container!
    docker rm doom-tmp
    pause
    exit /b 1
)

echo [4/6] Waiting...
timeout /t 2 /nobreak >nul

echo [5/6] Copying Doom.wgt...
docker cp doom-tmp:/home/doom/Doom.wgt .
if errorlevel 1 (
    echo ERROR: Failed to copy file!
    docker stop doom-tmp
    docker rm doom-tmp
    pause
    exit /b 1
)

echo [6/6] Cleaning up...
docker stop doom-tmp
docker rm doom-tmp

echo.
echo ================================================
echo SUCCESS! Doom.wgt extracted successfully.
echo ================================================
pause