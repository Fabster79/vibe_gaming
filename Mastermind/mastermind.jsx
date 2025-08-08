const { useMemo, useState } = React;

// Mastermind – Single-file React component (TailwindCSS)
// Default export so it can be previewed immediately.
// No external UI libs required. Pure React + Tailwind.

// --- Types
const defaultPalette = [
  { k: "r", label: "Red", hex: "#ef4444" },
  { k: "b", label: "Blue", hex: "#3b82f6" },
  { k: "g", label: "Green", hex: "#22c55e" },
  { k: "y", label: "Yellow", hex: "#eab308" },
  { k: "o", label: "Orange", hex: "#f97316" },
  { k: "p", label: "Purple", hex: "#a855f7" },
];

function randomCode(keys, length, allowDuplicates) {
  if (allowDuplicates) {
    return Array.from({ length }, () => keys[Math.floor(Math.random() * keys.length)]);
  }
  const arr = [...keys];
  if (length > arr.length) {
    // Fallback to allowing duplicates if impossible
    return randomCode(keys, length, true);
  }
  arr.sort(() => Math.random() - 0.5);
  return arr.slice(0, length);
}

function scoreGuess(secret, guess) {
  // black = correct color & position
  const blacks = secret.reduce((acc, s, i) => acc + (s === guess[i] ? 1 : 0), 0);

  // whites = color overlap minus blacks
  const secCounts = new Map();
  const gueCounts = new Map();
  for (const s of secret) secCounts.set(s, (secCounts.get(s) || 0) + 1);
  for (const g of guess) gueCounts.set(g, (gueCounts.get(g) || 0) + 1);
  let overlap = 0;
  for (const [k, sc] of secCounts.entries()) {
    const gc = gueCounts.get(k) || 0;
    overlap += Math.min(sc, gc);
  }
  const whites = Math.max(0, overlap - blacks);
  return { blacks, whites };
}

function Peg({ color, active }) {
  return (
    <div
      className={
        "h-10 w-10 rounded-full border shadow-sm transition-transform " +
        (active ? "ring-2 ring-offset-2 scale-105 " : "")
      }
      style={{ background: color, borderColor: "rgba(0,0,0,0.2)" }}
    />
  );
}

function Pin({ type }) {
  // type: "black" | "white" | null
  const bg = type === "black" ? "bg-gray-900" : type === "white" ? "bg-white" : "bg-transparent";
  const border = type ? "border border-gray-300" : "";
  return <div className={`h-3 w-3 rounded-full ${bg} ${border}`} />;
}

