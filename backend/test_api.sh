#!/bin/bash
# ================================================
# Finance Tracker API — Edge Case Test Script
# ================================================
# Usage: BASE_URL=http://localhost:3011 bash test_api.sh

BASE="${BASE_URL:-http://localhost:3011}"
PASS=0
FAIL=0

test_endpoint() {
    local desc="$1"
    local expected_code="$2"
    local method="$3"
    local url="$4"
    local data="$5"

    if [ -n "$data" ]; then
        response=$(curl -s -w "\n%{http_code}" -X "$method" "$url" \
            -H "Content-Type: application/json" -d "$data")
    else
        response=$(curl -s -w "\n%{http_code}" -X "$method" "$url")
    fi

    actual=$(echo "$response" | tail -1)
    body=$(echo "$response" | sed '$d')

    if [ "$actual" == "$expected_code" ]; then
        echo "✅ PASS | $desc (got $actual)"
        ((PASS++))
    else
        echo "❌ FAIL | $desc (expected $expected_code, got $actual)"
        echo "        Response: $(echo "$body" | head -c 200)"
        ((FAIL++))
    fi
}

echo ""
echo "=========================================="
echo "🧪 Finance Tracker API Test Suite"
echo "   Target: $BASE"
echo "=========================================="
echo ""

# ─── Health Check ───
echo "── Health ──"
test_endpoint "Health check" "200" "GET" "$BASE/api/health"

# ─── POST /api/transactions ───
echo ""
echo "── POST /api/transactions ──"
test_endpoint "Empty body" "400" "POST" "$BASE/api/transactions" '{}'
test_endpoint "Amount missing" "400" "POST" "$BASE/api/transactions" \
    '{"description":"Test item","category_id":1,"date":"2026-01-01"}'
test_endpoint "Amount is string" "400" "POST" "$BASE/api/transactions" \
    '{"amount":"abc","description":"Test item","category_id":1,"date":"2026-01-01"}'
test_endpoint "Amount negative" "400" "POST" "$BASE/api/transactions" \
    '{"amount":-500,"description":"Test item","category_id":1,"date":"2026-01-01"}'
test_endpoint "Amount zero" "400" "POST" "$BASE/api/transactions" \
    '{"amount":0,"description":"Test item","category_id":1,"date":"2026-01-01"}'
test_endpoint "Description too short (2 chars)" "400" "POST" "$BASE/api/transactions" \
    '{"amount":100,"description":"ab","category_id":1,"date":"2026-01-01"}'
test_endpoint "Invalid date format" "400" "POST" "$BASE/api/transactions" \
    '{"amount":100,"description":"Test item","category_id":1,"date":"30-04-2026"}'
test_endpoint "Non-existent category_id" "400" "POST" "$BASE/api/transactions" \
    '{"amount":100,"description":"Test item","category_id":9999,"date":"2026-01-01"}'
test_endpoint "Malformed JSON body" "400" "POST" "$BASE/api/transactions" '{bad json}'
test_endpoint "Valid transaction ✓" "201" "POST" "$BASE/api/transactions" \
    '{"amount":50000,"description":"Makan siang","category_id":2,"date":"2026-04-30"}'

# ─── GET /api/transactions ───
echo ""
echo "── GET /api/transactions ──"
test_endpoint "Default (no params)" "200" "GET" "$BASE/api/transactions"
test_endpoint "Page = 0" "200" "GET" "$BASE/api/transactions?page=0"
test_endpoint "Page = -5" "200" "GET" "$BASE/api/transactions?page=-5"
test_endpoint "Limit = 0" "200" "GET" "$BASE/api/transactions?limit=0"
test_endpoint "Limit = 99999 (should cap)" "200" "GET" "$BASE/api/transactions?limit=99999"
test_endpoint "Sort injection attempt" "200" "GET" "$BASE/api/transactions?sort=;DROP%20TABLE%20transactions"
test_endpoint "Non-existent category" "200" "GET" "$BASE/api/transactions?category=FakeCategory"
test_endpoint "Search keyword" "200" "GET" "$BASE/api/transactions?search=makan"
test_endpoint "Date range filter" "200" "GET" "$BASE/api/transactions?startDate=2026-01-01&endDate=2026-12-31"
test_endpoint "Amount range filter" "200" "GET" "$BASE/api/transactions?minAmount=100&maxAmount=100000"

