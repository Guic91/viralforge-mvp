import requests, json, sys

TOKEN = '2|FHilvfudJ8lu6HrkrbQWyau6m8W791UkMaau8SDoa400708b'
BASE = 'http://145.223.34.99:8000'
h = {'Authorization': f'Bearer {TOKEN}'}

DEPLOY_UUID = 'a9itsm4kaauk43yqnf3u4mef'
r = requests.get(BASE + '/api/v1/deployments/' + DEPLOY_UUID, headers=h, timeout=15)
d = r.json()
logs = json.loads(d.get('logs', '[]'))
print('Total log entries:', len(logs), file=sys.stderr)
for entry in logs:
    out = entry.get('output', '')
    ts = entry.get('timestamp', '')[:19]
    print(f'{ts} | {out[:150]}', file=sys.stderr)
