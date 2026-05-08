#!/usr/bin/env python3
"""Deploy viralforge to Netlify via API"""
import requests, json, hashlib, base64, os

TOKEN = 'nfp_vu9NpPGADi3eND91wq2KTU5ZJAZ4cqwg6c59'
SITE_ID = 'a9c98e69-1aba-4088-8c92-f15a6b38a74d'
HEADERS = {'Authorization': 'Bearer ' + TOKEN}
BASE = 'https://api.netlify.com/api/v1'

def digest(data):
    return hashlib.sha1(data).hexdigest()

def deploy_directory(dir_path):
    """Upload directory files to Netlify deploy"""
    # Create deploy
    r = requests.post(BASE + '/sites/' + SITE_ID + '/deploys', headers=HEADERS, json={}, timeout=30)
    print('Create deploy:', r.status_code)
    d = r.json()
    deploy_id = d['id']
    print('Deploy ID:', deploy_id)

    # Walk directory
    uploaded = 0
    for root, dirs, files in os.walk(dir_path):
        for fname in files:
            fpath = os.path.join(root, fname)
            rel = os.path.relpath(fpath, dir_path).replace(os.sep, '/')
            with open(fpath, 'rb') as f:
                data = f.read()
            sha = digest(data)

            # Upload file: POST /deploys/{id}/files/{path} with raw binary body
            url = BASE + '/deploys/' + deploy_id + '/files/' + rel
            r2 = requests.post(url, headers={**HEADERS, 'Content-Type': 'application/octet-stream', 'x-nd-digest': sha}, data=data, timeout=120)
            if r2.status_code in (200, 201):
                print(f'  OK {rel}')
                uploaded += 1
            else:
                print(f'  FAIL {rel}: {r2.status_code} {r2.text[:100]}')

    print(f'Uploaded {uploaded} files')

    # Publish
    r3 = requests.post(BASE + '/deploys/' + deploy_id + '/restore', headers=HEADERS, json={}, timeout=30)
    print('Restore:', r3.status_code)
    r4 = requests.post(BASE + '/deploys/' + deploy_id + '/publish', headers=HEADERS, json={}, timeout=30)
    print('Publish:', r4.status_code)
    if r4.status_code in (200, 201):
        print('DONE: https://viralforge-mvp.netlify.app')
        return True
    else:
        print(r4.text[:300])
        return False

if __name__ == '__main__':
    deploy_directory('apps/web')