# ─── GET /api/transactions/:id ───
echo ""
echo "── GET /api/transactions/:id ──"
test_endpoint "Existing ID (1)" "200" "GET" "$BASE/api/transactions/1"
test_endpoint "Non-existent ID (99999)" "404" "GET" "$BASE/api/transactions/99999"
test_endpoint "String ID (abc)" "400" "GET" "$BASE/api/transactions/abc"
test_endpoint "Negative ID (-1)" "400" "GET" "$BASE/api/transactions/-1"
test_endpoint "Float ID (1.5)" "400" "GET" "$BASE/api/transactions/1.5"

# ─── PUT /api/transactions/:id ───
echo ""
echo "── PUT /api/transactions/:id ──"
test_endpoint "Valid full update" "200" "PUT" "$BASE/api/transactions/1" \
    '{"amount":75000,"description":"Updated item","category_id":1,"date":"2026-04-30"}'
test_endpoint "Partial update (should fail - PUT requires all fields)" "400" "PUT" "$BASE/api/transactions/1" \
    '{"amount":75000}'
test_endpoint "Update non-existent ID" "404" "PUT" "$BASE/api/transactions/99999" \
    '{"amount":75000,"description":"Test","category_id":1,"date":"2026-04-30"}'
test_endpoint "Update invalid ID format" "400" "PUT" "$BASE/api/transactions/abc" \
    '{"amount":75000,"description":"Test","category_id":1,"date":"2026-04-30"}'

# ─── DELETE /api/transactions/:id ───
echo ""
echo "── DELETE /api/transactions/:id ──"
# Create a transaction specifically to delete
CREATE_RESP=$(curl -s -X POST "$BASE/api/transactions" \
    -H "Content-Type: application/json" \
    -d '{"amount":1,"description":"To be deleted","category_id":1,"date":"2026-01-01"}')
DELETE_ID=$(echo "$CREATE_RESP" | grep -o '"id":[0-9]*' | head -1 | cut -d: -f2)

if [ -n "$DELETE_ID" ]; then
    test_endpoint "Valid delete (ID=$DELETE_ID)" "200" "DELETE" "$BASE/api/transactions/$DELETE_ID"
    test_endpoint "Delete already deleted (ID=$DELETE_ID)" "404" "DELETE" "$BASE/api/transactions/$DELETE_ID"
else
    echo "⚠️  Could not create test transaction for delete tests"
    ((FAIL+=2))
fi
test_endpoint "Delete string ID" "400" "DELETE" "$BASE/api/transactions/abc"

# ─── POST /api/budget/allocate ───
echo ""
echo "── POST /api/budget/allocate ──"
test_endpoint "Valid income" "200" "POST" "$BASE/api/budget/allocate" '{"income":10000000}'
test_endpoint "Negative income" "400" "POST" "$BASE/api/budget/allocate" '{"income":-1000}'
test_endpoint "String income" "400" "POST" "$BASE/api/budget/allocate" '{"income":"abc"}'
test_endpoint "Empty body" "400" "POST" "$BASE/api/budget/allocate" '{}'
test_endpoint "Zero income" "400" "POST" "$BASE/api/budget/allocate" '{"income":0}'

# ─── Unknown Route (404) ───
echo ""
echo "── Unknown Route ──"
test_endpoint "GET unknown route" "404" "GET" "$BASE/api/nonexistent"
test_endpoint "POST unknown route" "404" "POST" "$BASE/api/nonexistent" '{}'

# ─── Summary ───
TOTAL=$((PASS + FAIL))
echo ""
echo "=========================================="
echo "📊 Results: $PASS/$TOTAL passed, $FAIL failed"
if [ $FAIL -eq 0 ]; then
    echo "🎉 All tests passed!"
else
    echo "⚠️  $FAIL test(s) need attention"
fi
echo "=========================================="
