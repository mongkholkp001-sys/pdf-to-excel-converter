import urllib.request
import json

url = "https://script.google.com/macros/s/AKfycbyaF7hmMRO7J4oBbK0-fuPAWqsxytNpp0_YpY8GIpnmdqEvGrBX_wNQD8I3GNwQtCC1/exec"

data = {
    "username": "admin",
    "rows": [
        {
            "no": 1,
            "index": "1501",
            "name": "พระ สวี อาจคำพันธ์",
            "idCard": "3470800108800",
            "type": "ทร.ไม่รับรอง",
            "address": "228",
            "moo": "18",
            "soiTrok": "-",
            "road": "-",
            "tambon": "สว่างแดนดิน",
            "amphoe": "สว่างแดนดิน",
            "province": "สกลนคร",
            "zipcode": "47110"
        },
        {
            "no": 2,
            "index": "1502",
            "name": "นาย ณัฐไผท วรรณะภูติ",
            "idCard": "1103701029323",
            "type": "ทร.ไม่รับรอง",
            "address": "15/3",
            "moo": "11",
            "soiTrok": "-",
            "road": "-",
            "tambon": "สระลงเรือ",
            "amphoe": "ห้วยกระเจา",
            "province": "กาญจนบุรี",
            "zipcode": "71170"
        },
        {
            "no": 3,
            "index": "1503",
            "name": "นาย รังสรรค์ ชื่นรี",
            "idCard": "3839900437923",
            "type": "ทร.ไม่รับรอง",
            "address": "11/35",
            "moo": "-",
            "soiTrok": "-",
            "road": "เทศบาลบำรุง",
            "tambon": "ท้ายช้าง",
            "amphoe": "เมืองพังงา",
            "province": "พังงา",
            "zipcode": "82000"
        },
        {
            "no": 4,
            "index": "1504",
            "name": "นาง รุ่งนภา ชื่นรี",
            "idCard": "3820800163076",
            "type": "ทร.ไม่รับรอง",
            "address": "11/35",
            "moo": "-",
            "soiTrok": "-",
            "road": "เทศบาลบำรุง",
            "tambon": "ท้ายช้าง",
            "amphoe": "เมืองพังงา",
            "province": "พังงา",
            "zipcode": "82000"
        }
    ]
}

req = urllib.request.Request(
    url, 
    data=json.dumps(data).encode('utf-8'), 
    headers={'Content-Type': 'application/json'}
)

try:
    with urllib.request.urlopen(req) as response:
        html = response.read().decode('utf-8')
        print("Success:", html)
except Exception as e:
    print("Error:", e)
