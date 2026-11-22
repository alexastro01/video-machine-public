"""Restore original artwork colours inside a keyed sprite's silhouette.

Global key-colour despill can shift fabric that is close to the key (purple
next to a magenta matte). Pixels far from the key colour, eroded away from the
edge, take the original opaque RGB; the soft-matte/despill result remains only
in the boundary band. Usage: protect-interior.py RAW KEYED KEYHEX [THRESH] [ERODE]
"""
import sys
import numpy as np
from PIL import Image, ImageFilter

raw_p, keyed_p, key = sys.argv[1], sys.argv[2], sys.argv[3]
thresh = float(sys.argv[4]) if len(sys.argv) > 4 else 100
erode = int(sys.argv[5]) if len(sys.argv) > 5 else 2
raw = np.asarray(Image.open(raw_p).convert("RGBA")).astype(np.int16)
keyed = np.asarray(Image.open(keyed_p).convert("RGBA")).copy()
k = np.array([int(key[i:i + 2], 16) for i in (0, 2, 4)], dtype=np.int16)
dist = np.abs(raw[..., :3] - k).max(axis=2)
mask = Image.fromarray(((dist > thresh) * 255).astype(np.uint8))
for _ in range(erode):
    mask = mask.filter(ImageFilter.MinFilter(3))
m = np.asarray(mask) > 0
keyed[m, :3] = raw[m, :3].astype(np.uint8)
keyed[m, 3] = 255
Image.fromarray(keyed).save(keyed_p)
print(int(m.sum()))
