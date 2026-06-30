param(
  [string]$EnvFile = ".env",
  [switch]$DevProfile
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$envPath = Join-Path $repoRoot $EnvFile
$backendPath = Join-Path $repoRoot "back-end"

if (-not (Test-Path -LiteralPath $envPath)) {
  throw "Cannot find env file: $envPath"
}

Get-Content -LiteralPath $envPath | ForEach-Object {
  $line = $_.Trim()
  if (-not $line -or $line.StartsWith("#") -or -not $line.Contains("=")) {
    return
  }

  $separatorIndex = $line.IndexOf("=")
  $key = $line.Substring(0, $separatorIndex).Trim()
  $value = $line.Substring($separatorIndex + 1)

  if ($key) {
    [Environment]::SetEnvironmentVariable($key, $value, "Process")
  }
}

if (-not $env:DB_URL) {
  $dbName = if ($env:DB_NAME) { $env:DB_NAME } else { "eventflow" }
  [Environment]::SetEnvironmentVariable("DB_URL", "jdbc:postgresql://localhost:5432/$dbName", "Process")
}

if (-not $env:SERVER_PORT) {
  [Environment]::SetEnvironmentVariable("SERVER_PORT", "8080", "Process")
}

Push-Location $backendPath
try {
  if ($DevProfile) {
    mvn spring-boot:run "-Dspring-boot.run.profiles=dev"
  } else {
    mvn spring-boot:run
  }
} finally {
  Pop-Location
}
