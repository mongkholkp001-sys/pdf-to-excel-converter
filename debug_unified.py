import urllib.request
import json

url = "https://raw.githubusercontent.com/kongvut/thai-province-data/master/api_province_with_amphur_tambon.json"
try:
    with urllib.request.urlopen(url) as res:
        data = json.loads(res.read().decode('utf-8'))
        print(f"Type: {type(data)}")
        if isinstance(data, list) and len(data) > 0:
            print(f"Sample keys: {list(data[0].keys())}")
            print(f"Sample data: {data[0]['name_th']}")
            print(f"First amphoe sample keys: {list(data[0]['amphure'][0].keys())}")
            print(f"First amphoe sample data: {data[0]['amphure'][0]['name_th']}")
            print(f"First tambon sample keys: {list(data[0]['amphure'][0]['tambon'][0].keys())}")
            print(f"First tambon sample data: {data[0]['amphure'][0]['tambon'][0]['name_th']}, Zip: {data[0]['amphure'][0]['tambon'][0]['zip_code']}")
except Exception as e:
    print(f"Error: {e}")
