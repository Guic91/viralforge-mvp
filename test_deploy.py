#!/usr/bin/env python3
"""Debug and deploy viralforge to Netlify via API"""
import requests, json, hashlib

TOKEN = 'nfp_vu9NpPGADi3eND91wq2KTU5ZJAZ4cqwg6c59'
SITE_ID = 'a9c98e69-1aba-4088-8c92-f15a6b38a74d'
HEADERS = {'Authorization': 'Bearer ' + TOKEN}
BASE = 'https://api.netlify.com/api/v1'

# Test: create a deploy and see all available endpoints
r = requests.post(BASE + '/sites/' + SITE_ID + '/deploys', headers=HEADERS, json={}, timeout=30)
print('Create deploy:', r.status_code)
d = r.json()
deploy_id = d['id']
print('Full deploy object keys:', list(d.keys()))

# Try different file upload approaches
fpath = 'apps/web/index.html'
with open(fpath, 'rb') as f:
    data = f.read()
sha = hashlib.sha1(data).hexdigest()

# Approach 1: form-based upload
import io
buffer = io.BytesIO(data)
r2 = requests.post(
    BASE + '/deploys/' + deploy_id + '/files/index.html',
    headers={'Authorization': 'Bearer ' + TOKEN},
    files={'file': ('index.html', buffer, 'text/html')}
)
print('Form upload:', r2.status_code, r2.text[:200])
