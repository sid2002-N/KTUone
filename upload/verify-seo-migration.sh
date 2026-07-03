#!/usr/bin/env bash
#
# verify-seo-migration.sh
#
# Checks the SEO routing migration actually did what it claimed to do.
# Run against a local build ("next build && next start") or the live site.
#
# Usage:
#   BASE_URL=http://localhost:3000 ./verify-seo-migration.sh
#   BASE_URL=https://ktuone.in ./verify-seo-migration.sh
#
# Also pass --src <path> to grep the source tree for canonical/noindex checks.
#   ./verify-seo-migration.sh --src ./src

set -uo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"
SRC_DIR="./src"

# parse --src flag
while [[ $# -gt 0 ]]; do
  case "$1" in
    --src) SRC_DIR="$2"; shift 2 ;;
    *) shift ;;
  esac
done

ROUTES=(
  "/"
  "/calculators"
  "/papers"
  "/syllabus"
  "/calendar"
  "/notices"
  "/settings"
)

PASS=0
FAIL=0
WARN=0

pass() { echo "  ✅ $1"; PASS=$((PASS+1)); }
fail() { echo "  ❌ $1"; FAIL=$((FAIL+1)); }
warn() { echo "  ⚠️  $1"; WARN=$((WARN+1)); }

echo "=================================================="
echo "SEO Migration Verification — $BASE_URL"
echo "=================================================="

# ---------------------------------------------------------
# 1. Each route loads and has a unique <title>
# ---------------------------------------------------------
echo ""
echo "--- 1. Unique <title> + <meta description> per route ---"
declare -A SEEN_TITLES
for route in "${ROUTES[@]}"; do
  html=$(curl -s -A "Mozilla/5.0 (SEO-check-bot)" "${BASE_URL}${route}")
  status=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}${route}")

  if [[ "$status" != "200" ]]; then
    fail "$route → HTTP $status (expected 200)"
    continue
  fi

  title=$(echo "$html" | grep -oPm1 '(?<=<title>)[^<]+' || echo "")
  desc=$(echo "$html" | grep -oPm1 '(?<=<meta name="description" content=")[^"]+' || echo "")

  if [[ -z "$title" ]]; then
    fail "$route → no <title> found"
  elif [[ -n "${SEEN_TITLES[$title]:-}" ]]; then
    fail "$route → duplicate title (\"$title\" also used by ${SEEN_TITLES[$title]})"
  else
    SEEN_TITLES["$title"]="$route"
    pass "$route → title: \"$title\""
  fi

  if [[ -z "$desc" ]]; then
    fail "$route → no meta description found"
  else
    pass "$route → description present (${#desc} chars)"
  fi
done

# ---------------------------------------------------------
# 2. JSON-LD present in raw HTML (not just after JS hydration)
# ---------------------------------------------------------
echo ""
echo "--- 2. JSON-LD structured data in static HTML ---"
for route in "${ROUTES[@]}"; do
  html=$(curl -s -A "Mozilla/5.0 (SEO-check-bot)" "${BASE_URL}${route}")
  if echo "$html" | grep -q 'application/ld+json'; then
    # sanity check it's valid-ish JSON, not empty
    ldjson=$(echo "$html" | grep -oPz '(?s)(?<=application/ld\+json">)[^<]+' | tr -d '\0')
    if echo "$ldjson" | head -c1 | grep -q '{'; then
      pass "$route → JSON-LD present and looks like valid JSON"
    else
      warn "$route → JSON-LD script tag found but content looks malformed"
    fi
  else
    fail "$route → no JSON-LD script tag in raw HTML (check it isn't injected client-side)"
  fi
done

# ---------------------------------------------------------
# 3. Canonical URL per route
# ---------------------------------------------------------
echo ""
echo "--- 3. Canonical URL tags ---"
for route in "${ROUTES[@]}"; do
  html=$(curl -s -A "Mozilla/5.0 (SEO-check-bot)" "${BASE_URL}${route}")
  canonical=$(echo "$html" | grep -oPm1 '(?<=rel="canonical" href=")[^"]+' || echo "")
  if [[ -z "$canonical" ]]; then
    fail "$route → no <link rel=\"canonical\"> found"
  else
    expected="https://ktuone.in${route}"
    # normalize trailing slash on root
    if [[ "$route" == "/" ]]; then expected="https://ktuone.in/"; fi
    if [[ "$canonical" == "$expected" || "$canonical" == "${expected%/}" ]]; then
      pass "$route → canonical: $canonical"
    else
      warn "$route → canonical is \"$canonical\", expected something like \"$expected\""
    fi
  fi
