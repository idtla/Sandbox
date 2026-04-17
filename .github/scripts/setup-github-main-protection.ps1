#Requires -Version 5.1
<#
.SYNOPSIS
  Crea o actualiza el ruleset sandbox-main-readonly: bloquea force-push y borrado de main (sin checks obligatorios, para no bloquear git push normal).

.PREREQUISITES
  winget install GitHub.cli
  gh auth login

.USAGE
  .\.github\scripts\setup-github-main-protection.ps1
  .\.github\scripts\setup-github-main-protection.ps1 -Owner idtla -Repo Sandbox
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

$rulesets = gh api "repos/$Owner/$Repo/rulesets" 2>$null | ConvertFrom-Json
$existing = $null
if ($rulesets) {
  $existing = $rulesets | Where-Object { $_.name -eq $rulesetName } | Select-Object -First 1
}

$bodyObj = @{
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
  )
}

$json = $bodyObj | ConvertTo-Json -Depth 10
$tmp = [System.IO.Path]::GetTempFileName()
[System.IO.File]::WriteAllText($tmp, $json, [System.Text.UTF8Encoding]::new($false))

try {
  if ($existing) {
    gh api --method PUT "repos/$Owner/$Repo/rulesets/$($existing.id)" --input $tmp
    Write-Host "Ruleset actualizado (id $($existing.id))."
  } else {
    gh api --method POST "repos/$Owner/$Repo/rulesets" --input $tmp
    Write-Host "Ruleset creado."
  }
} finally {
  Remove-Item -Force $tmp -ErrorAction SilentlyContinue
}
