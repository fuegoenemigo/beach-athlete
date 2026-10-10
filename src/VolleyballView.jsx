import { useState } from "react";
import { isVolleyballDateTaken } from "./syncPolicy.js";
import { appendTournamentGame, finishTournament } from "./tournament.js";
import { appendRegularGame, finishRegularDay } from "./regularDay.js";
import { gameStatus, isCompletedGame } from "./gameRules.js";
import { beachSetOpponent } from "./beachOpponents.js";
import { RatingStepper, SetResultHeading, StrengthStepper } from "./VolleyballInputs.jsx";
import { isRating, strengthLabels, strengthOptions } from "./volleyballValues.js";

const today = () => new Date().toLocaleDateString("sv-SE");
const freshSet = () => ({ fitness: "5", opponentStrength: "equal", intensity: "5", technique: "5", won: "true" });
const beachStrengths = {
  openPlay: strengthOptions,
  testMatch: ["weaker2", "weaker1", "equal", "stronger1", "stronger2"],
  tournament: ["weaker1", "equal", "stronger1"],
};

function calendarDays(month) {
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

function gameLabel(gameType) {
  return ({ openPlay: "🏐 Open Play", testMatch: "🤝 Testspiel",
    matchDay: "🏐 Spieltag", tournament: "🏆 Turnier" })[gameType] ?? gameType;
}

export default function VolleyballView({ sport, volleyballDays, setVolleyballDays, setNotice }) {
  const beach = sport === "beach";
  const maxSets = beach ? 3 : 5;
  const label = beach ? "Beachvolleyball" : "Hallenvolleyball";
  const [showForm, setShowForm] = useState(false);
  const [date, setDate] = useState("");
  const [month, setMonth] = useState(() => today().slice(0, 7));
  const [gameType, setGameType] = useState("");
  const [fitness, setFitness] = useState("5");
  const [fatigue, setFatigue] = useState("5");
  const [notes, setNotes] = useState("");
  const [editingGame, setEditingGame] = useState(false);
  const [opponent, setOpponent] = useState("");
  const [opponentLocked, setOpponentLocked] = useState(false);
  const [setDraft, setSetDraft] = useState(freshSet);
  const [gameSets, setGameSets] = useState([]);
  const [tournamentName, setTournamentName] = useState("");
  const [tournamentLocation, setTournamentLocation] = useState("");
  const [tournamentPlace, setTournamentPlace] = useState("");
  const [activeDayId, setActiveDayId] = useState(null);
  const [expandedDayId, setExpandedDayId] = useState(null);
  const [editingLegacySetId, setEditingLegacySetId] = useState(null);
  const [legacyOpponentEdit, setLegacyOpponentEdit] = useState("");
  const activeDay = volleyballDays.find((day) => day.id === activeDayId);
  const activeTournament = activeDay?.gameType === "tournament" ? activeDay : null;
  const savedDays = volleyballDays.filter((day) => day.type === sport)
    .sort((a, b) => b.date.localeCompare(a.date));
  const takenDates = volleyballDays.filter((day) => day.type === "beach" || day.type === "indoor")
    .map((day) => day.date);
  const dateAvailable = Boolean(date) && (!isVolleyballDateTaken(volleyballDays, date)
    || activeDay?.date === date);
  const allowedStrengths = beach ? beachStrengths[gameType] ?? strengthOptions : strengthOptions;
  const currentGameStatus = gameStatus(gameSets, sport);

  function resetGame() {
    setEditingGame(false);
    setOpponent("");
    setOpponentLocked(false);
    setGameSets([]);
    setSetDraft(freshSet());
  }

  function startDay() {
    setDate(isVolleyballDateTaken(volleyballDays, today()) ? "" : today());
    setMonth(today().slice(0, 7));
    setGameType("");
    setFitness("5");
    setFatigue("5");
    setNotes("");
    setTournamentName("");
    setTournamentLocation("");
    setTournamentPlace("");
    setActiveDayId(null);
    resetGame();
    setNotice("");
    setShowForm(true);
  }

  function resumeDay(day) {
    if (gameSets.length && !window.confirm("Ungespeicherte Sätze des aktuellen Spiels verwerfen?")) return;
    setDate(day.date);
    setMonth(day.date.slice(0, 7));
    setGameType(day.gameType);
    setFitness(String(day.fitness));
    setFatigue(String(day.endFatigue ?? 5));
    setNotes(day.notes ?? "");
    setTournamentName(day.tournamentName ?? "");
    setTournamentLocation(day.tournamentLocation ?? "");
    setTournamentPlace(String(day.tournamentPlace ?? ""));
    setActiveDayId(day.id);
    resetGame();
    setShowForm(true);
    setNotice("");
  }

  function changeMonth(direction) {
    const [year, monthNumber] = month.split("-").map(Number);
    const next = new Date(year, monthNumber - 1 + direction, 1);
    setMonth(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`);
  }

  function addSet() {
    if (gameSets.length >= maxSets || currentGameStatus.finished) return;
    if (beach && gameType === "testMatch" && !opponent.trim()) {
      setNotice("Bitte gib den Gegner für dieses Testspiel ein.");
      return;
    }
    const opponentStrength = gameSets[0]?.opponentStrength ?? setDraft.opponentStrength;
    if (!isRating(setDraft.fitness) || !isRating(setDraft.intensity)
      || !isRating(setDraft.technique) || !allowedStrengths.includes(opponentStrength)) {
      setNotice("Bitte prüfe Fitness, Intensität, Technik und Gegnerstärke des Satzes.");
      return;
    }
    setGameSets((previous) => [...previous, {
      id: crypto.randomUUID(), fitness: Number(setDraft.fitness), opponentStrength,
      intensity: Number(setDraft.intensity), technique: Number(setDraft.technique),
      won: setDraft.won === "true",
    }]);
    setSetDraft({ ...freshSet(), opponentStrength });
    if (opponent.trim()) setOpponentLocked(true);
    setNotice("");
  }

  function completeGame(isLastGame = false) {
    if (!isCompletedGame(gameSets, sport)) {
      setNotice(`Dieses Spiel endet erst nach ${currentGameStatus.winsNeeded} gewonnenen oder verlorenen Sätzen.`);
      return;
    }
    const game = { id: crypto.randomUUID(), opponent: opponent.trim(), sets: gameSets };
    if (gameType === "tournament") {
      if (activeDayId && !activeTournament) {
        setNotice("Dieses Turnier wurde nicht gefunden. Bitte öffne es erneut aus der Übersicht.");
        return;
      }
      if (!activeTournament && (!dateAvailable || !tournamentName.trim()
        || !tournamentLocation.trim() || !isRating(fitness))) {
        setNotice("Bitte wähle ein freies Datum und gib Turniername, Austragungsort und Tagesform an.");
        return;
      }
      let updated;
      try {
        updated = appendTournamentGame(activeTournament, {
          date, sport, name: tournamentName, location: tournamentLocation, fitness,
        }, game, isLastGame);
      } catch (error) {
        setNotice(error.message);
        return;
      }
      setVolleyballDays((previous) => activeTournament
        ? previous.map((day) => day.id === updated.id ? updated : day)
        : [...previous, updated]);
      setActiveDayId(updated.id);
      setNotice(isLastGame ? "Letztes Spiel gespeichert. Bitte trage die Platzierung ein."
        : "Turnierspiel gespeichert. Du kannst später weitere Spiele hinzufügen.");
    } else {
      if (activeDayId && !activeDay) {
        setNotice("Dieser Spieltag wurde nicht gefunden. Bitte öffne ihn erneut aus der Übersicht.");
        return;
      }
      if (!activeDay && !dateAvailable) {
        setNotice("Bitte wähle ein freies Datum im Kalender.");
        return;
      }
      let updated;
      try {
        updated = appendRegularGame(activeDay, { date, sport, gameType, fitness }, game);
      } catch (error) {
        setNotice(error.message);
        return;
      }
      setVolleyballDays((previous) => activeDay
        ? previous.map((day) => day.id === updated.id ? updated : day)
        : [...previous, updated]);
      setActiveDayId(updated.id);
      setNotice("Spiel gespeichert. Du kannst später weitere Spiele hinzufügen.");
    }
    resetGame();
  }

  function saveDay() {
    if (!activeDay || editingGame) {
      setNotice("Bitte schließe zuerst das aktuelle Spiel ab.");
      return;
    }
    let finished;
    try {
      finished = finishRegularDay(activeDay, fatigue, notes);
    } catch (error) {
      setNotice(error.message);
      return;
    }
    setVolleyballDays((previous) => previous.map((day) => day.id === finished.id ? finished : day));
    setShowForm(false);
    setActiveDayId(null);
    setNotice(`${label}-Spieltag gespeichert.`);
  }

  function completeTournament() {
    if (!activeTournament || !isRating(fatigue)) {
      setNotice("Bitte gib eine gültige Erschöpfung von 1 bis 10 ein.");
      return;
    }
    try {
      const finished = finishTournament(activeTournament, tournamentPlace, fatigue, notes);
      setVolleyballDays((previous) => previous.map((day) => day.id === finished.id ? finished : day));
      setShowForm(false);
      setActiveDayId(null);
      setNotice("Turnier mit Platzierung gespeichert.");
    } catch (error) {
      setNotice(error.message);
    }
  }

  function undoLastGameMarker() {
    if (!activeTournament || activeTournament.tournamentStatus !== "pendingPlacement") return;
    const lastId = activeTournament.games.at(-1)?.id;
    setVolleyballDays((previous) => previous.map((day) => day.id === activeTournament.id
      ? { ...day, tournamentStatus: "ongoing", tournamentPlace: null,
        games: day.games.map((game) => game.id === lastId ? { ...game, isLastGame: false } : game) }
      : day));
    setTournamentPlace("");
  }

  function cancelForm() {
    if (gameSets.length
      && !window.confirm("Ungespeicherte Spiele und Sätze verwerfen?")) return;
    setShowForm(false);
    setActiveDayId(null);
    resetGame();
    setNotice("");
  }

  function saveLegacyOpponent(day, set) {
    const name = legacyOpponentEdit.trim();
    if (!name) {
      setNotice("Bitte gib einen Gegnernamen ein.");
      return;
    }
    setVolleyballDays((previous) => previous.map((item) => item.id === day.id
      ? { ...item, sets: item.sets.map((entry) => entry.id === set.id
        ? { ...entry, opponent: name } : entry) } : item));
    setEditingLegacySetId(null);
    setNotice("Gegner für den Satz gespeichert.");
  }

  return (
    <section className="diary-panel">
      <div className="section-heading"><div>
        <p className="eyebrow">VOLLEYBALL</p>
        <h2>{beach ? "🏖️" : "🏟️"} {label}</h2>
      </div></div>
      <p>{beach ? "Erfasse Beach-Spiele mit bis zu drei Sätzen und Turniere über den ganzen Tag."
        : "Erfasse Hallenspiele mit bis zu fünf Sätzen und Turniere über den ganzen Tag."}</p>
      {!showForm && <button type="button" className="primary-button" onClick={startDay}>＋ Spieltag erfassen</button>}

      {showForm && <div className="volleyball-form">
        {!activeDay && <>
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
              {calendarDays(month).map((calendarDate, index) => calendarDate === null
                ? <div key={`empty-${index}`} />
                : <button key={calendarDate} type="button"
                    className={`beach-calendar-day ${dateAvailable && date === calendarDate ? "selected" : ""}`}
                    aria-label={formatDate(calendarDate)} aria-pressed={dateAvailable && date === calendarDate}
                    disabled={takenDates.includes(calendarDate)} onClick={() => setDate(calendarDate)}>
                    {Number(calendarDate.slice(8, 10))}</button>)}
            </div>
          </div>
          {!dateAvailable && <p className="helper-text" role="status">
            Bitte wähle ein freies Datum. Durchgestrichene Tage haben bereits einen Beach- oder Hallenvolleyball-Spieltag.
          </p>}
        </>}
        {activeDay && <p><strong>{formatDate(activeDay.date)}</strong> · {gameLabel(activeDay.gameType)}</p>}

        {dateAvailable && <>
          {!gameType && <div>
            <h3>Welche Art von Spieltag?</h3>
            {(beach ? [["openPlay", "🏐 Open Play"], ["testMatch", "🤝 Testspiel"], ["tournament", "🏆 Turnier"]]
              : [["matchDay", "🏐 Spieltag"], ["tournament", "🏆 Turnier"]]).map(([value, title]) =>
              <button key={value} type="button" className="secondary-button"
                onClick={() => { setGameType(value); setEditingGame(true); }}>{title}</button>)}
          </div>}

          {gameType && <>
            {gameType === "tournament" && !activeTournament && <>
              <label className="field-label" htmlFor={`${sport}-tournament-name`}>Turniername</label>
              <input id={`${sport}-tournament-name`} className="field" value={tournamentName}
                onChange={(event) => setTournamentName(event.target.value)} placeholder="Name des Turniers" />
              <label className="field-label" htmlFor={`${sport}-tournament-location`}>Austragungsort</label>
              <input id={`${sport}-tournament-location`} className="field" value={tournamentLocation}
                onChange={(event) => setTournamentLocation(event.target.value)} placeholder="Stadt oder Spielstätte" />
            </>}
            {gameType === "tournament" && activeTournament && <p>
              {activeTournament.tournamentName} · {activeTournament.tournamentLocation}
            </p>}
            {!activeDay && <RatingStepper id={`${sport}-day-fitness`}
              label="Wie fit warst du zu Beginn? (1–10)" value={fitness} onChange={setFitness} />}

            {activeDay?.games?.length > 0 &&
              <div className="volleyball-day-list">
                <h3>Erfasste Spiele</h3>
                {activeDay.games.map((game, index) =>
                  <div className="diary-panel" key={game.id}>
                    <h4>Spiel {index + 1}{game.opponent ? ` · ${game.opponent}` : ""}</h4>
                    <p>{game.setIds.length} Sätze</p>
                    {game.isLastGame && <p>✓ Letztes Spiel des Turniers</p>}
                  </div>)}
              </div>}

            {editingGame && (!activeDay || activeDay.tournamentStatus === "ongoing"
              || activeDay.dayStatus === "ongoing")
              ? <div className="volleyball-set-editor">
                <h3>Spiel {(activeDay?.games.length ?? 0) + 1}</h3>
                {!opponentLocked ? <>
                  <label className="field-label" htmlFor={`${sport}-opponent`}>
                    Gegner {beach && gameType === "testMatch" ? "" : "(optional)"}
                  </label>
                  <input id={`${sport}-opponent`} className="field" value={opponent}
                    onChange={(event) => setOpponent(event.target.value)} placeholder="Gegnerisches Team" />
                </> : <p>Gegner: {opponent}</p>}

                {gameSets.length > 0 && <div className="volleyball-day-list">
                  <h4>Erfasste Sätze</h4>
                  {gameSets.map((set, index) => <div className="diary-panel" key={set.id}>
                    <SetResultHeading number={index + 1} won={set.won} />
                    <p>Gegnerstärke: {strengthLabels[set.opponentStrength]}</p>
                    <p>Fitness zu Satzbeginn: {set.fitness}/10</p>
                    <p>Intensität: {set.intensity}/10</p>
                    <p>Technische Leistung: {set.technique}/10</p>
                  </div>)}
                  <button type="button" className="secondary-button" onClick={() => {
                    const last = gameSets.at(-1);
                    setGameSets((previous) => previous.slice(0, -1));
                    if (gameSets.length === 1) {
                      setSetDraft((previous) => ({ ...previous, opponentStrength: last.opponentStrength }));
                      setOpponentLocked(false);
                    }
                  }}>Letzten Satz entfernen</button>
                </div>}

                {!currentGameStatus.finished && gameSets.length < maxSets && <>
                  <h4>Satz {gameSets.length + 1}</h4>
                  {gameSets.length === 0 && <StrengthStepper value={setDraft.opponentStrength}
                    options={allowedStrengths}
                    onChange={(opponentStrength) => setSetDraft((previous) => ({ ...previous, opponentStrength }))} />}
                  <RatingStepper id={`${sport}-set-fitness`} label="Fitness zu Satzbeginn (1–10)"
                    value={setDraft.fitness} onChange={(fitnessValue) => setSetDraft((previous) => ({ ...previous, fitness: fitnessValue }))} />
                  <RatingStepper id={`${sport}-set-intensity`} label="Spielintensität (1–10)"
                    value={setDraft.intensity} onChange={(intensity) => setSetDraft((previous) => ({ ...previous, intensity }))} />
                  <RatingStepper id={`${sport}-set-technique`} label="Technische Leistung (1–10)"
                    value={setDraft.technique} onChange={(technique) => setSetDraft((previous) => ({ ...previous, technique }))} />
                  <label className="field-label" htmlFor={`${sport}-set-result`}>Satzergebnis</label>
                  <select id={`${sport}-set-result`} className="field" value={setDraft.won}
                    onChange={(event) => setSetDraft((previous) => ({ ...previous, won: event.target.value }))}>
                    <option value="true">Gewonnen</option><option value="false">Verloren</option>
                  </select>
                  <button type="button" className="secondary-button" onClick={addSet}>＋ Satz hinzufügen</button>
                </>}
                {currentGameStatus.finished && <p className="helper-text" role="status">
                  Spiel beendet: {currentGameStatus.wins}:{currentGameStatus.losses} Sätze.
                </p>}
                {currentGameStatus.finished && <>
                  <button type="button" className="last-set-button" onClick={() => completeGame(false)}>
                    {gameType === "tournament" ? "✓ Spiel speichern · Turnier fortsetzen" : "✓ Spiel speichern · Spieltag fortsetzen"}
                  </button>
                  {gameType === "tournament" && <button type="button" className="last-set-button last-game-button"
                    onClick={() => completeGame(true)}>🏁 Das war mein letztes Spiel</button>}
                </>}
                {activeDay && <button type="button" className="secondary-button"
                  onClick={() => {
                    if (gameSets.length && !window.confirm("Ungespeicherte Sätze dieses Spiels verwerfen?")) return;
                    resetGame();
                  }}>Spiel abbrechen</button>}
              </div> : null}

            {!editingGame && (activeDay?.tournamentStatus === "ongoing"
              || activeDay?.dayStatus === "ongoing") &&
              <button type="button" className="secondary-button" onClick={() => setEditingGame(true)}>
                ＋ Weiteres Spiel erfassen
              </button>}

            {gameType === "tournament" && activeTournament?.tournamentStatus === "pendingPlacement" && <>
              <p>Das letzte Spiel ist gespeichert. Trage jetzt die erreichte Platzierung ein.</p>
              <label className="field-label" htmlFor={`${sport}-tournament-place`}>Belegter Platz</label>
              <input id={`${sport}-tournament-place`} className="field" type="number" inputMode="numeric"
                min="1" step="1" value={tournamentPlace}
                onChange={(event) => setTournamentPlace(event.target.value)} placeholder="z. B. 3" />
              <RatingStepper id={`${sport}-tournament-fatigue`}
                label="Erschöpfung am Ende des Turniers (1–10)" value={fatigue} onChange={setFatigue} />
              <label className="field-label" htmlFor={`${sport}-tournament-notes`}>Notizen (optional)</label>
              <textarea id={`${sport}-tournament-notes`} className="field" rows="3" value={notes}
                onChange={(event) => setNotes(event.target.value)} />
              <button type="button" className="primary-button" onClick={completeTournament}>Turnier abschließen</button>
              <button type="button" className="secondary-button" onClick={undoLastGameMarker}>
                Letztes Spiel war doch nicht das letzte
              </button>
            </>}

            {gameType !== "tournament" && activeDay?.dayStatus === "ongoing" && !editingGame && <>
              <RatingStepper id={`${sport}-day-fatigue`}
                label="Erschöpfung am Ende des Spieltags (1–10)" value={fatigue} onChange={setFatigue} />
              <label className="field-label" htmlFor={`${sport}-day-notes`}>Notizen (optional)</label>
              <textarea id={`${sport}-day-notes`} className="field" rows="3" value={notes}
                onChange={(event) => setNotes(event.target.value)} />
              <button type="button" className="primary-button" onClick={saveDay}>Spieltag abschließen</button>
            </>}
          </>}
        </>}
        <button type="button" className="secondary-button" onClick={cancelForm}>
          {activeDay ? "Für später schließen" : "Abbrechen"}
        </button>
      </div>}

      <div className="volleyball-day-list">
        <h3>Meine Spieltage</h3>
        {savedDays.length === 0 ? <p className="helper-text">Noch keine {label}-Spieltage gespeichert.</p>
          : savedDays.map((day) => <div className="diary-panel" key={day.id}>
            <div className="volleyball-day-header"><h3>{formatDate(day.date)}</h3>
              <span>{day.games?.length ?? day.sets.length} {day.games ? "Spiele" : "Sätze"}</span></div>
            <p>{gameLabel(day.gameType)} · {day.sets.length} Sätze</p>
            {day.gameType === "tournament" && <>
              <p>Turnier: {day.tournamentName ?? day.tournamentLocation ?? "–"}</p>
              {day.tournamentName && <p>Austragungsort: {day.tournamentLocation}</p>}
              <p>{day.tournamentStatus === "ongoing" ? "Turnier läuft – weitere Spiele möglich"
                : day.tournamentStatus === "pendingPlacement" ? "Letztes Spiel gespeichert – Platzierung offen"
                  : day.tournamentPlace != null ? `Platzierung: ${day.tournamentPlace}. Platz` : ""}</p>
            </>}
            {day.dayStatus === "ongoing" && <p>Spieltag läuft – weitere Spiele möglich</p>}
            <p>Tagesform zu Beginn: {day.fitness ?? "–"}/10
              {day.endFatigue != null && ` · Erschöpfung am Ende: ${day.endFatigue}/10`}</p>
            {day.notes && <p>{day.notes}</p>}
            {day.gameType === "tournament" && day.games
              && day.tournamentStatus !== "completed" && <button type="button" className="primary-button"
                onClick={() => resumeDay(day)}>
                {day.tournamentStatus === "pendingPlacement" ? "Platzierung eintragen" : "Turnier fortsetzen"}
              </button>}
            {day.dayStatus === "ongoing" && <button type="button" className="primary-button"
              onClick={() => resumeDay(day)}>Spieltag fortsetzen</button>}
            <button type="button" className="secondary-button" aria-expanded={expandedDayId === day.id}
              onClick={() => { setEditingLegacySetId(null); setExpandedDayId(expandedDayId === day.id ? null : day.id); }}>
              {expandedDayId === day.id ? "Details schließen" : day.games ? "Spiele anzeigen" : "Sätze anzeigen"}
            </button>
            {expandedDayId === day.id && <div className="volleyball-day-list">
              {day.games ? day.games.map((game, index) => <div className="diary-panel" key={game.id}>
                <h4>Spiel {index + 1}{game.opponent ? ` · ${game.opponent}` : ""}
                  {game.isLastGame ? " · Letztes Spiel" : ""}</h4>
                {game.setIds.map((setId, setIndex) => {
                  const set = day.sets.find((item) => item.id === setId);
                  return set && <div className="volleyball-saved-set" key={setId}>
                    <SetResultHeading number={setIndex + 1} won={set.won} />
                    <p>Gegnerstärke: {strengthLabels[set.opponentStrength]}</p>
                    <p>Fitness zu Satzbeginn: {set.fitness}/10</p>
                    <p>Intensität: {set.intensity}/10</p>
                    <p>Technische Leistung: {set.technique}/10</p>
                  </div>;
                })}
              </div>) : (day.sets ?? []).map((set, index) => <div className="volleyball-saved-set" key={set.id}>
                <SetResultHeading number={index + 1} won={set.won} />
                {day.gameType === "testMatch" && <>
                  <p>Gegner: {beachSetOpponent(day, set) ?? "Nicht einzeln erfasst"}</p>
                  {editingLegacySetId === set.id ? <div className="beach-opponent-editor">
                    <label className="field-label" htmlFor={`legacy-opponent-${set.id}`}>Gegner für Satz {index + 1}</label>
                    <input id={`legacy-opponent-${set.id}`} className="field" value={legacyOpponentEdit}
                      onChange={(event) => setLegacyOpponentEdit(event.target.value)} />
                    <button type="button" className="secondary-button"
                      onClick={() => saveLegacyOpponent(day, set)}>Gegner speichern</button>
                    <button type="button" className="secondary-button"
                      onClick={() => setEditingLegacySetId(null)}>Abbrechen</button>
                  </div> : <button type="button" className="secondary-button" onClick={() => {
                    setLegacyOpponentEdit(beachSetOpponent(day, set) ?? "");
                    setEditingLegacySetId(set.id);
                  }}>Gegner nachtragen/ändern</button>}
                </>}
                <p>Gegnerstärke: {strengthLabels[set.opponentStrength] ?? set.opponentStrength}</p>
                <p>Fitness zu Satzbeginn: {set.fitness ?? "–"}/10</p>
                <p>Intensität: {set.intensity}/10</p>
                <p>Technische Leistung: {set.technique}/10</p>
              </div>)}
            </div>}
            <button type="button" className="secondary-button volleyball-delete-action" onClick={() => {
              if (!window.confirm(`Diesen ${label}-Spieltag wirklich löschen?`)) return;
              setVolleyballDays((previous) => previous.filter((item) => item.id !== day.id));
              if (activeDayId === day.id) { setShowForm(false); setActiveDayId(null); }
              setExpandedDayId(null);
            }}>Spieltag löschen</button>
          </div>)}
      </div>
    </section>
  );
}
