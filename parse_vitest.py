import json, sys
d = json.load(open("/tmp/vitest-json.txt"))
print(f"total: {d['numTotalTests']}  pass: {d['numPassedTests']}  fail: {d['numFailedTests']}")
for s in d["testResults"]:
    name = s["name"].split("quantmate-portal/")[-1]
    np = len([t for t in s["assertionResults"] if t["status"] == "passed"])
    nf = len([t for t in s["assertionResults"] if t["status"] == "failed"])
    print(f"  {s['status']:6} {name}  ({np} pass, {nf} fail)")
    for t in s["assertionResults"]:
        if t["status"] == "failed":
            print(f"    FAIL: {t['fullName']}")
            msgs = t.get("failureMessages", [])
            if msgs:
                print(f"      {msgs[0][:200]}")
