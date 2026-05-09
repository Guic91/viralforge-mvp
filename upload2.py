import requests, hashlib, os, json

TOKEN = 'nfp_xQcDiyRxqKqvMUySFQ9grxTq2Qv4CHpBb175'
SITE_ID = 'a9c98e69-1aba-4088-8c92-f15a6b38a74d'
BASE = 'https://api.netlify.com/api/v1'

index_path = os.path.join(os.path.dirname(__file__), 'apps', 'web', 'index.html')

# Create deploy
r = requests.post(BASE + '/sites/' + SITE_ID + '/deploys', headers={'Authorization': 'Bearer ' + TOKEN}, json={}, timeout=30)
print('Create deploy:', r.status_code)
if r.status_code not in (200, 201):
    print('Error:', r.text[:500])
    exit(1)

d = r.json()
deploy_id = d['id']
deploy_url = d['deploy_url']
print('Deploy ID:', deploy_id, 'URL:', deploy_url)
print('Required SHA:', d.get('required_sha'))

# Read file
with open(index_path, 'rb') as f:
    data = f.read()

sha = hashlib.sha1(data).hexdigest()
print('File SHA:', sha)

# Upload with both SHA and required_sha
headers = {'Authorization': 'Bearer ' + TOKEN, 'x-nd-digest': sha}
if d.get('required_sha'):
    headers['x-nd-required-sha'] = d['required_sha']

url = deploy_url + '/files/index.html'
r2 = requests.put(url, headers=headers, data=data, timeout=60)
print('Upload index.html:', r2.status_code, r2.text[:300])

if r2.status_code not in (200, 201):
    # Try without required_sha
    r3 = requests.post(BASE + '/deploys/' + deploy_id + '/files', 
        headers={'Authorization': 'Bearer ' + TOKEN},
        files={'path': (None, 'index.html'), 'file': ('index.html', data)})
    print('Alternative upload:', r3.status_code, r3.text[:300])