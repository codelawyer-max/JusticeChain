#!/usr/bin/env bash
# =============================================================================
# test-audit.sh — Manual audit-logging smoke test
#
# Usage:
#   TOKEN=<your-jwt>  CASE_ID=<valid-mongo-case-_id>  bash backend/test-audit.sh
#
# Requires:
#   - Backend running:  cd backend && node index.js
#   - A real JWT and a real case _id (see Step 0 in the companion .md guide)
#   - python3 in PATH (for pretty-printing JSON)
#   - A /tmp/test.pdf file to upload (any small PDF will do)
# =============================================================================
set -euo pipefail

BASE="${BASE:-http://localhost:5000}"
AUTH="Authorization: Bearer $TOKEN"

RED='\033[0;31m'; GREEN='\033[0;32m'; CYAN='\033[0;36m'; NC='\033[0m'

step() { echo -e "\n${CYAN}=== $* ===${NC}"; }
ok()   { echo -e "${GREEN}✓ $*${NC}"; }
fail() { echo -e "${RED}✗ $*${NC}"; }

# ── Preflight checks ──────────────────────────────────────────────────────────
[[ -z "${TOKEN:-}"   ]] && { fail "TOKEN env var is required"; exit 1; }
[[ -z "${CASE_ID:-}" ]] && { fail "CASE_ID env var is required"; exit 1; }
[[ ! -f /tmp/test.pdf ]] && {
    # create a minimal 1-byte file so the upload middleware is satisfied
    echo "%PDF-1.0" > /tmp/test.pdf
    ok "Created stub /tmp/test.pdf"
}

# ── Step 1: Successful upload → DOCUMENT_UPLOADED / SUCCESS ──────────────────
step "1 · Upload document (success path)"
UPLOAD_RESP=$(curl -s -X POST "$BASE/api/documents/upload" \
  -H "$AUTH" \
  -F "document=@/tmp/test.pdf" \
  -F "caseId=$CASE_ID" \
  -F "title=Audit-Smoke-Test" \
  -F "documentType=Other")
echo "$UPLOAD_RESP" | python3 -m json.tool 2>/dev/null || echo "$UPLOAD_RESP"

DOC_ID=$(echo "$UPLOAD_RESP" | python3 -c \
  "import sys,json; d=json.load(sys.stdin); print(d.get('document',{}).get('id',''))" 2>/dev/null || true)

if [[ -n "$DOC_ID" ]]; then
    ok "Upload succeeded. doc._id = $DOC_ID"
else
    fail "Upload may have failed — DOC_ID not extracted. Check output above."
fi

# ── Step 2: Failed upload → DOCUMENT_UPLOADED / FAILED ───────────────────────
step "2 · Upload document — failure path (missing required fields)"
FAIL_RESP=$(curl -s -X POST "$BASE/api/documents/upload" \
  -H "$AUTH" \
  -F "document=@/tmp/test.pdf")   # no caseId / title / documentType
echo "$FAIL_RESP" | python3 -m json.tool 2>/dev/null || echo "$FAIL_RESP"
STATUS=$(echo "$FAIL_RESP" | python3 -c \
  "import sys,json; print(json.load(sys.stdin).get('success','?'))" 2>/dev/null || true)
[[ "$STATUS" == "False" || "$STATUS" == "false" ]] \
    && ok "Got expected failure response" \
    || fail "Unexpected response — check output above"

# ── Step 3: Successful view → DOCUMENT_VIEWED / SUCCESS ──────────────────────
if [[ -n "$DOC_ID" ]]; then
    step "3 · Fetch document by ID (success path)"
    VIEW_RESP=$(curl -s "$BASE/api/documents/$DOC_ID" -H "$AUTH")
    echo "$VIEW_RESP" | python3 -m json.tool 2>/dev/null || echo "$VIEW_RESP"
    TITLE=$(echo "$VIEW_RESP" | python3 -c \
      "import sys,json; print(json.load(sys.stdin).get('document',{}).get('title',''))" 2>/dev/null || true)
    [[ -n "$TITLE" ]] && ok "Viewed document: $TITLE" || fail "View may have failed"
else
    step "3 · SKIPPED — no DOC_ID from step 1"
fi

# ── Step 4: Verify AuditLog entries ──────────────────────────────────────────
step "4 · Query audit logs"

if [[ -n "$DOC_ID" ]]; then
    echo -e "\n--- Logs for document $DOC_ID ---"
    curl -s "$BASE/api/audit-logs?documentId=$DOC_ID" -H "$AUTH" \
      | python3 -c "
import sys, json
resp = json.load(sys.stdin)
logs = resp.get('logs', [])
if not logs:
    print('  (no logs found)')
for l in logs:
    print(f\"  [{l.get('status','?'):7s}] {l.get('action','?'):30s} at {l.get('createdAt','?')}\")
    if l.get('metadata'):
        print(f\"          metadata={json.dumps(l['metadata'])}\")
print(f'  Total: {resp.get(\"total\", 0)}')
" 2>/dev/null
fi

echo -e "\n--- FAILED uploads (all documents) ---"
curl -s "$BASE/api/audit-logs?action=DOCUMENT_UPLOADED" -H "$AUTH" \
  | python3 -c "
import sys, json
resp = json.load(sys.stdin)
failed = [l for l in resp.get('logs', []) if l.get('status') == 'FAILED']
if not failed:
    print('  (none yet — FAILED entries show up if logAudit wrote them)')
for l in failed:
    print(f\"  FAILED upload: {l.get('description','')}\")
    print(f\"  metadata: {json.dumps(l.get('metadata', {}))}\")
" 2>/dev/null

echo -e "\n--- All logs for case $CASE_ID ---"
curl -s "$BASE/api/audit-logs?caseId=$CASE_ID" -H "$AUTH" \
  | python3 -c "
import sys, json
resp = json.load(sys.stdin)
logs = resp.get('logs', [])
for l in logs:
    print(f\"  [{l.get('status','?'):7s}] {l.get('action','?'):30s} at {l.get('createdAt','?')}\")
print(f'  Total: {resp.get(\"total\", 0)}')
" 2>/dev/null

echo -e "\n${GREEN}=== Smoke test complete ===${NC}"
echo "Expected entries in the audit log:"
echo "  ✓ DOCUMENT_UPLOADED / SUCCESS  (step 1)"
echo "  ✓ DOCUMENT_UPLOADED / FAILED   (step 2 — only if user was authenticated)"
echo "  ✓ DOCUMENT_VIEWED   / SUCCESS  (step 3)"
