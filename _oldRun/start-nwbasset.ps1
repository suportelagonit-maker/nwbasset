$root = $PSScriptRoot
$backendPath = Join-Path $root 'backend'
$frontendWebPath = Join-Path $root 'frontend-web'
$defaultPhp = 'C:\Users\gutto\AppData\Local\Microsoft\WinGet\Packages\PHP.PHP.8.3_Microsoft.Winget.Source_8wekyb3d8bbwe\php.exe'
$phpCommand = if (Test-Path $defaultPhp) { $defaultPhp } else { (Get-Command php -ErrorAction SilentlyContinue).Source }
$php = $phpCommand
$npmCommand = Get-Command npm.cmd -ErrorAction SilentlyContinue
$npmCmd = if ($npmCommand) { $npmCommand.Source } else { $null }
$backendJobName = 'NWBAssetBackend'

if (-not (Test-Path (Join-Path $backendPath 'artisan'))) {
  Write-Error "Projeto Laravel nao encontrado em: $backendPath"
  exit 1
}

if (-not (Test-Path $php)) {
  Write-Error "PHP nao encontrado. Verifique o caminho fixo ou o PATH do sistema."
  exit 1
}

if (-not (Test-Path $frontendWebPath)) {
  Write-Error "Diretorio frontend web nao encontrado em: $frontendWebPath"
  exit 1
}

if (-not $npmCmd) {
  Write-Error 'npm.cmd nao encontrado no PATH do Windows.'
  exit 1
}

$existingJob = Get-Job -Name $backendJobName -ErrorAction SilentlyContinue
if ($existingJob) {
  Stop-Job -Job $existingJob -ErrorAction SilentlyContinue | Out-Null
  Remove-Job -Job $existingJob -Force -ErrorAction SilentlyContinue | Out-Null
}

Write-Host ''
Write-Host 'Subindo NWB Asset...' -ForegroundColor Cyan
Write-Host 'Backend:  http://127.0.0.1:5000' -ForegroundColor Yellow
Write-Host 'Frontend: http://localhost:5001' -ForegroundColor Yellow
Write-Host ''

$backendJob = Start-Job -Name $backendJobName -ArgumentList $backendPath, $php -ScriptBlock {
  param($projectRoot, $phpPath)
  Set-Location $projectRoot
  & $phpPath artisan serve --host=127.0.0.1 --port=5000
}

Start-Sleep -Seconds 3

$backendError = Receive-Job -Job $backendJob -Keep -ErrorAction SilentlyContinue | Out-String
if ($backendJob.State -eq 'Failed') {
  Write-Error "Falha ao iniciar o backend.`n$backendError"
  exit 1
}

Write-Host "Backend iniciado em background. Job: $backendJobName" -ForegroundColor Green
Write-Host 'Frontend (web) iniciando no terminal atual...' -ForegroundColor Green
Write-Host 'Para parar tudo depois, pressione Ctrl+C no frontend e rode: Stop-Job -Name NWBAssetBackend' -ForegroundColor DarkGray
Write-Host ''

Set-Location $frontendWebPath
& $npmCmd run dev
