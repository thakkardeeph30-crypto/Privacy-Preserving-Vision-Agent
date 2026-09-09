"""
Automated Backend & Model Reasoning Test Suite
Tests FastAPI endpoints, model_handler action reasoning, and PII audit scorecard.
"""

import sys
import os
import base64
import json

# Ensure server path is in pythonpath
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from model_handler import ModelHandler
from app import app
from fastapi.testclient import TestClient

client = TestClient(app)

print("🧪 [Test Suite] Running Backend & Privacy Audit Tests...\n")
passed = 0
failed = 0

def assert_test(cond, msg):
    global passed, failed
    if cond:
        print(f"  ✅ PASS: {msg}")
        passed += 1
    else:
        print(f"  ❌ FAIL: {msg}")
        failed += 1

# 1. Health Endpoint Test
print("1. GET /health Endpoint:")
res = client.get("/health")
assert_test(res.status_code == 200, "Server responded HTTP 200")
data = res.json()
assert_test(data.get("status") == "healthy", "Status is healthy")
assert_test("privacy_guarantee" in data, "Privacy guarantee field present")

# 2. Model Handler Heuristic & Action Generation
print("\n2. ModelHandler Action Planning:")
handler = ModelHandler()

actions, conf = handler.generate_actions(
    visual_description="Test page with login form and submit button",
    task="Click the login button",
    context={"url": "http://localhost/test"}
)
assert_test(len(actions) > 0, "Generated at least 1 action for 'Click login'")
assert_test(actions[0]["type"] == "click", f"Action type is 'click': {actions[0]}")
assert_test(conf >= 0.85, f"High confidence returned: {conf}")

# Task 2: Fill Email
actions, conf = handler.generate_actions(
    visual_description="Contact form",
    task="Fill in the contact email field",
    context={}
)
assert_test(actions[0]["type"] == "fill", f"Action type is 'fill': {actions[0]}")

# Task 3: Scroll
actions, conf = handler.generate_actions(
    visual_description="Long feed",
    task="Scroll down to reviews",
    context={}
)
assert_test(actions[0]["type"] == "scroll", f"Action type is 'scroll': {actions[0]}")

# 3. POST /process Endpoint (End-to-End API Test)
print("\n3. POST /process API Endpoint:")
# 1x1 transparent PNG as base64
dummy_png = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="

payload = {
    "image": dummy_png,
    "task": "Click the login button",
    "context": {
        "url": "http://localhost/test_page.html",
        "title": "Test Page",
        "redactedCount": 3
    }
}
resp = client.post("/process", json=payload)
assert_test(resp.status_code == 200, "POST /process returned HTTP 200")
p_data = resp.json()
assert_test(len(p_data.get("actions", [])) > 0, "Actions returned in payload")
assert_test(p_data.get("confidence", 0) > 0.8, "Confidence valid in payload")

# 4. Privacy Audit Endpoint Test (/verify-privacy)
print("\n4. POST /verify-privacy Compliance Audit:")
# Case A: Sanitized clean payload
clean_payload = {
    "image": dummy_png,
    "context": {
        "email": "us***@safe-agent.internal",
        "phone": "XXX-XXX-5678",
        "card": "**** **** **** 8928"
    }
}
audit_resp = client.post("/verify-privacy", json=clean_payload)
assert_test(audit_resp.status_code == 200, "Audit clean payload returned 200")
assert_test(audit_resp.json().get("compliant") is True, "Clean payload certified compliant")

# Case B: Leaked unmasked PII payload (must trigger violation alert)
dirty_payload = {
    "image": dummy_png,
    "context": {
        "raw_email": "unmasked_victim@leak.com",
        "raw_card": "4532 0158 9234 8928"
    }
}
audit_dirty = client.post("/verify-privacy", json=dirty_payload)
assert_test(audit_dirty.json().get("compliant") is False, "Dirty payload flagged non-compliant")
assert_test(len(audit_dirty.json().get("violations_found", [])) >= 2, "Detected both raw email and card violations")

# Summary
print(f"\n========================================")
print(f"Backend Test Results: {passed} passed, {failed} failed")
print(f"========================================\n")

if failed > 0:
    sys.exit(1)
else:
    print("🎉 All Backend & Privacy Audit tests passed with 100% success!\n")
