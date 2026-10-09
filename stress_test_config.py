import requests
import time
import concurrent.futures
import re
import os
import statistics

def get_script_url():
    config_path = os.path.join(os.path.dirname(__file__), "public", "config.js")
    with open(config_path, "r") as f:
        content = f.read()
    match = re.search(r"googleScriptUrl:\s*['\"]([^'\"]+)['\"]", content)
    if not match:
        raise ValueError("googleScriptUrl not found in public/config.js")
    return match.group(1)

url = get_script_url()
endpoint = f"{url}?action=config"

print("==================================================")
print("Bloom Conference 2026 — Dropdown Config Load Stress Test")
print(f"Target Endpoint: {endpoint}")
print("==================================================\n")

def send_request(req_id):
    t0 = time.time()
    try:
        res = requests.get(endpoint, timeout=30)
        latency = round(time.time() - t0, 3)
        status = res.status_code
        success = False
        data_preview = ""
        if status == 200:
            try:
                js = res.json()
                if js.get("result") == "success" and "config" in js:
                    success = True
                    workshops = len(js.get("config", {}).get("Workshop", []))
                    data_preview = f"{workshops} workshops loaded"
            except Exception as e:
                data_preview = f"JSON parse error: {e}"
        else:
            data_preview = res.text[:60]
        return {
            "id": req_id,
            "status": status,
            "latency": latency,
            "success": success,
            "info": data_preview
        }
    except Exception as e:
        latency = round(time.time() - t0, 3)
        return {
            "id": req_id,
            "status": "ERR",
            "latency": latency,
            "success": False,
            "info": str(e)
        }

def run_burst(concurrency, total_requests):
    print(f"\n🚀 Running burst: {total_requests} simultaneous users / requests (Concurrency: {concurrency})...")
    start_time = time.time()
    results = []
    
    with concurrent.futures.ThreadPoolExecutor(max_workers=concurrency) as executor:
        futures = [executor.submit(send_request, i+1) for i in range(total_requests)]
        for f in concurrent.futures.as_completed(futures):
            results.append(f.result())
            
    total_elapsed = round(time.time() - start_time, 2)
    successful = [r for r in results if r["success"]]
    failed = [r for r in results if not r["success"]]
    latencies = [r["latency"] for r in results if r["latency"] is not None]

    print(f"\n--- Burst Results ({total_requests} requests) ---")
    print(f"Total Time Taken: {total_elapsed}s")
    print(f"Success Rate: {len(successful)}/{total_requests} ({len(successful)/total_requests*100:.1f}%)")
    if failed:
        print(f"Failed Count: {len(failed)}")
        for f in failed[:3]:
            print(f"  Sample Error (Req #{f['id']}): Status {f['status']} - {f['info']}")
    
    if latencies:
        print(f"Min Latency: {min(latencies):.2f}s")
        print(f"Avg Latency: {statistics.mean(latencies):.2f}s")
        print(f"Median Latency: {statistics.median(latencies):.2f}s")
        print(f"Max Latency: {max(latencies):.2f}s")
        print(f"Throughput: {len(results)/total_elapsed:.2f} req/s")
    return results

if __name__ == "__main__":
    # Test 1: 5 Concurrent Loads (Normal crowd)
    run_burst(concurrency=5, total_requests=5)
    
    time.sleep(2)
    
    # Test 2: 15 Concurrent Loads (Spike when message is sent)
    run_burst(concurrency=15, total_requests=15)
    
    time.sleep(3)
    
    # Test 3: 30 Concurrent Loads (High burst load)
    run_burst(concurrency=30, total_requests=30)
