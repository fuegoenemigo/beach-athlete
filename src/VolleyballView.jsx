import { useEffect, useRef, useState } from "react";
import UIIcon from "./UIIcon.jsx";
import { isVolleyballDateTaken } from "./syncPolicy.js";
import { appendTournamentGame, finishTournament } from "./tournament.js";
import { appendRegularGame, finishRegularDay } from "./regularDay.js";
import { gameStatus, isRecordableGame } from "./gameRules.js";
import { beachSetOpponent } from "./beachOpponents.js";
import { RatingStepper, SetResultHeading, StrengthStepper } from "./VolleyballInputs.jsx";
import { isRating, strengthLabels, strengthOptions } from "./volleyballValues.js";
import EntryWindow from "./EntryWindow.jsx";
import DateWheel from './DateWheel.jsx';
import { NumberWheel, ChoiceWheel } from './WheelPicker.jsx';
import { isOpenVolleyballDay, isRecentDate } from "./activityHistory.js";

const today = () => new Date().toLocaleDateString("sv-SE");
const freshSet = () => ({ fitness: "5", opponentStrength: "equal", intensity: "5", technique: "5", won: "true" });
const beachStrengths = {
  openPlay: strengthOptions,
  testMatch: ["weaker2", "weaker1", "equal", "stronger1", "stronger2"],
  tournament: ["weaker1", "equal", "stronger1"],
};

function formatDate(date) {
  return new Date(`${date}T12:00:00`).toLocaleDateString("de-DE", {
    weekday: "short", day: "2-digit", month: "2-digit", year: "numeric",
  });
}

function gameLabel(gameType) {
  return ({ openPlay: "🏐 Open Play", testMatch: "🤝 Testspiel",
    matchDay: "🏐 Spieltag", tournament: "🏆 Turnier" })[gameType] ?? gameType;
}

