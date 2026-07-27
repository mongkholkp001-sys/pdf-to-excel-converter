import urllib.request
import json
import os

output_path = r"C:\Users\comk25\.gemini\antigravity\scratch\online_converter\zipcodes.json"

print("Building Thai zipcode database...")
try:
    sub_dist_url = "https://raw.githubusercontent.com/kongvut/thai-province-data/master/api/latest/sub_district.json"
    dist_url = "https://raw.githubusercontent.com/kongvut/thai-province-data/master/api/latest/district.json"
    prov_url = "https://raw.githubusercontent.com/kongvut/thai-province-data/master/api/latest/province.json"
    
    # Download files
    print("Downloading provinces...")
    with urllib.request.urlopen(prov_url) as res:
        provinces = {item['id']: item['name_th'].strip() for item in json.loads(res.read().decode('utf-8'))}
        
    print("Downloading districts...")
    with urllib.request.urlopen(dist_url) as res:
        districts = {item['id']: (item['name_th'].strip(), item['province_id']) for item in json.loads(res.read().decode('utf-8'))}
        
    print("Downloading sub-districts...")
    with urllib.request.urlopen(sub_dist_url) as res:
        sub_districts = json.loads(res.read().decode('utf-8'))
        
    print("Compiling zipcode map...")
    zipcode_map = {}
    for item in sub_districts:
        t = item['name_th'].strip()
        z = item.get('zip_code')
        dist_id = item['district_id']
        
        if dist_id in districts:
            a, prov_id = districts[dist_id]
            if prov_id in provinces:
                p = provinces[prov_id]
                
                # Clean up names to normalize search matching
                p_clean = p.replace("จังหวัด", "").strip()
                a_clean = a.replace("อำเภอ", "").replace("เขต", "").strip()
                t_clean = t.replace("ตำบล", "").replace("แขวง", "").strip()
                
                # We store both clean keys and raw keys for maximum reliability
                key_clean = f"{p_clean}|{a_clean}|{t_clean}"
                zipcode_map[key_clean] = str(z).strip()
                
                # Also store raw keys in case names are matched exactly
                key_raw = f"{p}|{a}|{t}"
                zipcode_map[key_raw] = str(z).strip()

    # Save to local file
    if zipcode_map:
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(zipcode_map, f, ensure_ascii=False, indent=2)
        print(f"Zipcode database generated successfully with {len(zipcode_map)} entries at {output_path}")
    else:
        print("Error: Could not generate zipcode map.")
        
except Exception as e:
    print(f"Error building zipcode database: {e}")
