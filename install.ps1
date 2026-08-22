# ============================================================
# dsh-quote-panel install script for Windows (idempotent)
#   Usage: powershell -NoProfile -ExecutionPolicy Bypass -File install.ps1
#   Optional environment variables:
#     DSH_PROFILE_DIR   web profile directory (default: $HOME\.dsh\profiles\web)
#     DSH_PLUGIN_DIR    plugin install directory (default: $HOME\dsh-plugin-download)
#   NOTE: this file must stay pure ASCII (no non-ASCII comments)
#         so Windows PowerShell 5.1 can parse it correctly.
# ============================================================
$ErrorActionPreference = 'Stop'

$Here = Split-Path -Parent $MyInvocation.MyCommand.Path
$PluginSrc = $Here

$ProfileDir = if ($env:DSH_PROFILE_DIR) { $env:DSH_PROFILE_DIR } else { Join-Path $HOME '.dsh\profiles\web' }
$PluginParent = if ($env:DSH_PLUGIN_DIR) { $env:DSH_PLUGIN_DIR } else { Join-Path $HOME 'dsh-plugin-download' }
$InstallDir = Join-Path $PluginParent 'dsh-quote-panel'
$PkgJson = Join-Path $ProfileDir 'package.json'

if (-not (Test-Path (Join-Path $PluginSrc 'package.json'))) {
    Write-Host '[ERROR] plugin source not found at' $PluginSrc '(run install.ps1 from the repo root)' -ForegroundColor Red
    exit 1
}
if (-not (Test-Path $PkgJson)) {
    Write-Host '[ERROR] profile package.json not found:' $PkgJson -ForegroundColor Red
    Write-Host '        make sure DSH is installed for the current user, or set DSH_PROFILE_DIR to the real path.'
    exit 1
}

Write-Host '[1/4] Copying plugin ->' $InstallDir
New-Item -ItemType Directory -Path $PluginParent -Force | Out-Null
if (Test-Path $InstallDir) { Remove-Item $InstallDir -Recurse -Force }
New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
Copy-Item (Join-Path $PluginSrc 'lib') $InstallDir -Recurse -Force
Copy-Item (Join-Path $PluginSrc 'docs') $InstallDir -Recurse -Force -ErrorAction SilentlyContinue
foreach ($f in @('package.json','cordis.patch.yml','README.md','README.en.md','CHANGELOG.md','LICENSE')) {
    $p = Join-Path $PluginSrc $f
    if (Test-Path $p) { Copy-Item $p $InstallDir -Force }
}

Write-Host '[2/4] Updating dependencies + bundles ->' $PkgJson
$Backup = "$PkgJson.bak-quote-$(Get-Date -Format 'yyyyMMddHHmmss')"
Copy-Item $PkgJson $Backup
$pkg = Get-Content $PkgJson -Raw | ConvertFrom-Json
$changed = $false
if (-not $pkg.PSObject.Properties['dependencies']) { $pkg | Add-Member -NotePropertyName 'dependencies' -NotePropertyValue @{} }
if ($pkg.dependencies.'dsh-quote-panel' -ne ('link:' + $InstallDir)) {
    $pkg.dependencies | Add-Member -NotePropertyName 'dsh-quote-panel' -NotePropertyValue ('link:' + $InstallDir) -Force
    $changed = $true
}
if (-not $pkg.PSObject.Properties['dsh']) { $pkg | Add-Member -NotePropertyName 'dsh' -NotePropertyValue @{} }
if (-not $pkg.dsh.PSObject.Properties['profile']) { $pkg.dsh | Add-Member -NotePropertyName 'profile' -NotePropertyValue @{} }
if (-not $pkg.dsh.profile.PSObject.Properties['bundles']) { $pkg.dsh.profile | Add-Member -NotePropertyName 'bundles' -NotePropertyValue @() }
if ($pkg.dsh.profile.bundles -notcontains 'dsh-quote-panel') {
    $pkg.dsh.profile.bundles += 'dsh-quote-panel'
    $changed = $true
}
if ($changed) {
    # PS5.1 的 Set-Content -Encoding UTF8 会写 BOM，node 的 JSON.parse 无法容忍，
    # 这里用 .NET 写 UTF-8 无 BOM
    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($PkgJson, ($pkg | ConvertTo-Json -Depth 12), $utf8NoBom)
    Write-Host '  added: dependencies + dsh.profile.bundles'
} else {
    Write-Host '  already configured, nothing to change'
}

Write-Host '[3/4] pnpm install (profile dir)'
Push-Location $ProfileDir
try {
    if (Get-Command corepack -ErrorAction SilentlyContinue) {
        corepack pnpm install --no-frozen-lockfile
    } elseif (Get-Command pnpm -ErrorAction SilentlyContinue) {
        pnpm install --no-frozen-lockfile
    } else {
        Write-Host '[ERROR] corepack/pnpm not found. DSH normally bundles corepack; check PATH.' -ForegroundColor Red
        exit 1
    }
} finally {
    Pop-Location
}

Write-Host '[4/4] Done.'
Write-Host ''
Write-Host '  Next: restart dsh web, then open the DSH web page.'
Write-Host '  A "quote panel" (market) button should appear in the session header.'
Write-Host ''
Write-Host '  Sanity check (optional):'
Write-Host "    curl 'http://127.0.0.1:3080/dshq/quotes?market=cn&symbols=sh000001'"
Write-Host '  To uninstall: remove the dsh-quote-panel dependency and bundle entry'
Write-Host "    from $PkgJson, then re-run pnpm install and restart dsh web."
