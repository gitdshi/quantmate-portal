#!/bin/bash
export TEST_ENV=dev
cd /mnt/c/Users/danie/Documents/Projects/QuantMate/quantmate-portal
echo "START $(date)" > /tmp/e2e-run5.txt
./node_modules/.bin/playwright test --project=setup --project=chromium --reporter=line >> /tmp/e2e-run5.txt 2>&1
echo "EXITCODE=$?" >> /tmp/e2e-run5.txt
