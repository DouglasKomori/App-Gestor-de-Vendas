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

if not exist node_modules (
  echo Instalando dependencias do app, a primeira vez demora...
  call npm install
)

rem Vale so para esta janela: o mobile\.env (IP do Wi-Fi de casa) fica como esta.
set "EXPO_PUBLIC_API_URL=http://localhost:3333"
call npx expo start --localhost --android
pause
