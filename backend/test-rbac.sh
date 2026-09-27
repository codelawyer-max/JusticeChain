#!/usr/bin/env bash
# =============================================================================
# test-rbac.sh — Phase 1 (permissions) + Phase 2 (RBAC) smoke test
#
# Tests:
#   1. Register rejects a payload missing officerRole → 400
#   2. Register officer A (INVESTIGATING_OFFICER)
#   3. Register officer B (PUBLIC_PROSECUTOR)
#   4. Register a SUPER_ADMIN
#   5. Officer A cannot view a document they have no permission for → 403
#   6. Officer A cannot list the document either → list is empty
#   7. Grant officer A view access via POST /api/permissions/grant (as SUPER_ADMIN)
#   8. Officer A can now view the document → 200
#   9. Officer A can now see it in the list → count ≥ 1
#  10. Revoke officer A's access → 200
#  11. Officer A is denied again → 403
#  12. SUPER_ADMIN can view the same document without any explicit permission → 200
#
# Usage:
#   SUPER_TOKEN=<existing-super-admin-jwt>  DOC_ID=<valid-doc-_id>  bash backend/test-rbac.sh
#
# SUPER_TOKEN  — JWT of an existing SUPER_ADMIN (used for grant/revoke/view checks).
#                If you don't have one yet, comment out step 12 and re-run after
#                registering a SUPER_ADMIN through this very script (step 4).
# DOC_ID       — MongoDB _id of any document the test officers did NOT upload.
#
# Requires:
#   - Backend running: cd backend && node index.js
#   - python3 in PATH (for JSON parsing)
# =============================================================================
set -euo pipefail

BASE="${BASE:-http://localhost:5000}"
RED='\033[0;31m'; GREEN='\033[0;32m'; CYAN='\033[0;36m'; YELLOW='\033[0;33m'; NC='\033[0m'

step()   { echo -e "\n${CYAN}=== $* ===${NC}"; }
ok()     { echo -e "${GREEN}✓ $*${NC}"; }
fail()   { echo -e "${RED}✗ $*${NC}"; }
warn()   { echo -e "${YELLOW}! $*${NC}"; }
pretty() { python3 -m json.tool 2>/dev/null || cat; }

# ── Preflight ─────────────────────────────────────────────────────────────────
# Random suffix so re-runs don't collide on the unique-email constraint
SUFFIX="${RANDOM}"
EMAIL_A="officer.a.${SUFFIX}@justicechain.test"
EMAIL_B="officer.b.${SUFFIX}@justicechain.test"
EMAIL_S="superadmin.${SUFFIX}@justicechain.test"
PASS="TestPass123!"

SUPER_AUTH=""
if [[ -n "${SUPER_TOKEN:-}" ]]; then
    SUPER_AUTH="Authorization: Bearer $SUPER_TOKEN"
    ok "Using provided SUPER_TOKEN"
fi


# ── Step 1: Register without officerRole → must be 400 ───────────────────────
step "1 · Register admin WITHOUT officerRole — expect 400"
RESP=$(curl -s -X POST "$BASE/api/auth/admin/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"norole.${SUFFIX}@test.com\",\"password\":\"$PASS\",\"fullName\":\"No Role\"}")
echo "$RESP" | pretty

HTTP_MSG=$(echo "$RESP" | python3 -c \
  "import sys,json; d=json.load(sys.stdin); print(d.get('message',''))" 2>/dev/null || true)

if echo "$HTTP_MSG" | grep -qi "officerRole"; then
    ok "Register correctly rejected missing officerRole"
else
    fail "Expected rejection for missing officerRole, got: $HTTP_MSG"
fi


# ── Step 2: Register officer A (INVESTIGATING_OFFICER) ───────────────────────
step "2 · Register officer A — INVESTIGATING_OFFICER"
RESP_A=$(curl -s -X POST "$BASE/api/auth/admin/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\":\"$EMAIL_A\",\"password\":\"$PASS\",
    \"fullName\":\"Officer Alpha\",
    \"officerRole\":\"INVESTIGATING_OFFICER\",
    \"department\":\"Police\"
  }")
echo "$RESP_A" | pretty
echo "$RESP_A" | grep -qi "successfully" && ok "Officer A registered" || fail "Officer A registration failed"


# ── Step 3: Register officer B (PUBLIC_PROSECUTOR) ───────────────────────────
step "3 · Register officer B — PUBLIC_PROSECUTOR"
RESP_B=$(curl -s -X POST "$BASE/api/auth/admin/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\":\"$EMAIL_B\",\"password\":\"$PASS\",
    \"fullName\":\"Officer Beta\",
    \"officerRole\":\"PUBLIC_PROSECUTOR\",
    \"department\":\"Legal\"
  }")
