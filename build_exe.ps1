$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
py -m pip install pyinstaller
if ($LASTEXITCODE -ne 0) {
  throw "PyInstaller dependency installation failed with exit code $LASTEXITCODE"
}
py -m PyInstaller --noconfirm --clean --onefile --name EnglishStudy --add-data "$root\index.html;." --add-data "$root\styles.css;." --add-data "$root\app.js;." "$root\server.py"
if ($LASTEXITCODE -ne 0) {
  throw "PyInstaller failed with exit code $LASTEXITCODE"
}
Write-Host "Built dist\EnglishStudy.exe"
