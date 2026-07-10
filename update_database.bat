@echo off
title Odd Realm Database Updater
echo ===================================================
echo   ODD REALM DATABASE EXPLORER - ONE-CLICK UPDATER
echo ===================================================
echo.
echo 1. Launching AssetRipper GUI...
echo.
echo 2. INSIDE ASSETRIPPER:
echo    - Select "File > Open Folder" and choose:
echo      E:\Program Files (x86)\Steam\steamapps\common\Odd Realm\OddRealm_Data
echo    - Select "Export > Export All Files" and choose this folder:
echo      %~dp0game_asset_export\ExportedProject
echo.
echo 3. Once the export is complete, CLOSE the AssetRipper window
echo    to let this script finish.
echo.
echo Launching GUI now. This window will pause until you close the GUI...
echo.

:: Launch AssetRipper and wait for the process to exit
start /wait AssetRipper.GUI.Free.exe

echo.
echo ===================================================
echo   ASSET EXPORT COMPLETE - HARVESTING AND CLEANING
echo ===================================================
echo.
call npm run sync-game-data
echo.
echo ===================================================
echo   DATABASE COMPILATION AND CLEANUP COMPLETE!
echo ===================================================
echo.
pause