function GuessRow({ palette, guess, onSetSlot, onSubmit, canSubmit, disabled, feedback }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex gap-2">
        {guess.map((g, i) => (
          <button
            key={i}
            onClick={() => !disabled && onSetSlot(i)}
            className={
              "h-10 w-10 rounded-full border border-gray-300 grid place-items-center text-xs font-medium shadow-sm " +
              (disabled ? "opacity-70 cursor-default" : "hover:scale-105 transition-transform")
            }
            style={{ background: g ? palette.find((p) => p.k === g)?.hex : "#f3f4f6" }}
            aria-label={`Slot ${i + 1}`}
          >
            {!g && <span className="text-gray-400">?</span>}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onSubmit}
          disabled={!canSubmit || disabled}
          className="px-3 py-2 rounded-md bg-gray-900 text-white text-sm disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Guess
        </button>
      </div>

      <div className="grid grid-cols-2 gap-1 ml-1">
        {Array.from({ length: feedback?.blacks || 0 }).map((_, i) => (
          <Pin key={`b${i}`} type="black" />
        ))}
        {Array.from({ length: feedback?.whites || 0 }).map((_, i) => (
          <Pin key={`w${i}`} type="white" />
        ))}
      </div>
    </div>
  );
}

function MastermindApp() {
  const [palette, setPalette] = useState(defaultPalette);
  const [length, setLength] = useState(4);
  const [attempts, setAttempts] = useState(10);
  const [allowDup, setAllowDup] = useState(true);

  const keys = useMemo(() => palette.map((p) => p.k), [palette]);
  const [secret, setSecret] = useState(() => randomCode(keys, length, allowDup));

  const [current, setCurrent] = useState(Array.from({ length }, () => null));
  const [cursor, setCursor] = useState(0); // which slot to set next
  const [history, setHistory] = useState([]); // {guess: string[], feedback: {blacks, whites}}
  const [gameOver, setGameOver] = useState(false);
  const [reveal, setReveal] = useState(false);

  // When config changes, reset the game
  const resetGame = () => {
    const newSecret = randomCode(keys, length, allowDup);
    setSecret(newSecret);
    setCurrent(Array.from({ length }, () => null));
    setCursor(0);
    setHistory([]);
    setGameOver(false);
    setReveal(false);
  };

  const canSubmit = current.every((c) => !!c) && !gameOver;

  const handleSetSlot = (i) => {
    setCursor(i);
  };

  const handlePick = (k) => {
    if (gameOver) return;
    const next = [...current];
    next[cursor] = k;
    setCurrent(next);
    // advance cursor
    const nextIdx = (cursor + 1) % length;
    setCursor(nextIdx);
  };

  const submit = () => {
    if (!canSubmit) return;
    const g = current.slice();
    const feedback = scoreGuess(secret, g);
    const newHistory = [...history, { guess: g, feedback }];
    setHistory(newHistory);

    if (feedback.blacks === length) {
      setGameOver(true);
    } else if (newHistory.length >= attempts) {
      setGameOver(true);
    } else {
      setCurrent(Array.from({ length }, () => null));
      setCursor(0);
    }
  };

  // Palette editor (optional extra colors)
  const addCyanMagenta = () => {
    const extra = [
      { k: "c", label: "Cyan", hex: "#06b6d4" },
      { k: "m", label: "Magenta", hex: "#db2777" },
    ];
    // add only if not already present
    const existing = new Set(palette.map((p) => p.k));
    const merged = [...palette, ...extra.filter((e) => !existing.has(e.k))];
    setPalette(merged);
  };

  const statusText = gameOver
    ? history.at(-1)?.feedback.blacks === length
      ? `Geschafft! In ${history.length} Versuchen.`
      : `Leider verloren. (${history.length}/${attempts})`
    : `Versuch ${history.length + 1} von ${attempts}`;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 text-slate-800 p-6">
      <div className="max-w-3xl mx-auto">
        <header className="mb-6">
          <h1 className="text-3xl font-bold">Mastermind</h1>
          <p className="text-sm text-slate-600">Errate den geheimen Farbcode. 🎯 = richtige Farbe & Position, ⚪ = richtige Farbe, falsche Position.</p>
        </header>

        {/* Controls */}
        <section className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl border bg-white p-4 shadow-sm">
            <h2 className="font-semibold mb-3">Einstellungen</h2>
            <div className="flex flex-wrap items-end gap-4">
              <label className="flex flex-col text-sm">
                Länge
                <input
                  type="number"
                  min={2}
                  max={10}
                  value={length}
                  onChange={(e) => {
                    const v = Math.min(10, Math.max(2, Number(e.target.value)));
                    setLength(v);
                  }}
                  className="mt-1 w-20 rounded-md border p-2"
                />
              </label>
              <label className="flex flex-col text-sm">
                Versuche
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={attempts}
                  onChange={(e) => {
                    const v = Math.min(20, Math.max(1, Number(e.target.value)));
                    setAttempts(v);
                  }}
                  className="mt-1 w-24 rounded-md border p-2"
                />
              </label>
              <label className="flex items-center gap-2 text-sm mt-6">
                <input
                  type="checkbox"
                  checked={allowDup}
                  onChange={(e) => setAllowDup(e.target.checked)}
                />
                Duplikate erlaubt
              </label>
              <button
                className="ml-auto px-3 py-2 rounded-md bg-slate-900 text-white text-sm"
                onClick={resetGame}
              >
                Neues Spiel
              </button>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <button className="px-2 py-1 text-xs rounded border" onClick={addCyanMagenta}>+ Cyan & Magenta</button>
              <button className="px-2 py-1 text-xs rounded border" onClick={() => setPalette(defaultPalette)}>Standardfarben</button>
            </div>
          </div>

          <div className="rounded-xl border bg-white p-4 shadow-sm">
            <h2 className="font-semibold mb-3">Palette</h2>
            <div className="flex flex-wrap gap-2">
              {palette.map((c) => (
                <button
                  key={c.k}
                  onClick={() => handlePick(c.k)}
                  className="flex items-center gap-2 rounded-full border px-2 py-1 shadow-sm hover:scale-[1.02]"
                >
                  <Peg color={c.hex} />
                  <span className="text-sm font-medium uppercase">{c.k}</span>
                </button>
              ))}
            </div>
            <p className="mt-3 text-xs text-slate-500">Klicke eine Farbe und dann die Slots in der Ratezeile, um zu setzen. Oder klicke erst einen Slot, dann eine Farbe.</p>
          </div>
        </section>

        {/* Board */}
        <section className="rounded-xl border bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Spielbrett</h2>
            <div className="text-sm">{statusText}</div>
          </div>

          {/* Current guess row */}
          {!gameOver && (
            <div className="mb-4">
              <GuessRow
                palette={palette}
                guess={current}
                onSetSlot={(i) => handleSetSlot(i)}
                onSubmit={submit}
                canSubmit={canSubmit}
                disabled={false}
                feedback={null}
              />
            </div>
          )}

          {/* History */}
          <div className="space-y-2">
            {history.map((h, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <div className="text-xs w-8 text-right text-slate-500">{idx + 1}.</div>
                <div className="flex gap-2">
                  {h.guess.map((g, i) => (
                    <Peg key={i} color={palette.find((p) => p.k === g)?.hex || "#ddd"} />
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-1 ml-1">
                  {Array.from({ length: h.feedback.blacks }).map((_, i) => (
                    <Pin key={`hb${idx}-${i}`} type="black" />
                  ))}
                  {Array.from({ length: h.feedback.whites }).map((_, i) => (
                    <Pin key={`hw${idx}-${i}`} type="white" />
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Reveal / Secret */}
          <div className="mt-6 flex items-center gap-3">
            <button className="px-3 py-2 rounded-md border" onClick={() => setReveal((r) => !r)}>
              {reveal ? "Code verbergen" : "Code zeigen"}
            </button>
            {reveal && (
              <div className="flex gap-2">
                {secret.map((k, i) => (
                  <Peg key={i} color={palette.find((p) => p.k === k)?.hex || "#ddd"} />
                ))}
              </div>
            )}
          </div>

          {gameOver && (
            <div className="mt-4 p-3 rounded-md bg-slate-50 border text-sm">
              {history.at(-1)?.feedback.blacks === length ? (
                <span>🎉 Glückwunsch! Du hast den Code geknackt.</span>
              ) : (
                <span>😬 Keine Versuche mehr übrig. Viel Glück beim nächsten Mal.</span>
              )}
            </div>
          )}
        </section>

        <footer className="mt-6 text-xs text-slate-500">
          Tipp: Passe Länge, Versuche oder Duplikate an und starte ein neues Spiel. Die Bewertung folgt dem klassischen Mastermind (🎯/⚪).
        </footer>
      </div>
    </div>
  );
}
window.MastermindApp = MastermindApp;
