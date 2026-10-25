# Controllo del lunedì (workflow "Dati F1", 12:41 UTC): ogni GP del calendario corso da più di un giorno deve avere i dati
# di gara e qualifiche in public/data/f1. Se mancano, o se il calendario 2026 è finito da più di 75 giorni (serve l'app
# del 2027), il controllo fallisce e GitHub manda un'email al proprietario del repository: nessuno deve accorgersene a mano.
# Uso: python3 tools/check_live_data.py [AAAA-MM-GG]   (data di oggi, per provarlo)
import datetime, json, os, re, sys
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
idx = json.load(open(os.path.join(ROOT, 'public', 'data', 'f1', 'index.json'), encoding='utf-8'))
cal = re.findall(r'\["(GP [^"]+)", "[^"]*", "[^"]*", "(\d{4}-\d{2}-\d{2})"\]', open(os.path.join(ROOT, 'src', 'data', 'f1-2026.js'), encoding='utf-8').read())
today = datetime.date.fromisoformat(sys.argv[1]) if len(sys.argv) > 1 else datetime.date.today()
done = [(i + 1, name) for i, (name, day) in enumerate(cal) if datetime.date.fromisoformat(day) + datetime.timedelta(days=1) < today]
missing = [f'{name} (round {r}: {"gara" if r not in idx["weekend"]["races"] else ""}{" e " if r not in idx["weekend"]["races"] and r not in idx["weekend"]["quali"] else ""}{"qualifiche" if r not in idx["weekend"]["quali"] else ""})'
           for r, name in done if r not in idx['weekend']['races'] or r not in idx['weekend']['quali']]
problems = []
if missing: problems.append('MANCANO I DATI DI: ' + '; '.join(missing) + '. TracingInsights non li ha pubblicati o il workflow non riesce a leggerli.')
if cal and today > datetime.date.fromisoformat(cal[-1][1]) + datetime.timedelta(days=75):
    problems.append('IL CALENDARIO 2026 È FINITO: per la stagione 2027 serve aggiornare l\'app (calendario, piloti, dati).')
if problems:
    print('\n'.join(problems)); sys.exit(1)
print(f'Dati completi: {len(done)} GP già corsi, tutti con gara e qualifiche.')
