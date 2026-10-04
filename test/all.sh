#!/usr/bin/env bash
# Tutte le prove: prima quelle dei calcoli e dei servizi (Node), poi quelle nel browser.
# Uso: bash test/all.sh            (i log completi vanno in test/logs/)
cd "$(dirname "$0")/.."
mkdir -p test/logs
fails=0; summary=""
if [ -f src/App.jsx ]; then
  if ! node test/build-test.js > test/logs/build-test.log 2>&1; then
    echo "ERRORE nella costruzione della pagina di prova:"; tail -5 test/logs/build-test.log; exit 1
  fi
fi
for f in test/unit/*.test.js test/e2e/*.js; do
  name=$(basename "$f" .js)
  [ "$name" = "helpers" ] && continue
  timeout 900 node "$f" > "test/logs/$name.log" 2>&1
  code=$?
  last=$(grep -E "passati, [0-9]+ falliti" "test/logs/$name.log" | tail -1)
  [ -z "$last" ] && last="(nessun risultato, uscita $code)"
  if [ $code -ne 0 ]; then fails=$((fails+1)); mark="FAIL"; else mark="ok  "; fi
  summary="$summary$mark $name: $last\n"
done
printf "$summary"
if [ $fails -ne 0 ]; then echo "PROVE FALLITE: $fails file"; exit 1; fi
echo "TUTTO VERDE"
