import requests

TOKEN = '2|FHilvfudJ8lu6HrkrbQWyau6m8W791UkMaau8SDoa400708b'
BASE = 'http://145.223.34.99:8000'
h = {'Authorization': f'Bearer {TOKEN}', 'Content-Type': 'application/json'}

dirs = ['/', '/apps/api', './', 'apps/api/', './apps/api/', '', 'apps/web', '/apps/web']
for d in dirs:
    payload = {
        'name': 'viralforge-api-test',
        'environment_uuid': 'phy9yfjfc6vov9dz9vnkxl2i',
        'project_uuid': 'gn8sho53eud858eg5dny5xa7',
        'server_uuid': 'uw2g4wnaxbcjc6uxsd5zb0io',
        'git_repository': 'https://github.com/Guic91/viralforge-mvp',
        'git_branch': 'master',
        'build_pack': 'nixpacks',
        'ports_exposes': '3001',
        'publish_directory': d,
    }
    r = requests.post(BASE + '/api/v1/applications/public', headers=h, json=payload, timeout=30)
    if r.status_code == 201:
        print('DIR=' + repr(d) + ': OK uuid=' + r.json().get('uuid', ''))
        break
    err = r.json().get('errors', {}).get('publish_directory', ['OK'])[0]
    print('DIR=' + repr(d) + ': ' + str(r.status_code) + ' ' + err)
