#!/usr/bin/env python3
"""Deploy viralforge to Netlify via build then file upload"""
import requests, hashlib, os, time

TOKEN = 'nfp_xQcDiyRxqKqvMUySFQ9grxTq2Qv4CHpBb175'
SITE_ID = 'a9c98e69-1aba-4088-8c92-f15a6b38a74d'
HEADERS = {'Authorization': 'Bearer ' + TOKEN}
BASE = 'https://api.netlify.com/api/v1'
WEB_DIR = r'C:\Users\gcalf\.openclaw\workspace\viralforge\apps\web'

def digest(data):
    return hashlib.sha1(data).hexdigest()

session = requests.Session()
session.headers.update({'Authorization': 'Bearer ' + TOKEN})

# Wait for the build from earlier to complete
print('Waiting for build to complete...')
for _ in range(30):
    r = session.get(BASE + '/sites/' + SITE_ID + '/builds', timeout=15)
    builds = r.json()
    latest = builds[0]
    print(f'  Build {latest["id"]}: done={latest["done"]} state={latest.get("deploy_state")}')
    if latest['done']:
        deploy_id = latest['deploy_id']
        break
    time.sleep(2)
else:
    print('Build still running, using current state...')
    deploy_id = latest['deploy_id']

print('Deploy ID from build:', deploy_id)

# Get the deploy details
r2 = session.get(BASE + '/deploys/' + deploy_id, timeout=15)
if r2.status_code != 200:
    print('Deploy not found:', r2.status_code)
    sys.exit(1)
d = r2.json()
print('Deploy state:', d.get('state'))
print('Deploy URL:', d.get('deploy_url'))

if d.get('state') == 'ready':
    print('Deploy is ready, trying to upload files...')
    with open(os.path.join(WEB_DIR, 'index.html'), 'rb') as f:
        data = f.read()
    sha = digest(data)
    url = d['deploy_url'] + '/files/index.html'
    r3 = session.put(url, headers={'x-nd-digest': sha, 'Content-Length': str(len(data))}, data=data, timeout=30)
    print('Upload:', r3.status_code, r3.text[:100])
else:
    print('Deploy not in ready state')
