# OpenClaw Wrapper Shortcut
# Run this once to add the shortcut to your PowerShell profile

$profilePath = "$env:USERPROFILE\OneDrive\Documentos\WindowsPowerShell\Microsoft.PowerShell_profile.ps1"
$wrapperDir = "$env:USERPROFILE\.openclaw"

# Create profile if it doesn't exist
if (-not (Test-Path $profilePath)) {
    New-Item -ItemType File -Path $profilePath -Force | Out-Null
    Write-Host "Created PowerShell profile: $profilePath"
}

# Add alias if not already present
$aliasLine = "# OpenClaw wrapper shortcut`nfunction ocw { cd `"$wrapperDir`"; .\gateway-start.ps1 }"
$content = Get-Content $profilePath -ErrorAction SilentlyContinue

if (-not ($content -contains "function ocw")) {
    Add-Content -Path $profilePath -Value "`n$aliasLine" -NoNewline
    Write-Host "Added `ocw` shortcut to profile"
    Write-Host ""
    Write-Host "✅ Restart PowerShell and run: ocw"
} else {
    Write-Host "`ocw` shortcut already exists in profile"
}
