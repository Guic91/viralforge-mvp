import requests, json, os, sys

TOKEN = '3|LjrCQxt0q74gYjmkzrn0T8TAeW6TuZ4FkpzraRpZ22dd7244'
BASE = 'http://145.223.34.99:8000'
HEADERS = {'Authorization': f'Bearer {TOKEN}', 'Content-Type': 'application/json'}
GH_TOKEN = 'github_pat_11AAGJXJAAAAAAAAAAAAAAAAAAAAAAAAApvxrCcvr7uV8t7zVv4tH0z2xQmJQf7N9V3yqK4p8zY5d'

def get_uuids():
    """Get current app UUIDs from coolify_apps_now.json"""
    import json
    with open('C:/Users/gcalf/.openclaw/workspace/coolify_apps_now.json') as f:
        data = json.load(f)
    return {app['name']: app['uuid'] for app in data if 'uuid' in app}

def get_current_env(uuid):
    """Get existing env vars for an app"""
    r = requests.get(f'{BASE}/api/v1/applications/{uuid}/envs', headers=HEADERS, timeout=30)
    if r.status_code != 200:
        return {}
    return {e['key']: e for e in r.json()}

def set_env(uuid, env_key, env_value):
    """Set an env var for an app"""
    existing = get_current_env(uuid)
    if env_key in existing:
        eu = existing[env_key]['uuid']
        payload = {'key': env_key, 'value': env_value, 'is_buildtime': False, 'is_runtime': True}
        r = requests.patch(f'{BASE}/api/v1/applications/{uuid}/envs/{eu}', headers=HEADERS, json=payload, timeout=30)
    else:
        payload = {'key': env_key, 'value': env_value, 'is_buildtime': False, 'is_runtime': True}
        r = requests.post(f'{BASE}/api/v1/applications/{uuid}/envs', headers=HEADERS, json=payload, timeout=30)
    return r.status_code

def deploy(uuid, force=True):
    """Trigger deployment"""
    r = requests.post(f'{BASE}/api/v1/deploy', headers=HEADERS, json={'uuid': uuid, 'force': force}, timeout=60)
    return r.status_code, r.text[:300]

if __name__ == '__main__':
    uuids = get_uuids()
    
    api_uuid = uuids.get('translation-api')
    worker_uuid = uuids.get('translation-worker')

    if not api_uuid:
        print("ERROR: translation-api uuid not found in coolify_apps_now.json")
        sys.exit(1)

    print(f"API uuid: {api_uuid}")
    print(f"Worker uuid: {worker_uuid}")

    # Common env vars
    common = {
        'RUNWAYML_API_SECRET': 'key_89d9ed5ca38ab7e2fc68300ec1239d3b72490674cf7b7ca22a8e0914980ba3d4911d5fd03474539f1124d6215c02b35925d31723018e367df901da7705453195',
        'DATABASE_URL': 'postgresql://postgres:postgres@145.223.34.99:5432/translation_saas',
        'REDIS_URL': 'redis://145.223.34.99:6379',
        'S3_ENDPOINT': 'http://145.223.34.99:9000',
        'S3_ACCESS_KEY': 'minio',
        'S3_SECRET_KEY': 'minio123',
        'S3_BUCKET': 'translation-docs',
    }

    # API-only env vars (use existing translation-api for now)
    api_only = {
        'PORT': '3001',
        'NODE_ENV': 'production',
    }

    # Update API env vars
    print("Setting API env vars...")
    for k, v in {**common, **api_only}.items():
        code = set_env(api_uuid, k, v)
        print(f"  {k}: {code}")

    # Deploy API
    print("Deploying API...")
    code, text = deploy(api_uuid, force=True)
    print(f"  Deploy API: {code} {text}")

    if worker_uuid:
        print("Setting Worker env vars...")
        for k, v in common.items():
            code = set_env(worker_uuid, k, v)
            print(f"  {k}: {code}")
        print("Deploying Worker...")
        code, text = deploy(worker_uuid, force=True)
        print(f"  Deploy Worker: {code} {text}")

    print("Done!")
