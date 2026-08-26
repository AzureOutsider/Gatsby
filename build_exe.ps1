$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
py -m pip install pyinstaller
py -m PyInstaller --noconfirm --clean --onefile --name EnglishStudy --add-data "$root\index.html;." --add-data "$root\styles.css;." --add-data "$root\app.js;." "$root\server.py"
Write-Host "Built dist\EnglishStudy.exe"
