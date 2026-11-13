@echo off
setlocal
title Gestor de Vendas - apresentacao
rem ==========================================================================
rem  Roda o Gestor de Vendas no emulador do Android Studio, com dois cliques.
rem
rem  Precisa so de: Docker Desktop, Android Studio com um aparelho virtual
rem  criado e acesso ao GitHub. Nada e instalado pelo npm nem pelo Docker Hub:
rem  o "kit" (projeto pronto + Node + imagens + Expo Go) vem do GitHub.
rem ==========================================================================

set "AQUI=%~dp0"
rem Pasta de nome curto: o Windows nao aceita caminhos com mais de 260 caracteres.
set "PASTA=%USERPROFILE%\gv"
set "PROJETO=%PASTA%\app"
set "COMPOSE=%PROJETO%\docker-compose.apresentacao.yml"
set "RELEASE=https://github.com/DouglasKomori/App-Gestor-de-Vendas/releases/download/kit"
if not exist "%PASTA%" mkdir "%PASTA%"

rem ---- 1. Projeto pronto (com dependencias e Node) ---------------------------
echo [1/6] Conferindo o projeto... ^(na primeira vez leva alguns minutos, nao feche a janela^)
call :pegar gestor-vendas.zip
if errorlevel 1 goto falhou
set "ZIP=%ARQ%"
rem Confere o conteudo de cada arquivo e conserta os estragados direto do .zip.
if not exist "%PASTA%\nodejs\node.exe" goto extrair_tudo
call :verificar
if "%VER%"=="0" goto docker
if "%VER%"=="2" goto baixar_de_novo

:extrair_tudo
call :extrair
if errorlevel 1 goto falhou
call :verificar
if "%VER%"=="0" goto docker
if not "%VER%"=="2" goto pc_estraga

:baixar_de_novo
rem O proprio .zip veio estragado: baixa de novo e tenta mais uma vez.
echo       Baixando o projeto de novo...
del "%ZIP%" 2>nul
call :pegar gestor-vendas.zip
if errorlevel 1 goto falhou
set "ZIP=%ARQ%"
call :extrair
if errorlevel 1 goto falhou
call :verificar
if "%VER%"=="0" goto docker

:pc_estraga
echo.
echo ERRO: os arquivos do projeto nao ficam inteiros neste PC. Um antivirus pode estar
echo mexendo na pasta %PASTA%. Plano B: o app no navegador, em http://localhost:8080
goto falhou

:docker
rem ---- 2. Docker ------------------------------------------------------------
echo [2/6] Conferindo o Docker...
docker info >nul 2>nul
if not errorlevel 1 goto docker_ok
if exist "%ProgramFiles%\Docker\Docker\Docker Desktop.exe" start "" "%ProgramFiles%\Docker\Docker\Docker Desktop.exe"
echo       Abrindo o Docker Desktop... espere ele ficar pronto.
:espera_docker
ping -n 4 127.0.0.1 >nul
docker info >nul 2>nul
if errorlevel 1 goto espera_docker
:docker_ok

set "FALTA_IMAGEM="
docker image inspect mysql:8.4 >nul 2>nul || set "FALTA_IMAGEM=1"
docker image inspect gestor-vendas-apresentacao-api >nul 2>nul || set "FALTA_IMAGEM=1"
docker image inspect gestor-vendas-apresentacao-web >nul 2>nul || set "FALTA_IMAGEM=1"
if not defined FALTA_IMAGEM goto imagens_ok
call :pegar imagens-docker.tar
if errorlevel 1 goto falhou
echo       Carregando as imagens no Docker... ^(alguns minutos^)
docker load -i "%ARQ%"
if errorlevel 1 (
  echo ERRO ao carregar as imagens no Docker.
  goto falhou
)
:imagens_ok

rem ---- 3. Banco + API + versao web ------------------------------------------
echo [3/6] Subindo banco e API...
docker compose -f "%COMPOSE%" up -d --no-build --pull never
if errorlevel 1 (
  echo ERRO ao subir os containers. Se a mensagem acima falar de port is already
  echo allocated, outro programa esta usando a porta 3333 ou 8080: feche-o.
  goto falhou
)
set /a TENTATIVAS=0
:espera_api
curl.exe -s http://localhost:3333/health 2>nul | find "ok" >nul
if not errorlevel 1 goto api_ok
set /a TENTATIVAS+=1
if %TENTATIVAS% geq 90 (
  echo A API nao respondeu. Veja o erro com:
  echo   docker compose -f "%COMPOSE%" logs api
  goto falhou
)
ping -n 3 127.0.0.1 >nul
goto espera_api
:api_ok
echo       API pronta. Plano B: o app tambem abre no navegador em http://localhost:8080

rem ---- 4. Emulador do Android Studio -----------------------------------------
echo [4/6] Preparando o emulador...
set "SDK=%LOCALAPPDATA%\Android\Sdk"
if defined ANDROID_SDK_ROOT set "SDK=%ANDROID_SDK_ROOT%"
if defined ANDROID_HOME set "SDK=%ANDROID_HOME%"
set "ADB=%SDK%\platform-tools\adb.exe"
set "EMU=%SDK%\emulator\emulator.exe"
if exist "%ADB%" goto sdk_ok
echo Nao encontrei o Android SDK em "%SDK%".
echo Abra o Android Studio uma vez, ou use o plano B no navegador.
start "" http://localhost:8080
goto falhou
:sdk_ok
"%ADB%" start-server >nul 2>nul

