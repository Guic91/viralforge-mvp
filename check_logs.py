import requests, json, sys
TOKEN = '2|FHilvfudJ8lu6HrkrbQWyau6m8W791UkMaau8SDoa400708b'
BASE = 'http://145.223.34.99:8000'
h = {'Authorization': f'Bearer {TOKEN}'}

log_ids = [
    'js5idhzxrlsea4ijajifdii8',  # current
    'q3yfgb0pwyvq6xtym5o2v8n3',  # prev
    'byk969zyokacy4scf18rwd1p',  # prev
]

for lid in log_ids:
    r = requests.get(BASE + '/api/v1/deployments/' + lid, headers=h, timeout=15)
    if r.status_code != 200:
        print(lid, ': status', r.status_code)
        continue
    d = r.json()
    logs = json.loads(d.get('logs', '[]'))
    print(f'=== {lid} status={d.get("status")} logs={len(logs)} ===')
    for log in logs[-20:]:
        out = log.get('output', '')
        sys.stdout.buffer.write((str(log.get('order')) + ' | ' + out[:200] + '\n').encode('utf-8'))
    print()