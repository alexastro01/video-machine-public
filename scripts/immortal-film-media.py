"""Reproducible full-film preparation from saved local speech and media."""
from pathlib import Path
import subprocess,sys
root=Path(__file__).resolve().parents[1]
for script in ['immortal-full-dialogue.py','immortal-film-plan.py','immortal-film-sound.py']:
 subprocess.run([sys.executable,str(root/'scripts'/script)],cwd=root,check=True)
