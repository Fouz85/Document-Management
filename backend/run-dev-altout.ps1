# Runs the API from an alternate build output folder instead of bin\Debug.
# Use this only when a stuck/elevated RecordsDestruction.Api.exe process is locking the normal
# bin\Debug\net10.0 folder (MSB3027 "process cannot access the file" during a normal dotnet build/run)
# and you can't or don't want to kill it via Task Manager yet.
#
# Reads secrets from `dotnet user-secrets` at run time — nothing here is hardcoded.

$apiProject = Join-Path $PSScriptRoot "src\RecordsDestruction.Api"

$secretsRaw = dotnet user-secrets list --project $apiProject
$secrets = @{}
foreach ($line in $secretsRaw) {
    if ($line -match '^(.+?)\s*=\s*(.*)$') { $secrets[$matches[1].Trim()] = $matches[2].Trim() }
}

# Use a fresh, uniquely-named folder each run so a previous run left hanging (e.g. an
# elevated process Task Manager itself can't close) never blocks this one with a file lock.
$altOut = Join-Path $env:TEMP ("rds-api-altbuild-" + [Guid]::NewGuid().ToString("N").Substring(0,8))
Write-Host "Building to $altOut ..."
dotnet build $apiProject -o $altOut
if ($LASTEXITCODE -ne 0) { Write-Host "Build failed."; exit $LASTEXITCODE }

# Best-effort cleanup of old altbuild folders from previous runs (ignored if still locked).
Get-ChildItem $env:TEMP -Directory -Filter "rds-api-altbuild-*" -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -ne $altOut } |
    ForEach-Object { Remove-Item $_.FullName -Recurse -Force -ErrorAction SilentlyContinue }

$env:ASPNETCORE_ENVIRONMENT = "Development"
$env:ASPNETCORE_URLS = "http://localhost:51511"
$env:ConnectionStrings__DefaultConnection = $secrets["ConnectionStrings:DefaultConnection"]
$env:Jwt__Key = $secrets["Jwt:Key"]
$env:Seed__AdminEmail = $secrets["Seed:AdminEmail"]
$env:Seed__AdminPassword = $secrets["Seed:AdminPassword"]

Push-Location $altOut
try { dotnet RecordsDestruction.Api.dll }
finally { Pop-Location }
