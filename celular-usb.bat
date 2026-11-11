@echo off
rem Abre o app no celular Android (Expo Go) ligado no PC pelo cabo USB.
rem O celular acessa o PC pelo cabo, entao a rede/Wi-Fi do lugar nao importa.
rem
rem Antes: deixe o apresentacao.bat rodando (banco + API) e ligue o celular no USB
rem com a "Depuracao USB" ativada (Configuracoes > Opcoes do desenvolvedor).
cd /d "%~dp0mobile"

rem Procura o adb: no PATH ou na pasta padrao do Android Studio.
set "ADB=adb"
where adb >nul 2>nul
if errorlevel 1 set "ADB=%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe"
if not exist "%ADB%" if not "%ADB%"=="adb" (
  echo Nao encontrei o adb. Ele vem com o Android Studio, em:
  echo   %LOCALAPPDATA%\Android\Sdk\platform-tools
  pause
  exit /b 1
)

echo Celulares conectados:
"%ADB%" devices
echo Se o seu celular nao apareceu acima como "device", confira o cabo e a Depuracao USB.
echo Se aparecer "unauthorized", aceite o aviso que surgiu na tela do celular.
echo.

rem "localhost" no celular passa a ser o PC: 8081 = Expo, 3333 = API.
"%ADB%" reverse tcp:8081 tcp:8081
"%ADB%" reverse tcp:3333 tcp:3333

where node >nul 2>nul
if errorlevel 1 (
  echo Nao encontrei o Node.js neste PC. Use o kit do pendrive ^(pendrive\APRESENTACAO.bat^).
  pause
  exit /b 1
)

rem Instala as dependencias do zero se faltarem ou se uma instalacao anterior ficou pela metade.
if exist node_modules\.bin\expo.cmd goto dependencias_ok
echo Instalando dependencias do app, a primeira vez demora...
if exist node_modules rmdir /s /q node_modules
call npm ci --no-audit --no-fund
if errorlevel 1 (
  echo.
  echo ERRO ao instalar as dependencias ^(provavelmente a internet bloqueou o npm^).
  echo Use o kit do pendrive ^(pendrive\APRESENTACAO.bat^), que nao precisa de internet.
  if exist node_modules rmdir /s /q node_modules
  pause
  exit /b 1
)
:dependencias_ok

rem Vale so para esta janela: o mobile\.env (IP do Wi-Fi de casa) fica como esta.
set "EXPO_PUBLIC_API_URL=http://localhost:3333"
set "EXPO_NO_TELEMETRY=1"
rem EXPO_OFFLINE: o Expo nao tenta acessar a internet (redes bloqueadas travam nisso).
set "EXPO_OFFLINE=1"
call node_modules\.bin\expo.cmd start --localhost --android
pause
