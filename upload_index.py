import requests, hashlib, os

TOKEN = 'nfp_xQcDiyRxqKqvMUySFQ9grxTq2Qv4CHpBb175'
SITE_ID = 'a9c98e69-1aba-4088-8c92-f15a6b38a74d'
BASE = 'https://api.netlify.com/api/v1'

index_path = os.path.join(os.path.dirname(__file__), 'apps', 'web', 'index.html')

# Create deploy
r = requests.post(BASE + '/sites/' + SITE_ID + '/deploys', headers={'Authorization': 'Bearer ' + TOKEN}, json={}, timeout=30)
print('Create deploy:', r.status_code)
if r.status_code not in (200, 201):
    print('Error:', r.text[:200])
    exit(1)

d = r.json()
deploy_id = d['id']
deploy_url = d['deploy_url']
print('Deploy ID:', deploy_id, 'URL:', deploy_url)

# Upload index.html
with open(index_path, 'rb') as f:
    data = f.read()
sha = hashlib.sha1(data).hexdigest()
url = deploy_url + '/files/index.html'
r2 = requests.put(url, headers={'Authorization': 'Bearer ' + TOKEN, 'x-nd-digest': sha}, data=data, timeout=60)
print('Upload index.html:', r2.status_code)

if r2.status_code == 200:
    r3 = requests.post(BASE + '/deploys/' + deploy_id + '/publish', headers={'Authorization': 'Bearer ' + TOKEN}, json={}, timeout=30)
    print('Publish:', r3.status_code)
    if r3.status_code in (200, 201):
        print('SUCCESS: https://viralforge-mvp.netlify.app')