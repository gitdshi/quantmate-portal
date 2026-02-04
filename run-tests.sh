#!/bin/bash

# TraderMate Automated Test Runner
# This script runs all automated tests for the TraderMate application

set -e

echo "🧪 TraderMate Automated Testing Suite"
echo "======================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 Installing dependencies...${NC}"
    npm install
    echo ""
fi

# Check if Playwright browsers are installed
if [ ! -d "node_modules/.playwright" ]; then
    echo -e "${YELLOW}🎭 Installing Playwright browsers...${NC}"
    npx playwright install
    echo ""
fi

# Function to run a test suite
run_test_suite() {
    local name=$1
    local command=$2
    
    echo -e "${YELLOW}Running $name...${NC}"
    if eval "$command"; then
        echo -e "${GREEN}✅ $name passed${NC}"
        return 0
    else
        echo -e "${RED}❌ $name failed${NC}"
        return 1
    fi
    echo ""
}

# Track test results
FAILED_TESTS=""
TOTAL_TESTS=0
PASSED_TESTS=0

# Run Unit Tests
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}📋 Unit & Integration Tests (Vitest)${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
TOTAL_TESTS=$((TOTAL_TESTS + 1))
if run_test_suite "Unit Tests" "npm run test:run"; then
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    FAILED_TESTS="$FAILED_TESTS\n- Unit Tests"
fi

# Run Tests with Coverage
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}📊 Coverage Report${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
TOTAL_TESTS=$((TOTAL_TESTS + 1))
if run_test_suite "Coverage" "npm run test:coverage"; then
    PASSED_TESTS=$((PASSED_TESTS + 1))
    echo -e "${GREEN}📈 Coverage report generated in ./coverage/${NC}"
else
    FAILED_TESTS="$FAILED_TESTS\n- Coverage"
fi

# Run Linting
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}🔍 Code Linting${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
TOTAL_TESTS=$((TOTAL_TESTS + 1))
if run_test_suite "Linting" "npm run lint"; then
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    FAILED_TESTS="$FAILED_TESTS\n- Linting"
fi

# Check if backend is running for E2E tests
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}🌐 E2E Tests (Playwright)${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Check if user wants to run E2E tests
if [ "$1" == "--skip-e2e" ]; then
    echo -e "${YELLOW}⏭️  Skipping E2E tests (use --with-e2e to include)${NC}"
    echo ""
elif [ "$1" == "--with-e2e" ]; then
    echo -e "${YELLOW}🚀 Starting development server for E2E tests...${NC}"
    echo -e "${YELLOW}Note: Make sure backend is running at http://localhost:8000${NC}"
    echo ""
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    if run_test_suite "E2E Tests" "npm run test:e2e"; then
        PASSED_TESTS=$((PASSED_TESTS + 1))
        echo -e "${GREEN}🎭 Playwright report generated${NC}"
    else
        FAILED_TESTS="$FAILED_TESTS\n- E2E Tests"
    fi
else
    echo -e "${YELLOW}⏭️  E2E tests skipped by default${NC}"
    echo -e "${YELLOW}Use: ./run-tests.sh --with-e2e to include E2E tests${NC}"
    echo ""
fi

# Final Summary
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}📊 Test Results Summary${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "Total Test Suites: $TOTAL_TESTS"
echo -e "${GREEN}Passed: $PASSED_TESTS${NC}"
echo -e "${RED}Failed: $((TOTAL_TESTS - PASSED_TESTS))${NC}"
echo ""

if [ $PASSED_TESTS -eq $TOTAL_TESTS ]; then
    echo -e "${GREEN}╔═══════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                                       ║${NC}"
    echo -e "${GREEN}║    ✅ All Tests Passed! 🎉           ║${NC}"
    echo -e "${GREEN}║                                       ║${NC}"
    echo -e "${GREEN}╚═══════════════════════════════════════╝${NC}"
    echo ""
    exit 0
else
    echo -e "${RED}╔═══════════════════════════════════════╗${NC}"
    echo -e "${RED}║                                       ║${NC}"
    echo -e "${RED}║    ❌ Some Tests Failed               ║${NC}"
    echo -e "${RED}║                                       ║${NC}"
    echo -e "${RED}╚═══════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${RED}Failed Test Suites:${NC}"
    echo -e "${RED}$FAILED_TESTS${NC}"
    echo ""
    exit 1
fi
