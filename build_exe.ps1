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
  $buildPython = Join-Path $projectRoot ".venv-build\Scripts\python.exe"
  if (-not (Test-Path -LiteralPath $buildPython)) {
    py -3 -m venv (Join-Path $projectRoot ".venv-build")
    if ($LASTEXITCODE -ne 0) { throw "Build environment creation failed" }
  }
  & $buildPython -m pip install --requirement (Join-Path $projectRoot "requirements-build.txt")
  if ($LASTEXITCODE -ne 0) { throw "Build dependencies installation failed" }
  $pythonLicense = & $buildPython -c 'from pathlib import Path; import sys; print(Path(sys.base_prefix) / "LICENSE.txt")'
  $packagerLicense = & $buildPython -c 'from importlib.metadata import distribution; d = distribution("pyinstaller"); print(next(d.locate_file(p) for p in d.files if p.name == "COPYING.txt"))'
  if ($LASTEXITCODE -ne 0) { throw "Could not locate packaging license" }
  $notices = Join-Path $projectRoot ".venv-build\notices"
  New-Item -ItemType Directory -Path $notices -Force | Out-Null
  Copy-Item -LiteralPath $pythonLicense -Destination (Join-Path $notices "PYTHON-LICENSE.txt") -Force
  Copy-Item -LiteralPath $packagerLicense -Destination (Join-Path $notices "PYINSTALLER-LICENSE.txt") -Force
  & $buildPython -m PyInstaller --noconfirm --clean --onefile --name Gatsby --icon "$projectRoot\public\gatsby.ico" --add-data "$projectRoot\web-dist;web-dist" --add-data "$projectRoot\LICENSE;." --add-data "$projectRoot\NOTICE.md;." --add-data "$notices;licenses" "$projectRoot\server.py"
  if ($LASTEXITCODE -ne 0) { throw "PyInstaller build failed" }
  $distributionNotices = Join-Path $projectRoot "dist\licenses"
  New-Item -ItemType Directory -Path $distributionNotices -Force | Out-Null
  foreach ($file in @("LICENSE", "NOTICE.md", "THIRD-PARTY-LICENSES.txt", "Nunito-OFL.txt")) {
    Copy-Item -LiteralPath (Join-Path "$projectRoot\web-dist" $file) -Destination $distributionNotices -Force
  }
  Copy-Item -LiteralPath (Join-Path $notices "PYTHON-LICENSE.txt"), (Join-Path $notices "PYINSTALLER-LICENSE.txt") -Destination $distributionNotices -Force
  Write-Host "Built $projectRoot\dist\Gatsby.exe"
} finally {
  Pop-Location
}
