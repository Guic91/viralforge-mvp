import requests, hashlib

TOKEN = 'nfp_xQcDiyRxqKqvMUySFQ9grxTq2Qv4CHpBb175'
SITE_ID = 'a9c98e69-1aba-4088-8c92-f15a6b38a74d'
BASE = 'https://api.netlify.com/api/v1'

def digest(data):
    return hashlib.sha1(data).hexdigest()

# 1. Create deploy
r = requests.post(BASE + '/sites/' + SITE_ID + '/deploys', headers={'Authorization': 'Bearer ' + TOKEN}, json={}, timeout=30)
print('Create deploy:', r.status_code)
if r.status_code not in (200, 201):
    print('Error:', r.text[:300])
    exit(1)

d = r.json()
deploy_id = d['id']
deploy_url = d['deploy_url']
print('Deploy ID:', deploy_id, 'URL:', deploy_url)

# 2. Upload index.html
with open('apps/web/index.html', 'rb') as f:
    data = f.read()
sha = digest(data)

url = deploy_url + '/files/index.html'
r2 = requests.put(url, headers={'Authorization': 'Bearer ' + TOKEN, 'x-nd-digest': sha}, data=data, timeout=60)
print('Upload index.html:', r2.status_code, r2.text[:100])

# 3. Publish
r3 = requests.post(BASE + '/deploys/' + deploy_id + '/publish', headers={'Authorization': 'Bearer ' + TOKEN}, json={}, timeout=30)
print('Publish:', r3.status_code)
if r3.status_code in (200, 201):
    print('SUCCESS: https://viralforge-mvp.netlify.app')
else:
    print('Error:', r3.text[:200])