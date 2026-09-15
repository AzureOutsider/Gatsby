$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Push-Location -LiteralPath $projectRoot
try {
  if (-not (Test-Path -LiteralPath "$projectRoot\node_modules")) {
    npm ci
    if ($LASTEXITCODE -ne 0) { throw "npm ci failed" }
  }
  npm run build
  if ($LASTEXITCODE -ne 0) { throw "Frontend build failed" }
  py -m PyInstaller --version
  if ($LASTEXITCODE -ne 0) {
    py -m pip install pyinstaller
    if ($LASTEXITCODE -ne 0) { throw "PyInstaller install failed" }
  }
  py -m PyInstaller --noconfirm --clean --onefile --name Gatsby --icon "$projectRoot\public\gatsby.ico" --add-data "$projectRoot\web-dist;web-dist" "$projectRoot\server.py"
  if ($LASTEXITCODE -ne 0) { throw "PyInstaller build failed" }
  Write-Host "Built $projectRoot\dist\Gatsby.exe"
} finally {
  Pop-Location
}
