@echo off
setlocal
title Gestor de Vendas - apresentacao
rem ==========================================================================
rem  Roda o Gestor de Vendas sem internet, a partir do kit do pendrive.
rem  O kit traz: Node proprio, dependencias do app ja instaladas e as imagens
rem  do Docker. O PC so precisa de Docker Desktop e do Android Studio (adb).
rem ==========================================================================

set "KIT=%~dp0"
rem Pasta de nome curto: alguns arquivos da node_modules tem caminhos longos e o
rem Windows nao aceita caminhos com mais de 260 caracteres.
set "PASTA=%USERPROFILE%\gv"
set "PROJETO=%PASTA%\app"
set "COMPOSE=%PROJETO%\docker-compose.apresentacao.yml"

rem ---- 1. Copia o projeto do pendrive para o PC (so na primeira vez) -------
if exist "%PROJETO%\mobile\node_modules\.bin\expo.cmd" goto docker
echo [1/5] Copiando o projeto para %PASTA% ... (leva de 1 a 3 minutos)
if not exist "%PASTA%" mkdir "%PASTA%"
"%SystemRoot%\System32\tar.exe" -xf "%KIT%gestor-vendas.zip" -C "%PASTA%"
if errorlevel 1 (
  echo.
  echo ERRO ao copiar o projeto. Confira se o gestor-vendas.zip esta no pendrive
  echo junto com este arquivo e se ha espaco livre no PC.
  pause
  exit /b 1
)

:docker
rem ---- 2. Docker ------------------------------------------------------------
echo [2/5] Conferindo o Docker...
docker info >nul 2>nul
if errorlevel 1 (
  echo.
  echo O Docker nao esta rodando. Abra o Docker Desktop, espere aparecer
  echo "Engine running" e aperte uma tecla aqui para tentar de novo.
  pause
  goto docker
)

set "FALTA_IMAGEM="
docker image inspect mysql:8.4 >nul 2>nul || set "FALTA_IMAGEM=1"
docker image inspect gestor-vendas-apresentacao-api >nul 2>nul || set "FALTA_IMAGEM=1"
docker image inspect gestor-vendas-apresentacao-web >nul 2>nul || set "FALTA_IMAGEM=1"
if defined FALTA_IMAGEM (
  echo       Carregando as imagens do pendrive... ^(leva alguns minutos^)
  docker load -i "%KIT%imagens-docker.tar"
  if errorlevel 1 (
    echo.
    echo ERRO ao carregar as imagens. Confira se o imagens-docker.tar esta no pendrive.
    pause
    exit /b 1
  )
)

rem ---- 3. Banco + API + versao web (sem baixar nada) -------------------------
echo [3/5] Subindo banco e API...
docker compose -f "%COMPOSE%" up -d --no-build --pull never
if errorlevel 1 (
  echo.
  echo ERRO ao subir os containers. Se a mensagem acima falar de port is already
  echo allocated, outro programa esta usando a porta 3333 ou 8080: feche-o.
  pause
  exit /b 1
)

echo       Esperando a API ficar pronta...
set /a TENTATIVAS=0
:espera_api
curl.exe -s http://localhost:3333/health 2>nul | find "ok" >nul
if not errorlevel 1 goto api_ok
set /a TENTATIVAS+=1
if %TENTATIVAS% geq 90 (
  echo.
  echo A API nao respondeu. Veja o erro com:
  echo   docker compose -f "%COMPOSE%" logs api
  pause
  exit /b 1
)
rem Espera ~2 segundos (o "timeout" do Windows falha em algumas janelas).
ping -n 3 127.0.0.1 >nul
goto espera_api
:api_ok
echo       API pronta. Plano B: o app tambem abre no navegador em http://localhost:8080

rem ---- 4. Celular (ou emulador) pelo USB -------------------------------------
echo [4/5] Procurando o celular...
set "ADB=adb"
where adb >nul 2>nul
if errorlevel 1 set "ADB=%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe"
if not "%ADB%"=="adb" if not exist "%ADB%" (
  echo.
  echo Nao encontrei o adb do Android Studio. Use o plano B: http://localhost:8080
  pause
  exit /b 1
)

:espera_celular
"%ADB%" get-state 2>nul | find "device" >nul
if not errorlevel 1 goto celular_ok
echo.
echo Nenhum celular encontrado. Confira:
echo   - o celular esta no cabo USB e com a "Depuracao USB" ativada;
echo   - voce aceitou o aviso "Permitir depuracao USB?" na tela do celular;
echo   - ou abra um emulador no Android Studio ^(Device Manager^).
echo Aperte uma tecla para procurar de novo.
pause >nul
goto espera_celular
:celular_ok

rem "localhost" no celular passa a ser este PC: 8081 = Expo, 3333 = API.
"%ADB%" reverse tcp:8081 tcp:8081 >nul
"%ADB%" reverse tcp:3333 tcp:3333 >nul

rem ---- 5. Expo, com o Node do kit e sem acessar a internet --------------------
echo [5/5] Abrindo o app no Expo Go...
set "PATH=%PASTA%\nodejs;%PATH%"
set "EXPO_PUBLIC_API_URL=http://localhost:3333"
set "EXPO_NO_TELEMETRY=1"
rem EXPO_OFFLINE: o Expo nao tenta acessar a internet (redes bloqueadas travam nisso).
set "EXPO_OFFLINE=1"
cd /d "%PROJETO%\mobile"
call node_modules\.bin\expo.cmd start --localhost --android
pause
