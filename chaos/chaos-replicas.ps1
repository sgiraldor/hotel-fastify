# Activa, consulta o revierte el caos temporal en CADA replica de Hotel.
# El estado vive en memoria del proceso. Un POST al NLB no cubre los dos pods.
# Enable exige -ConfirmExperiment. La duracion maxima de la API es 300 s y
# cada proceso vuelve solo a 200 aunque se pierda esta sesion.
param(
  [ValidateSet('enable', 'disable', 'status', 'verify-active')]
  [string]$Action = 'status',
  [int]$DurationSeconds = 120,
  [int]$ExpectedReplicas = 2,
  [string]$Namespace = 'default',
  [string]$Selector = 'app=hotel-api',
  [string]$Container = 'hotel-api',
  [string]$HabitacionId = '1',
  [switch]$ConfirmExperiment,
  # La demo declarativa puede usar un TTL corto. Sin este switch, enable
  # exige ventana restante >= 80 s para no autorizar k6 a medias.
  [switch]$SkipK6WindowGate
)

$ErrorActionPreference = 'Stop'

if ($Action -eq 'enable' -and -not $ConfirmExperiment) {
  Write-Error 'Enable rechazado. Hace falta -ConfirmExperiment en la ventana acordada con Jarrison.'
}

if ($DurationSeconds -lt 1 -or $DurationSeconds -gt 300) {
  Write-Error 'DurationSeconds debe estar entre 1 y 300.'
}

# 75 s de stages + 5 s de gracefulRampDown del perfil canonico.
$k6BudgetMs = 80000

$scriptPath = Join-Path $PSScriptRoot 'pod-switch.js'
$scriptText = [System.IO.File]::ReadAllText($scriptPath)

function Get-ReadyPods {
  $raw = & kubectl get pods -n $Namespace -l $Selector -o json --request-timeout=20s
  if ($LASTEXITCODE -ne 0) {
    throw "kubectl get pods fallo ($LASTEXITCODE)"
  }

  $rawText = ($raw | Out-String).Trim()
  $start = $rawText.IndexOf('{')
  $end = $rawText.LastIndexOf('}')
  if ($start -lt 0 -or $end -lt $start) {
    throw 'kubectl no devolvio JSON de pods'
  }

  $parsed = $rawText.Substring($start, $end - $start + 1) | ConvertFrom-Json
  $ready = @()
  foreach ($pod in @($parsed.items)) {
    $condition = @($pod.status.conditions) | Where-Object { $_.type -eq 'Ready' } | Select-Object -First 1
    if ($pod.status.phase -eq 'Running' -and $condition.status -eq 'True') {
      $ready += $pod.metadata.name
    }
  }

  return @($ready)
}

function Invoke-PodSwitch {
  param(
    [string]$PodName,
    [string]$ActionName
  )

  $psi = New-Object System.Diagnostics.ProcessStartInfo
  $psi.FileName = 'kubectl'
  $psi.Arguments = "exec -i -n $Namespace $PodName -c $Container --request-timeout=25s -- env CHAOS_ACTION=$ActionName CHAOS_DURATION=$DurationSeconds HABITACION_ID=$HabitacionId node -"
  $psi.RedirectStandardInput = $true
  $psi.RedirectStandardOutput = $true
  $psi.RedirectStandardError = $true
  $psi.UseShellExecute = $false
  $psi.CreateNoWindow = $true

  $process = [System.Diagnostics.Process]::Start($psi)
  $utf8 = New-Object System.Text.UTF8Encoding $false
  $bytes = $utf8.GetBytes($scriptText)
  $process.StandardInput.BaseStream.Write($bytes, 0, $bytes.Length)
  $process.StandardInput.Close()

  if (-not $process.WaitForExit(30000)) {
    try { $process.Kill() } catch { }
    throw "timeout al hablar con $PodName"
  }

  $stdout = $process.StandardOutput.ReadToEnd()
  $stderr = $process.StandardError.ReadToEnd()
  $jsonLine = ($stdout -split "`n" | Where-Object { $_.Trim().StartsWith('{') } | Select-Object -Last 1)

  if (-not $jsonLine) {
    throw "sin JSON de ${PodName}: $stderr"
  }

  $result = $jsonLine | ConvertFrom-Json
  $result | Add-Member -NotePropertyName exitCode -NotePropertyValue $process.ExitCode -Force
  return $result
}

