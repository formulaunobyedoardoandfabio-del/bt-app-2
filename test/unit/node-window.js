// Finestra finta per le prove Node: localStorage in memoria e il Firebase finto appena caricato.
// setupWindow({ seed }) azzera tutto e restituisce { window, firebase, localStorage }.
const path = require('path');

function memoryStorage() {
  const m = new Map();
  return {
    getItem: k => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => { m.set(k, String(v)); },
    removeItem: k => { m.delete(k); },
    clear: () => m.clear(),
    key: i => [...m.keys()][i] ?? null,
    get length() { return m.size; },
  };
}

function setupWindow({ seed } = {}) {
  const localStorage = memoryStorage();
  const win = { localStorage, location: { search: '' }, __btSeed: seed };
  global.window = win;
  global.localStorage = localStorage;
  const file = path.join(__dirname, '..', 'fake', 'fake-firebase.js');
  delete require.cache[require.resolve(file)];
  require(file);
  return { window: win, firebase: win.firebase, localStorage };
}

module.exports = { setupWindow, memoryStorage };
