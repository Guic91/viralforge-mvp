import requests

TOKEN = '1|xpxywv4ETzU9Qstkqxlfg4NJgUyIwYkmuSaWjP53d3487444'
BASE = 'http://145.223.34.99:8000'
h = {'Authorization': f'Bearer {TOKEN}'}

r = requests.get(BASE + '/swagger/index.yaml', headers=h, timeout=15)
with open(r'C:\Users\gcalf\.openclaw\workspace\viralforge\swagger.yaml', 'w', encoding='utf-8') as f:
    f.write(r.text)
print('Saved', len(r.text), 'bytes')
