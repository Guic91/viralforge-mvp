import re

with open('node_modules/@runwayml/sdk/src/client.ts', 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

# Find all URLs
urls = re.findall(r'["\'](https?://[^"\']+)["\']', content)
for url in urls[:20]:
    if 'stability' in url or 'runway' in url or 'api.' in url:
        print(url)