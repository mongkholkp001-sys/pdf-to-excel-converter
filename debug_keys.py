import urllib.request
import json

urls = [
    "https://raw.githubusercontent.com/kongvut/thai-province-data/master/api/latest/sub_district.json",
    "https://raw.githubusercontent.com/kongvut/thai-province-data/master/api/latest/district.json",
    "https://raw.githubusercontent.com/kongvut/thai-province-data/master/api/latest/province.json"
]

for url in urls:
    try:
        with urllib.request.urlopen(url) as res:
            data = json.loads(res.read().decode('utf-8'))
            if isinstance(data, list) and len(data) > 0:
                print(f"URL: {url}")
                print(f"Sample keys: {list(data[0].keys())}")
                print(f"Sample data: {data[0]}")
    except Exception as e:
        print(f"Error {url}: {e}")
