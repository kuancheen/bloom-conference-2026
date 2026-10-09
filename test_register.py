import requests
import json
import base64
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

payload = {
    "fullName": "Mary Magdalene (Live Test)",
    "emailAddress": "kuancheen+bloom2026+tester@actschurch.org",
    "phoneNumber": "+60123456789",
    "ageRange": "26-35",
    "maritalStatus": "single",
    "churchPlant": "Acts Subang Jaya 1000",
    "churchPlantOther": "",
    "homesCode": "SJA01",
    "workshop": "cars",
    "firstBloom": "yes",
    "remarks": "Testing with the correct Version 12 endpoint URL",
    "fileName": "live_receipt_v12.jpg",
    "fileType": "image/jpeg",
    "fileData": base64.b64encode(b"Dummy test file for Version 12 verification").decode("utf-8")
}

response = requests.post(url, json=payload, headers={"Content-Type": "application/json"})
print("Status Code:", response.status_code)
try:
    print("Response Body:", response.json())
except:
    print("Raw text:", response.text)
