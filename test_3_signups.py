import requests
import json
import base64
import time
import re
import os

def get_script_url():
    config_path = os.path.join(os.path.dirname(__file__), "public", "config.js")
    with open(config_path, "r") as f:
        content = f.read()
    match = re.search(r"googleScriptUrl:\s*['\"]([^'\"]+)['\"]", content)
    if not match:
        raise ValueError("googleScriptUrl not found in public/config.js")
    return match.group(1)

url = get_script_url()

dummy_file = base64.b64encode(b"Dummy receipt verification data").decode("utf-8")

tests = [
    {
        "name": "Test 1 (Standard)",
        "payload": {
            "fullName": "Mary Magdalene",
            "emailAddress": "kuancheen+bloom2026+tester@actschurch.org",
            "phoneNumber": "+60123456789",
            "ageRange": "26-35",
            "maritalStatus": "single",
            "churchPlant": "Acts Subang Jaya 1000",
            "churchPlantOther": "",
            "homesCode": "SJA01",
            "workshop": "cars",
            "firstBloom": "yes",
            "remarks": "Test sign up 1 of 3",
            "fileName": "receipt_1.jpg",
            "fileType": "image/jpeg",
            "fileData": dummy_file
        }
    },
    {
        "name": "Test 2 (Others Church Plant)",
        "payload": {
            "fullName": "Joanna Chuza",
            "emailAddress": "kuancheen+bloom2026+tester@actschurch.org",
            "phoneNumber": "+60129876543",
            "ageRange": "36-50",
            "maritalStatus": "married",
            "churchPlant": "Others",
            "churchPlantOther": "Grace Community Church PJ",
            "homesCode": "NONE",
            "workshop": "beautiful",
            "firstBloom": "no",
            "remarks": "Test sign up 2 of 3 (Others church plant)",
            "fileName": "receipt_2.png",
            "fileType": "image/png",
            "fileData": dummy_file
        }
    },
    {
        "name": "Test 3 (Another Plant & Workshop)",
        "payload": {
            "fullName": "Susanna Galilee",
            "emailAddress": "kuancheen+bloom2026+tester@actschurch.org",
            "phoneNumber": "+60171234567",
            "ageRange": "16-25",
            "maritalStatus": "single",
            "churchPlant": "Acts Ampang",
            "churchPlantOther": "",
            "homesCode": "AMP02",
            "workshop": "journalling",
            "firstBloom": "yes",
            "remarks": "Test sign up 3 of 3",
            "fileName": "receipt_3.jpg",
            "fileType": "image/jpeg",
            "fileData": dummy_file
        }
    }
]

for t in tests:
    print(f"=== Submitting {t['name']} ===")
    res = requests.post(url, json=t['payload'], headers={"Content-Type": "application/json"})
    print("Status:", res.status_code)
    try:
        print("Response:", res.json())
    except:
        print("Raw:", res.text)
    time.sleep(2)