echo "$RESP_B" | pretty
echo "$RESP_B" | grep -qi "successfully" && ok "Officer B registered" || fail "Officer B registration failed"


# ── Step 4: Register SUPER_ADMIN ─────────────────────────────────────────────
step "4 · Register a SUPER_ADMIN"
RESP_S=$(curl -s -X POST "$BASE/api/auth/admin/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\":\"$EMAIL_S\",\"password\":\"$PASS\",
    \"fullName\":\"Super Admin\",
    \"officerRole\":\"SUPER_ADMIN\"
  }")
echo "$RESP_S" | pretty
echo "$RESP_S" | grep -qi "successfully" && ok "SUPER_ADMIN registered" || fail "SUPER_ADMIN registration failed"

# Auto-acquire SUPER_TOKEN if not explicitly passed
if [[ -z "$SUPER_AUTH" ]]; then
    LOGIN_S=$(curl -s -X POST "$BASE/api/auth/admin/login" \
      -H "Content-Type: application/json" \
      -d "{\"email\":\"$EMAIL_S\",\"password\":\"$PASS\"}")
    SUPER_TOKEN=$(echo "$LOGIN_S" | python3 -c \
      "import sys,json; print(json.load(sys.stdin).get('token',''))" 2>/dev/null || true)
    [[ -n "$SUPER_TOKEN" ]] && ok "Logged in as new SUPER_ADMIN" || { fail "Failed to login as new SUPER_ADMIN"; exit 1; }
    SUPER_AUTH="Authorization: Bearer $SUPER_TOKEN"
fi

# Auto-discover DOC_ID if not explicitly provided
if [[ -z "${DOC_ID:-}" ]]; then
    DOC_ID=$(curl -s -X GET "$BASE/api/documents" -H "$SUPER_AUTH" | python3 -c \
      "import sys,json; docs=json.load(sys.stdin).get('documents',[]); print(docs[0].get('_id','') if docs else '')" 2>/dev/null || true)
    if [[ -z "$DOC_ID" ]]; then
        fail "No documents found in database. Please upload a document first or pass DOC_ID=<id>."
        exit 1
    fi
    ok "Discovered test document ID: $DOC_ID"
fi


# ── Login officer A → get token ───────────────────────────────────────────────
step "Login officer A to get JWT"
LOGIN_A=$(curl -s -X POST "$BASE/api/auth/admin/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL_A\",\"password\":\"$PASS\"}")
echo "$LOGIN_A" | pretty

TOKEN_A=$(echo "$LOGIN_A" | python3 -c \
  "import sys,json; print(json.load(sys.stdin).get('token',''))" 2>/dev/null || true)

[[ -n "$TOKEN_A" ]] && ok "Got JWT for officer A" || { fail "Could not get JWT for officer A"; exit 1; }
AUTH_A="Authorization: Bearer $TOKEN_A"

# Decode officerRole from JWT payload (middle segment, base64)
OFFICER_ROLE_A=$(echo "$TOKEN_A" | cut -d. -f2 | python3 -c \
  "import sys,json,base64; p=sys.stdin.read().strip(); p+='='*(-len(p)%4); print(json.loads(base64.b64decode(p)).get('officerRole','?'))" 2>/dev/null || echo "?")
ok "JWT carries officerRole=$OFFICER_ROLE_A"


# ── Step 5: Officer A tries to view the document — expect 403 ────────────────
step "5 · Officer A views document $DOC_ID — expect 403 (no permission)"
VIEW_RESP=$(curl -s -o /dev/null -w "%{http_code}" -X GET "$BASE/api/documents/$DOC_ID" \
  -H "$AUTH_A")
echo "HTTP status: $VIEW_RESP"
[[ "$VIEW_RESP" == "403" ]] && ok "Correctly denied with 403" || fail "Expected 403, got $VIEW_RESP"


# ── Step 6: Officer A lists documents — their count should be 0 (or only docs they uploaded) ─
step "6 · Officer A lists documents — should NOT include the test document"
LIST_RESP=$(curl -s -X GET "$BASE/api/documents" -H "$AUTH_A")
DOC_IDS_IN_LIST=$(echo "$LIST_RESP" | python3 -c \
  "import sys,json; docs=json.load(sys.stdin).get('documents',[]); print(' '.join(d.get('_id','') for d in docs))" 2>/dev/null || true)

