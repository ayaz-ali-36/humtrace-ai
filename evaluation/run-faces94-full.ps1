param(
  [Parameter(Mandatory = $true)]
  [string]$Dataset,
  [string]$Workspace = "",
  [string]$PythonExecutable = ""
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
$webRoot = Join-Path $repoRoot "web"
$aiRoot = Join-Path $repoRoot "ai-service"
$npmCommand = Get-Command npm.cmd -ErrorAction SilentlyContinue
if (-not $npmCommand) { $npmCommand = Get-Command npm -ErrorAction SilentlyContinue }
$npm = $npmCommand.Source
if (-not $PythonExecutable) {
  $repoPython = Join-Path $repoRoot ".venv\Scripts\python.exe"
  if (Test-Path -LiteralPath $repoPython) {
    $PythonExecutable = $repoPython
  } else {
    $pythonCommand = Get-Command python -ErrorAction SilentlyContinue
    if ($pythonCommand) { $PythonExecutable = $pythonCommand.Source }
  }
}
if (-not $Workspace) { $Workspace = Join-Path $PSScriptRoot "runtime\faces94-100" }
$Workspace = [System.IO.Path]::GetFullPath($Workspace)
$statusPath = Join-Path $Workspace "full-evaluation-status.json"
$evaluationLog = Join-Path $Workspace "full-evaluation.log"
$serviceLog = Join-Path $Workspace "full-evaluation-ai-service.log"

New-Item -ItemType Directory -Force -Path $Workspace | Out-Null

function Write-RunStatus {
  param([string]$State, [string]$Message, [Nullable[int]]$ExitCode = $null)
  $payload = [ordered]@{
    state = $State
    message = $Message
    controllerProcessId = $PID
    dataset = [System.IO.Path]::GetFullPath($Dataset)
    workspace = $Workspace
    updatedAt = [DateTime]::UtcNow.ToString("o")
  }
  if ($null -ne $ExitCode) { $payload.exitCode = $ExitCode }
  $payload | ConvertTo-Json | Set-Content -LiteralPath $statusPath -Encoding UTF8
}

$serviceJob = $null
try {
  if (-not (Test-Path -LiteralPath $Dataset)) { throw "Faces94 dataset folder not found: $Dataset" }
  if (-not (Test-Path -LiteralPath $npm)) { throw "npm.cmd not found: $npm" }
  if (-not $npm) { throw "npm was not found on PATH." }
  if (-not $PythonExecutable -or -not (Test-Path -LiteralPath $PythonExecutable)) { throw "Python was not found. Pass -PythonExecutable or create .venv." }

  Write-RunStatus -State "STARTING" -Message "Starting the loopback AI service."
  $serviceJob = Start-Job -ScriptBlock {
    param($WorkingDirectory, $PythonExecutable)
    Set-Location -LiteralPath $WorkingDirectory
    & $PythonExecutable -m uvicorn app.main:app --host 127.0.0.1 --port 5055 --workers 1
  } -ArgumentList $aiRoot, $PythonExecutable

  Start-Sleep -Seconds 5
  if ($serviceJob.State -eq "Failed") {
    Receive-Job $serviceJob *>&1 | Out-File -LiteralPath $serviceLog -Append -Encoding utf8
    throw "AI service failed during startup."
  }

  Write-RunStatus -State "RUNNING" -Message "Generating encrypted embeddings and evaluating ranked recommendations."
  Set-Location -LiteralPath $webRoot
  & $npm run evaluation:run -- --workspace $Workspace *> $evaluationLog
  $evaluationExitCode = $LASTEXITCODE
  if ($evaluationExitCode -ne 0) { throw "Evaluation runner failed with exit code $evaluationExitCode." }

  Write-RunStatus -State "COMPLETED" -Message "Full Faces94 evaluation completed successfully." -ExitCode 0
}
catch {
  $failureCode = if ($null -ne $evaluationExitCode) { [int]$evaluationExitCode } else { 1 }
  $_ | Out-String | Out-File -LiteralPath $evaluationLog -Append -Encoding utf8
  Write-RunStatus -State "FAILED" -Message $_.Exception.Message -ExitCode $failureCode
  exit $failureCode
}
finally {
  if ($null -ne $serviceJob) {
    Stop-Job $serviceJob -ErrorAction SilentlyContinue
    Receive-Job $serviceJob *>&1 | Out-File -LiteralPath $serviceLog -Append -Encoding utf8
    Remove-Job $serviceJob -Force -ErrorAction SilentlyContinue
  }
}
