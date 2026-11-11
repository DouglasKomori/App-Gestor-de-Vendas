# Monta o kit da apresentação: tudo o que é preciso para rodar o projeto num PC sem internet.
#
#   powershell -ExecutionPolicy Bypass -File pendrive\preparar-pendrive.ps1
#
# Gera, na pasta de destino (padrão: Área de Trabalho\kit-apresentacao):
#   APRESENTACAO.bat     o que se roda no outro PC (dois cliques)
#   gestor-vendas.zip    projeto + dependências do app já instaladas + Node deste PC
#   imagens-docker.tar   imagens do MySQL, da API e da versão web
# Copie esses três arquivos para o pendrive.

param(
    [string]$Destino = (Join-Path ([Environment]::GetFolderPath('Desktop')) 'kit-apresentacao')
)

$ErrorActionPreference = 'Stop'
$app = Split-Path $PSScriptRoot -Parent          # pasta "app" (raiz do repositório)
$compose = Join-Path $app 'docker-compose.apresentacao.yml'
$tar = Join-Path $env:SystemRoot 'System32\tar.exe'

function Passo($texto) { Write-Host "`n== $texto" -ForegroundColor Cyan }
function Checar($oque) { if ($LASTEXITCODE -ne 0) { throw "Falhou: $oque" } }

New-Item -ItemType Directory -Force $Destino | Out-Null

Passo 'Conferindo o Docker'
docker info *> $null
if ($LASTEXITCODE -ne 0) { throw 'O Docker não está rodando. Abra o Docker Desktop e rode de novo.' }

Passo 'Gerando as imagens (banco, API e web) com o código atual'
docker pull mysql:8.4; Checar 'docker pull mysql:8.4'
docker compose -f $compose build; Checar 'docker compose build'

Passo 'Salvando as imagens em imagens-docker.tar (alguns minutos)'
docker save -o (Join-Path $Destino 'imagens-docker.tar') mysql:8.4 gestor-vendas-apresentacao-api gestor-vendas-apresentacao-web
Checar 'docker save'

Passo 'Conferindo as dependências do app'
$mobile = Join-Path $app 'mobile'
if (-not (Test-Path (Join-Path $mobile 'node_modules\.bin\expo.cmd'))) {
    Push-Location $mobile
    npm ci; Checar 'npm ci'
    Pop-Location
}

Passo 'Compactando projeto + Node em gestor-vendas.zip (alguns minutos)'
# expo-image/prebuilds só tem arquivos de iOS, com caminhos maiores que o limite de 260
# caracteres do Windows (o tar não consegue nem ler). O Expo Go no Android não precisa deles.
$node = Split-Path (Get-Command node).Source -Parent   # ex.: C:\Program Files\nodejs
Write-Host "Node incluído: $(node -v) ($node)"
# O APRESENTACAO.bat procura o Node numa pasta chamada "nodejs" (o tar do Windows não sabe renomear).
if ((Split-Path $node -Leaf) -ne 'nodejs') {
    $copia = Join-Path $env:TEMP 'kit-apresentacao-node\nodejs'
    if (Test-Path $copia) { Remove-Item $copia -Recurse -Force }
    Copy-Item $node $copia -Recurse
    $node = $copia
}
$zip = Join-Path $Destino 'gestor-vendas.zip'
if (Test-Path $zip) { Remove-Item $zip -Force }

& $tar -a -c -f $zip `
    --exclude 'app/api/node_modules' --exclude 'app/api/.env' --exclude 'app/api/src/generated' `
    --exclude 'app/api/.agents' --exclude 'app/api/.claude' --exclude 'app/api/.windsurf' `
    --exclude 'app/mobile/.env' --exclude 'app/mobile/.expo' `
    --exclude 'app/mobile/node_modules/expo-image/prebuilds' `
    -C (Split-Path $app -Parent) `
    'app/api' 'app/mobile' 'app/docker-compose.apresentacao.yml' 'app/README.md' `
    -C (Split-Path $node -Parent) 'nodejs'
Checar 'tar (zip)'

Copy-Item (Join-Path $PSScriptRoot 'APRESENTACAO.bat') $Destino -Force

Passo 'Pronto'
Get-ChildItem $Destino | Select-Object Name, @{ n = 'Tamanho (MB)'; e = { [math]::Round($_.Length / 1MB) } } | Format-Table -AutoSize
Write-Host "Copie os três arquivos de $Destino para o pendrive."