export default function VolleyballView({ sport, volleyballDays, setVolleyballDays, setNotice, onOpenArchive, navigationTarget, onReturn }) {
  const beach = sport === "beach";
  const maxSets = beach ? 3 : 5;
  const label = beach ? "Beachvolleyball" : "Hallenvolleyball";
  const [showForm, setShowForm] = useState(false);
  const [date, setDate] = useState("");
  const [gameType, setGameType] = useState("");
  const [gamePageOpen, setGamePageOpen] = useState(false);
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
  const [showTournamentFieldErrors, setShowTournamentFieldErrors] = useState(false);
  const tournamentNameRef = useRef(null);
  const tournamentLocationRef = useRef(null);
  const [activeDayId, setActiveDayId] = useState(null);
  const [expandedDayId, setExpandedDayId] = useState(null);
  const [showSavedDays, setShowSavedDays] = useState(false);
  const [editingLegacySetId, setEditingLegacySetId] = useState(null);
  const [legacyOpponentEdit, setLegacyOpponentEdit] = useState("");
  useEffect(() => {
    if (!navigationTarget) return;
    let scrollFrame;
    const frame = window.requestAnimationFrame(() => {
      if (navigationTarget.mode === "create") {
        setDate(navigationTarget.date);
        setGameType("");
        setGamePageOpen(false);
        setFitness("5");
        setFatigue("5");
        setNotes("");
        setEditingGame(false);
        setOpponent("");
        setOpponentLocked(false);
        setGameSets([]);
        setSetDraft(freshSet());
        setTournamentName("");
        setTournamentLocation("");
        setTournamentPlace("");
        setShowTournamentFieldErrors(false);
        setActiveDayId(null);
        setShowForm(true);
        return;
      }
      setShowSavedDays(true);
      setExpandedDayId(navigationTarget.id);
      scrollFrame = window.requestAnimationFrame(() => {
        document.getElementById(`volleyball-day-${sport}-${navigationTarget.id}`)?.scrollIntoView({ block: "start" });
      });
    });
    return () => { window.cancelAnimationFrame(frame); window.cancelAnimationFrame(scrollFrame); };
  }, [navigationTarget, sport]);
  const activeDay = volleyballDays.find((day) => day.id === activeDayId);
  const activeTournament = activeDay?.gameType === "tournament" ? activeDay : null;
  const savedDays = volleyballDays.filter((day) => day.type === sport
    && (isOpenVolleyballDay(day) || isRecentDate(day.date)))
    .sort((a, b) => b.date.localeCompare(a.date));
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
    setGameType("");
    setGamePageOpen(false);
    setFitness("5");
    setFatigue("5");
    setNotes("");
    setTournamentName("");
    setTournamentLocation("");
    setTournamentPlace("");
    setShowTournamentFieldErrors(false);
    setActiveDayId(null);
    resetGame();
    setNotice("");
    setShowForm(true);
  }

  function resumeDay(day) {
    if (gameSets.length && !window.confirm("Ungespeicherte Sätze des aktuellen Spiels verwerfen?")) return;
    setDate(day.date);
    setGameType(day.gameType);
    setGamePageOpen(true);
    setFitness(String(day.fitness));
    setFatigue(String(day.endFatigue ?? 5));
    setNotes(day.notes ?? "");
    setTournamentName(day.tournamentName ?? "");
    setTournamentLocation(day.tournamentLocation ?? "");
    setTournamentPlace(String(day.tournamentPlace ?? ""));
    setShowTournamentFieldErrors(false);
    setActiveDayId(day.id);
    resetGame();
    setShowForm(true);
    setShowSavedDays(false);
    setExpandedDayId(null);
    setNotice("");
  }

  function validateTournamentFields() {
    if (gameType !== "tournament" || activeTournament) return true;
    const missingName = !tournamentName.trim();
    const missingLocation = !tournamentLocation.trim();
    setShowTournamentFieldErrors(true);
    if (missingName || missingLocation) {
      setNotice(missingName && missingLocation
        ? "Bitte gib Turniername und Austragungsort ein."
        : `Bitte gib ${missingName ? "den Turniernamen" : "den Austragungsort"} ein.`);
      (missingName ? tournamentNameRef : tournamentLocationRef).current?.focus();
      return false;
    }
    if (!isRating(fitness)) {
      setNotice("Bitte gib für die Tagesform einen Wert von 1 bis 10 ein.");
      document.getElementById(`${sport}-day-fitness`)?.focus();
      return false;
    }
    return true;
  }

  function addSet() {
    if (gameSets.length >= maxSets || currentGameStatus.finished) return;
    if (!validateTournamentFields()) return;
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
    if (!validateTournamentFields()) return;
    const endedEarly = !currentGameStatus.finished;
    if (!isRecordableGame(gameSets, sport, endedEarly)) {
      setNotice("Füge mindestens einen gültigen Satz hinzu, bevor du das Spiel speicherst.");
      return;
    }
    const game = { id: crypto.randomUUID(), opponent: opponent.trim(), sets: gameSets, endedEarly };
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
      && !window.confirm("Ungespeicherte Spiele und Sätze verwerfen?")) return false;
    setShowForm(false);
    setGamePageOpen(false);
    setActiveDayId(null);
    resetGame();
    setNotice("");
    return true;
  }

  function closeForm() {
    if (cancelForm() && navigationTarget?.mode === 'create') onReturn(navigationTarget)
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
    <div className="volleyball-view">
    <section className="diary-panel volleyball-intro">
      <span className={`area-emblem ${beach ? 'tone-beach' : 'tone-indoor'}`}><UIIcon name={beach ? 'beach' : 'ball'} /></span>
      <div className="section-heading"><div>
        <p className="eyebrow">VOLLEYBALL</p>
        <h2>{label}.</h2>
      </div></div>
      <p>{beach ? "Erfasse Beach-Spiele mit bis zu drei Sätzen und Turniere über den ganzen Tag."
        : "Erfasse Hallenspiele mit bis zu fünf Sätzen und Turniere über den ganzen Tag."}</p>
      {!showForm && <button type="button" className="primary-button" onClick={startDay}>＋ Spieltag erfassen</button>}

      {showForm && <EntryWindow title={activeDay ? `${label} · Spieltag fortsetzen` : `${label} · Spieltag erfassen`}
        subtitle="SPIELTAG-EINGABE" onClose={closeForm}>
        <div className="volleyball-form">
        {!activeDay && <>
          <DateWheel label="Spieltag-Datum" value={date || today()} onChange={setDate} />
          {!dateAvailable && <p className="helper-text" role="status">
            Bitte wähle am Rad ein freies Datum. Für diesen Tag gibt es bereits einen Beach- oder Hallenvolleyball-Spieltag.
          </p>}
        </>}
        {activeDay && <p><strong>{formatDate(activeDay.date)}</strong> · {gameLabel(activeDay.gameType)}</p>}

        {dateAvailable && <>
          {!gameType && <div>
            <h3>Welche Art von Spieltag?</h3>
            {(beach ? [["openPlay", "🏐 Open Play"], ["testMatch", "🤝 Testspiel"], ["tournament", "🏆 Turnier"]]
              : [["matchDay", "🏐 Spieltag"], ["tournament", "🏆 Turnier"]]).map(([value, title]) =>
              <button key={value} type="button" className="secondary-button"
                onClick={() => { setGameType(value); setEditingGame(true); setGamePageOpen(true) }}>{title}</button>)}
          </div>}

          {gameType && !gamePageOpen && <button type="button" className="secondary-button"
            onClick={() => setGamePageOpen(true)}>Spieltag ansehen</button>}

          {gameType && gamePageOpen && <EntryWindow title={`${label} · ${gameLabel(gameType)}`}
            subtitle={formatDate(activeDay?.date ?? date)} onClose={() => {
              if (gameSets.length && !window.confirm("Ungespeicherte Sätze dieses Spiels verwerfen?")) return
              setGamePageOpen(false)
              if (!activeDay) setGameType("")
              resetGame()
            }}>
            {gameType === "tournament" && !activeTournament && <>
              <label className="field-label" htmlFor={`${sport}-tournament-name`}>Turniername *</label>
              <input id={`${sport}-tournament-name`} ref={tournamentNameRef} className="field"
                value={tournamentName} required
                aria-invalid={showTournamentFieldErrors && !tournamentName.trim()}
                aria-describedby={showTournamentFieldErrors && !tournamentName.trim()
                  ? `${sport}-tournament-name-error` : undefined}
                onChange={(event) => setTournamentName(event.target.value)} placeholder="Name des Turniers" />
              {showTournamentFieldErrors && !tournamentName.trim() &&
                <p id={`${sport}-tournament-name-error`} className="field-error" role="alert">
                  Bitte gib den Namen des Turniers ein.
                </p>}
              <label className="field-label" htmlFor={`${sport}-tournament-location`}>Austragungsort *</label>
              <input id={`${sport}-tournament-location`} ref={tournamentLocationRef} className="field"
                value={tournamentLocation} required
                aria-invalid={showTournamentFieldErrors && !tournamentLocation.trim()}
                aria-describedby={showTournamentFieldErrors && !tournamentLocation.trim()
                  ? `${sport}-tournament-location-error` : undefined}
                onChange={(event) => setTournamentLocation(event.target.value)} placeholder="Stadt oder Spielstätte" />
              {showTournamentFieldErrors && !tournamentLocation.trim() &&
                <p id={`${sport}-tournament-location-error`} className="field-error" role="alert">
                  Bitte gib den Austragungsort ein.
                </p>}
              <p className="helper-text">* Pflichtfeld vor dem ersten Satz</p>
            </>}
            {gameType === "tournament" && activeTournament && <p>
              {activeTournament.tournamentName} · {activeTournament.tournamentLocation}
            </p>}
            {!activeDay && <RatingStepper id={`${sport}-day-fitness`}
              label="Wie fit warst du zu Beginn? (1–10)" value={fitness} onChange={setFitness} />}
            {gameType === "tournament" && !activeDay && showTournamentFieldErrors && !isRating(fitness)
              && <p className="field-error" role="alert">Bitte gib die Tagesform von 1 bis 10 ein.</p>}

            {activeDay?.games?.length > 0 &&
              <div className="volleyball-day-list">
                <h3>Erfasste Spiele</h3>
                {activeDay.games.map((game, index) =>
                  <div className="diary-panel" key={game.id}>
                    <h4>Spiel {index + 1}{game.opponent ? ` · ${game.opponent}` : ""}</h4>
                    <p>{game.setIds.length} Sätze</p>
                    {game.endedEarly && <p>Nach {game.setIds.length} {game.setIds.length === 1 ? "Satz" : "Sätzen"} beendet</p>}
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
                  <ChoiceWheel label="Satzergebnis" value={setDraft.won}
                    options={[{ value: 'true', label: 'Gewonnen' }, { value: 'false', label: 'Verloren' }]}
                    onChange={(won) => setSetDraft((previous) => ({ ...previous, won }))} />
                  <button type="button" className="secondary-button" onClick={addSet}>＋ Satz hinzufügen</button>
                </>}
                {currentGameStatus.finished && <p className="helper-text" role="status">
                  Spiel beendet: {currentGameStatus.wins}:{currentGameStatus.losses} Sätze.
                </p>}
                {gameSets.length > 0 && <>
                  <button type="button" className="last-set-button" onClick={() => completeGame(false)}>
                    {currentGameStatus.finished
                      ? gameType === "tournament" ? "✓ Spiel speichern · Turnier fortsetzen" : "✓ Spiel speichern · Spieltag fortsetzen"
                      : "✓ Spiel hier beenden und speichern"}
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
              <NumberWheel label="Belegter Platz" value={tournamentPlace} onChange={setTournamentPlace}
                min={1} max={100} step={1} />
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
          </EntryWindow>}
        </>}
        <button type="button" className="secondary-button" onClick={closeForm}>
          {activeDay ? "Für später schließen" : "Abbrechen"}
        </button>
        </div>
      </EntryWindow>}

    </section>

    <section className="diary-panel volleyball-history-section">
      <div className="section-heading"><div><p className="eyebrow">DEIN VERLAUF</p>
        <h2>Meine Spieltage</h2></div><span className="count-badge">{savedDays.length}</span></div>
      <p className="helper-text">Offene Spieltage und Einträge der letzten fünf Tage. Ältere Einträge findest du im Archiv.</p>
      {savedDays.length === 0 ? <p className="helper-text">Hier sind aktuell keine {label}-Spieltage.</p>
        : <>
          <button type="button" className="secondary-button volleyball-list-toggle"
            onClick={() => { setExpandedDayId(null); setShowSavedDays(true); }}>
            Aktuelle Spieltage anzeigen
          </button>
          {showSavedDays && <EntryWindow key={expandedDayId ?? 'days'}
            title={expandedDayId ? `${label} · ${formatDate(savedDays.find((day) => day.id === expandedDayId)?.date ?? today())}` : 'Meine Spieltage'}
            subtitle={label.toUpperCase()} onClose={() => {
              if (expandedDayId) {
                setEditingLegacySetId(null); setExpandedDayId(null)
                if (navigationTarget?.id === expandedDayId) onReturn(navigationTarget)
              }
              else setShowSavedDays(false)
            }}>
          <div className="volleyball-day-list">
          {savedDays.filter((day) => !expandedDayId || day.id === expandedDayId).map((day) => <div className="diary-panel" id={`volleyball-day-${sport}-${day.id}`} key={day.id}>
            <div className="volleyball-day-header"><h3>{formatDate(day.date)}</h3>
              <span>{day.games?.length ?? day.sets.length} {day.games ? "Spiele" : "Sätze"}</span></div>
            <p>{gameLabel(day.gameType)} · {day.sets.length} Sätze</p>
            {day.gameType === "tournament" && day.tournamentName && <p>Turnier: {day.tournamentName}</p>}
            {day.gameType === "tournament" && day.games
              && day.tournamentStatus !== "completed" && <button type="button" className="primary-button"
                onClick={() => resumeDay(day)}>
                {day.tournamentStatus === "pendingPlacement" ? "Platzierung eintragen" : "Turnier fortsetzen"}
              </button>}
            {day.dayStatus === "ongoing" && <button type="button" className="primary-button"
              onClick={() => resumeDay(day)}>Spieltag fortsetzen</button>}
            {!expandedDayId && <button type="button" className="secondary-button"
              onClick={() => { setEditingLegacySetId(null); setExpandedDayId(day.id); }}>
              {day.games ? "Spiele anzeigen" : "Sätze anzeigen"}
            </button>}
            {expandedDayId === day.id && <div className="volleyball-day-list volleyball-day-details">
              {day.gameType === "tournament" && <>
                {day.tournamentName && <p>Austragungsort: {day.tournamentLocation}</p>}
                <p>{day.tournamentStatus === "ongoing" ? "Turnier läuft – weitere Spiele möglich"
                  : day.tournamentStatus === "pendingPlacement" ? "Letztes Spiel gespeichert – Platzierung offen"
                    : day.tournamentPlace != null ? `Platzierung: ${day.tournamentPlace}. Platz` : ""}</p>
              </>}
              {day.dayStatus === "ongoing" && <p>Spieltag läuft – weitere Spiele möglich</p>}
              <p>Tagesform zu Beginn: {day.fitness ?? "–"}/10
                {day.endFatigue != null && ` · Erschöpfung am Ende: ${day.endFatigue}/10`}</p>
              {day.notes && <p>{day.notes}</p>}
              {day.games ? day.games.map((game, index) => {
                const gameSets = game.setIds.map((setId) => day.sets.find((set) => set.id === setId));
                const sharedStrength = new Set(gameSets.map((set) => set?.opponentStrength)).size === 1
                  ? gameSets[0]?.opponentStrength : null;
                return <div className="diary-panel" key={game.id}>
                  <h4>Spiel {index + 1}{game.opponent ? ` · ${game.opponent}` : ""}
                    {game.isLastGame ? " · Letztes Spiel" : ""}</h4>
                  {sharedStrength && <p>Gegnerstärke: {strengthLabels[sharedStrength] ?? sharedStrength}</p>}
                  {game.endedEarly && <p>Nach {game.setIds.length} {game.setIds.length === 1 ? "Satz" : "Sätzen"} beendet</p>}
                  {gameSets.map((set, setIndex) => set && <div className="volleyball-saved-set" key={set.id}>
                    <SetResultHeading number={setIndex + 1} won={set.won} />
                    {!sharedStrength && <p>Gegnerstärke: {strengthLabels[set.opponentStrength] ?? set.opponentStrength}</p>}
                    <p>Fitness zu Satzbeginn: {set.fitness}/10</p>
                    <p>Intensität: {set.intensity}/10</p>
                    <p>Technische Leistung: {set.technique}/10</p>
                  </div>)}
                </div>;
              }) : (day.sets ?? []).map((set, index) => <div className="volleyball-saved-set" key={set.id}>
                <SetResultHeading number={index + 1} won={set.won} />
                {day.gameType === "testMatch" && <>
                  <p>Gegner: {beachSetOpponent(day, set) ?? "Nicht einzeln erfasst"}</p>
                  <button type="button" className="secondary-button" onClick={() => {
                    setLegacyOpponentEdit(beachSetOpponent(day, set) ?? "");
                    setEditingLegacySetId(set.id);
                  }}>Gegner nachtragen/ändern</button>
                  {editingLegacySetId === set.id && <EntryWindow title={`Gegner für Satz ${index + 1}`}
                    subtitle={formatDate(day.date)} onClose={() => setEditingLegacySetId(null)}>
                    <div className="beach-opponent-editor">
                    <label className="field-label" htmlFor={`legacy-opponent-${set.id}`}>Gegner für Satz {index + 1}</label>
                    <input id={`legacy-opponent-${set.id}`} className="field" value={legacyOpponentEdit}
                      onChange={(event) => setLegacyOpponentEdit(event.target.value)} />
                    <button type="button" className="secondary-button"
                      onClick={() => saveLegacyOpponent(day, set)}>Gegner speichern</button>
                    </div>
                  </EntryWindow>}
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
          </EntryWindow>}
        </>}
      <button type="button" className="secondary-button" onClick={onOpenArchive}>Zum Archiv</button>
    </section>
    </div>
  );
}