if echo "$DOC_IDS_IN_LIST" | grep -q "$DOC_ID"; then
    fail "Document $DOC_ID appeared in officer A's list — permission filter not working"
else
    ok "Document $DOC_ID correctly absent from officer A's list"
fi


# ── Step 7: SUPER_ADMIN grants officer A view access ─────────────────────────
step "7 · Grant officer A view access (as SUPER_ADMIN)"

# Resolve officer A's admin _id from the list endpoint or from login response
OFFICER_A_ID=$(echo "$LOGIN_A" | python3 -c \
  "import sys,json; d=json.load(sys.stdin); print(d.get('admin',{}).get('id',''))" 2>/dev/null || true)

[[ -n "$OFFICER_A_ID" ]] && ok "Officer A _id = $OFFICER_A_ID" || { fail "Could not resolve officer A _id"; exit 1; }

GRANT_RESP=$(curl -s -X POST "$BASE/api/permissions/grant" \
  -H "Content-Type: application/json" \
  -H "$SUPER_AUTH" \
  -d "{
    \"documentId\":\"$DOC_ID\",
    \"grantedTo\":\"$OFFICER_A_ID\",
    \"grantedToModel\":\"Admin\",
    \"permissions\":{\"view\":true,\"download\":false}
  }")
echo "$GRANT_RESP" | pretty

PERM_ID=$(echo "$GRANT_RESP" | python3 -c \
  "import sys,json; print(json.load(sys.stdin).get('permission',{}).get('_id',''))" 2>/dev/null || true)

[[ -n "$PERM_ID" ]] && ok "Permission granted. permId=$PERM_ID" || { fail "Grant failed"; exit 1; }


# ── Step 8: Officer A can now view the document ───────────────────────────────
step "8 · Officer A views document after grant — expect 200"
VIEW_RESP2=$(curl -s -o /dev/null -w "%{http_code}" -X GET "$BASE/api/documents/$DOC_ID" \
  -H "$AUTH_A")
echo "HTTP status: $VIEW_RESP2"
[[ "$VIEW_RESP2" == "200" ]] && ok "Access granted, 200 received" || fail "Expected 200, got $VIEW_RESP2"


# ── Step 9: Document now appears in officer A's list ─────────────────────────
step "9 · Officer A's document list now includes the test document"
LIST_RESP2=$(curl -s -X GET "$BASE/api/documents" -H "$AUTH_A")
DOC_IDS_IN_LIST2=$(echo "$LIST_RESP2" | python3 -c \
  "import sys,json; docs=json.load(sys.stdin).get('documents',[]); print(' '.join(d.get('_id','') for d in docs))" 2>/dev/null || true)

if echo "$DOC_IDS_IN_LIST2" | grep -q "$DOC_ID"; then
    ok "Document $DOC_ID now visible in officer A's list"
else
    fail "Document $DOC_ID still missing from officer A's list after grant"
fi


# ── Step 10: Revoke officer A's permission ────────────────────────────────────
step "10 · Revoke officer A's permission (as SUPER_ADMIN)"
REVOKE_RESP=$(curl -s -X DELETE "$BASE/api/permissions/$PERM_ID/revoke" \
  -H "$SUPER_AUTH")
echo "$REVOKE_RESP" | pretty
echo "$REVOKE_RESP" | grep -qi '"status":"REVOKED"' && ok "Permission revoked" || fail "Revoke may have failed"


# ── Step 11: Officer A is denied again ───────────────────────────────────────
step "11 · Officer A tries to view document after revoke — expect 403"
VIEW_RESP3=$(curl -s -o /dev/null -w "%{http_code}" -X GET "$BASE/api/documents/$DOC_ID" \
  -H "$AUTH_A")
echo "HTTP status: $VIEW_RESP3"
[[ "$VIEW_RESP3" == "403" ]] && ok "Access correctly removed, 403 received" || fail "Expected 403, got $VIEW_RESP3"


# ── Step 12: SUPER_ADMIN bypasses everything ──────────────────────────────────
step "12 · SUPER_ADMIN views same document without any explicit permission — expect 200"
VIEW_SUPER=$(curl -s -o /dev/null -w "%{http_code}" -X GET "$BASE/api/documents/$DOC_ID" \
  -H "$SUPER_AUTH")
echo "HTTP status: $VIEW_SUPER"
[[ "$VIEW_SUPER" == "200" ]] && ok "SUPER_ADMIN bypass works, 200 received" || fail "Expected 200, got $VIEW_SUPER"


# ── Summary ───────────────────────────────────────────────────────────────────
echo -e "\n${CYAN}=== All tests complete ===${NC}"
