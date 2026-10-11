#!/usr/bin/env bash
# Tutte le prove: quelle dei calcoli e dei servizi (Node) e quelle nel browser.
# Girano JOBS file alla volta (di serie 2: qui ci sono 2 processori; tutte in fila durerebbero più di 20 minuti).
# Uso: bash test/all.sh            (i log completi vanno in test/logs/; JOBS=1 bash test/all.sh per farle in fila)
cd "$(dirname "$0")/.."
mkdir -p test/logs
JOBS=${JOBS:-2}
if [ -f src/App.jsx ]; then
  if ! node test/build-test.js > test/logs/build-test.log 2>&1; then
    echo "ERRORE nella costruzione della pagina di prova:"; tail -5 test/logs/build-test.log; exit 1
  fi
fi
files=()
for f in test/unit/*.test.js test/e2e/*.js; do
  case "$(basename "$f" .js)" in helpers|app) continue ;; esac   # aiuti e app costruita: non sono prove
  files+=("$f")
done
run_one() {
  local f=$1 name
  name=$(basename "$f" .js)
  timeout 900 node "$f" > "test/logs/$name.log" 2>&1
  echo $? > "test/logs/$name.code"
}
export -f run_one
# Risultati della volta prima: ogni prova parte segnata "non finita" (99) finché non scrive il suo.
for f in "${files[@]}"; do echo 99 > "test/logs/$(basename "$f" .js).code"; done
printf '%s\n' "${files[@]}" | xargs -P "$JOBS" -I{} bash -c 'run_one "$1"' _ {}
fails=0; summary=""
for f in "${files[@]}"; do
  name=$(basename "$f" .js)
  code=$(cat "test/logs/$name.code" 2>/dev/null || echo 99)
  last=$(grep -E "passati, [0-9]+ falliti" "test/logs/$name.log" | tail -1)
  [ -z "$last" ] && last="(nessun risultato, uscita $code)"
  if [ "$code" -ne 0 ]; then fails=$((fails+1)); mark="FAIL"; else mark="ok  "; fi
  summary="$summary$mark $name: $last\n"
done
printf '%b' "$summary"
if [ $fails -ne 0 ]; then echo "PROVE FALLITE: $fails file"; exit 1; fi
echo "TUTTO VERDE"
