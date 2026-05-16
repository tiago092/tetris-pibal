$Root = Resolve-Path (Join-Path $PSScriptRoot '..')
$Out = Join-Path $Root 'dist-mobile'

if ($Out -ne (Join-Path $Root 'dist-mobile')) {
  throw "Unexpected output path: $Out"
}

if (Test-Path -LiteralPath $Out) {
  Remove-Item -LiteralPath $Out -Recurse -Force
}

New-Item -ItemType Directory -Path $Out | Out-Null
Copy-Item -LiteralPath (Join-Path $Root 'index.html') -Destination $Out
Copy-Item -LiteralPath (Join-Path $Root 'manifest.webmanifest') -Destination $Out
Copy-Item -LiteralPath (Join-Path $Root 'assets') -Destination $Out -Recurse
Copy-Item -LiteralPath (Join-Path $Root 'js') -Destination $Out -Recurse
Get-ChildItem -Path $Out -Recurse -Filter '*.bak' | Remove-Item -Force

$MobileAssets = Join-Path $Root 'assets-mobile'
if (Test-Path -LiteralPath $MobileAssets) {
  Copy-Item -Path (Join-Path $MobileAssets '*') -Destination (Join-Path $Out 'assets') -Recurse -Force -Exclude 'README.md','.gitkeep'
}

$MobileLineClear = Join-Path $Out 'assets\sound\achi.mp3'
if (Test-Path -LiteralPath $MobileLineClear) {
  $ConfigPath = Join-Path $Out 'js\config.js'
  $Config = Get-Content -Raw $ConfigPath
  $Config = $Config.Replace('assets/sound/achi.flac', 'assets/sound/achi.mp3')
  Set-Content -Path $ConfigPath -Value $Config -NoNewline
}

Write-Host "Prepared mobile web assets in dist-mobile"
