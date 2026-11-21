#!/usr/bin/env bash
# Loyihadagi barcha .ts/.tsx fayllardan ko'rinmas (zero-width) belgilarni olib tashlaydi.
# Ishlatish: loyiha ildizida -> bash zero-width-tozalash.sh
ROOT="${1:-.}"
python3 - "$ROOT" <<'PY'
import os, sys
bad = ['\u200b', '\u200c', '\u200d', '\ufeff']
count = 0
for dp, dn, fn in os.walk(sys.argv[1]):
    dn[:] = [d for d in dn if d != 'node_modules']
    for f in fn:
        if not f.endswith(('.ts', '.tsx')):
            continue
        p = os.path.join(dp, f)
        s = open(p, encoding='utf-8').read()
        t = s
        for b in bad:
            t = t.replace(b, '')
        if t != s:
            open(p, 'w', encoding='utf-8').write(t)
            print('tozalandi:', p)
            count += 1
print('Jami tozalangan fayllar:', count)
PY
