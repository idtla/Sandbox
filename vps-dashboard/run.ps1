# Genera el dashboard del VPS: recoge datos por SSH, los renderiza y abre el HTML.
#
#   .\run.ps1              # captura + dashboard + abrir en el navegador
#   .\run.ps1 -NoOpen      # solo generar
#   .\run.ps1 -Host otro   # contra otro host del ~/.ssh/config

param(
  [string]$HostAlias = "knowmad-claude",
  [switch]$NoOpen
)

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot
$raw  = Join-Path $root "last-capture.txt"
$out  = Join-Path $root "dashboard.html"

Write-Host "Recogiendo estado de $HostAlias ..." -ForegroundColor Cyan
$collector = Join-Path $root "collect.sh"

# El script se envía en base64: por el pipe de PowerShell viajaría con BOM y
# saltos CRLF, y bash se atraganta con ambos.
$src = [System.IO.File]::ReadAllText($collector).TrimStart([char]0xFEFF) -replace "`r`n", "`n"
$b64 = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($src))

# El colector es de solo lectura; se ejecuta con sudo para poder leer journal,
# ufw y los ficheros de /etc que el usuario normal no ve.
ssh -o BatchMode=yes -o ConnectTimeout=30 $HostAlias "echo $b64 | base64 -d | sudo -n bash" |
  Set-Content -Path $raw -Encoding utf8

if (-not (Select-String -Path $raw -Pattern '##::SECTION::end' -Quiet)) {
  Write-Host "La captura no llegó completa. Revisa la conexión con $HostAlias." -ForegroundColor Red
  exit 1
}

node (Join-Path $root "render.mjs") $raw $out
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

if (-not $NoOpen) { Start-Process $out }
