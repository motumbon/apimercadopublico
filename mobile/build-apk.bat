@echo off
echo ========================================
echo   Seguimiento OC - Build APK
echo ========================================
echo.

echo [1/3] Verificando dependencias...
call npm install

echo.
echo [2/3] Iniciando build con EAS...
echo.
echo NOTA: Si es la primera vez, ejecuta primero:
echo   eas login
echo   eas build:configure
echo.

call eas build -p android --profile preview

echo.
echo ========================================
echo   Build completado!
echo   Revisa el link de descarga en la consola
echo   o en https://expo.dev
echo ========================================
pause
