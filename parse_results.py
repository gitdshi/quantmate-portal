import json
d = json.load(open("/tmp/vitest-all.json"))
print(f"Total: {d['numTotalTests']}  Pass: {d['numPassedTests']}  Fail: {d['numFailedTests']}")
for s in d["testResults"]:
    name = s["name"].split("quantmate-portal/")[-1]
    np_count = len([t for t in s["assertionResults"] if t["status"] == "passed"])
    nf = len([t for t in s["assertionResults"] if t["status"] == "failed"])
    print(f"  {s['status']:6} {name}  ({np_count} pass, {nf} fail)")
    # Show file-level error message if present
    msg = s.get("message", "")
    if msg and np_count == 0 and nf == 0:
        print(f"    FILE_ERROR: {msg[:400]}")
    for t in s["assertionResults"]:
        if t["status"] == "failed":
            msgs = t.get("failureMessages", [])
            msg = msgs[0][:200] if msgs else ""
            print(f"    FAIL: {t['fullName']}")
            print(f"      {msg}")
