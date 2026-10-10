import { useState } from "react";
import { isVolleyballDateTaken } from "./syncPolicy.js";
import { RatingStepper, StrengthStepper } from "./VolleyballInputs.jsx";
import { isRating, strengthLabels, strengthOptions } from "./volleyballValues.js";

const today = () => new Date().toLocaleDateString("sv-SE");
const newSetDraft = () => ({ fitness: "5", opponentStrength: "equal", intensity: "5", technique: "5", won: "true" });

function getCalendarDays(month) {
  const [year, monthNumber] = month.split("-").map(Number);
  const count = new Date(year, monthNumber, 0).getDate();
  const blanks = (new Date(year, monthNumber - 1, 1).getDay() + 6) % 7;
  return [...Array(blanks).fill(null), ...Array.from({ length: count }, (_, index) =>
    `${month}-${String(index + 1).padStart(2, "0")}`)];
}

function formatDate(date) {
  return new Date(`${date}T12:00:00`).toLocaleDateString("de-DE", {
    weekday: "short", day: "2-digit", month: "2-digit", year: "numeric",
  });
}

export default function IndoorView({ volleyballDays, setVolleyballDays, setNotice }) {
  const [showForm, setShowForm] = useState(false);
  const [date, setDate] = useState("");
  const [month, setMonth] = useState(() => today().slice(0, 7));
  const [gameType, setGameType] = useState("");
  const [fitness, setFitness] = useState("5");
  const [fatigue, setFatigue] = useState("5");
  const [notes, setNotes] = useState("");
  const [games, setGames] = useState([]);
  const [editingGame, setEditingGame] = useState(false);
  const [opponent, setOpponent] = useState("");
  const [opponentLocked, setOpponentLocked] = useState(false);
  const [setDraft, setSetDraft] = useState(newSetDraft);
  const [gameSets, setGameSets] = useState([]);
  const [expandedDayId, setExpandedDayId] = useState(null);
  const takenDates = volleyballDays.filter((day) => day.type === "beach" || day.type === "indoor")
    .map((day) => day.date);
  const dateAvailable = Boolean(date) && !isVolleyballDateTaken(volleyballDays, date);
  const indoorDays = volleyballDays.filter((day) => day.type === "indoor")
    .sort((a, b) => b.date.localeCompare(a.date));

  function startDay() {
    setDate(isVolleyballDateTaken(volleyballDays, today()) ? "" : today());
    setMonth(today().slice(0, 7));
    setGameType("");
    setFitness("5");
    setFatigue("5");
    setNotes("");
    setGames([]);
    setEditingGame(false);
    setOpponent("");
    setOpponentLocked(false);
    setGameSets([]);
    setSetDraft(newSetDraft());
    setNotice("");
    setShowForm(true);
  }

  function cancelDay() {
    if ((games.length || gameSets.length) && !window.confirm("Diesen ungespeicherten Spieltag verwerfen?")) return;
    setShowForm(false);
    setNotice("");
  }

  function changeMonth(direction) {
    const [year, monthNumber] = month.split("-").map(Number);
    const next = new Date(year, monthNumber - 1 + direction, 1);
    setMonth(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`);
  }

  function addSet() {
    if (gameSets.length >= 5) return;
    const opponentStrength = gameSets[0]?.opponentStrength ?? setDraft.opponentStrength;
    if (!isRating(setDraft.fitness) || !isRating(setDraft.intensity)
      || !isRating(setDraft.technique) || !strengthOptions.includes(opponentStrength)) {
      setNotice("Bitte gib für den Satz gültige Werte von 1 bis 10 und eine Gegnerstärke ein.");
      return;
    }
    setGameSets((previous) => [...previous, {
      id: crypto.randomUUID(), fitness: Number(setDraft.fitness),
      opponentStrength,
      intensity: Number(setDraft.intensity), technique: Number(setDraft.technique),
      won: setDraft.won === "true",
    }]);
    setSetDraft({ ...newSetDraft(), opponentStrength });
    if (opponent.trim()) setOpponentLocked(true);
    setNotice("");
  }

  function completeGame() {
    if (gameSets.length === 0) {
      setNotice("Füge für dieses Spiel mindestens einen Satz hinzu.");
      return;
    }
    setGames((previous) => [...previous, {
      id: crypto.randomUUID(), opponent: opponent.trim(), sets: gameSets,
    }]);
    setEditingGame(false);
    setOpponent("");
    setOpponentLocked(false);
    setGameSets([]);
    setSetDraft(newSetDraft());
    setNotice("");
  }

  function saveDay() {
    if (!dateAvailable) {
      setNotice("Bitte wähle ein freies Datum ohne Beach- oder Hallenvolleyball-Spieltag.");
      return;
    }
    if (gameType !== "matchDay" || games.length === 0 || editingGame
      || !isRating(fitness) || !isRating(fatigue)) {
      setNotice("Bitte schließe mindestens ein Spiel ab und prüfe die Werte von 1 bis 10.");
      return;
    }
    const sets = games.flatMap((game) => game.sets.map((set) => ({ ...set, gameId: game.id })));
    const day = {
      id: crypto.randomUUID(), date, type: "indoor", gameType,
      fitness: Number(fitness), endFatigue: Number(fatigue), notes: notes.trim(),
      games: games.map((game) => ({ id: game.id, opponent: game.opponent,
        setIds: game.sets.map((set) => set.id) })),
      sets, createdAt: new Date().toISOString(),
    };
    setVolleyballDays((previous) => [...previous, day]);
    setShowForm(false);
    setNotice("Hallenvolleyball-Spieltag gespeichert.");
  }

  return (
    <section className="diary-panel">
      <div className="section-heading"><div>
        <p className="eyebrow">VOLLEYBALL</p>
        <h2>🏟️ Hallenvolleyball</h2>
      </div></div>
      <p>Erfasse deine Hallenvolleyball-Spieltage mit mehreren Spielen und bis zu fünf Sätzen pro Spiel.</p>

      {!showForm && <button type="button" className="primary-button" onClick={startDay}>＋ Spieltag erfassen</button>}

      {showForm && <div className="volleyball-form">
        <span className="field-label">Datum</span>
        <div className="beach-calendar">
          <div className="beach-calendar-header">
            <button type="button" className="secondary-button" aria-label="Vorheriger Monat"
              onClick={() => changeMonth(-1)}>‹</button>
            <strong>{new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 1, 1)
              .toLocaleDateString("de-DE", { month: "long", year: "numeric" })}</strong>
            <button type="button" className="secondary-button" aria-label="Nächster Monat"
              onClick={() => changeMonth(1)}>›</button>
          </div>
          <div className="beach-calendar-grid">
            {["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"].map((weekday) =>
              <div className="beach-calendar-weekday" key={weekday}>{weekday}</div>)}
            {getCalendarDays(month).map((day, index) => day === null
              ? <div key={`empty-${index}`} />
              : <button key={day} type="button"
                  className={`beach-calendar-day ${dateAvailable && date === day ? "selected" : ""}`}
                  aria-label={formatDate(day)} aria-pressed={dateAvailable && date === day}
                  disabled={takenDates.includes(day)} onClick={() => setDate(day)}>
                  {Number(day.slice(8, 10))}</button>)}
          </div>
        </div>
        {!dateAvailable && <p className="helper-text" role="status">
          Bitte wähle ein freies Datum. Durchgestrichene Tage haben bereits einen Beach- oder Hallenvolleyball-Spieltag.
        </p>}

        {dateAvailable && <>
          {!gameType && <div>
            <h3>Welche Art von Spieltag?</h3>
            <button type="button" className="secondary-button" onClick={() => { setGameType("matchDay"); setEditingGame(true); }}>
              🏐 Spieltag
            </button>
            <button type="button" className="secondary-button" disabled>🏆 Turnier · folgt später</button>
          </div>}

          {gameType === "matchDay" && <>
            <RatingStepper id="indoor-fitness" label="Wie fit warst du zu Beginn? (1–10)"
              value={fitness} onChange={setFitness} />

            {games.length > 0 && <div className="volleyball-day-list">
              <h3>Erfasste Spiele</h3>
              {games.map((game, index) => <div className="diary-panel" key={game.id}>
                <h4>Spiel {index + 1}{game.opponent ? ` · ${game.opponent}` : ""}</h4>
                <p>{game.sets.length} {game.sets.length === 1 ? "Satz" : "Sätze"} erfasst</p>
              </div>)}
            </div>}

            {editingGame ? <div className="volleyball-set-editor">
              <h3>Spiel {games.length + 1}</h3>
              {!opponentLocked ? <>
                <label className="field-label" htmlFor="indoor-opponent">Gegner (optional)</label>
                <input id="indoor-opponent" className="field" value={opponent}
                  onChange={(event) => setOpponent(event.target.value)} placeholder="z. B. Teamname" />
              </> : <p>Gegner: {opponent}</p>}

              {gameSets.length > 0 && <div className="volleyball-day-list">
                <h4>Erfasste Sätze</h4>
                {gameSets.map((set, index) => <div className="diary-panel" key={set.id}>
                  <strong>Satz {index + 1}</strong>
                  <p>{set.won ? "Gewonnen" : "Verloren"} · {strengthLabels[set.opponentStrength]}</p>
                  <p>Fitness zu Satzbeginn: {set.fitness}/10</p>
                  <p>Intensität: {set.intensity}/10</p>
                  <p>Technische Leistung: {set.technique}/10</p>
                </div>)}
                <button type="button" className="secondary-button" onClick={() => {
                  const lastSet = gameSets.at(-1);
                  setGameSets((previous) => previous.slice(0, -1));
                  if (gameSets.length === 1) {
                    setSetDraft((previous) => ({ ...previous, opponentStrength: lastSet.opponentStrength }));
                    setOpponentLocked(false);
                  }
                }}>
                  Letzten Satz entfernen
                </button>
              </div>}

              {gameSets.length < 5 && <>
                <h4>Satz {gameSets.length + 1}</h4>
                {gameSets.length === 0 && <StrengthStepper value={setDraft.opponentStrength} options={strengthOptions}
                  onChange={(opponentStrength) => setSetDraft((previous) => ({ ...previous, opponentStrength }))} />}
                <RatingStepper id="indoor-set-fitness" label="Fitness zu Satzbeginn (1–10)"
                  value={setDraft.fitness} onChange={(fitness) => setSetDraft((previous) => ({ ...previous, fitness }))} />
                <RatingStepper id="indoor-set-intensity" label="Spielintensität (1–10)"
                  value={setDraft.intensity} onChange={(intensity) => setSetDraft((previous) => ({ ...previous, intensity }))} />
                <RatingStepper id="indoor-set-technique" label="Technische Leistung (1–10)"
                  value={setDraft.technique} onChange={(technique) => setSetDraft((previous) => ({ ...previous, technique }))} />
                <label className="field-label" htmlFor="indoor-set-result">Satzergebnis</label>
                <select id="indoor-set-result" className="field" value={setDraft.won}
                  onChange={(event) => setSetDraft((previous) => ({ ...previous, won: event.target.value }))}>
                  <option value="true">Gewonnen</option><option value="false">Verloren</option>
                </select>
                <button type="button" className="secondary-button" onClick={addSet}>＋ Satz hinzufügen</button>
              </>}
              {gameSets.length === 5 && <p className="helper-text">Fünf Sätze erfasst – dieses Spiel kann nun abgeschlossen werden.</p>}
              {gameSets.length > 0 && <button type="button" className="last-set-button" onClick={completeGame}>
                ✓ Spiel abschließen
              </button>}
              {games.length > 0 && <button type="button" className="secondary-button" onClick={() => {
                if (gameSets.length && !window.confirm("Die ungespeicherten Sätze dieses Spiels verwerfen?")) return;
                setGameSets([]); setOpponent(""); setOpponentLocked(false); setEditingGame(false);
              }}>Spiel abbrechen</button>}
            </div> : <button type="button" className="secondary-button" onClick={() => setEditingGame(true)}>
              ＋ Weiteres Spiel erfassen
            </button>}

            {games.length > 0 && !editingGame && <>
              <RatingStepper id="indoor-fatigue" label="Erschöpfung am Ende des Spieltags (1–10)"
                value={fatigue} onChange={setFatigue} />
              <p className="helper-text">1 = überhaupt nicht erschöpft, 10 = völlig erschöpft.</p>
              <label className="field-label" htmlFor="indoor-notes">Notizen (optional)</label>
              <textarea id="indoor-notes" className="field" rows="3" value={notes}
                onChange={(event) => setNotes(event.target.value)} />
              <button type="button" className="primary-button" onClick={saveDay}>Spieltag speichern</button>
            </>}
          </>}
        </>}
        <button type="button" className="secondary-button" onClick={cancelDay}>Abbrechen</button>
      </div>}

      <div className="volleyball-day-list">
        <h3>Meine Spieltage</h3>
        {indoorDays.length === 0 ? <p className="helper-text">Noch keine Hallenvolleyball-Spieltage gespeichert.</p>
          : indoorDays.map((day) => <div className="diary-panel" key={day.id}>
            <div className="volleyball-day-header">
              <h3>{formatDate(day.date)}</h3>
              <span>{day.games.length} {day.games.length === 1 ? "Spiel" : "Spiele"}</span>
            </div>
            <p>🏐 Spieltag · {day.sets.length} {day.sets.length === 1 ? "Satz" : "Sätze"}</p>
            <p>Tagesform zu Beginn: {day.fitness}/10 · Erschöpfung am Ende: {day.endFatigue}/10</p>
            {day.notes && <p>{day.notes}</p>}
            <button type="button" className="secondary-button" aria-expanded={expandedDayId === day.id}
              onClick={() => setExpandedDayId(expandedDayId === day.id ? null : day.id)}>
              {expandedDayId === day.id ? "Details schließen" : "Spiele anzeigen"}
            </button>
            {expandedDayId === day.id && <div className="volleyball-day-list">
              {day.games.map((game, index) => <div className="diary-panel" key={game.id}>
                <h4>Spiel {index + 1}{game.opponent ? ` · ${game.opponent}` : ""}</h4>
                {game.setIds.map((setId, setIndex) => {
                  const set = day.sets.find((item) => item.id === setId);
                  return set && <div className="volleyball-saved-set" key={setId}>
                    <strong>Satz {setIndex + 1} · {set.won ? "Gewonnen" : "Verloren"}</strong>
                    <p>Gegnerstärke: {strengthLabels[set.opponentStrength]}</p>
                    <p>Fitness zu Satzbeginn: {set.fitness}/10</p>
                    <p>Intensität: {set.intensity}/10</p>
                    <p>Technische Leistung: {set.technique}/10</p>
                  </div>;
                })}
              </div>)}
            </div>}
            <button type="button" className="secondary-button volleyball-delete-action" onClick={() => {
              if (!window.confirm("Diesen Hallenvolleyball-Spieltag wirklich löschen?")) return;
              setVolleyballDays((previous) => previous.filter((item) => item.id !== day.id));
              setExpandedDayId(null);
            }}>Spieltag löschen</button>
          </div>)}
      </div>
    </section>
  );
}
