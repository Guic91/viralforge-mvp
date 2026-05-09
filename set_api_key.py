with open('C:/Users/gcalf/.openclaw/workspace/viralforge/apps/web/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

old = 'id="apiKeyInput" type="password" placeholder="sk-..."'
new = 'id="apiKeyInput" type="password" placeholder="sk-..." value="key_89d9ed5ca38ab7e2fc68300ec1239d3b72490674cf7b7ca22a8e0914980ba3d4911d5fd03474539f1124d6215c02b35925d31723018e367df901da7705453195"'

if old in content:
    content = content.replace(old, new)
    with open('C:/Users/gcalf/.openclaw/workspace/viralforge/apps/web/index.html', 'w', encoding='utf-8') as f:
        f.write(content)
    print('SUCCESS: API key embedded in index.html')
else:
    print('NOT FOUND. Searching...')
    idx = content.find('apiKeyInput')
    print(repr(content[idx:idx+200]))