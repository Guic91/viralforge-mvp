import requests, sys
TOKEN = '2|FHilvfudJ8lu6HrkrbQWyau6m8W791UkMaau8SDoa400708b'
BASE = 'http://145.223.34.99:8000'
h = {'Authorization': f'Bearer {TOKEN}'}

APP_UUID = 'pkd558hwmupk6j76mn0c89hz'

r = requests.get(BASE + '/api/v1/applications/' + APP_UUID + '/envs', headers=h, timeout=15)
print('ENV status:', r.status_code)
if r.status_code == 200:
    envs = r.json()
    for e in envs:
        k = e.get('key', '')
        if k in ('PORT', 'NODE_ENV', 'RUNWAYML_API_SECRET'):
            print(k, ':', e.get('value', '')[:30])
