"""Collect runtime licenses for Windows EXE distribution."""
from importlib.metadata import distribution
from pathlib import Path
import shutil
import sys

root = Path(__file__).resolve().parent.parent
notices = root / ".venv-build" / "notices"
python_license = Path(sys.base_prefix) / "LICENSE.txt"
packager = distribution("pyinstaller")
packager_license = next(
    packager.locate_file(file)
    for file in packager.files or []
    if file.name == "COPYING.txt"
)
notices.mkdir(parents=True, exist_ok=True)
shutil.copyfile(python_license, notices / "PYTHON-LICENSE.txt")
shutil.copyfile(packager_license, notices / "PYINSTALLER-LICENSE.txt")
print("Prepared Python and PyInstaller runtime notices.")
