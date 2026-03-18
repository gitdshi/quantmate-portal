#!/bin/bash
echo "Testing login with wrong creds..."
curl -s -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"wronguser","password":"wrongpassword"}' \
  -w "\nHTTP_CODE: %{http_code}\n" > /tmp/login-test.txt 2>&1
cat /tmp/login-test.txt
echo "---"
echo "Testing login with right creds..."
curl -s -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' \
  -w "\nHTTP_CODE: %{http_code}\n"
