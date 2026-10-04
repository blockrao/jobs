#!/usr/bin/env bash
# Applies a launch-load export directory with psql. Stops at the first failure; never retries,
# repairs or skips. The connection string is read from the environment (LOAD_URL) and is
# never written to a file or printed.
#
#   read -s LOAD_URL; export LOAD_URL
#   scripts/launch-load/apply.sh <export-dir> [--verify-only]
#
# Order: 1) before-state hashes  2) every chunk, hash-checked, in manifest order
#        3) verify.sql  4) after-state hashes (same rows as step 1).
# Paste the printed BEFORE, VERIFY and AFTER blocks back for comparison with the manifest.
set -euo pipefail
dir="${1:?export directory}"
mode="${2:-}"
: "${LOAD_URL:?set LOAD_URL (read -s LOAD_URL; export LOAD_URL)}"
here="$(cd "$(dirname "$0")" && pwd)"
psqlq() { psql "$LOAD_URL" -v ON_ERROR_STOP=1 -X -q -At -F '|' "$@"; }

# Highest id per table before the load; the AFTER hash covers exactly those rows.
vars=()
while read -r t; do
  m="$(psqlq -c "select coalesce(max(id),0) from public.$t")"
  vars+=(-v "max_$t=$m")
done < "$dir/state_tables.txt"

echo "== BEFORE (existing rows)"
psqlq "${vars[@]}" -f "$dir/state.sql" | tee "$dir/state_before.out"

if [ "$mode" != "--verify-only" ]; then
  echo "== CHUNKS"
  # manifest chunk list: seq|file|sha256
  while IFS='|' read -r seq file sha; do
    got="$(shasum -a 256 "$dir/chunks/$file" | cut -d' ' -f1)"
    [ "$got" = "$sha" ] || { echo "STOP: $file does not match its manifest hash"; exit 1; }
    psqlq -f "$dir/chunks/$file" >/dev/null || { echo "STOP: $file failed"; exit 1; }
    echo "applied $file"
  done < "$dir/chunk_list.txt"
fi

echo "== VERIFY (manifest rows)"
psqlq -f "$dir/verify.sql"
echo "== AFTER (same existing rows as BEFORE)"
psqlq "${vars[@]}" -f "$dir/state.sql" | tee "$dir/state_after.out"
if [ "$mode" != "--verify-only" ] && ! diff -q "$dir/state_before.out" "$dir/state_after.out" >/dev/null; then
  echo "STOP: existing rows differ after the load"; exit 1
fi
echo "done"
