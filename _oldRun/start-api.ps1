$defaultPhp = 'C:\Users\gutto\AppData\Local\Microsoft\WinGet\Packages\PHP.PHP.8.3_Microsoft.Winget.Source_8wekyb3d8bbwe\php.exe'
$phpCommand = if (Test-Path $defaultPhp) { $defaultPhp } else { (Get-Command php -ErrorAction SilentlyContinue).Source }
$php = $phpCommand
$backendPath = Join-Path $PSScriptRoot 'backend'

if (-not (Test-Path (Join-Path $backendPath 'artisan'))) {
  Write-Error "Projeto Laravel nao encontrado em: $backendPath"
  exit 1
}

if (-not (Test-Path $php)) {
  Write-Error "PHP nao encontrado. Verifique o caminho fixo ou o PATH do sistema."
  exit 1
}

Set-Location $backendPath
Write-Host ''
Write-Host 'NWB Asset API' -ForegroundColor Cyan
Write-Host 'Este script sobe somente o backend Laravel.' -ForegroundColor Yellow
Write-Host 'Para subir backend + frontend, use: .\start-nwbasset.ps1' -ForegroundColor Green
Write-Host ''
& $php artisan serve --host=127.0.0.1 --port=5000
