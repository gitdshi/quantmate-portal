import json, sys

with open('/tmp/vitest-p2.json') as f:
    d = json.load(f)

print(f"Tests: {d['numTotalTests']} total, {d['numPassedTests']} passed, {d['numFailedTests']} failed")

for s in d['testResults']:
    for t in s['assertionResults']:
        if t['status'] == 'failed':
            name = t.get('fullName', 'unknown')
            msg = (t['failureMessages'][0][:300] if t.get('failureMessages') else 'no message')
            print(f"\nFAIL: {name}")
            print(msg)
