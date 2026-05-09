import requests, json, sys
TOKEN = '2|FHilvfudJ8lu6HrkrbQWyau6m8W791UkMaau8SDoa400708b'
BASE = 'http://145.223.34.99:8000'
h = {'Authorization': f'Bearer {TOKEN}'}

r = requests.get(BASE + '/api/v1/deployments/js5idhzxrlsea4ijajifdii8', headers=h, timeout=15)
d = r.json()
logs = json.loads(d.get('logs', '[]'))

for log in logs:
    out = log.get('output', '')
    if isinstance(out, str) and any(kw in out.lower() for kw in ['error', 'fail', 'warn', 'exception']):
        sys.stdout.buffer.write((str(log.get('order')) + ' | ' + out + '\n').encode('utf-8'))