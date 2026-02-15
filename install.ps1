# AAC CLI Installer for Windows
# Usage: irm https://raw.githubusercontent.com/keinar/aac-cli/main/install.ps1 | iex

$ErrorActionPreference = "Stop"

$Repo = "keinar/aac-cli"
$Binary = "aac.exe"

# Detect architecture
$Arch = if ([Environment]::Is64BitOperatingSystem) {
    if ($env:PROCESSOR_ARCHITECTURE -eq "ARM64") { "arm64" } else { "amd64" }
} else {
    Write-Error "32-bit systems are not supported."
    exit 1
}

# Fetch latest release tag
Write-Host "Fetching latest release..." -ForegroundColor Cyan
$Release = Invoke-RestMethod -Uri "https://api.github.com/repos/$Repo/releases/latest"
$Tag = $Release.tag_name

if (-not $Tag) {
    Write-Error "Could not determine latest release."
    exit 1
}

Write-Host "Latest version: $Tag" -ForegroundColor Green

# Download archive
$Archive = "aac_windows_$Arch.zip"
$Url = "https://github.com/$Repo/releases/download/$Tag/$Archive"

$TmpDir = Join-Path $env:TEMP "aac-install"
if (Test-Path $TmpDir) { Remove-Item -Recurse -Force $TmpDir }
New-Item -ItemType Directory -Path $TmpDir | Out-Null

Write-Host "Downloading $Url..." -ForegroundColor Cyan
Invoke-WebRequest -Uri $Url -OutFile (Join-Path $TmpDir $Archive)

# Extract
Expand-Archive -Path (Join-Path $TmpDir $Archive) -DestinationPath $TmpDir -Force

# Install to LOCALAPPDATA
$InstallDir = Join-Path $env:LOCALAPPDATA "aac"
if (-not (Test-Path $InstallDir)) {
    New-Item -ItemType Directory -Path $InstallDir | Out-Null
}

Copy-Item -Path (Join-Path $TmpDir $Binary) -Destination (Join-Path $InstallDir $Binary) -Force

# Add to PATH if not already present
$UserPath = [Environment]::GetEnvironmentVariable("Path", "User")
if ($UserPath -notlike "*$InstallDir*") {
    [Environment]::SetEnvironmentVariable("Path", "$UserPath;$InstallDir", "User")
    Write-Host "Added $InstallDir to your PATH." -ForegroundColor Yellow
    Write-Host "Please restart your terminal for PATH changes to take effect." -ForegroundColor Yellow
}

# Cleanup
Remove-Item -Recurse -Force $TmpDir

Write-Host ""
Write-Host "AAC CLI $Tag installed successfully!" -ForegroundColor Green
Write-Host "   Run 'aac --help' to get started." -ForegroundColor Cyan