function Test-Expected {
  param($Result)

  if ($Result.controlStatus -ne 200 -or $null -eq $Result.chaos) {
    return $false
  }

  if ($Result.chaos.envDown) {
    return $false
  }

  if ($Action -eq 'enable' -or $Action -eq 'verify-active') {
    return $Result.chaos.temporalActivo -and
      $Result.habitacionStatus -eq 503 -and
      $Result.habitacionCode -eq 'CHAOS_DEPENDENCY_DOWN' -and
      $Result.liveStatus -eq 200
  }

  return -not $Result.chaos.temporalActivo -and
    -not $Result.chaos.activo -and
    $Result.habitacionStatus -eq 200 -and
    $Result.liveStatus -eq 200
}

function Disable-All {
  param([string[]]$PodNames)

  foreach ($podName in $PodNames) {
    try {
      $disabled = Invoke-PodSwitch -PodName $podName -ActionName 'disable'
      Write-Output ($disabled | ConvertTo-Json -Compress)
    } catch {
      Write-Warning "no se pudo desactivar ${podName}: $($_.Exception.Message)"
    }
  }
}

$pods = @(Get-ReadyPods)
if ($pods.Count -ne $ExpectedReplicas) {
  Write-Error "Se esperaban $ExpectedReplicas pods Ready ($Selector). Hay $($pods.Count): $($pods -join ', ')"
}

$results = @()
$failed = $false

if ($Action -eq 'enable') {
  try {
    foreach ($podName in $pods) {
      $result = Invoke-PodSwitch -PodName $podName -ActionName 'enable'
      $results += $result
      Write-Output ($result | ConvertTo-Json -Compress)
      if (-not (Test-Expected $result)) {
        throw "la replica $podName no quedo en 503 con /live 200"
      }
    }
  } catch {
    Write-Warning $_.Exception.Message
    Write-Output 'k6_permitido=no'
    Disable-All -PodNames $pods
    exit 1
  }

  $earliest = $null
  foreach ($result in @($results)) {
    $until = [int64]$result.chaos.until
    if ($null -eq $earliest -or $until -lt $earliest) {
      $earliest = $until
    }
  }

  $nowMs = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
  $remaining = 0
  if ($null -ne $earliest) {
    $remaining = $earliest - $nowMs
  }
  if (-not $SkipK6WindowGate -and ($null -eq $earliest -or $remaining -lt $k6BudgetMs)) {
    Write-Warning "ventana restante ${remaining} ms no cubre los 80 s de k6; no iniciar la ronda"
    Write-Output 'k6_permitido=no'
    Disable-All -PodNames $pods
    exit 1
  }

  if ($SkipK6WindowGate) {
    Write-Output "k6_permitido=no motivo=demo_declarativa remaining_ms=$remaining"
  } else {
    $startBefore = [DateTimeOffset]::FromUnixTimeMilliseconds($earliest - $k6BudgetMs).ToLocalTime().ToString('o')
    Write-Output "k6_permitido=si k6_start_before=$startBefore remaining_ms=$remaining"
  }
} else {
  # status, disable y verify-active: el token no sale del pod (pod-switch.js).
  # verify-active solo hace GET y exige 503 en habitación con /live 200 en las dos.
  $podAction = if ($Action -eq 'verify-active') { 'status' } else { $Action }
  foreach ($podName in $pods) {
    try {
      $result = Invoke-PodSwitch -PodName $podName -ActionName $podAction
      $results += $result
      Write-Output ($result | ConvertTo-Json -Compress)
      if (-not (Test-Expected $result)) {
        $failed = $true
      }
    } catch {
      Write-Warning $_.Exception.Message
      $failed = $true
    }
  }
}

if ($failed) {
  exit 1
}

Write-Output "ok action=$Action replicas=$($pods.Count) pods=$($pods -join ',')"
exit 0
