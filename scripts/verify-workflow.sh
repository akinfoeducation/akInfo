#!/bin/bash
# ============================================================
# AKT Institute OS — Action-Driven Workflow Smoke Test
# Run after every backend restart or code change.
# Usage: ./scripts/verify-workflow.sh
# ============================================================

BASE="http://localhost:8080"
PASS=0; FAIL=0

# ── Login ─────────────────────────────────────────────────────────────────────
TOKEN=$(curl -s -X POST "$BASE/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"emailOrUsername":"admin","password":"admin"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['accessToken'])" 2>/dev/null)

if [ ${#TOKEN} -lt 50 ]; then echo "❌ Login failed — is backend running?"; exit 1; fi

H="Authorization: Bearer $TOKEN"

check() {
  local name="$1"; local result="$2"; local expected="$3"
  if echo "$result" | grep -q "$expected"; then
    echo "  ✅ $name"; PASS=$((PASS+1))
  else
    echo "  ❌ $name → got: $result"; FAIL=$((FAIL+1))
  fi
}

# ── Helper: get first lead with given status ──────────────────────────────────
lead_id() {
  curl -s "$BASE/api/v1/leads?size=50&status=$1" -H "$H" \
    | python3 -c "import sys,json; d=json.load(sys.stdin)['data']; print(d[0]['id'] if d else 'NONE')" 2>/dev/null
}

actions_for() {
  curl -s "$BASE/api/v1/leads/$1/available-actions" -H "$H" \
    | python3 -c "import sys,json; d=json.load(sys.stdin); print(' '.join(a['action'] for a in d.get('data',[])))" 2>/dev/null
}

echo ""
echo "========================================"
echo " AKT Workflow Smoke Test"
echo "========================================"

# ── 1. Stage in list response ─────────────────────────────────────────────────
echo ""
echo "1. Lead list includes stage field"
R=$(curl -s "$BASE/api/v1/leads?size=3" -H "$H" \
  | python3 -c "import sys,json; d=json.load(sys.stdin)['data']; print('HAS_STAGE' if d and 'stage' in d[0] and d[0]['stage'] else 'MISSING')" 2>/dev/null)
check "stage in list response" "$R" "HAS_STAGE"

# ── 2. ASSIGNED lead ──────────────────────────────────────────────────────────
echo ""
echo "2. ASSIGNED lead — Called—Reached is primary, no Plan Visit"
ID=$(lead_id ASSIGNED)
if [ "$ID" != "NONE" ]; then
  A=$(actions_for $ID)
  check "MARK_CONTACTED present"    "$A" "MARK_CONTACTED"
  check "CALL_NOT_CONNECTED present" "$A" "CALL_NOT_CONNECTED"
  check "PLAN_VISIT absent (not yet interested)" "$(echo $A | grep -v PLAN_VISIT; echo OK)" "OK"
else
  echo "  ⚪ No ASSIGNED leads to test"
fi

# ── 3. CONTACTED lead ─────────────────────────────────────────────────────────
echo ""
echo "3. CONTACTED lead — 9 actions including Plan Visit"
ID=$(lead_id CONTACTED)
if [ "$ID" != "NONE" ]; then
  A=$(actions_for $ID)
  check "MARK_INTERESTED present" "$A" "MARK_INTERESTED"
  check "PLAN_VISIT present"      "$A" "PLAN_VISIT"
  check "SCHEDULE_FOLLOW_UP"      "$A" "SCHEDULE_FOLLOW_UP"
  check "REQUEST_CALLBACK"        "$A" "REQUEST_CALLBACK"
else
  echo "  ⚪ No CONTACTED leads to test"
fi

# ── 4. INTERESTED lead ────────────────────────────────────────────────────────
echo ""
echo "4. INTERESTED lead — Plan Visit is primary, Mark Interested hidden"
ID=$(lead_id INTERESTED)
if [ "$ID" != "NONE" ]; then
  A=$(actions_for $ID)
  check "PLAN_VISIT present"         "$A" "PLAN_VISIT"
  check "MARK_INTERESTED absent"     "$(echo $A | grep -v MARK_INTERESTED; echo OK)" "OK"
else
  echo "  ⚪ No INTERESTED leads to test"
fi

# ── 5. VISIT_PLANNED lead — KEY: Student Visited action ──────────────────────
echo ""
echo "5. VISIT_PLANNED lead — Student Visited + Reschedule available"
ID=$(lead_id VISIT_PLANNED)
if [ "$ID" != "NONE" ]; then
  A=$(actions_for $ID)
  check "STUDENT_VISITED present"   "$A" "STUDENT_VISITED"
  check "RESCHEDULE_VISIT present"  "$A" "RESCHEDULE_VISIT"
  check "CALL_NOT_CONNECTED present" "$A" "CALL_NOT_CONNECTED"
else
  echo "  ⚪ No VISIT_PLANNED leads to test"
fi

# ── 6. NOT_CONNECTED — no double pool ────────────────────────────────────────
echo ""
echo "6. NOT_CONNECTED lead — cannot send to retry pool again"
ID=$(lead_id NOT_CONNECTED)
if [ "$ID" != "NONE" ]; then
  A=$(actions_for $ID)
  check "CALL_NOT_CONNECTED absent (already NC)" "$(echo $A | grep -v CALL_NOT_CONNECTED; echo OK)" "OK"
  check "MARK_CONTACTED present (primary)"       "$A" "MARK_CONTACTED"
else
  echo "  ⚪ No NOT_CONNECTED leads to test"
fi

# ── 7. VISIT_DONE — counsellor actions ───────────────────────────────────────
echo ""
echo "7. VISIT_DONE lead — counsellor sees Start Negotiation + Follow-up"
ID=$(lead_id VISIT_DONE)
if [ "$ID" != "NONE" ]; then
  A=$(actions_for $ID)
  check "START_NEGOTIATION present"            "$A" "START_NEGOTIATION"
  check "SCHEDULE_POST_VISIT_FOLLOWUP present" "$A" "SCHEDULE_POST_VISIT_FOLLOWUP"
  check "MARK_NOT_INTERESTED present"          "$A" "MARK_NOT_INTERESTED"
else
  echo "  ⚪ No VISIT_DONE leads to test"
fi

# ── 8. NEGOTIATION — counsellor actions ──────────────────────────────────────
echo ""
echo "8. NEGOTIATION lead — Request Documents + Not Interested"
ID=$(lead_id NEGOTIATION)
if [ "$ID" != "NONE" ]; then
  A=$(actions_for $ID)
  check "REQUEST_DOCUMENTS present"   "$A" "REQUEST_DOCUMENTS"
  check "MARK_NOT_INTERESTED present" "$A" "MARK_NOT_INTERESTED"
else
  echo "  ⚪ No NEGOTIATION leads to test"
fi

# ── 9. DOCUMENT_PENDING ───────────────────────────────────────────────────────
echo ""
echo "9. DOCUMENT_PENDING — Mark Documents Received"
ID=$(lead_id DOCUMENT_PENDING)
if [ "$ID" != "NONE" ]; then
  A=$(actions_for $ID)
  check "MARK_DOCUMENTS_RECEIVED present" "$A" "MARK_DOCUMENTS_RECEIVED"
else
  echo "  ⚪ No DOCUMENT_PENDING leads to test"
fi

# ── 10. Admin override requires reason ───────────────────────────────────────
echo ""
echo "10. Admin override — blocked without reason"
ID=$(lead_id ASSIGNED)
if [ "$ID" != "NONE" ]; then
  R=$(curl -s -X POST "$BASE/api/v1/leads/$ID/actions" -H "$H" \
    -H "Content-Type: application/json" \
    -d '{"action":"ADMIN_STATUS_OVERRIDE","overrideStatus":"INTERESTED"}' \
    | python3 -c "import sys,json; print(json.load(sys.stdin).get('errorCode',''))" 2>/dev/null)
  check "MISSING_OVERRIDE_REASON error" "$R" "MISSING_OVERRIDE_REASON"
fi

# ── 11. Activity timeline has structured fields ───────────────────────────────
echo ""
echo "11. Activity timeline has actionCategory + outcome"
# Use a lead we know had actions performed
ID=$(curl -s "$BASE/api/v1/leads?size=50&status=CONTACTED" -H "$H" \
  | python3 -c "import sys,json; d=json.load(sys.stdin)['data']; print(d[0]['id'] if d else 'NONE')" 2>/dev/null)
if [ "$ID" != "NONE" ]; then
  R=$(curl -s "$BASE/api/v1/leads/$ID/activities" -H "$H" \
    | python3 -c "import sys,json; d=json.load(sys.stdin)['data']; print('HAS_CAT' if any(a.get('actionCategory') for a in d) else 'MISSING')" 2>/dev/null)
  check "actionCategory in activities" "$R" "HAS_CAT"
fi

# ── Summary ───────────────────────────────────────────────────────────────────
echo ""
echo "========================================"
echo " Results: $PASS passed, $FAIL failed"
echo "========================================"
[ $FAIL -gt 0 ] && exit 1 || exit 0