done

# ---------------------------------------------------------
# 4. /settings noindex (metadata-level, not just robots.txt)
# ---------------------------------------------------------
echo ""
echo "--- 4. /settings noindex (metadata-level) ---"
settings_html=$(curl -s -A "Mozilla/5.0 (SEO-check-bot)" "${BASE_URL}/settings")
if echo "$settings_html" | grep -qiP '<meta[^>]*name="robots"[^>]*content="[^"]*noindex'; then
  pass "/settings → <meta name=\"robots\" content=\"noindex...\"> present"
else
  fail "/settings → no noindex meta tag found (robots.txt disallow alone won't guarantee de-indexing)"
fi

# ---------------------------------------------------------
# 5. robots.txt and sitemap.xml
# ---------------------------------------------------------
echo ""
echo "--- 5. robots.txt + sitemap.xml ---"
robots=$(curl -s "${BASE_URL}/robots.txt")
if echo "$robots" | grep -qi "Disallow.*admin"; then
  pass "robots.txt disallows /admin"
else
  fail "robots.txt does not disallow /admin"
fi
if echo "$robots" | grep -qi "sitemap"; then
  pass "robots.txt references sitemap"
else
  warn "robots.txt does not reference sitemap.xml"
fi

sitemap=$(curl -s "${BASE_URL}/sitemap.xml")
for route in "${ROUTES[@]}"; do
  url="https://ktuone.in${route}"
  if [[ "$route" == "/" ]]; then url="https://ktuone.in/"; fi
  if echo "$sitemap" | grep -q "$url" || echo "$sitemap" | grep -q "${url%/}"; then
    pass "sitemap.xml includes $route"
  else
    fail "sitemap.xml missing $route"
  fi
done

# ---------------------------------------------------------
# 6. Branch abbreviation check (EC vs ECE) in papers description
# ---------------------------------------------------------
echo ""
echo "--- 6. Branch abbreviation check (papers page) ---"
papers_html=$(curl -s -A "Mozilla/5.0 (SEO-check-bot)" "${BASE_URL}/papers")
if echo "$papers_html" | grep -qP '\bEC\b(?!E)'; then
  warn "papers description/content may still contain bare \"EC\" — confirm this should be \"ECE\""
else
  pass "no bare \"EC\" abbreviation found (assuming ECE or none used)"
fi

# ---------------------------------------------------------
# 7. Source-level checks (requires local source tree)
# ---------------------------------------------------------
echo ""
echo "--- 7. Source tree checks (--src $SRC_DIR) ---"
if [[ -d "$SRC_DIR" ]]; then
  canon_count=$(grep -rl "canonical" "$SRC_DIR/app" 2>/dev/null | wc -l | tr -d ' ')
  noindex_count=$(grep -rl "noindex" "$SRC_DIR/app" 2>/dev/null | wc -l | tr -d ' ')
  navstore_in_pages=$(grep -rl "useNavStore" "$SRC_DIR/app" 2>/dev/null | grep -v "layout.tsx" | wc -l | tr -d ' ')

  if [[ "$canon_count" -ge 7 ]]; then
    pass "found \"canonical\" in $canon_count files under $SRC_DIR/app"
  else
    warn "\"canonical\" only found in $canon_count files under $SRC_DIR/app (expected ~7)"
  fi

  if [[ "$noindex_count" -ge 1 ]]; then
    pass "found \"noindex\" in $noindex_count file(s)"
  else
    fail "\"noindex\" not found anywhere under $SRC_DIR/app"
  fi

  if [[ "$navstore_in_pages" -eq 0 ]]; then
    pass "no leftover useNavStore route-switching calls outside layout.tsx"
  else
    warn "useNavStore referenced in $navstore_in_pages page file(s) outside layout.tsx — confirm these are modal-only usages"
  fi
else
  warn "source dir \"$SRC_DIR\" not found — skipping source-level checks (pass --src <path>)"
fi

# ---------------------------------------------------------
# Summary
# ---------------------------------------------------------
echo ""
echo "=================================================="
echo "RESULTS: $PASS passed, $FAIL failed, $WARN warnings"
echo "=================================================="
if [[ "$FAIL" -gt 0 ]]; then
  exit 1
fi
exit 0
