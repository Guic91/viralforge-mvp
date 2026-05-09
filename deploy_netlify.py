#!/usr/bin/env python3
"""Deploy viralforge to Netlify via build trigger"""
import requests, hashlib, os

TOKEN = 'nfp_xQcDiyRxqKqvMUySFQ9grxTq2Qv4CHpBb175'
SITE_ID = 'a9c98e69-1aba-4088-8c92-f15a6b38a74d'
BASE = 'https://api.netlify.com/api/v1'
WEB_DIR = r'C:\Users\gcalf\.openclaw\workspace\viralforge\apps\web'

session = requests.Session()
session.headers.update({'Authorization': 'Bearer ' + TOKEN})

def digest(data):
    return hashlib.sha1(data).hexdigest()

# Step 1: Update build settings to no-build
r = session.patch(BASE + '/sites/' + SITE_ID, json={
    'build_settings': {
        'dir': 'apps/web',
        'command': 'echo no build',
        'build_image': 'noble'
    }
}, timeout=30)
print('Update build settings:', r.status_code)

# Step 2: Trigger a build deploy (this creates a deploy with state=upload)
r2 = session.post(BASE + '/sites/' + SITE_ID + '/deploys', json={}, timeout=30)
print('Create deploy:', r2.status_code)
d = r2.json()
deploy_id = d['id']
deploy_url = d['deploy_url']
print('Deploy state:', d.get('state'))
print('Deploy ID:', deploy_id)

# Step 3: Upload files
uploaded = []
for root, dirs, files in os.walk(WEB_DIR):
    for fname in files:
        fpath = os.path.join(root, fname)
        rel = os.path.relpath(fpath, WEB_DIR).replace(os.sep, '/')
        with open(fpath, 'rb') as f:
            data = f.read()
        sha = digest(data)
        url = deploy_url + '/files/' + rel
        r3 = session.put(url, headers={'x-nd-digest': sha, 'Content-Length': str(len(data))}, data=data, timeout=120)
        print(f'  {rel}: {r3.status_code}')
        if r3.status_code in (200, 201):
            uploaded.append(rel)

print(f'Uploaded {len(uploaded)} files')

# Step 4: Publish
r4 = session.post(BASE + '/deploys/' + deploy_id + '/publish', json={}, timeout=30)
print('Publish:', r4.status_code)
if r4.status_code in (200, 201):
    print('DONE: https://viralforge-mvp.netlify.app')
