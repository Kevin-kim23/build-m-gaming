"""Run Gradle :app:exportNoticeDependencies -PnoticeVariant=all first.
The combined inventory preserves both release and development runtime versions.
No npm/Gradle development tools are distributed in this inventory.
"""
import hashlib
import io
import json
from pathlib import Path
import xml.etree.ElementTree as ET
import zipfile

ROOT = Path(__file__).resolve().parent.parent
NS = {'m': 'http://maven.apache.org/POM/4.0.0'}
# This exact AndroidX release repackages protobuf-javalite 4.28.2 but its JAR
# omits the BSD copyright/conditions. Preserve the reviewed upstream text.
# Provenance: docs/licenses/README.md. A new artifact version needs a new review.
REVIEWED_NATIVE_LICENSES = {
    ('androidx.datastore:datastore-preferences-external-protobuf:1.1.7', 'BSD-3-Clause'): (
        'docs/licenses/protobuf-4.28.2-LICENSE.txt',
        '6e5e117324afd944dcf67f36cf329843bc1a92229a8cd9bb573d7a83130fea7d',
    ),
}
rows = json.loads((ROOT / 'android/app/build/notices/dependencies.json').read_text())
texts, entries, inventory = {}, [], []

def add_text(value):
    value = value.replace('\r\n', '\n').strip() + '\n'
    key = hashlib.sha256(value.encode()).hexdigest()
    texts[key] = value
    return key

def licenses(pom):
    tree = ET.parse(pom)
    found = tree.findall('m:licenses/m:license', NS)
    if found:
        return [(n.findtext('m:name', namespaces=NS), n.findtext('m:url', namespaces=NS)) for n in found]
    parent = tree.find('m:parent', NS)
    if parent is None:
        raise ValueError(f'Missing license: {pom}')
    group, name, version = [parent.findtext('m:' + key, namespaces=NS) for key in ('groupId','artifactId','version')]
    cache = Path(pom).parents[4] / group / name / version
    candidates = list(cache.glob('**/*.pom'))
    if not candidates:
        raise ValueError(f'Missing parent POM: {group}:{name}:{version}')
    return licenses(candidates[0])

embedded = {}
def scan_zip(data, owner):
    result = []
    with zipfile.ZipFile(data) as archive:
        names = archive.namelist()
        if 'third_party_licenses.json' in names:
            raw = archive.read('third_party_licenses.txt')
            metadata = json.loads(archive.read('third_party_licenses.json'))
            for name, span in metadata.items():
                text = raw[span['start']:span['start'] + span['length']].decode('utf-8')
                key = add_text(text)
                embedded.setdefault((name, key), set()).add(owner)
        for name in names:
            base = name.rsplit('/', 1)[-1].lower()
            if base.startswith(('license', 'notice', 'copying')):
                result.append(add_text(archive.read(name).decode('utf-8')))
            elif name == 'classes.jar' or (name.startswith('libs/') and name.endswith('.jar')):
                result.extend(scan_zip(io.BytesIO(archive.read(name)), owner))
    return result

# Use the Apache license shipped by AndroidX, preserving the upstream text.
with zipfile.ZipFile(rows[0]['artifact']) as z:
    apache = add_text(z.read(next(n for n in z.namelist() if n.endswith('/LICENSE.txt'))).decode())

