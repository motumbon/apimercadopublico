@echo off
title Seguimiento Licitaciones - Servidor
color 0A

echo ============================================
echo   Iniciando Seguimiento de Licitaciones
echo ============================================
echo.

cd /d "c:\Users\pablo\OneDrive\Escritorio\Seguimiento OC"

echo [1/2] Iniciando servidor backend...
start "Backend" cmd /k "node server/index.js"

echo [2/2] Iniciando frontend...
timeout /t 3 /nobreak > nul
start "Frontend" cmd /k "cd client && npm run dev"

echo.
echo ============================================
echo   Servidores iniciados correctamente!
echo ============================================
echo.
echo   Backend:  http://localhost:3001
echo   Frontend: http://localhost:5173
echo.
echo   Abriendo navegador...
echo ============================================

timeout /t 5 /nobreak > nul
start http://localhost:5173

echo.
echo Presiona cualquier tecla para cerrar esta ventana...
pause > nul