"%ADB%" get-state 2>nul | find "device" >nul
if not errorlevel 1 goto emulador_ok

set "AVD="
rem Primeiro aparelho virtual da lista (ignora linhas de log do tipo "INFO | ...").
"%EMU%" -list-avds 2>nul | findstr /v /c:"|" > "%TEMP%\gv-avds.txt"
set /p AVD=<"%TEMP%\gv-avds.txt"
if not defined AVD (
  echo.
  echo Nao ha nenhum aparelho virtual criado neste PC. No Android Studio:
  echo   More Actions ^(ou Tools^) ^> Device Manager ^> + ^> Create Virtual Device
  echo Depois rode este arquivo de novo. Plano B: http://localhost:8080
  goto falhou
)
echo       Ligando o emulador "%AVD%"... ^(pode levar 1 ou 2 minutos^)
start "Emulador" "%EMU%" -avd "%AVD%"
"%ADB%" wait-for-device
:espera_boot
"%ADB%" shell getprop sys.boot_completed 2>nul | find "1" >nul
if not errorlevel 1 goto emulador_ok
ping -n 3 127.0.0.1 >nul
goto espera_boot
:emulador_ok

rem ---- 5. Expo Go no emulador ------------------------------------------------
echo [5/6] Conferindo o Expo Go...
"%ADB%" shell pm list packages host.exp.exponent 2>nul | find "host.exp.exponent" >nul
if not errorlevel 1 goto expo_go_ok
call :pegar expo-go.apk
if errorlevel 1 goto falhou
echo       Instalando o Expo Go no emulador...
"%ADB%" install -r "%ARQ%"
if errorlevel 1 (
  echo ERRO ao instalar o Expo Go no emulador.
  goto falhou
)
:expo_go_ok

rem "localhost" no emulador passa a ser este PC: 8081 = Expo, 3333 = API.
"%ADB%" reverse tcp:8081 tcp:8081 >nul
"%ADB%" reverse tcp:3333 tcp:3333 >nul

rem ---- 6. Expo, com o Node do kit e sem acessar a internet --------------------
echo [6/6] Abrindo o app no Expo Go...
set "PATH=%PASTA%\nodejs;%PATH%"
set "EXPO_PUBLIC_API_URL=http://localhost:3333"
set "EXPO_NO_TELEMETRY=1"
rem EXPO_OFFLINE: o Expo nao tenta acessar a internet (redes bloqueadas travam nisso).
set "EXPO_OFFLINE=1"
cd /d "%PROJETO%\mobile"
call node_modules\.bin\expo.cmd start --localhost --android
pause
exit /b 0

:falhou
echo.
echo Algo deu errado ^(veja a mensagem acima^). Tire uma foto desta janela.
pause
exit /b 1

rem --------------------------------------------------------------------------
rem  :verificar  -> VER = 0 (inteiro), 2 (.zip estragado) ou outro (refazer copia).
rem --------------------------------------------------------------------------
:verificar
"%PASTA%\nodejs\node.exe" "%AQUI%kit\verificar-kit.js" "%ZIP%" "%PASTA%"
set "VER=%errorlevel%"
exit /b 0

rem --------------------------------------------------------------------------
rem  :extrair  -> descompacta o ZIP do zero em PASTA (app + nodejs).
rem --------------------------------------------------------------------------
:extrair
echo       Copiando o projeto para %PASTA% ... ^(1 a 3 minutos, nao feche a janela^)
if exist "%PROJETO%" rmdir /s /q "%PROJETO%"
if exist "%PASTA%\nodejs" rmdir /s /q "%PASTA%\nodejs"
"%SystemRoot%\System32\tar.exe" -xf "%ZIP%" -C "%PASTA%"
if errorlevel 1 (
  echo ERRO ao descompactar o projeto. Confira se ha espaco livre no disco.
  exit /b 1
)
exit /b 0

rem --------------------------------------------------------------------------
rem  :pegar ARQUIVO  -> deixa em ARQ o caminho do arquivo do kit.
rem  Usa o que estiver ao lado deste .bat ou ja baixado; senao baixa do GitHub.
rem --------------------------------------------------------------------------
:pegar
set "ARQ=%AQUI%%~1"
if exist "%ARQ%" exit /b 0
set "ARQ=%PASTA%\%~1"
if exist "%ARQ%" exit /b 0
echo       Baixando %~1 do GitHub...
curl.exe -L --fail --retry 3 -# -o "%ARQ%.part" "%RELEASE%/%~1"
if errorlevel 1 (
  if exist "%ARQ%.part" del "%ARQ%.part"
  echo ERRO ao baixar %~1 do GitHub. Confira a internet e tente de novo.
  exit /b 1
)
move /y "%ARQ%.part" "%ARQ%" >nul
exit /b 0