native = {}
for row in rows:
    coord = f"{row['group']}:{row['name']}:{row['version']}"
    # This original POM omits its license. The JSR-330 authors retain it in source.
    # https://github.com/javax-inject/javax-inject/blob/master/src/javax/inject/Inject.java
    declared = [('Apache License, Version 2.0', 'https://www.apache.org/licenses/LICENSE-2.0')]
    if coord != 'javax.inject:javax.inject:1':
        declared = licenses(row['pom'])
    keys = scan_zip(row['artifact'], coord)
    if coord == 'javax.inject:javax.inject:1':
        keys.append(add_text('Copyright (C) 2009 The JSR-330 Expert Group\nLicensed under the Apache License, Version 2.0.\nhttps://github.com/javax-inject/javax-inject/blob/master/src/javax/inject/Inject.java'))
    for name, url in declared:
        reviewed = REVIEWED_NATIVE_LICENSES.get((coord, name))
        if reviewed:
            path, expected_hash = reviewed
            key = add_text((ROOT / path).read_text(encoding='utf-8'))
            if key != expected_hash:
                raise ValueError(f'Reviewed license text changed: {coord}')
            keys.append(key)
        elif 'Apache' in name:
            keys.append(apache)
        elif name in ('Android Software Development Kit License', 'Play Core Software Development Kit Terms of Service', 'Play Integrity API Terms of Service'):
            keys.append(add_text(f'{name}\n{url}\n\nGoogle SDK 이용조건은 위 공식 주소에서 확인할 수 있습니다. 이 SDK 자체를 Apache-2.0 오픈소스로 표시하지 않습니다. SDK에 포함된 오픈소스 고지는 별도 항목에 원문으로 제공합니다.'))
        elif 'MIT' in name and keys:
            pass
        else:
            raise ValueError(f'Unreviewed license: {coord} {name}')
    entry = native.setdefault(coord, {'name': coord, 'license': ' / '.join(n for n, _ in declared), 'textIds': []})
    entry['textIds'] = sorted(set(entry['textIds'] + keys))
    inventory.append({'coordinate': coord, 'sha256': hashlib.sha256(Path(row['artifact']).read_bytes()).hexdigest(), 'licenses': declared})
entries.extend(native.values())

for package in ('core', 'android', 'app'):
    folder = ROOT / 'node_modules/@capacitor' / package
    pkg = json.loads((folder / 'package.json').read_text())
    license_file = next(p for p in folder.iterdir() if p.name.lower() in ('license', 'license.md', 'license.txt'))
    entries.append({'name': f"@capacitor/{package} {pkg['version']}", 'license': 'MIT', 'textIds': [add_text(license_file.read_text())]})

# Runtime modules used by sign-in, App Check, and callable cloud functions.
# The Firebase *-interop-types packages contain declarations, not runtime JS.
for package in ('firebase', '@firebase/app', '@firebase/auth', '@firebase/app-check', '@firebase/functions', '@firebase/component', '@firebase/logger', '@firebase/util', '@capacitor-firebase/authentication', 'idb', 'tslib'):
    folder = ROOT / 'node_modules' / package
    pkg = json.loads((folder / 'package.json').read_text())
    license_files = [p for p in folder.iterdir() if p.is_file() and p.name.lower() in ('license', 'license.md', 'license.txt', 'license.apache', 'license.bsd', 'license-notice.md', 'notice', 'notice.txt', 'copyrightnotice.txt')]
    if not license_files and (package == 'firebase' or package.startswith('@firebase/')):
        # npm omits the monorepo license; retain the exact published revision's upstream file.
        license_files = [ROOT / 'docs/licenses/firebase-js-LICENSE.txt']
    if not license_files:
        raise ValueError(f'Missing npm license: {package}')
    entries.append({'name': f"{package} {pkg['version']} (로그인·앱 검증·클라우드)", 'license': pkg['license'], 'textIds': [add_text(p.read_text(encoding='utf-8')) for p in license_files]})

for (name, key), owners in sorted(embedded.items()):
    entries.append({'name': name + ' (SDK 포함)', 'license': '포함 SDK: ' + ', '.join(sorted(owners)), 'textIds': [key]})

output = {'entries': entries, 'texts': texts}
folder = ROOT / 'docs/licenses'
folder.mkdir(parents=True, exist_ok=True)
(folder / 'runtime-notices.json').write_text(json.dumps(output, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
(folder / 'runtime-inventory.json').write_text(json.dumps(inventory, indent=2) + '\n', encoding='utf-8')
full = '부대 키우기 · Third-party notices\n배포 앱의 런타임 라이브러리 및 SDK 포함 고지. 개발 도구 제외.\n\n'
full += '\n'.join(e['name'] + '\n' + e['license'] + '\n원문: ' + ', '.join(e['textIds']) + '\n' for e in entries)
full += '\n'.join('\n========== ' + key + ' ==========\n' + text for key, text in texts.items())
# Keep a readable repository copy. The app already packages the complete JSON
# through info-ui.js; a public TXT would copy every notice into the app twice.
(ROOT / 'THIRD_PARTY_NOTICES.txt').write_text(full, encoding='utf-8')
print(f'{len(entries)} entries, {len(texts)} distinct license texts, {len(inventory)} runtime artifacts')
