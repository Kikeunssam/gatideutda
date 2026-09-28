"""Save a server-only Supabase key without echoing it or recording it in shell history."""
from pathlib import Path
from getpass import getpass
import base64
import json
import os

folder = Path(__file__).resolve().parent.parent
path = folder / '.env.local'
key = getpass('Supabase 서버용 키를 붙여넣고 Enter를 누르세요 (화면에는 보이지 않음): ').strip()
if '=' in key and not key.startswith(('eyJ', 'sb_secret_', 'sb_publishable_')):
    key = key.split('=', 1)[1].strip()
key = key.strip('\"\'')
valid = key.startswith('sb_secret_') and len(key) > 25
if key.startswith('eyJ'):
    try:
        payload = key.split('.')[1]
        valid = json.loads(base64.urlsafe_b64decode(payload + '=' * (-len(payload) % 4))).get('role') == 'service_role'
    except (ValueError, IndexError, UnicodeDecodeError):
        valid = False
if not valid:
    raise SystemExit('저장하지 않았습니다. publishable/anon 키가 아닌 service_role 또는 sb_secret_ 서버용 키를 복사해주세요.')
source = path if path.exists() else folder / '.env.local.example'
lines = [line for line in source.read_text().splitlines() if line.split('=', 1)[0].strip() not in ('SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY')]
lines.extend(['SUPABASE_URL=https://xyyidwprnelowbpfdnkb.supabase.co', 'SUPABASE_SERVICE_ROLE_KEY=' + key])
fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
with os.fdopen(fd, 'w') as output:
    output.write('\n'.join(lines) + '\n')
path.chmod(0o600)
print('완료! 서버 연결 설정을 저장했습니다. Codex에 저장했다고 알려주세요.')
