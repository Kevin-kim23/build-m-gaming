"""Verify archived PNG sources and lossless WebP output, including invisible RGBA.

Use --encode to recreate the packaged images with Pillow/libwebp. No resize,
palette reduction or alpha cleanup is performed. App builds need no Python.
"""
import argparse
import hashlib
import json
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument('--encode', action='store_true')
args = parser.parse_args()
manifest = json.loads((ROOT / 'docs/image-encodes.json').read_text(encoding='utf-8'))
for item in manifest['assets']:
    source, output = ROOT / item['source'], ROOT / item['path']
    assert hashlib.sha256(source.read_bytes()).hexdigest() == item['sourceSha256'], source
    with Image.open(source) as original:
        rgba = original.convert('RGBA')
        if args.encode:
            rgba.save(output, 'WEBP', lossless=True, exact=True, method=6)
        with Image.open(output) as encoded:
            assert encoded.size == original.size, output
            assert encoded.convert('RGBA').tobytes() == rgba.tobytes(), output
        assert hashlib.sha256(output.read_bytes()).hexdigest() == item['sha256'], output
    print(f"PASS {item['path']}: identical RGBA and dimensions")
