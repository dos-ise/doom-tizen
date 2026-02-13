@echo off
echo ================================================
echo Doom.wgt aus Docker Container extrahieren
echo ================================================
echo.

echo [1/5] Erstelle temporaeren Container...
docker create --name doom-tmp doom-tizen
if errorlevel 1 (
    echo FEHLER: Container konnte nicht erstellt werden!
    pause
    exit /b 1
)

echo [2/5] Starte Container...
docker start doom-tmp
if errorlevel 1 (
    echo FEHLER: Container konnte nicht gestartet werden!
    docker rm doom-tmp
    pause
    exit /b 1
)

echo [3/5] Warte kurz...
timeout /t 2 /nobreak >nul

echo [4/5] Kopiere Doom.wgt...
docker cp doom-tmp:/home/doom/Doom.wgt .
if errorlevel 1 (
    echo FEHLER: Datei konnte nicht kopiert werden!
    docker stop doom-tmp
    docker rm doom-tmp
    pause
    exit /b 1
)

echo [5/5] Raeume auf...
docker stop doom-tmp
docker rm doom-tmp

echo.
echo ================================================
echo FERTIG! Doom.wgt wurde erfolgreich extrahiert.
echo ================================================
pause