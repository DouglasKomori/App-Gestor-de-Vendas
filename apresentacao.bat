@echo off
rem Sobe o projeto inteiro no Docker. Depois abra http://localhost:8080 no navegador.
rem Para parar: feche esta janela ou aperte Ctrl+C.
cd /d "%~dp0"
echo Subindo banco, API e app... a primeira vez demora alguns minutos.
echo Quando aparecer "API rodando", abra http://localhost:8080
echo.
docker compose -f docker-compose.apresentacao.yml up --build
pause
