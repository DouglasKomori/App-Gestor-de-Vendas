# Monta o "kit" da apresentação: tudo o que o apresentacao.bat precisa para rodar o projeto
# num PC sem instalar nada pelo npm nem pelo Docker Hub.
#
#   powershell -ExecutionPolicy Bypass -File kit\preparar-kit.ps1            # só gera
#   powershell -ExecutionPolicy Bypass -File kit\preparar-kit.ps1 -Publicar  # gera e envia ao GitHub
#
# Gera, na pasta de destino (padrão: Área de Trabalho\kit-apresentacao):
#   gestor-vendas.zip    projeto + dependências do app já instaladas + Node deste PC
#   imagens-docker.tar   imagens do MySQL, da API e da versão web
#   expo-go.apk          Expo Go compatível com o SDK do app, para instalar no emulador
# Com -Publicar, envia os três para o release "kit" do GitHub, de onde o apresentacao.bat baixa.
# Rode de novo sempre que mudar o código do app ou da API.

param(
    [string]$Destino = (Join-Path ([Environment]::GetFolderPath('Desktop')) 'kit-apresentacao'),
    [switch]$Publicar
)

$ErrorActionPreference = 'Stop'
$app = Split-Path $PSScriptRoot -Parent          # pasta "app" (raiz do repositório)
$compose = Join-Path $app 'docker-compose.apresentacao.yml'
$tar = Join-Path $env:SystemRoot 'System32\tar.exe'
$expoGoUrl = 'https://github.com/expo/expo-go-releases/releases/download/Expo-Go-58.0.5/Expo-Go-58.0.5.apk'

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
$node = Split-Path (Get-Command node).Source -Parent   # ex.: C:\Program Files\nodejs
Write-Host "Node incluído: $(node -v) ($node)"
# O apresentacao.bat procura o Node numa pasta chamada "nodejs" (o tar do Windows não sabe renomear).
if ((Split-Path $node -Leaf) -ne 'nodejs') {
    $copia = Join-Path $env:TEMP 'kit-apresentacao-node\nodejs'
    if (Test-Path $copia) { Remove-Item $copia -Recurse -Force }
    Copy-Item $node $copia -Recurse
    $node = $copia
}
$zip = Join-Path $Destino 'gestor-vendas.zip'
if (Test-Path $zip) { Remove-Item $zip -Force }

# expo-image/prebuilds só tem arquivos de iOS, com caminhos longos demais para o Windows.
& $tar -a -c -f $zip `
    --exclude 'app/api/node_modules' --exclude 'app/api/.env' --exclude 'app/api/src/generated' `
    --exclude 'app/api/.agents' --exclude 'app/api/.claude' --exclude 'app/api/.windsurf' `
    --exclude 'app/mobile/.env' --exclude 'app/mobile/.expo' `
    --exclude 'app/mobile/node_modules/expo-image/prebuilds' `
    -C (Split-Path $app -Parent) `
    'app/api' 'app/mobile' 'app/docker-compose.apresentacao.yml' 'app/README.md' `
    -C (Split-Path $node -Parent) 'nodejs'
Checar 'tar (zip)'

Passo 'Expo Go para o emulador'
$apk = Join-Path $Destino 'expo-go.apk'
if (-not (Test-Path $apk)) {
    curl.exe -L --fail -o $apk $expoGoUrl; Checar 'download do Expo Go'
}

# Restos da versão antiga do kit (pendrive).
Remove-Item (Join-Path $Destino 'APRESENTACAO.bat') -ErrorAction SilentlyContinue

$arquivos = 'gestor-vendas.zip', 'imagens-docker.tar', 'expo-go.apk' | ForEach-Object { Join-Path $Destino $_ }

if ($Publicar) {
    Passo 'Enviando para o release "kit" do GitHub (depende da sua internet)'
    Push-Location $app
    gh release view kit *> $null
    if ($LASTEXITCODE -ne 0) {
        gh release create kit --title 'Kit da apresentação' `
            --notes 'Arquivos baixados pelo apresentacao.bat. Gerados por kit/preparar-kit.ps1.'
        Checar 'gh release create'
    }
    gh release upload kit @arquivos --clobber; Checar 'gh release upload'
    Pop-Location
}

Passo 'Pronto'
Get-ChildItem $arquivos | Select-Object Name, @{ n = 'Tamanho (MB)'; e = { [math]::Round($_.Length / 1MB) } } | Format-Table -AutoSize
