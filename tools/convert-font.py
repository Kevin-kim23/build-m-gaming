"""Lossless, full-glyph webfont conversion. No subsetting or runtime dependencies.

Install fonttools[woff]==4.67.0 in an isolated Python environment, then run:
    python tools/convert-font.py
    python tools/convert-font.py --check
The original font and OFL remain under assets/source-fonts for reproducibility.
"""
import argparse
import hashlib
import json
from pathlib import Path

from fontTools.ttLib import TTFont
from fontTools.pens.recordingPen import RecordingPen

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / 'assets/source-fonts/black-han-sans/BlackHanSans-Regular.ttf'
OUTPUT = ROOT / 'public/fonts/black-han-sans/BlackHanSans-Regular.woff2'
REPORT = ROOT / 'docs/font-conversion.json'
SOURCE_SHA256 = '31960809284026681774a8e52dc19ebcad26cf69b0ad9d560f288296fbb52739'


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def validate():
    assert digest(SOURCE) == SOURCE_SHA256, 'Unexpected source font'
    with TTFont(SOURCE, recalcTimestamp=False) as source, TTFont(OUTPUT, recalcTimestamp=False) as web:
        assert web.flavor == 'woff2'
        # FontTools strips DSIG for WOFF2; this source has an empty signature
        # placeholder, so no signature, glyph or rendering information is lost.
        assert source['DSIG'].usNumSigs == 0 and not source['DSIG'].signatureRecords
        assert set(source.keys()) - {'DSIG'} == set(web.keys()), 'Rendering table set changed'
        assert source.getGlyphOrder() == web.getGlyphOrder(), 'Glyphs removed or reordered'
        assert source.getBestCmap() == web.getBestCmap(), 'Character coverage changed'
        assert source['hmtx'].metrics == web['hmtx'].metrics, 'Advance widths or bearings changed'
        # WOFF2 transforms glyf/loca and updates the checksum; all other tables
        # (including every cmap, name, layout, hinting and metric table) stay exact.
        for tag in source.keys():
            if tag not in ('GlyphOrder', 'head', 'glyf', 'loca', 'DSIG'):
                assert source.getTableData(tag) == web.getTableData(tag), f'{tag} changed'
        source_head, web_head = vars(source['head']).copy(), vars(web['head']).copy()
        for field in ('checkSumAdjustment', 'flags'):
            source_head.pop(field, None)
            web_head.pop(field, None)
        assert source_head == web_head, 'Font sizing/timestamps changed'
        # WOFF2 is allowed to mark lossless compression in head.flags bit11.
        assert source['head'].flags & ~(1 << 11) == web['head'].flags & ~(1 << 11)
        source_glyphs, web_glyphs = source.getGlyphSet(), web.getGlyphSet()
        for name in source.getGlyphOrder():
            before, after = RecordingPen(), RecordingPen()
            source_glyphs[name].draw(before)
            web_glyphs[name].draw(after)
            assert before.value == after.value, f'Outline changed: {name}'
            for font in (source, web):
                font['glyf'][name].expand(font['glyf'])
            a = getattr(source['glyf'][name], 'program', None)
            b = getattr(web['glyf'][name], 'program', None)
            assert (a.getBytecode() if a else b'') == (b.getBytecode() if b else b''), f'Hinting changed: {name}'
        return {
            'source': SOURCE.relative_to(ROOT).as_posix(),
            'sourceSha256': digest(SOURCE),
            'sourceBytes': SOURCE.stat().st_size,
            'output': OUTPUT.relative_to(ROOT).as_posix(),
            'outputSha256': digest(OUTPUT),
            'outputBytes': OUTPUT.stat().st_size,
            'glyphCount': len(source.getGlyphOrder()),
            'unicodeCodepointCount': len(source.getBestCmap()),
            'fullGlyphSet': True,
            'removedEmptyTables': ['DSIG (0 signatures)'],
            'checks': ['all rendering tables retained', 'all cmap tables exact', 'all glyph outlines exact',
                       'all glyph hinting exact', 'all advance widths and bearings exact',
                       'name, layout and sizing tables retained'],
            'tool': 'fonttools[woff]==4.67.0; Brotli==1.2.0',
        }


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true', help='Verify existing output without writing files')
    args = parser.parse_args()
    if not args.check:
        assert digest(SOURCE) == SOURCE_SHA256, 'Unexpected source font'
        with TTFont(SOURCE, recalcTimestamp=False) as font:
            font.flavor = 'woff2'
            font.save(OUTPUT)
    report = validate()
    if args.check:
        assert json.loads(REPORT.read_text(encoding='utf-8')) == report, 'Conversion record is stale'
    else:
        REPORT.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(report, ensure_ascii=False))
