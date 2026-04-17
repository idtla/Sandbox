#Requires -Version 5.1
<#
.SYNOPSIS
  Crea un ruleset en GitHub que exige el check del workflow block-pr-to-main (y bloquea force-push / borrado de main).

.PREREQUISITES
  winget install GitHub.cli
  gh auth login

.USAGE
  .\.github\scripts\setup-github-main-protection.ps1
  .\.github\scripts\setup-github-main-protection.ps1 -Owner idtla -Repo Sandbox

NOTA
  Tras el primer PR a main, GitHub registra el check "block-pr-to-main / block-merge-to-main".
  Si el POST del ruleset falla por contexto desconocido, añade el check manualmente en Settings → Rules.
#>
param(
  [string] $Owner = "idtla",
  [string] $Repo = "Sandbox"
)

$ErrorActionPreference = "Stop"

if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
  Write-Error "Instala GitHub CLI: winget install GitHub.cli  y ejecuta: gh auth login"
}

$rulesetName = "sandbox-main-readonly"

$existing = gh api "repos/$Owner/$Repo/rulesets" 2>$null | ConvertFrom-Json
if ($existing) {
  $dup = $existing | Where-Object { $_.name -eq $rulesetName }
  if ($dup) {
    Write-Host "Ya existe ruleset '$rulesetName' (id $($dup.id)). Elimínalo en la UI o con gh api si quieres recrearlo."
    exit 0
  }
}

$body = @{
  name = $rulesetName
  target = "branch"
  enforcement = "active"
  conditions = @{
    ref_name = @{
      include = @("refs/heads/main")
      exclude = @()
    }
  }
  rules = @(
    @{ type = "non_fast_forward" }
    @{ type = "deletion" }
    @{
      type = "required_status_checks"
      parameters = @{
        strict_required_status_checks_policy = $true
        required_status_checks = @(
          @{ context = "block-pr-to-main / block-merge-to-main" }
        )
      }
    }
  )
} | ConvertTo-Json -Depth 10

$tmp = [System.IO.Path]::GetTempFileName()
Set-Content -Path $tmp -Value $body -Encoding UTF8

try {
  gh api --method POST "repos/$Owner/$Repo/rulesets" --input $tmp
  Write-Host "Ruleset creado. Si falla por el nombre del check, fusiona primero un PR de prueba o configura el check en la UI."
} finally {
  Remove-Item -Force $tmp -ErrorAction SilentlyContinue
}
